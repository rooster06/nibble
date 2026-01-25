import hashlib
import json
import os
import re
import requests
import boto3
from botocore.exceptions import ClientError
from lib.response import success, error
from lib.secrets import get_serpapi_key, get_openai_api_key
from lib.dynamo import get_run
from lib.auth import require_auth

s3_client = boto3.client("s3")

SERPAPI_URL = "https://serpapi.com/search"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"


def is_valid_maps_url(url: str) -> tuple[bool, str]:
    """Check if URL is a valid Google Maps URL format."""
    # Unsupported formats
    if 'share.google' in url:
        return False, "share.google links are not supported. Please use the Google Maps app to share."

    # Supported formats
    valid_patterns = [
        'google.com/maps',
        'maps.google.com',
        'goo.gl/maps',
        'maps.app.goo.gl',
    ]

    if any(pattern in url for pattern in valid_patterns):
        return True, ""

    return False, "This doesn't look like a Google Maps link. Open the restaurant in Google Maps, tap Share, and copy the link."


def resolve_short_url(url: str) -> str:
    """Resolve short URLs to full Google Maps URLs."""
    # List of short URL domains that need resolving
    short_domains = ['goo.gl', 'maps.app']

    if any(domain in url for domain in short_domains):
        try:
            # Follow redirects to get the full URL
            response = requests.head(url, allow_redirects=True, timeout=10)
            return response.url
        except Exception as e:
            print(f"Error resolving short URL: {e}")
    return url


def extract_place_id_from_url(url: str) -> dict:
    """Extract place info from Google Maps URL."""
    # First resolve short URLs
    url = resolve_short_url(url)

    # Example URLs:
    # https://www.google.com/maps/place/Restaurant+Name/@lat,lng,zoom/data=...
    # https://maps.app.goo.gl/... (resolved to full URL)

    result = {"query": None, "data_cid": None}

    # Try to extract data_cid (unique place identifier)
    cid_match = re.search(r'0x[0-9a-fA-F]+:0x[0-9a-fA-F]+', url)
    if cid_match:
        result["data_cid"] = cid_match.group()

    # Try to extract place name from URL path
    place_match = re.search(r'/maps/place/([^/@]+)', url)
    if place_match:
        place_name = place_match.group(1).replace('+', ' ').replace('%20', ' ')
        result["query"] = place_name

    return result


def fetch_reviews_from_serpapi(google_maps_url: str) -> list:
    """Fetch reviews from Google Maps via SerpAPI."""
    api_key = get_serpapi_key()

    place_info = extract_place_id_from_url(google_maps_url)

    if not place_info["query"] and not place_info["data_cid"]:
        print(f"Could not extract place info from URL: {google_maps_url}")
        return []

    params = {
        "engine": "google_maps_reviews",
        "api_key": api_key,
        "hl": "en",
    }

    if place_info["data_cid"]:
        params["data_id"] = place_info["data_cid"]
    elif place_info["query"]:
        # First search for the place to get the data_id
        search_params = {
            "engine": "google_maps",
            "q": place_info["query"],
            "api_key": api_key,
            "type": "search",
        }

        try:
            search_response = requests.get(SERPAPI_URL, params=search_params, timeout=15)
            search_response.raise_for_status()
            search_data = search_response.json()

            # Get first result's data_id
            local_results = search_data.get("local_results", [])
            if local_results:
                data_id = local_results[0].get("data_id")
                if data_id:
                    params["data_id"] = data_id
                else:
                    print("No data_id in search results")
                    return []
            else:
                print("No local results found")
                return []
        except Exception as e:
            print(f"Error searching for place: {e}")
            return []

    try:
        response = requests.get(SERPAPI_URL, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        reviews = data.get("reviews", [])
        return reviews[:20]  # Limit to 20 reviews

    except Exception as e:
        print(f"Error fetching reviews: {e}")
        return []


def extract_dish_mentions(reviews: list, menu_dishes: list) -> list:
    """Use GPT to extract dish mentions from reviews."""
    if not reviews:
        return []

    api_key = get_openai_api_key()

    # Combine review snippets
    review_texts = []
    for review in reviews:
        snippet = review.get("snippet", "")
        if snippet:
            review_texts.append(snippet)

    if not review_texts:
        return []

    combined_reviews = "\n---\n".join(review_texts[:15])  # Limit to 15 reviews
    dish_names = [d for d in menu_dishes]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {
                "role": "system",
                "content": """You analyze restaurant reviews to find mentions of specific dishes.
Given a list of dishes from the menu and customer reviews, identify which dishes are mentioned positively.
Return a JSON array of objects with "dish" (exact name from menu) and "quote" (brief excerpt from review mentioning it).
Only include dishes that are clearly mentioned positively. Return max 5 dishes.
If no dishes are clearly mentioned, return an empty array."""
            },
            {
                "role": "user",
                "content": f"""Menu dishes: {json.dumps(dish_names)}

Reviews:
{combined_reviews}

Return JSON array only, no other text."""
            }
        ],
        "max_tokens": 500,
        "temperature": 0.3,
    }

    try:
        response = requests.post(OPENAI_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()

        content = data["choices"][0]["message"]["content"].strip()

        # Parse JSON from response
        # Handle potential markdown code blocks
        if content.startswith("```"):
            content = re.sub(r'^```json?\n?', '', content)
            content = re.sub(r'\n?```$', '', content)

        mentions = json.loads(content)
        return mentions if isinstance(mentions, list) else []

    except Exception as e:
        print(f"Error extracting dish mentions: {e}")
        return []


@require_auth
def handler(event, context, user):
    """
    POST /menu/reviews

    Request body:
    {
        "run_id": "uuid"
    }

    Response:
    {
        "mentions": [
            { "dish": "Pulpo", "quote": "The octopus was incredible..." }
        ],
        "review_count": 20
    }
    """
    try:
        body = json.loads(event.get("body", "{}"))
        run_id = body.get("run_id")
        google_maps_url = body.get("google_maps_url")

        if not run_id:
            return error("run_id is required", 400)

        # If no URL provided in request, try to get from run data
        if not google_maps_url:
            run_data = get_run(run_id)
            if not run_data:
                return error("Run not found", 404)
            google_maps_url = run_data.get("google_maps_url")

        if not google_maps_url:
            return success({"mentions": [], "review_count": 0, "message": "No Google Maps URL provided"})

        # Validate URL format
        is_valid, error_message = is_valid_maps_url(google_maps_url)
        if not is_valid:
            return success({
                "mentions": [],
                "review_count": 0,
                "error": "invalid_url",
                "message": error_message
            })

        # Check for cached reviews (include URL hash in cache key)
        cache_bucket = os.environ.get("CACHE_BUCKET")
        url_hash = hashlib.md5(google_maps_url.encode()).hexdigest()[:8]
        reviews_cache_key = f"{run_id}/reviews_{url_hash}.json"

        try:
            response = s3_client.get_object(Bucket=cache_bucket, Key=reviews_cache_key)
            cached = json.loads(response["Body"].read().decode("utf-8"))
            return success(cached)
        except ClientError as e:
            if e.response['Error']['Code'] != 'NoSuchKey':
                raise

        # Get menu data to know which dishes to look for
        menu_cache_key = f"{run_id}/menu.json"
        try:
            response = s3_client.get_object(Bucket=cache_bucket, Key=menu_cache_key)
            menu_data = json.loads(response["Body"].read().decode("utf-8"))
        except ClientError:
            return error("Menu not found", 404)

        # Extract dish names from menu
        dish_names = []
        for section in menu_data.get("sections", []):
            for dish in section.get("dishes", []):
                if dish.get("name"):
                    dish_names.append(dish["name"])

        # Fetch reviews from SerpAPI
        reviews = fetch_reviews_from_serpapi(google_maps_url)

        if not reviews:
            result = {"mentions": [], "review_count": 0, "message": "No reviews found"}
            s3_client.put_object(
                Bucket=cache_bucket,
                Key=reviews_cache_key,
                Body=json.dumps(result),
                ContentType="application/json",
            )
            return success(result)

        # Extract dish mentions using GPT
        mentions = extract_dish_mentions(reviews, dish_names)

        result = {
            "mentions": mentions,
            "review_count": len(reviews),
        }

        # Cache the result
        s3_client.put_object(
            Bucket=cache_bucket,
            Key=reviews_cache_key,
            Body=json.dumps(result),
            ContentType="application/json",
        )

        return success(result)

    except json.JSONDecodeError:
        return error("Invalid JSON in request body", 400)
    except Exception as e:
        print(f"Error: {str(e)}")
        return error("Internal server error", 500)
