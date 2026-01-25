"use client";

import { Menu, RecommendResponse, ReviewsResponse } from "@/lib/api";
import DishCard from "./DishCard";

interface RecommendationViewProps {
  menu: Menu;
  dishImages: Record<string, string[]>;
  reviews: ReviewsResponse | null;
  recommendations: RecommendResponse | null;
  loading: boolean;
  vibe: string;
  setVibe: (v: string) => void;
  groupSize: number;
  setGroupSize: (n: number) => void;
  dietary: string[];
  setDietary: (d: string[]) => void;
  adventurousness: "low" | "medium" | "high";
  setAdventurousness: (a: "low" | "medium" | "high") => void;
  budget: "low" | "moderate" | "high";
  setBudget: (b: "low" | "moderate" | "high") => void;
  googleMapsUrl: string;
  setGoogleMapsUrl: (url: string) => void;
  onSubmit: () => void;
}

const vibeOptions = [
  { value: "date_night", label: "Date Night", icon: "heart" },
  { value: "friends", label: "Friends", icon: "users" },
  { value: "family", label: "Family", icon: "home" },
  { value: "business", label: "Business", icon: "briefcase" },
];

const dietaryOptions = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "no_pork",
  "no_shellfish",
  "no_nuts",
  "halal",
  "kosher",
];

export default function RecommendationView({
  menu,
  dishImages,
  reviews,
  recommendations,
  loading,
  vibe,
  setVibe,
  groupSize,
  setGroupSize,
  dietary,
  setDietary,
  adventurousness,
  setAdventurousness,
  budget,
  setBudget,
  googleMapsUrl,
  setGoogleMapsUrl,
  onSubmit,
}: RecommendationViewProps) {
  const toggleDietary = (option: string) => {
    if (dietary.includes(option)) {
      setDietary(dietary.filter((d) => d !== option));
    } else {
      setDietary([...dietary, option]);
    }
  };

  // Find dish data from menu
  const findDish = (name: string) => {
    for (const section of menu.sections) {
      const dish = section.dishes.find(
        (d) => d.name.toLowerCase() === name.toLowerCase()
      );
      if (dish) return dish;
    }
    return null;
  };

  // Only show prices if every dish has a price
  const allDishesHavePrices = menu.sections.every((section) =>
    section.dishes.every((dish) => dish.price != null && dish.price > 0)
  );

  return (
    <div className="space-y-8">
      {/* Preferences Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Tell us about your meal
        </h2>

        {/* Vibe Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            What&apos;s the occasion?
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {vibeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setVibe(option.value)}
                className={`
                  p-4 rounded-xl border-2 text-center transition-all
                  ${
                    vibe === option.value
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary-300"
                  }
                `}
              >
                <span className="block text-2xl mb-1">
                  {option.icon === "heart" && "💕"}
                  {option.icon === "users" && "👥"}
                  {option.icon === "home" && "👨‍👩‍👧‍👦"}
                  {option.icon === "briefcase" && "💼"}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Group Size */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            How many people? ({groupSize})
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={groupSize}
            onChange={(e) => setGroupSize(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
            <span>10</span>
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Dietary restrictions
          </label>
          <div className="flex flex-wrap gap-2">
            {dietaryOptions.map((option) => (
              <button
                key={option}
                onClick={() => toggleDietary(option)}
                className={`
                  px-3 py-1.5 rounded-full text-sm transition-all
                  ${
                    dietary.includes(option)
                      ? "bg-primary-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }
                `}
              >
                {option.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Adventurousness */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            How adventurous?
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["low", "medium", "high"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setAdventurousness(level)}
                className={`
                  p-3 rounded-xl border-2 text-center transition-all
                  ${
                    adventurousness === level
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary-300"
                  }
                `}
              >
                <span className="block text-xl mb-1">
                  {level === "low" && "🥗"}
                  {level === "medium" && "🍜"}
                  {level === "high" && "🌶️"}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {level}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Budget sensitivity
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["low", "moderate", "high"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setBudget(level)}
                className={`
                  p-3 rounded-xl border-2 text-center transition-all
                  ${
                    budget === level
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary-300"
                  }
                `}
              >
                <span className="block text-xl mb-1">
                  {level === "low" && "💵"}
                  {level === "moderate" && "💵💵"}
                  {level === "high" && "💵💵💵"}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {level === "low" ? "Budget-conscious" : level === "moderate" ? "Moderate" : "Splurge"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Google Maps Link (optional) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Google Maps Link (optional)
          </label>
          <input
            type="url"
            value={googleMapsUrl}
            onChange={(e) => setGoogleMapsUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/... or full Google Maps URL"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Open the restaurant in Google Maps, tap Share, and paste the link here
          </p>
        </div>

        {/* Submit Button */}
        <button
          onClick={onSubmit}
          disabled={loading}
          className={`
            w-full py-3 px-6 rounded-xl font-semibold text-white transition-all
            ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-primary-600 hover:bg-primary-700 active:scale-[0.98]"
            }
          `}
        >
          {loading ? "Getting recommendations..." : "Get Recommendations"}
        </button>
      </div>

      {/* Results */}
      {recommendations && (
        <div className="space-y-8">
          {/* Plan Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Your Ordering Plan
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">
                  {recommendations.plan.shareables}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Shareables
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">
                  {recommendations.plan.mains}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Mains</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">
                  {recommendations.plan.dessert}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Desserts</div>
              </div>
            </div>
            {recommendations.plan.reasoning && (
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                {recommendations.plan.reasoning}
              </p>
            )}
          </div>

          {/* Recommended Dishes */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Recommended Dishes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.recommendations.map((rec, index) => {
                const dish = findDish(rec.dish);
                if (!dish) return null;
                return (
                  <DishCard
                    key={index}
                    dish={dish}
                    images={dishImages[dish.name] || []}
                    highlighted={true}
                    highlightReason={rec.reason}
                    showPrice={allDishesHavePrices}
                  />
                );
              })}
            </div>
          </div>

          {/* Dishes to Avoid */}
          {recommendations.avoid && recommendations.avoid.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Maybe Skip These
              </h2>
              <div className="space-y-3">
                {recommendations.avoid.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex items-start gap-3"
                  >
                    <span className="text-xl">⚠️</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item.dish}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {item.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Error Message */}
          {reviews && reviews.error === "invalid_url" && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                <span>⚠️</span>
                Invalid Google Maps Link
              </h2>
              <p className="text-amber-700 dark:text-amber-300 mb-4">
                {reviews.message}
              </p>
              <div className="text-sm text-amber-600 dark:text-amber-400">
                <p className="font-medium mb-2">How to get the right link:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open the <strong>Google Maps</strong> app</li>
                  <li>Search for the restaurant</li>
                  <li>Tap on the restaurant to open its page</li>
                  <li>Tap the <strong>Share</strong> button</li>
                  <li>Choose <strong>Copy link</strong></li>
                </ol>
              </div>
            </div>
          )}

          {/* People Loved - Reviews */}
          {reviews && reviews.mentions && reviews.mentions.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span>⭐</span>
                People Loved
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Based on {reviews.review_count} Google reviews
              </p>
              <div className="space-y-4">
                {reviews.mentions.map((mention, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
                  >
                    <div className="font-medium text-gray-900 dark:text-white mb-2">
                      {mention.dish}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                      &ldquo;{mention.quote}&rdquo;
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
