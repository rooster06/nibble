output "api_gateway_url" {
  description = "API Gateway URL"
  value       = aws_api_gateway_deployment.main.invoke_url
}

output "uploads_bucket" {
  description = "S3 bucket for menu uploads"
  value       = aws_s3_bucket.uploads.id
}

output "cache_bucket" {
  description = "S3 bucket for cache"
  value       = aws_s3_bucket.cache.id
}

output "dynamodb_table" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.menu_runs.name
}
