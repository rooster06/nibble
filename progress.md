# Nibble - Development Progress

**Last Updated**: 2026-01-23

## Project Overview

Nibble is a Progressive Web App that turns menu photos into visual, vibe-aware ordering plans. Users upload restaurant menus, the app extracts dishes using AI vision, retrieves representative photos, and provides personalized ordering recommendations.

**Tech Stack**:
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS (Vercel)
- **Backend**: Python 3.11, AWS Lambda, API Gateway
- **Storage**: S3 (images/cache), DynamoDB (runs/cache)
- **AI**: OpenAI GPT-4o Vision (extraction + recommendations), Google Custom Search (dish images)
- **Infrastructure**: Terraform

---

## Completion Status

### Phase 1: Repo + Environments
| Task | Status | Notes |
|------|--------|-------|
| Monorepo structure | Done | apps/web, services/api, infra/, packages/shared |
| pnpm workspace config | Done | pnpm-workspace.yaml configured |
| Environment separation | Done | Terraform supports `environment` variable (dev/prod) |

### Phase 2: Frontend - PWA Skeleton
| Task | Status | Notes |
|------|--------|-------|
| Next.js app created | Done | Next.js 14 with App Router |
| PWA manifest.json | Done | Name, icons, theme color configured |
| Service worker | **Not Started** | Need to add for offline caching |
| Login screen | **Not Started** | Awaiting Supabase auth integration |
| Upload menu screen | Done | MenuUpload.tsx with drag-drop, multi-image |
| Extracted menu editor | **Partial** | Display works; editing UI not implemented |
| Dish cards | Done | DishCard.tsx with image carousel, dietary tags |
| Recommendations view | Done | RecommendationView.tsx with full preferences form |

### Phase 3: Auth (Invite-Only) + Allowlist
| Task | Status | Notes |
|------|--------|-------|
| Supabase project setup | **Not Started** | - |
| Magic link sign-in | **Not Started** | - |
| Allowlist table | **Not Started** | allowed_users(email, role, created_at) |
| Enforce allowlist in API | **Not Started** | POST /auth/request-link endpoint |
| Access request flow | **Not Started** | access_requests table |
| Admin approval page | **Not Started** | - |

### Phase 4: AWS Core Resources
| Task | Status | Notes |
|------|--------|-------|
| S3 buckets | Done | nibble-uploads, nibble-cache with lifecycle rules |
| DynamoDB tables | Done | menu-runs (7-day TTL), image-cache (30-day TTL) |
| Secrets Manager | Done | OpenAI, Google API keys |
| API Gateway | Done | REST API with 5 endpoints |
| Lambda functions | Done | presign, extract, menu_get, images, recommend |
| Lambda layer | Done | Python dependencies packaged |
| IAM roles/policies | Done | S3, DynamoDB, Secrets Manager, CloudWatch access |

### Phase 5: Upload Pipeline
| Task | Status | Notes |
|------|--------|-------|
| Frontend multi-image select | Done | Up to 10 images with previews |
| POST /uploads/presign | Done | Returns presigned URLs + run_id |
| Direct S3 upload | Done | Frontend uploads with PUT |
| Run creation in DynamoDB | Done | Status tracking (UPLOADED → ...) |

### Phase 6: Menu Extraction
| Task | Status | Notes |
|------|--------|-------|
| POST /menu/extract | Done | GPT-4o Vision extraction |
| Per-page extraction | Done | Handles multi-page menus |
| Merge step | **Partial** | Basic merge; deduplication not robust |
| Cache to S3 | Done | nibble-cache/run_id/merged_menu.json |
| GET /menu/{runId} | Done | Retrieve cached menu |

### Phase 7: Dish Query Generation
| Task | Status | Notes |
|------|--------|-------|
| Dish signature creation | **Partial** | Uses dish name only |
| Search query generation | **Partial** | Simple "{dish_name} food photo" |
| Language detection/translation | **Not Started** | - |

### Phase 8: Image Retrieval
| Task | Status | Notes |
|------|--------|-------|
| POST /menu/images | Done | Google Custom Search integration |
| Image filtering | **Partial** | Google API filters; no custom filtering |
| Reranking (LLM/embeddings) | **Not Started** | Currently uses raw search results |
| Per-dish caching | Done | DynamoDB with 30-day TTL |
| Run status update | Done | IMAGES_READY status |

### Phase 9: Recommendations
| Task | Status | Notes |
|------|--------|-------|
| POST /menu/recommend | Done | GPT-4o recommendations |
| Vibe presets | Done | date_night, friends, family, business |
| Group size | Done | 1-20 people |
| Dietary preferences | Done | vegetarian, vegan, gluten_free, dairy_free, nut_free |
| Budget sensitivity | Done | low, moderate, high |
| Adventurousness | Done | low, medium, high |
| Order plan output | Done | shareables/mains/dessert counts + reasoning |
| Cache by preferences | Done | MD5 hash of preferences |

### Phase 10: Frontend Polish
| Task | Status | Notes |
|------|--------|-------|
| Menu editor UX | **Not Started** | Rename, delete, merge dishes |
| Dish cards carousel | Done | 3-5 images with navigation |
| Save/ordered buttons | **Not Started** | For future personalization |
| PWA "Add to Home Screen" | **Not Started** | Helper prompt |
| Offline caching | **Not Started** | Service worker for last run |

### Phase 11: Reliability + Cost Guardrails
| Task | Status | Notes |
|------|--------|-------|
| Per-page extraction cache | Done | S3 cache |
| Per-dish image cache | Done | DynamoDB with TTL |
| Per-recommendation cache | Done | DynamoDB/S3 |
| Max pages limit | Done | 10 pages |
| Max dishes limit | **Not Enforced** | Should add |
| Max images per dish | Done | 5 images |
| Structured logging | **Partial** | Basic print statements |
| Metrics/observability | **Not Started** | - |
| Security (keys in Secrets Manager) | Done | - |
| S3 private + presigned URLs | Done | - |

### Phase 12: Nice-to-Haves
| Task | Status | Notes |
|------|--------|-------|
| User profiles | **Not Started** | - |
| My favorites | **Not Started** | - |
| Never again list | **Not Started** | - |
| Nutrition estimates | **Not Started** | - |
| Async jobs (SQS/Step Functions) | **Not Started** | - |

---

## Current Codebase Structure

```
nibble/
├── apps/web/                   # Next.js 14 PWA
│   ├── app/                    # App Router pages
│   │   ├── page.tsx            # Home with MenuUpload
│   │   └── menu/[runId]/       # Menu browse + recommend
│   ├── components/             # React components
│   │   ├── MenuUpload.tsx
│   │   ├── DishCard.tsx
│   │   └── RecommendationView.tsx
│   ├── lib/api.ts              # API client
│   └── public/manifest.json    # PWA manifest
├── services/api/               # Python Lambda handlers
│   ├── handlers/               # Lambda entry points
│   │   ├── presign.py
│   │   ├── extract.py
│   │   ├── menu_get.py
│   │   ├── images.py
│   │   └── recommend.py
│   └── lib/                    # Shared Python modules
│       ├── openai_client.py
│       ├── google_search.py
│       ├── dynamo.py
│       ├── secrets.py
│       └── response.py
├── infra/                      # Terraform IaC
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── modules/                # API Gateway, CORS, etc.
├── packages/shared/            # JSON schemas
│   ├── menu.json
│   └── recommendation.json
├── package.json
├── pnpm-workspace.yaml
├── app_plan.md
└── progress.md                 # This file
```

---

## Next Steps (Recommended Priority)

### High Priority
1. **Deploy & Test End-to-End**
   - Run `terraform apply` to provision AWS resources
   - Deploy frontend to Vercel
   - Test complete flow: upload → extract → images → recommend

2. **Add Service Worker for PWA**
   - Implement offline caching for last menu run
   - Add install prompt

3. **Implement Menu Editor**
   - Allow renaming dishes
   - Delete incorrect extractions
   - Merge duplicate items

### Medium Priority
4. **Add Supabase Auth**
   - Set up Supabase project
   - Implement magic link flow
   - Add allowlist enforcement

5. **Improve Image Quality**
   - Better search queries (ingredients, cuisine type)
   - Add LLM/VLM reranking for relevance

6. **Add Logging & Monitoring**
   - CloudWatch structured logs
   - Latency metrics per endpoint

### Lower Priority
7. **User Profiles & Personalization**
   - Track ordered dishes
   - Save favorites
   - Remember dietary preferences

---

## Known Issues

1. **Menu extraction** sometimes includes non-dish items (section headers, notes)
2. **Dish images** occasionally return irrelevant results for uncommon dishes
3. **No input validation** on frontend for edge cases
4. **No error recovery** - if extraction fails, user must start over

---

## Environment Setup Notes

### Local Development
```bash
# Frontend
cd apps/web && pnpm install && pnpm dev

# Infrastructure (requires AWS credentials)
cd infra && terraform init && terraform plan
```

### Required Secrets (for Terraform)
- `openai_api_key` - OpenAI API key
- `google_api_key` - Google Cloud API key (Custom Search enabled)
- `google_cse_id` - Google Custom Search Engine ID

### Environment Variables (Frontend)
- `NEXT_PUBLIC_API_URL` - API Gateway endpoint URL

---

## Session Notes

### 2026-01-23
- Initial progress assessment
- All core Lambda handlers implemented (presign, extract, menu_get, images, recommend)
- Frontend has working upload, dish cards, and recommendation views
- Terraform infrastructure fully defined
- Auth (Supabase) not yet started
- Service worker for offline PWA not implemented
- Menu editing UI not implemented
