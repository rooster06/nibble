# Image Search Implementation Decisions

This document tracks the various image search APIs we evaluated for fetching dish images in Nibble, along with the reasons each was accepted or rejected.

## Requirements

- Search for images of restaurant dishes by name (often in Spanish or other languages)
- Return high-quality images of **prepared/plated dishes** (not raw ingredients)
- Support international/ethnic cuisine names (e.g., "POLLO AL CARBÓN", "PAD THAI")
- Reasonable cost and API reliability

---

## Approaches Evaluated

### 1. Google Custom Search API
**Status:** Rejected

**Reason:** API access issues. Received persistent 403 Forbidden errors with message "This project does not have the access to Custom Search JSON API" even after enabling the API in Google Cloud Console and regenerating API keys multiple times.

**Notes:** Google Custom Search JSON API requires:
- Creating a Programmable Search Engine
- Enabling "Image Search" in the engine settings
- Enabling the API in Google Cloud Console
- Proper billing setup

The configuration complexity and persistent access issues made this impractical.

---

### 2. Bing Image Search API
**Status:** Rejected

**Reason:** Same API access/authentication issues as Google Custom Search. Azure Cognitive Services setup had similar friction with subscription and key management.

---

### 3. Google Vertex AI Search
**Status:** Rejected

**Reason:** Requires domains/data stores to be pre-indexed and maintained. This is designed for searching your own content, not the open web. Would need to:
- Create and maintain a data store
- Index specific domains containing food images
- Ongoing maintenance to keep the index fresh

Not suitable for searching arbitrary dish images across the web.

---

### 4. Unsplash API
**Status:** Rejected

**Reason:** Limited coverage for ethnic/regional dishes. Unsplash is primarily generic stock photography. Searches for specific dishes like "POLLO AL CARBÓN" returned:
- Raw chicken images instead of prepared dishes
- Generic grilled chicken that didn't match the specific cuisine
- Unrelated food photos

Even with GPT-4o vision to select the best image from results, the candidate pool was too poor to find relevant matches.

**Pros:**
- Free tier available
- Simple API
- High-quality images when they exist

**Cons:**
- Poor coverage of international cuisine
- Stock photo aesthetic doesn't match real restaurant dishes

---

### 5. SerpAPI (Google Images)
**Status:** Selected

**Reason:** Provides access to actual Google Image search results, which has the best coverage of specific dishes across all cuisines. Combined with GPT-4o vision to select the most relevant image from candidates.

**Implementation:**
1. Search Google Images via SerpAPI with dish name
2. Retrieve ~10 candidate images
3. Pass candidates to GPT-4o vision
4. GPT selects the image that best shows the prepared/plated dish
5. Cache the selected image for future requests

**Pros:**
- Best coverage of international/ethnic dishes
- Real food photos from recipes, restaurants, food blogs
- Reliable API with good documentation

**Cons:**
- Paid service (usage-based pricing)
- Thumbnails may have lower resolution
- Dependent on Google's image index

---

## Final Architecture

```
Dish Name (e.g., "POLLO AL CARBÓN")
        │
        ▼
┌─────────────────┐
│  Check Cache    │ ──► If cached, return immediately
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SerpAPI        │ ──► Google Images search
│  (10 results)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GPT-4o Vision  │ ──► Select best prepared dish image
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Cache Result   │ ──► DynamoDB for future requests
└────────┬────────┘
         │
         ▼
    Return Image URL
```

---

## Cost Considerations

- **SerpAPI:** ~$50/month for 5,000 searches (scales with usage)
- **Caching:** Minimizes repeat API calls for same dishes

With caching, costs are primarily driven by unique dish names rather than total requests.

---

## Product Design Decisions

### GPT Vision Re-ranking: Rejected

**Decision:** Rely on Google's image ranking from SerpAPI instead of using GPT-4o Vision to re-rank/select images.

**Context:** We initially implemented GPT-4o Vision to analyze candidate images and select the ones that best showed the prepared dish (filtering out raw ingredients, cooking processes, or unrelated food).

**Why we rejected GPT re-ranking:**

1. **Redundant quality signal** - Google Images already ranks results by relevance. For a query like "POLLO AL CARBÓN food", Google's algorithm considers image context, source quality, and visual relevance.

2. **Added latency** - Each GPT-4o Vision call added 3-7 seconds per dish. With 10+ dishes on a menu, this caused API Gateway timeouts (29-second limit).

3. **Cost** - GPT-4o Vision calls cost ~$0.01-0.02 per dish. For a menu with 20 dishes, that's $0.20-0.40 per menu scan, adding up quickly at scale.

4. **Marginal improvement** - In testing, Google's top results were generally appropriate. The GPT re-ranking didn't provide enough quality improvement to justify the cost and latency.

**Current approach:**
- Search SerpAPI with `{dish_name} food` query
- Return top 5 images as ranked by Google
- Cache results in DynamoDB

**When to reconsider:**
- If users report consistently poor image quality
- If we need to filter specific image types (e.g., only professional photos)
- If latency/cost constraints change significantly

---

## Final Architecture (Simplified)

```
Dish Name (e.g., "POLLO AL CARBÓN")
        │
        ▼
┌─────────────────┐
│  Check Cache    │ ──► If cached, return immediately
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SerpAPI        │ ──► Google Images search "{dish} food"
│  (top 5 results)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Cache Result   │ ──► DynamoDB for future requests
└────────┬────────┘
         │
         ▼
    Return Image URLs
```
