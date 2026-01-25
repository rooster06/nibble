import json
import os
import boto3
from lib.response import success, error
from lib.dynamo import get_run, update_run_status
from lib.openai_client import extract_menu_from_images
from lib.auth import require_auth

s3_client = boto3.client("s3")
lambda_client = boto3.client("lambda")


def handler(event, context):
    """
    POST /menu/extract

    Two modes:
    1. API Gateway call (has 'body'): Starts async processing, returns immediately
    2. Async invocation (has 'async_extract'): Does actual extraction

    Request body:
    {
        "run_id": "uuid"
    }

    Response:
    {
        "run_id": "uuid",
        "status": "PROCESSING" | "EXTRACTED"
    }
    """
    # Check if this is an async extraction call (internal Lambda invocation)
    if event.get("async_extract"):
        return do_async_extraction(event)

    # For API Gateway calls, require auth
    return _authenticated_handler(event, context)


@require_auth
def _authenticated_handler(event, context, user):
    """Authenticated handler for API Gateway requests."""
    try:
        # Parse request body (API Gateway call)
        body = json.loads(event.get("body", "{}"))
        run_id = body.get("run_id")

        if not run_id:
            return error("run_id is required", 400)

        # Get run record
        run = get_run(run_id)
        if not run:
            return error("Run not found", 404)

        # Check if already extracted
        if run.get("status") == "EXTRACTED":
            return success({"run_id": run_id, "status": "EXTRACTED"})

        # Check if already processing
        if run.get("status") == "PROCESSING":
            return success({"run_id": run_id, "status": "PROCESSING"})

        # Get keys
        keys = run.get("keys", [])
        if not keys:
            return error("No images found for this run", 400)

        # Verify images exist
        uploads_bucket = os.environ.get("UPLOADS_BUCKET")
        for key in keys:
            try:
                s3_client.head_object(Bucket=uploads_bucket, Key=key)
            except:
                return error(f"Image not found: {key}", 404)

        # Update status to processing
        update_run_status(run_id, "PROCESSING")

        # Invoke self asynchronously for actual extraction
        function_name = context.function_name
        lambda_client.invoke(
            FunctionName=function_name,
            InvocationType="Event",  # Async invocation
            Payload=json.dumps({
                "async_extract": True,
                "run_id": run_id,
                "keys": keys,
            }),
        )

        # Return immediately - frontend will poll for status
        return success({"run_id": run_id, "status": "PROCESSING"})

    except json.JSONDecodeError:
        return error("Invalid JSON in request body", 400)
    except Exception as e:
        print(f"Error: {str(e)}")
        return error("Internal server error", 500)


def do_async_extraction(event):
    """Handle async extraction invocation."""
    run_id = event.get("run_id")
    keys = event.get("keys", [])

    uploads_bucket = os.environ.get("UPLOADS_BUCKET")
    cache_bucket = os.environ.get("CACHE_BUCKET")

    try:
        # Download images
        image_data_list = []
        for key in keys:
            response = s3_client.get_object(Bucket=uploads_bucket, Key=key)
            image_bytes = response["Body"].read()
            content_type = response.get("ContentType", "image/jpeg")
            image_data_list.append((image_bytes, content_type))

        # Extract menu using GPT-4o Vision
        menu_data = extract_menu_from_images(image_data_list)

        # Cache the result
        cache_key = f"{run_id}/menu.json"
        s3_client.put_object(
            Bucket=cache_bucket,
            Key=cache_key,
            Body=json.dumps(menu_data),
            ContentType="application/json",
        )

        # Update status
        update_run_status(run_id, "EXTRACTED")
        print(f"Extraction complete for {run_id}")

    except Exception as e:
        print(f"Extraction error for {run_id}: {str(e)}")
        update_run_status(run_id, "FAILED", {"error": str(e)})

    return {"status": "done"}
