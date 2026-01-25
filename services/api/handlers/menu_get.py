import json
import os
import boto3
from botocore.exceptions import ClientError
from lib.response import success, error
from lib.dynamo import get_run
from lib.auth import require_auth

s3_client = boto3.client("s3")


@require_auth
def handler(event, context, user):
    """
    GET /menu/{runId}

    Response:
    {
        "run_id": "uuid",
        "menu": {
            "restaurant_name": "...",
            "sections": [...]
        }
    }
    """
    try:
        # Get runId from path parameters
        run_id = event.get("pathParameters", {}).get("runId")

        if not run_id:
            return error("runId is required", 400)

        # Get run record
        run = get_run(run_id)
        if not run:
            return error("Run not found", 404)

        # Check status
        status = run.get("status")
        if status == "PENDING":
            return success({"run_id": run_id, "status": "PENDING"})
        if status == "PROCESSING":
            return success({"run_id": run_id, "status": "PROCESSING"})
        if status == "FAILED":
            return success({"run_id": run_id, "status": "FAILED", "error": run.get("error", "Unknown error")})

        # Get cached menu
        cache_bucket = os.environ.get("CACHE_BUCKET")
        cache_key = f"{run_id}/menu.json"

        try:
            response = s3_client.get_object(Bucket=cache_bucket, Key=cache_key)
            menu_data = json.loads(response["Body"].read().decode("utf-8"))
            return success({"run_id": run_id, "status": "EXTRACTED", "menu": menu_data})
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return error("Menu data not found", 404)
            raise

    except Exception as e:
        print(f"Error: {str(e)}")
        return error("Internal server error", 500)
