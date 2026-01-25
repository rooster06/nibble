# Secrets Manager for API keys
resource "aws_secretsmanager_secret" "openai" {
  name                    = "${local.name_prefix}/openai-api-key"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "openai" {
  secret_id     = aws_secretsmanager_secret.openai.id
  secret_string = var.openai_api_key
}

resource "aws_secretsmanager_secret" "unsplash" {
  name                    = "${local.name_prefix}/unsplash-api-key"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "unsplash" {
  secret_id     = aws_secretsmanager_secret.unsplash.id
  secret_string = var.unsplash_api_key
}

resource "aws_secretsmanager_secret" "serpapi" {
  name                    = "${local.name_prefix}/serpapi-key"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "serpapi" {
  secret_id     = aws_secretsmanager_secret.serpapi.id
  secret_string = var.serpapi_key
}
