import json
import os
from typing import Any, Dict, Optional

# Get allowed origin from environment, default to localhost for dev
ALLOWED_ORIGIN = os.environ.get("FRONTEND_URL", "http://localhost:3000")


def cors_headers(origin: str = None) -> Dict[str, str]:
    """Return CORS headers for API Gateway responses."""
    return {
        "Access-Control-Allow-Origin": origin or ALLOWED_ORIGIN,
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    }


def success(body: Any, status_code: int = 200, origin: str = None) -> Dict[str, Any]:
    """Return a successful API Gateway response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            **cors_headers(origin),
        },
        "body": json.dumps(body),
    }


def error(
    message: str,
    status_code: int = 400,
    origin: str = None,
    details: Optional[Dict] = None,
) -> Dict[str, Any]:
    """Return an error API Gateway response."""
    body = {"error": message}
    if details:
        body["details"] = details

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            **cors_headers(origin),
        },
        "body": json.dumps(body),
    }
