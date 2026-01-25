# Nibble - Smart Menu Assistant

Upload a menu photo, get personalized dish recommendations for any occasion.

## Architecture

- **Frontend**: Next.js 14 (App Router) PWA on Vercel + Tailwind CSS
- **Backend**: AWS Lambda (Python) + API Gateway
- **Storage**: S3 (uploads + cache)
- **Database**: DynamoDB
- **IaC**: Terraform
- **APIs**: OpenAI GPT-4o (vision + recommendations), Google Custom Search

## Project Structure

```
nibble/
├── apps/web/                   # Next.js PWA
├── services/api/               # Lambda handlers (Python)
├── infra/                      # Terraform infrastructure
└── packages/shared/            # Shared schemas
```

## Prerequisites

1. **Node.js** >= 18
2. **pnpm** - Install with `npm install -g pnpm`
3. **Python** >= 3.11
4. **Terraform** >= 1.0
5. **AWS CLI** configured with credentials

## API Keys Setup

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Save it for Terraform deployment

### Google Custom Search Setup
1. Create a Programmable Search Engine at https://programmablesearchengine.google.com/
2. Select "Search the entire web"
3. Copy the Search engine ID (cx parameter)
4. Enable Custom Search API at https://console.cloud.google.com/
5. Create an API key and restrict to Custom Search API

## Quick Start

### 1. Install Dependencies

```bash
# Install frontend dependencies
pnpm install

# Install Python dependencies (for local testing)
cd services/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Deploy Infrastructure

```bash
cd infra

# Copy and fill in your values
cp example.tfvars terraform.tfvars

# Initialize Terraform
terraform init

# Build Lambda packages
cd ../services/api
./build.sh
cd ../../infra

# Deploy
terraform apply
```

### 3. Configure Frontend

```bash
# Copy the API Gateway URL from Terraform output
cd apps/web
echo "NEXT_PUBLIC_API_URL=https://xxx.execute-api.us-east-1.amazonaws.com/dev" > .env.local
```

### 4. Run Frontend Locally

```bash
pnpm dev
```

### 5. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd apps/web
vercel

# Set environment variable in Vercel dashboard
# NEXT_PUBLIC_API_URL = your API Gateway URL
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/uploads/presign` | POST | Get presigned S3 URLs for upload |
| `/menu/extract` | POST | Extract dishes from menu images |
| `/menu/{runId}` | GET | Get extracted menu data |
| `/menu/images` | POST | Fetch dish images |
| `/menu/recommend` | POST | Get ordering recommendations |

## Development

### Frontend

```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm lint       # Run linter
```

### Lambda Functions

```bash
cd services/api
./build.sh      # Build deployment packages
```

### Infrastructure

```bash
cd infra
terraform plan  # Preview changes
terraform apply # Apply changes
```

## Environment Variables

### Frontend (Vercel)
- `NEXT_PUBLIC_API_URL` - API Gateway URL

### Lambda (via Secrets Manager)
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_API_KEY` - Google Custom Search API key
- `GOOGLE_CSE_ID` - Google Custom Search Engine ID

## License

MIT
