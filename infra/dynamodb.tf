# DynamoDB table for menu runs
resource "aws_dynamodb_table" "menu_runs" {
  name         = "${local.name_prefix}-menu-runs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "run_id"

  attribute {
    name = "run_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  global_secondary_index {
    name            = "created_at_index"
    hash_key        = "created_at"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name = "${local.name_prefix}-menu-runs"
  }
}

# DynamoDB table for image cache
resource "aws_dynamodb_table" "image_cache" {
  name         = "${local.name_prefix}-image-cache"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "dish_hash"

  attribute {
    name = "dish_hash"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name = "${local.name_prefix}-image-cache"
  }
}
