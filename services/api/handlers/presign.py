import json
import os
import uuid
import boto3
from lib.response import success, error
from lib.dynamo import create_run
from lib.auth import require_auth

s3_client = boto3.client("s3")


@require_auth
def handler(event, context, user):
    """
    POST /uploads/presign

    Request body:
    {
        "count": 2,
        "content_types": ["image/jpeg", "image/png"]
    }

    Response:
    {
        "run_id": "uuid",
        "upload_urls": ["presigned-url-1", "presigned-url-2"],
        "keys": ["key1", "key2"]
    }
    """
    try:
        # Parse request body
        body = json.loads(event.get("body", "{}"))
        count = body.get("count", 1)
        content_types = body.get("content_types", ["image/jpeg"] * count)
        google_maps_url = body.get("google_maps_url")

        # Validate input
        if count < 1 or count > 10:
            return error("count must be between 1 and 10", 400)

        if len(content_types) != count:
            return error("content_types length must match count", 400)

        # Generate run ID
        run_id = str(uuid.uuid4())
        bucket = os.environ.get("UPLOADS_BUCKET")

        if not bucket:
            return error("Server configuration error", 500)

        # Generate presigned URLs
        upload_urls = []
        keys = []

        for i, content_type in enumerate(content_types):
            # Determine file extension
            ext = "jpg"
            if "png" in content_type:
                ext = "png"
            elif "webp" in content_type:
                ext = "webp"

            key = f"{run_id}/{i}.{ext}"
            keys.append(key)

            # Generate presigned URL for PUT
            url = s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": bucket,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=3600,  # 1 hour
            )
            upload_urls.append(url)

        # Create run record in DynamoDB
        create_run(run_id, keys, google_maps_url)

        return success({
            "run_id": run_id,
            "upload_urls": upload_urls,
            "keys": keys,
        })

    except json.JSONDecodeError:
        return error("Invalid JSON in request body", 400)
    except Exception as e:
        print(f"Error: {str(e)}")
        return error("Internal server error", 500)
