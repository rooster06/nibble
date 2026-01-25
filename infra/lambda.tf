# IAM role for Lambda functions
resource "aws_iam_role" "lambda" {
  name = "${local.name_prefix}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda basic execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy for Lambda to access S3, DynamoDB, and Secrets Manager
resource "aws_iam_role_policy" "lambda_custom" {
  name = "${local.name_prefix}-lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.uploads.arn}/*",
          "${aws_s3_bucket.cache.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.uploads.arn,
          aws_s3_bucket.cache.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.menu_runs.arn,
          "${aws_dynamodb_table.menu_runs.arn}/index/*",
          aws_dynamodb_table.image_cache.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.openai.arn,
          aws_secretsmanager_secret.unsplash.arn,
          aws_secretsmanager_secret.serpapi.arn
        ]
      }
    ]
  })
}

# Lambda layer for dependencies
resource "aws_lambda_layer_version" "deps" {
  filename            = "${path.module}/../services/api/layer.zip"
  layer_name          = "${local.name_prefix}-deps"
  compatible_runtimes = ["python3.11"]

  lifecycle {
    create_before_destroy = true
  }
}

# Presign Lambda
resource "aws_lambda_function" "presign" {
  filename         = "${path.module}/../services/api/presign.zip"
  function_name    = "${local.name_prefix}-presign"
  role             = aws_iam_role.lambda.arn
  handler          = "handlers.presign.handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256
  source_code_hash = filebase64sha256("${path.module}/../services/api/presign.zip")

  layers = [aws_lambda_layer_version.deps.arn]

  environment {
    variables = {
      UPLOADS_BUCKET      = aws_s3_bucket.uploads.id
      DYNAMO_TABLE        = aws_dynamodb_table.menu_runs.name
      ENVIRONMENT         = var.environment
      SUPABASE_JWT_SECRET = var.supabase_jwt_secret
      SUPABASE_URL        = var.supabase_url
      FRONTEND_URL        = var.frontend_url
    }
  }
}

# Extract Lambda
resource "aws_lambda_function" "extract" {
  filename         = "${path.module}/../services/api/extract.zip"
  function_name    = "${local.name_prefix}-extract"
  role             = aws_iam_role.lambda.arn
  handler          = "handlers.extract.handler"
  runtime          = "python3.11"
  timeout          = 120
  memory_size      = 512
  source_code_hash = filebase64sha256("${path.module}/../services/api/extract.zip")

  layers = [aws_lambda_layer_version.deps.arn]

  environment {
    variables = {
      UPLOADS_BUCKET      = aws_s3_bucket.uploads.id
      CACHE_BUCKET        = aws_s3_bucket.cache.id
      DYNAMO_TABLE        = aws_dynamodb_table.menu_runs.name
      OPENAI_SECRET_ARN   = aws_secretsmanager_secret.openai.arn
      ENVIRONMENT         = var.environment
      SUPABASE_JWT_SECRET = var.supabase_jwt_secret
      SUPABASE_URL        = var.supabase_url
      FRONTEND_URL        = var.frontend_url
    }
  }
}

# Images Lambda
resource "aws_lambda_function" "images" {
  filename         = "${path.module}/../services/api/images.zip"
  function_name    = "${local.name_prefix}-images"
  role             = aws_iam_role.lambda.arn
  handler          = "handlers.images.handler"
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 256
  source_code_hash = filebase64sha256("${path.module}/../services/api/images.zip")

  layers = [aws_lambda_layer_version.deps.arn]

  environment {
    variables = {
      CACHE_BUCKET        = aws_s3_bucket.cache.id
      IMAGE_CACHE_TABLE   = aws_dynamodb_table.image_cache.name
      SERPAPI_SECRET      = aws_secretsmanager_secret.serpapi.arn
      ENVIRONMENT         = var.environment
      SUPABASE_JWT_SECRET = var.supabase_jwt_secret
      SUPABASE_URL        = var.supabase_url
      FRONTEND_URL        = var.frontend_url
    }
  }
}

# Recommend Lambda
resource "aws_lambda_function" "recommend" {
  filename         = "${path.module}/../services/api/recommend.zip"
  function_name    = "${local.name_prefix}-recommend"
  role             = aws_iam_role.lambda.arn
  handler          = "handlers.recommend.handler"
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 256
  source_code_hash = filebase64sha256("${path.module}/../services/api/recommend.zip")

  layers = [aws_lambda_layer_version.deps.arn]

  environment {
    variables = {
      CACHE_BUCKET        = aws_s3_bucket.cache.id
      DYNAMO_TABLE        = aws_dynamodb_table.menu_runs.name
      OPENAI_SECRET_ARN   = aws_secretsmanager_secret.openai.arn
      ENVIRONMENT         = var.environment
      SUPABASE_JWT_SECRET = var.supabase_jwt_secret
      SUPABASE_URL        = var.supabase_url
      FRONTEND_URL        = var.frontend_url
    }
  }
}

# Menu GET Lambda (for fetching menu data)
resource "aws_lambda_function" "menu_get" {
  filename         = "${path.module}/../services/api/menu_get.zip"
  function_name    = "${local.name_prefix}-menu-get"
  role             = aws_iam_role.lambda.arn
  handler          = "handlers.menu_get.handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256
  source_code_hash = filebase64sha256("${path.module}/../services/api/menu_get.zip")

  layers = [aws_lambda_layer_version.deps.arn]

  environment {
    variables = {
      CACHE_BUCKET        = aws_s3_bucket.cache.id
      DYNAMO_TABLE        = aws_dynamodb_table.menu_runs.name
      ENVIRONMENT         = var.environment
      SUPABASE_JWT_SECRET = var.supabase_jwt_secret
      SUPABASE_URL        = var.supabase_url
      FRONTEND_URL        = var.frontend_url
    }
  }
}

# Reviews Lambda (for fetching Google Maps reviews)
resource "aws_lambda_function" "reviews" {
  filename         = "${path.module}/../services/api/reviews.zip"
  function_name    = "${local.name_prefix}-reviews"
  role             = aws_iam_role.lambda.arn
  handler          = "handlers.reviews.handler"
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 256
  source_code_hash = filebase64sha256("${path.module}/../services/api/reviews.zip")

  layers = [aws_lambda_layer_version.deps.arn]

  environment {
    variables = {
      CACHE_BUCKET        = aws_s3_bucket.cache.id
      DYNAMO_TABLE        = aws_dynamodb_table.menu_runs.name
      SERPAPI_SECRET      = aws_secretsmanager_secret.serpapi.arn
      OPENAI_SECRET_ARN   = aws_secretsmanager_secret.openai.arn
      ENVIRONMENT         = var.environment
      SUPABASE_JWT_SECRET = var.supabase_jwt_secret
      SUPABASE_URL        = var.supabase_url
      FRONTEND_URL        = var.frontend_url
    }
  }
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "presign" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.presign.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "extract" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.extract.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "images" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.images.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "recommend" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.recommend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "menu_get" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.menu_get.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "reviews" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.reviews.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}
