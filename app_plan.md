# Nibble - Progressive Web App for food discovery

## Use case

Build a private, shareable Progressive Web app that turns a menu photo into a visual, vibe-aware ordering plan. You upload a picture of any restaurant menu, the app extracts the dishes, pulls representative photos of what each dish typically looks like (not necessarily from that restaurant), and then recommends what to order based on the occasion (date night vs friends), party size, dietary preferences, budget, and adventurousness. The output is dish cards with images plus a suggested order set (shareables/mains/dessert) tailored to your group.

## Nibble Engineering Implementation Plan

Stack: Next.js PWA on Vercel + AWS API Gateway/Lambda + S3 + DynamoDB (+ Secrets Manager) + Supabase Auth for magic links + allowlist.

⸻

1) Repo + environments
	1.	Create a monorepo:
	•	apps/web — Next.js PWA (Vercel)
	•	services/api — Lambda handlers (Python)
	•	infra/ — AWS IaC (CDK / Terraform / Serverless Framework)
	•	packages/shared — shared JSON schemas/types
	2.	Set up environments:
	•	dev (your sandbox)
	•	prod (the one you and your gf use)

⸻

2) Frontend (Vercel): PWA skeleton
	1.	Create Next.js app and deploy to Vercel.
	2.	Add PWA essentials:
	•	manifest.json (name: Nibble, icons, theme color)
	•	service worker (cache static assets + optionally last results)
	3.	Build the screens (wireframe first):
	•	Login
	•	Upload menu (multi-page) + preview thumbnails
	•	Extracted menu editor (quick edit dish names/descriptions)
	•	Dish cards (name + photos)
	•	Recommendations (vibe + party size + prefs → output)

Deliverable: end-to-end UI working with mocked API responses.

⸻

3) Auth (invite-only) + allowlist

Recommended: Supabase Auth (magic links) + allowlist table
	1.	Supabase:
	•	enable magic link sign-in
	2.	Add allowlist table:
	•	allowed_users(email primary key, role, created_at)
	3.	Enforce allowlist:
	•	Frontend calls POST /auth/request-link (your API)
	•	API checks allowed_users → if allowed, triggers Supabase OTP send
	4.	“request access” flow:
	•	access_requests(email, status, created_at)
	•	On denied login attempt: create pending request + notify you (email/Slack)
	•	Admin page: approve → adds to allowlist

Deliverable: only you + approved emails can use Nibble.

⸻

4) AWS core resources (infra)

Provision via IaC:
	1.	S3
	•	nibble-uploads (menu images)
	•	nibble-cache (cached extraction + dish image results)
	2.	DynamoDB
	•	menu_runs (run_id, user_id, created_at, status, page_keys…)
	•	dish_cache (dish_signature_hash → results, TTL)
	3.	Secrets Manager
	•	store keys for: image search API, LLM API, Supabase service key (if needed)
	4.	API Gateway
	•	routes for upload presign + extract + images + recommend
	5.	Lambda
	•	one Lambda per endpoint (or a single Lambda with a router)

Deliverable: a deployed backend you can hit from Vercel.

⸻

5) Upload pipeline (multi-page menus)
	1.	Frontend selects 1+ images.
	2.	Frontend requests presigned URLs:
	•	POST /uploads/presign { count, content_types }
	3.	Frontend uploads directly to S3.
	4.	Frontend creates a run:
	•	POST /menu/run/create { page_keys: [...] }
	•	DynamoDB stores run_id, pages, status = UPLOADED

Deliverable: menu photos stored, grouped by run.

⸻

6) Menu extraction (vision/OCR → JSON) + merge
	1.	Endpoint:
	•	POST /menu/extract { run_id }
	2.	For each page:
	•	run vision extraction → page_menu.json
	•	store per-page extraction to nibble-cache/run_id/page_i.json
	3.	Merge step:
	•	combine sections in page order
	•	dedupe repeated section headers and repeated dishes (fuzzy match on name+price)
	•	keep provenance: each dish stores source_page
	4.	Store merged output:
	•	nibble-cache/run_id/merged_menu.json
	•	update DynamoDB menu_runs.status = EXTRACTED

Deliverable: multi-page menu → clean, editable structured menu.

⸻

7) Dish query generation (so image search works well)

For each dish:
	1.	Create a dish_signature:
	•	name + key ingredients + section + cuisine hints
	2.	Generate 2–4 search queries:
	•	"{dish_name} dish"
	•	"{dish_name} {key_ingredients}"
	•	if very custom, lean on description: "{main ingredient} {style} dish"
	3.	Add language support:
	•	detect language → translate queries if needed

Deliverable: every menu item has strong search prompts.

⸻

8) Image retrieval + filtering + reranking
	1.	Endpoint:
	•	POST /menu/images { run_id }
	2.	For each dish (batched + parallel):
	•	call image search API for candidate images
	•	filter obvious junk (logos, menu scans, tiny images, duplicates)
	•	rerank candidates:
	•	simplest: LLM/VLM “is this dish X?” classifier on top N
	•	better: embedding similarity (dish text ↔ image embeddings)
	3.	Save results:
	•	dish_cache by dish_signature_hash (TTL ~30 days)
	•	also save under run_id for easy replay
	4.	Update run status: IMAGES_READY

Deliverable: dish cards populate with representative photos (generic ok).

⸻

9) Recommendations (LLM “what to order” planner)
	1.	Endpoint:
	•	POST /menu/recommend { run_id, vibe, group_size, prefs }
	2.	Prompt strategy:
	•	input: merged menu + prices + dietary constraints + vibe + group size
	•	output JSON:
	•	order_plan (shareables/mains/dessert counts)
	•	recommended_items[] with reason + who it’s for
	•	avoid[] with reason
	3.	Cache by preference signature:
	•	recommend_cache = hash(run_id + prefs)
	4.	Update run status: DONE

Deliverable: one tap → a coherent ordering plan tailored to the moment.

⸻

10) Frontend polish (make it feel “app-like”)
	1.	Menu editor UX:
	•	quick rename dish, delete junk lines, merge duplicates
	2.	Dish cards:
	•	3–5 images carousel
	•	“save” / “we ordered this” buttons (feeds future personalization)
	3.	Recommendation view:
	•	presets: Date / Friends / Family
	•	sliders: adventurousness, budget sensitivity
	4.	PWA:
	•	“Add to Home Screen” helper
	•	cache last run for spotty reception

⸻

11) Reliability + cost guardrails
	1.	Caching:
	•	per page extraction cache
	•	per dish image cache (TTL)
	•	per recommendation cache by prefs
	2.	Limits:
	•	max pages per run (e.g., 8)
	•	max dishes per run (e.g., 60)
	•	max images per dish (e.g., 5)
	3.	Observability:
	•	structured logs with run_id
	•	metrics: latency per step, cache hit rate, failures
	4.	Security:
	•	keys only in Secrets Manager
	•	S3 buckets private; access via presigned URLs

⸻

12) Nice-to-haves (later)
	•	User profiles (you vs gf preferences)
	•	“My favorites” + “Never again”
	•	Dish nutrition estimates (as an optional enrichment step)
	•	Async jobs (SQS/Step Functions) if you want progress bars for huge menus