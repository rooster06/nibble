import hashlib
import requests
from typing import List
from urllib.parse import urlparse
from lib.secrets import get_serpapi_key
from lib.dynamo import get_cached_images, cache_images

SERPAPI_URL = "https://serpapi.com/search"

# Domains to skip - blocked by tracking prevention or unreliable
BLOCKED_DOMAINS = [
    "wp.com",           # WordPress CDN - blocked by Safari/Firefox tracking prevention
    "tiktok.com",       # Slow/timeouts + tracking prevention
    "wsj.net",          # Paywall/403 issues
    "craftbeering.com", # Consistent 403s
]


def is_blocked_domain(url: str) -> bool:
    """Check if URL is from a blocked domain."""
    try:
        host = urlparse(url).netloc.lower()
        return any(blocked in host for blocked in BLOCKED_DOMAINS)
    except:
        return False


def get_dish_hash(dish_name: str) -> str:
    """Generate a hash for a dish name for caching."""
    normalized = dish_name.lower().strip()
    return hashlib.md5(normalized.encode()).hexdigest()


def search_dish_images(dish_name: str, num_results: int = 5) -> List[str]:
    """
    Search for images of a dish using SerpAPI Google Images.

    Args:
        dish_name: Name of the dish to search for
        num_results: Number of images to return

    Returns:
        List of image URLs ranked by Google
    """
    # Check cache first
    dish_hash = get_dish_hash(dish_name)
    cached = get_cached_images(dish_hash)
    if cached:
        return cached[:num_results]

    # Search Google Images via SerpAPI - request extra in case some fail
    api_key = get_serpapi_key()
    fetch_count = num_results * 3  # Get 3x to account for broken links

    params = {
        "engine": "google_images",
        "q": f"{dish_name} food",
        "api_key": api_key,
        "num": fetch_count,
    }

    try:
        response = requests.get(SERPAPI_URL, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        images = []
        for item in data.get("images_results", []):
            if len(images) >= fetch_count:
                break
            # Use original high-quality images
            image_url = item.get("original")
            if image_url and not is_blocked_domain(image_url):
                images.append(image_url)

        if not images:
            print(f"No images found for '{dish_name}'")
            return []

        # Cache all fetched results (frontend will filter broken ones)
        cache_images(dish_hash, images)
        return images

    except requests.RequestException as e:
        print(f"SerpAPI error: {e}")
        return []


def search_multiple_dishes(dishes: List[str], num_results_per_dish: int = 1) -> dict:
    """
    Search for images of multiple dishes.

    Args:
        dishes: List of dish names
        num_results_per_dish: Number of images per dish

    Returns:
        Dictionary mapping dish names to lists of image URLs
    """
    results = {}

    for dish_name in dishes:
        images = search_dish_images(dish_name, num_results_per_dish)
        results[dish_name] = images

    return results
