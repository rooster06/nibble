"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getMenuData,
  getMenuImages,
  getRecommendations,
  getReviews,
  Menu,
  ImagesResponse,
  RecommendResponse,
  ReviewsResponse,
} from "@/lib/api";
import RecommendationView from "@/components/RecommendationView";

type LoadState = "idle" | "loading" | "loaded" | "error";

export default function RecommendPage() {
  const params = useParams();
  const runId = params.runId as string;

  const [menu, setMenu] = useState<Menu | null>(null);
  const [images, setImages] = useState<ImagesResponse | null>(null);
  const [reviews, setReviews] = useState<ReviewsResponse | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendResponse | null>(null);
  const [menuState, setMenuState] = useState<LoadState>("loading");
  const [recState, setRecState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Preference state
  const [vibe, setVibe] = useState("date_night");
  const [groupSize, setGroupSize] = useState(2);
  const [dietary, setDietary] = useState<string[]>([]);
  const [adventurousness, setAdventurousness] = useState<"low" | "medium" | "high">("medium");
  const [budget, setBudget] = useState<"low" | "moderate" | "high">("moderate");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");

  useEffect(() => {
    async function loadMenu() {
      try {
        const data = await getMenuData(runId);
        setMenu(data.menu ?? null);
        setMenuState("loaded");
      } catch (err) {
        setMenuState("error");
        setError(err instanceof Error ? err.message : "Failed to load menu");
      }
    }

    async function loadImages() {
      try {
        const data = await getMenuImages(runId);
        setImages(data);
      } catch {
        // Images are optional
      }
    }

    loadMenu();
    loadImages();
  }, [runId]);

  const handleGetRecommendations = async () => {
    console.log("Getting recommendations...", { runId, vibe, groupSize, dietary, adventurousness, budget, googleMapsUrl });
    setRecState("loading");
    setRecommendations(null);
    setReviews(null);
    setError(null);

    try {
      // Fetch recommendations and reviews in parallel
      const [recData, reviewData] = await Promise.all([
        getRecommendations({
          run_id: runId,
          vibe,
          group_size: groupSize,
          prefs: {
            dietary,
            adventurousness,
            budget,
          },
        }),
        googleMapsUrl ? getReviews(runId, googleMapsUrl) : Promise.resolve(null),
      ]);

      console.log("Recommendations received:", recData);
      console.log("Reviews received:", reviewData);
      setRecommendations(recData);
      setReviews(reviewData);
      setRecState("loaded");
    } catch (err) {
      console.error("Error getting recommendations:", err);
      setRecState("error");
      setError(err instanceof Error ? err.message : "Failed to get recommendations");
    }
  };

  if (menuState === "loading") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (menuState === "error" || !menu) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
          {error || "Failed to load menu"}
        </div>
        <Link href="/" className="mt-4 inline-block text-primary-600 hover:underline">
          Upload a new menu
        </Link>
      </div>
    );
  }

  const dishImages: Record<string, string[]> = {};
  if (images?.dishes) {
    images.dishes.forEach((d) => {
      dishImages[d.name] = d.images;
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/menu/${runId}`}
          className="text-primary-600 hover:underline flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to menu
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Get Recommendations
      </h1>

      {recState === "error" && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error || "Failed to get recommendations. Please try again."}
        </div>
      )}

      <RecommendationView
        menu={menu}
        dishImages={dishImages}
        reviews={reviews}
        recommendations={recommendations}
        loading={recState === "loading"}
        vibe={vibe}
        setVibe={setVibe}
        groupSize={groupSize}
        setGroupSize={setGroupSize}
        dietary={dietary}
        setDietary={setDietary}
        adventurousness={adventurousness}
        setAdventurousness={setAdventurousness}
        budget={budget}
        setBudget={setBudget}
        googleMapsUrl={googleMapsUrl}
        setGoogleMapsUrl={setGoogleMapsUrl}
        onSubmit={handleGetRecommendations}
      />
    </div>
  );
}
