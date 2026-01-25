import os
import boto3
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

dynamodb = boto3.resource("dynamodb")


def get_menu_runs_table():
    """Get the menu runs DynamoDB table."""
    table_name = os.environ.get("DYNAMO_TABLE", "nibble-dev-menu-runs")
    return dynamodb.Table(table_name)


def get_image_cache_table():
    """Get the image cache DynamoDB table."""
    table_name = os.environ.get("IMAGE_CACHE_TABLE", "nibble-dev-image-cache")
    return dynamodb.Table(table_name)


def create_run(run_id: str, keys: List[str], google_maps_url: Optional[str] = None) -> Dict[str, Any]:
    """Create a new menu run record."""
    table = get_menu_runs_table()

    now = datetime.utcnow()
    ttl = int((now + timedelta(days=7)).timestamp())

    item = {
        "run_id": run_id,
        "status": "PENDING",
        "keys": keys,
        "created_at": now.isoformat(),
        "ttl": ttl,
    }

    if google_maps_url:
        item["google_maps_url"] = google_maps_url

    table.put_item(Item=item)
    return item


def get_run(run_id: str) -> Optional[Dict[str, Any]]:
    """Get a menu run record."""
    table = get_menu_runs_table()

    response = table.get_item(Key={"run_id": run_id})
    return response.get("Item")


def update_run_status(run_id: str, status: str, extra_data: Optional[Dict] = None):
    """Update the status of a menu run."""
    table = get_menu_runs_table()

    update_expr = "SET #status = :status, updated_at = :updated_at"
    expr_values = {
        ":status": status,
        ":updated_at": datetime.utcnow().isoformat(),
    }
    expr_names = {"#status": "status"}

    if extra_data:
        for key, value in extra_data.items():
            # Use expression attribute names to handle reserved keywords
            expr_names[f"#{key}"] = key
            update_expr += f", #{key} = :{key}"
            expr_values[f":{key}"] = value

    table.update_item(
        Key={"run_id": run_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
    )


def get_cached_images(dish_hash: str) -> Optional[List[str]]:
    """Get cached images for a dish."""
    table = get_image_cache_table()

    response = table.get_item(Key={"dish_hash": dish_hash})
    item = response.get("Item")

    if item:
        return item.get("images", [])
    return None


def cache_images(dish_hash: str, images: List[str]):
    """Cache images for a dish."""
    table = get_image_cache_table()

    ttl = int((datetime.utcnow() + timedelta(days=30)).timestamp())

    table.put_item(
        Item={
            "dish_hash": dish_hash,
            "images": images,
            "cached_at": datetime.utcnow().isoformat(),
            "ttl": ttl,
        }
    )
