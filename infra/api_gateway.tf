# API Gateway REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "${local.name_prefix}-api"
  description = "Nibble Menu API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# /uploads resource
resource "aws_api_gateway_resource" "uploads" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "uploads"
}

# /uploads/presign resource
resource "aws_api_gateway_resource" "presign" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.uploads.id
  path_part   = "presign"
}

# /menu resource
resource "aws_api_gateway_resource" "menu" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "menu"
}

# /menu/{runId} resource
resource "aws_api_gateway_resource" "menu_run" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.menu.id
  path_part   = "{runId}"
}

# /menu/extract resource
resource "aws_api_gateway_resource" "extract" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.menu.id
  path_part   = "extract"
}

# /menu/images resource
resource "aws_api_gateway_resource" "images" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.menu.id
  path_part   = "images"
}

# /menu/recommend resource
resource "aws_api_gateway_resource" "recommend" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.menu.id
  path_part   = "recommend"
}

# /menu/reviews resource
resource "aws_api_gateway_resource" "reviews" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.menu.id
  path_part   = "reviews"
}

# POST /uploads/presign
resource "aws_api_gateway_method" "presign_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.presign.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "presign" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.presign.id
  http_method             = aws_api_gateway_method.presign_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.presign.invoke_arn
}

# POST /menu/extract
resource "aws_api_gateway_method" "extract_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.extract.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "extract" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.extract.id
  http_method             = aws_api_gateway_method.extract_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.extract.invoke_arn
}

# POST /menu/images
resource "aws_api_gateway_method" "images_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.images.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "images" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.images.id
  http_method             = aws_api_gateway_method.images_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.images.invoke_arn
}

# POST /menu/recommend
resource "aws_api_gateway_method" "recommend_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.recommend.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "recommend" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.recommend.id
  http_method             = aws_api_gateway_method.recommend_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.recommend.invoke_arn
}

# GET /menu/{runId}
resource "aws_api_gateway_method" "menu_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.menu_run.id
  http_method   = "GET"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.runId" = true
  }
}

resource "aws_api_gateway_integration" "menu_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.menu_run.id
  http_method             = aws_api_gateway_method.menu_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.menu_get.invoke_arn
}

# POST /menu/reviews
resource "aws_api_gateway_method" "reviews_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.reviews.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "reviews" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.reviews.id
  http_method             = aws_api_gateway_method.reviews_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.reviews.invoke_arn
}

# CORS configuration for all endpoints
module "cors_presign" {
  source  = "./modules/cors"

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.presign.id
  origin      = var.frontend_url
}

module "cors_extract" {
  source  = "./modules/cors"

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.extract.id
  origin      = var.frontend_url
}

module "cors_images" {
  source  = "./modules/cors"

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.images.id
  origin      = var.frontend_url
}

module "cors_recommend" {
  source  = "./modules/cors"

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.recommend.id
  origin      = var.frontend_url
}

module "cors_menu_run" {
  source  = "./modules/cors"

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.menu_run.id
  origin      = var.frontend_url
}

module "cors_reviews" {
  source  = "./modules/cors"

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.reviews.id
  origin      = var.frontend_url
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_integration.presign,
    aws_api_gateway_integration.extract,
    aws_api_gateway_integration.images,
    aws_api_gateway_integration.recommend,
    aws_api_gateway_integration.menu_get,
    aws_api_gateway_integration.reviews,
    module.cors_presign,
    module.cors_extract,
    module.cors_images,
    module.cors_recommend,
    module.cors_menu_run,
    module.cors_reviews
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = var.environment

  lifecycle {
    create_before_destroy = true
  }
}
