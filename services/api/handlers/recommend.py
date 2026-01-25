import json
import os
import hashlib
import boto3
from botocore.exceptions import ClientError
from lib.response import success, error
from lib.openai_client import get_recommendations
from lib.auth import require_auth

s3_client = boto3.client("s3")


def get_prefs_hash(run_id: str, vibe: str, group_size: int, prefs: dict) -> str:
    """Generate a hash for caching recommendations based on preferences."""
    key = f"{run_id}:{vibe}:{group_size}:{json.dumps(prefs, sort_keys=True)}"
    return hashlib.md5(key.encode()).hexdigest()


@require_auth
def handler(event, context, user):
    """
    POST /menu/recommend

    Request body:
    {
        "run_id": "uuid",
        "vibe": "date_night",
        "group_size": 2,
        "prefs": {
            "dietary": ["no_pork"],
            "adventurousness": "medium",
            "budget": "moderate"
        }
    }

    Response:
    {
        "plan": {
            "shareables": 2,
            "mains": 2,
            "dessert": 1
        },
        "recommendations": [
            { "dish": "Spring Rolls", "reason": "...", "category": "shareable" }
        ],
        "avoid": [
            { "dish": "Super Spicy Wings", "reason": "..." }
        ]
    }
    """
    try:
        # Parse request body
        body = json.loads(event.get("body", "{}"))
        run_id = body.get("run_id")
        vibe = body.get("vibe", "friends")
        group_size = body.get("group_size", 2)
        prefs = body.get("prefs", {})

        if not run_id:
            return error("run_id is required", 400)

        # Validate inputs
        valid_vibes = ["date_night", "friends", "family", "business"]
        if vibe not in valid_vibes:
            return error(f"vibe must be one of: {', '.join(valid_vibes)}", 400)

        if not isinstance(group_size, int) or group_size < 1 or group_size > 20:
            return error("group_size must be between 1 and 20", 400)

        # Extract preferences
        dietary = prefs.get("dietary", [])
        adventurousness = prefs.get("adventurousness", "medium")
        budget = prefs.get("budget", "moderate")

        valid_adventurousness = ["low", "medium", "high"]
        valid_budget = ["low", "moderate", "high"]

        if adventurousness not in valid_adventurousness:
            adventurousness = "medium"
        if budget not in valid_budget:
            budget = "moderate"

        # Get menu data from cache
        cache_bucket = os.environ.get("CACHE_BUCKET")
        cache_key = f"{run_id}/menu.json"

        try:
            response = s3_client.get_object(Bucket=cache_bucket, Key=cache_key)
            menu_data = json.loads(response["Body"].read().decode("utf-8"))
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return error("Menu not found. Please extract the menu first.", 404)
            raise

        # Check for cached recommendations
        prefs_hash = get_prefs_hash(run_id, vibe, group_size, prefs)
        rec_cache_key = f"{run_id}/recommendations/{prefs_hash}.json"

        try:
            response = s3_client.get_object(Bucket=cache_bucket, Key=rec_cache_key)
            cached_recs = json.loads(response["Body"].read().decode("utf-8"))
            return success(cached_recs)
        except ClientError as e:
            if e.response['Error']['Code'] != 'NoSuchKey':
                raise
            # Need to generate recommendations

        # Get recommendations from GPT-4o
        try:
            recommendations = get_recommendations(
                menu=menu_data,
                vibe=vibe,
                group_size=group_size,
                dietary=dietary,
                adventurousness=adventurousness,
                budget=budget,
            )
        except Exception as e:
            return error(f"Failed to generate recommendations: {str(e)}", 500)

        # Cache the result
        s3_client.put_object(
            Bucket=cache_bucket,
            Key=rec_cache_key,
            Body=json.dumps(recommendations),
            ContentType="application/json",
        )

        return success(recommendations)

    except json.JSONDecodeError:
        return error("Invalid JSON in request body", 400)
    except Exception as e:
        print(f"Error: {str(e)}")
        return error("Internal server error", 500)
