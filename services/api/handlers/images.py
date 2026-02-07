import json
import os
import boto3
from concurrent.futures import ThreadPoolExecutor, as_completed
from botocore.exceptions import ClientError
from lib.response import success, error
from lib.image_search import search_dish_images
from lib.auth import require_auth

s3_client = boto3.client("s3")


def fetch_dish_image(dish_name):
    """Fetch images for a single dish. Returns extra candidates for frontend fallback."""
    images = search_dish_images(dish_name, num_results=5)  # Will fetch 15, return all
    return {"name": dish_name, "images": images}


def handler(event, context):
    """
    POST /menu/images

    Two modes:
    1. API Gateway call (has 'body'): Authenticated request from frontend
    2. Async invocation (has 'async_images'): Internal call from extract Lambda

    Request body:
    {
        "run_id": "uuid"
    }

    Response:
    {
        "dishes": [
            { "name": "Spring Rolls", "images": ["url1", "url2", "url3"] }
        ]
    }
    """
    # Async invocation from extract Lambda - no auth needed
    if event.get("async_images"):
        return _fetch_images(event.get("run_id"), api_gateway=False)

    # API Gateway call - require auth
    return _authenticated_handler(event, context)


@require_auth
def _authenticated_handler(event, context, user):
    try:
        body = json.loads(event.get("body", "{}"))
        run_id = body.get("run_id")

        if not run_id:
            return error("run_id is required", 400)

        return _fetch_images(run_id, api_gateway=True)

    except json.JSONDecodeError:
        return error("Invalid JSON in request body", 400)
    except Exception as e:
        print(f"Error: {str(e)}")
        return error("Internal server error", 500)


def _fetch_images(run_id, api_gateway=True):
    """Core image fetching logic shared by both API and async paths."""
    cache_bucket = os.environ.get("CACHE_BUCKET")
    cache_key = f"{run_id}/menu.json"

    try:
        response = s3_client.get_object(Bucket=cache_bucket, Key=cache_key)
        menu_data = json.loads(response["Body"].read().decode("utf-8"))
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            if api_gateway:
                return error("Menu not found. Please extract the menu first.", 404)
            print(f"Menu not found for {run_id}")
            return {"status": "error", "message": "Menu not found"}
        raise

    # Check for cached images result
    images_cache_key = f"{run_id}/images.json"
    try:
        response = s3_client.get_object(Bucket=cache_bucket, Key=images_cache_key)
        cached_images = json.loads(response["Body"].read().decode("utf-8"))
        if api_gateway:
            return success(cached_images)
        return cached_images
    except ClientError as e:
        if e.response['Error']['Code'] != 'NoSuchKey':
            raise
        # Need to fetch images

    # Extract all dish names
    dishes = []
    for section in menu_data.get("sections", []):
        for dish in section.get("dishes", []):
            dish_name = dish.get("name")
            if dish_name:
                dishes.append(dish_name)

    # Fetch images for each dish in parallel
    dish_images = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_dish_image, name): name for name in dishes}
        for future in as_completed(futures):
            try:
                result = future.result()
                dish_images.append(result)
            except Exception as e:
                dish_name = futures[future]
                print(f"Error fetching image for {dish_name}: {e}")
                dish_images.append({"name": dish_name, "images": []})

    result = {"dishes": dish_images}

    # Cache the result
    s3_client.put_object(
        Bucket=cache_bucket,
        Key=images_cache_key,
        Body=json.dumps(result),
        ContentType="application/json",
    )

    print(f"Images fetched for {run_id}: {len(dish_images)} dishes")

    if api_gateway:
        return success(result)
    return result
