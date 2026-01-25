#!/usr/bin/env python3
"""
Test script for image search functionality.

Usage:
    python test_images.py [run_id]

If run_id is not provided, it will use the most recent run from DynamoDB.
"""

import sys
import json
import requests
import boto3
from concurrent.futures import ThreadPoolExecutor

# Configuration
API_URL = "https://s8uwh6gj46.execute-api.us-east-1.amazonaws.com/dev"
DYNAMODB_TABLE = "nibble-dev-menu-runs"
IMAGE_CACHE_TABLE = "nibble-dev-image-cache"
REGION = "us-east-1"


def clear_image_cache(run_id=None):
    """Clear all items from the image cache table and S3 cache."""
    print("Clearing image cache...")

    # Clear DynamoDB cache
    dynamodb = boto3.client("dynamodb", region_name=REGION)
    response = dynamodb.scan(
        TableName=IMAGE_CACHE_TABLE,
        ProjectionExpression="dish_hash"
    )

    items = response.get("Items", [])
    count = 0
    for item in items:
        dish_hash = item["dish_hash"]["S"]
        dynamodb.delete_item(
            TableName=IMAGE_CACHE_TABLE,
            Key={"dish_hash": {"S": dish_hash}}
        )
        count += 1

    print(f"Cleared {count} DynamoDB cached items")

    # Clear S3 cache for specific run_id if provided
    if run_id:
        s3 = boto3.client("s3", region_name=REGION)
        try:
            s3.delete_object(
                Bucket="nibble-dev-cache-c62d2244",
                Key=f"{run_id}/images.json"
            )
            print(f"Cleared S3 cache for run_id: {run_id}")
        except Exception as e:
            print(f"No S3 cache to clear (or error): {e}")


def get_latest_run_id():
    """Get the most recent run_id from DynamoDB."""
    dynamodb = boto3.client("dynamodb", region_name=REGION)

    response = dynamodb.scan(
        TableName=DYNAMODB_TABLE,
        Limit=10
    )

    items = response.get("Items", [])
    if not items:
        return None

    # Sort by created_at if available, otherwise just return first
    latest = items[0]
    return latest.get("run_id", {}).get("S")


def check_image_url(url):
    """Check if an image URL is accessible."""
    try:
        response = requests.head(url, timeout=5, allow_redirects=True)
        content_type = response.headers.get("content-type", "")
        if response.status_code == 200:
            return {"url": url, "status": "ok", "content_type": content_type}
        else:
            return {"url": url, "status": "error", "code": response.status_code}
    except requests.RequestException as e:
        return {"url": url, "status": "error", "error": str(e)}


def test_images(run_id):
    """Test the images endpoint and validate all URLs."""
    print(f"\nTesting images for run_id: {run_id}")
    print("=" * 60)

    # Call the images endpoint
    response = requests.post(
        f"{API_URL}/menu/images",
        json={"run_id": run_id},
        timeout=60
    )

    if response.status_code != 200:
        print(f"ERROR: API returned {response.status_code}")
        print(response.text)
        return False

    data = response.json()
    dishes = data.get("dishes", [])

    print(f"\nFound {len(dishes)} dishes")
    print("-" * 60)

    total_images = 0
    missing_images = 0
    broken_images = 0
    all_urls = []

    for dish in dishes:
        name = dish.get("name", "Unknown")
        images = dish.get("images", [])

        if not images:
            print(f"[MISSING] {name}: No images found")
            missing_images += 1
        else:
            print(f"[OK]      {name}: {len(images)} images")
            total_images += len(images)
            all_urls.extend([(name, url) for url in images])

    print("\n" + "=" * 60)
    print("Validating image URLs...")
    print("-" * 60)

    # Validate URLs in parallel
    with ThreadPoolExecutor(max_workers=10) as executor:
        url_results = list(executor.map(lambda x: (x[0], check_image_url(x[1])), all_urls))

    for dish_name, result in url_results:
        if result["status"] != "ok":
            print(f"[BROKEN]  {dish_name}: {result.get('url', '')[:60]}...")
            print(f"          Error: {result.get('error') or result.get('code')}")
            broken_images += 1

    # Count working images per dish
    working_per_dish = {}
    for dish_name, result in url_results:
        if dish_name not in working_per_dish:
            working_per_dish[dish_name] = 0
        if result["status"] == "ok":
            working_per_dish[dish_name] += 1

    dishes_with_enough = sum(1 for count in working_per_dish.values() if count >= 5)

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total dishes:           {len(dishes)}")
    print(f"Missing images:         {missing_images}")
    print(f"Total images:           {total_images}")
    print(f"Broken images:          {broken_images}")
    print(f"Working images:         {total_images - broken_images}")
    print(f"Dishes with 5+ working: {dishes_with_enough}/{len(dishes)}")

    # Pass if all dishes have at least 5 working images
    success = missing_images == 0 and dishes_with_enough == len(dishes)
    print(f"\nResult: {'PASS' if success else 'FAIL'}")

    return success


def main():
    # Get run_id from args or find latest
    if len(sys.argv) > 1:
        run_id = sys.argv[1]
    else:
        run_id = get_latest_run_id()
        if not run_id:
            print("ERROR: No run_id provided and no runs found in DynamoDB")
            print("Usage: python test_images.py <run_id>")
            sys.exit(1)

    # Clear cache first (both DynamoDB and S3)
    clear_image_cache(run_id)

    # Run test
    success = test_images(run_id)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
