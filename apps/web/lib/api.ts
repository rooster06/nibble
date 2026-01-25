import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export interface PresignResponse {
  run_id: string;
  upload_urls: string[];
  keys: string[];
}

export interface Dish {
  name: string;
  description: string | null;
  price: number | null;
  dietary: string[];
  images?: string[];
}

export interface MenuSection {
  name: string;
  dishes: Dish[];
}

export interface Menu {
  restaurant_name: string | null;
  sections: MenuSection[];
}

export interface ExtractResponse {
  run_id: string;
  status?: string;
  menu?: Menu;
  error?: string;
}

export interface RecommendationPlan {
  shareables: number;
  mains: number;
  dessert: number;
  reasoning?: string;
}

export interface Recommendation {
  dish: string;
  category: "shareable" | "main" | "dessert";
  reason: string;
  for_whom?: string;
}

export interface AvoidDish {
  dish: string;
  reason: string;
}

export interface RecommendResponse {
  plan: RecommendationPlan;
  recommendations: Recommendation[];
  avoid: AvoidDish[];
}

export interface RecommendRequest {
  run_id: string;
  vibe: string;
  group_size: number;
  prefs: {
    dietary: string[];
    adventurousness: "low" | "medium" | "high";
    budget: "low" | "moderate" | "high";
  };
}

export interface ImagesResponse {
  dishes: Array<{
    name: string;
    images: string[];
  }>;
}

export interface ReviewMention {
  dish: string;
  quote: string;
}

export interface ReviewsResponse {
  mentions: ReviewMention[];
  review_count: number;
  message?: string;
  error?: string;
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

export async function getPresignedUrls(
  count: number,
  contentTypes: string[],
  googleMapsUrl?: string
): Promise<PresignResponse> {
  return fetchAPI<PresignResponse>("/uploads/presign", {
    method: "POST",
    body: JSON.stringify({
      count,
      content_types: contentTypes,
      google_maps_url: googleMapsUrl,
    }),
  });
}

export async function extractMenu(runId: string): Promise<ExtractResponse> {
  return fetchAPI<ExtractResponse>("/menu/extract", {
    method: "POST",
    body: JSON.stringify({ run_id: runId }),
  });
}

export async function getMenuImages(runId: string): Promise<ImagesResponse> {
  return fetchAPI<ImagesResponse>("/menu/images", {
    method: "POST",
    body: JSON.stringify({ run_id: runId }),
  });
}

export async function getRecommendations(
  request: RecommendRequest
): Promise<RecommendResponse> {
  return fetchAPI<RecommendResponse>("/menu/recommend", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getMenuData(runId: string): Promise<ExtractResponse> {
  return fetchAPI<ExtractResponse>(`/menu/${runId}`, {
    method: "GET",
  });
}

export async function getReviews(runId: string, googleMapsUrl?: string): Promise<ReviewsResponse> {
  return fetchAPI<ReviewsResponse>("/menu/reviews", {
    method: "POST",
    body: JSON.stringify({
      run_id: runId,
      google_maps_url: googleMapsUrl,
    }),
  });
}
