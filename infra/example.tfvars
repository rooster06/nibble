# Example Terraform variables
# Copy this file to terraform.tfvars and fill in your values

aws_region   = "us-east-1"
environment  = "dev"
frontend_url = "http://localhost:3000"

# API Keys - get these from:
# OpenAI: https://platform.openai.com/api-keys
# Google: https://console.cloud.google.com/apis/credentials
# Google CSE: https://programmablesearchengine.google.com/

openai_api_key = "sk-..."
google_api_key = "AIza..."
google_cse_id  = "..."
