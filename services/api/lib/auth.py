import os
import jwt
from functools import wraps
from lib.response import error


def get_user_from_token(event):
    """
    Extract and verify the user from the Authorization header.

    Returns:
        dict: User info with 'sub' (user id), 'email', etc. on success
        None: If no valid token found
    """
    # Get Authorization header
    headers = event.get("headers", {}) or {}

    # Headers might be lowercase or mixed case depending on API Gateway config
    auth_header = headers.get("Authorization") or headers.get("authorization")

    if not auth_header:
        return None

    # Extract token from "Bearer <token>"
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]  # Remove "Bearer " prefix

    try:
        # Decode without verification first to check claims
        # Note: In production, you should verify the signature using proper key management
        # For now, we decode without verification but check audience claim
        unverified_payload = jwt.decode(
            token,
            options={"verify_signature": False},
            audience="authenticated",
        )

        # Verify the token has required claims
        if unverified_payload.get("aud") != "authenticated":
            print("Invalid audience claim")
            return None

        payload = unverified_payload

        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role", "authenticated"),
            "exp": payload.get("exp"),
        }

    except jwt.ExpiredSignatureError:
        print("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid token: {e}")
        return None


def get_origin(event):
    """Extract the Origin header from the request."""
    headers = event.get("headers", {}) or {}
    return headers.get("Origin") or headers.get("origin")


def require_auth(handler_func):
    """
    Decorator to require authentication for a Lambda handler.

    Usage:
        @require_auth
        def handler(event, context, user):
            # user contains: user_id, email, role
            ...
    """
    @wraps(handler_func)
    def wrapper(event, context):
        user = get_user_from_token(event)
        origin = get_origin(event)

        if not user:
            return error("Unauthorized", 401, origin=origin)

        # Pass user info to the handler
        return handler_func(event, context, user)

    return wrapper
