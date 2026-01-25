import os
import boto3
import json
from functools import lru_cache

secrets_client = boto3.client("secretsmanager")


@lru_cache(maxsize=10)
def get_secret(secret_arn: str) -> str:
    """Get a secret value from Secrets Manager (cached)."""
    response = secrets_client.get_secret_value(SecretId=secret_arn)
    return response["SecretString"]


def get_openai_api_key() -> str:
    """Get the OpenAI API key."""
    secret_arn = os.environ.get("OPENAI_SECRET_ARN")
    if not secret_arn:
        raise ValueError("OPENAI_SECRET_ARN environment variable not set")
    return get_secret(secret_arn)


def get_unsplash_api_key() -> str:
    """Get the Unsplash API key."""
    secret_arn = os.environ.get("UNSPLASH_API_SECRET")
    if not secret_arn:
        raise ValueError("UNSPLASH_API_SECRET environment variable not set")
    return get_secret(secret_arn)


def get_serpapi_key() -> str:
    """Get the SerpAPI key."""
    secret_arn = os.environ.get("SERPAPI_SECRET")
    if not secret_arn:
        raise ValueError("SERPAPI_SECRET environment variable not set")
    return get_secret(secret_arn)
