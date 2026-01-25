"use client";

import { useState, useEffect } from "react";
import { Dish } from "@/lib/api";

interface DishCardProps {
  dish: Dish;
  images: string[];
  loading?: boolean;
  highlighted?: boolean;
  highlightReason?: string;
  showPrice?: boolean;
}

export default function DishCard({
  dish,
  images,
  loading = false,
  highlighted = false,
  highlightReason,
  showPrice = true,
}: DishCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState<Record<number, boolean>>({});

  // Find valid (non-errored) images
  const validIndices = images
    .map((_, i) => i)
    .filter((i) => !imageError[i]);
  const hasImages = validIndices.length > 0;

  // Auto-advance to next valid image when current one errors
  useEffect(() => {
    if (imageError[currentImageIndex] && validIndices.length > 0) {
      // Find next valid index
      const nextValid = validIndices.find((i) => i > currentImageIndex) ?? validIndices[0];
      setCurrentImageIndex(nextValid);
    }
  }, [imageError, currentImageIndex, validIndices]);

  const nextImage = () => {
    const currentPos = validIndices.indexOf(currentImageIndex);
    const nextPos = (currentPos + 1) % validIndices.length;
    setCurrentImageIndex(validIndices[nextPos]);
  };

  const prevImage = () => {
    const currentPos = validIndices.indexOf(currentImageIndex);
    const prevPos = (currentPos - 1 + validIndices.length) % validIndices.length;
    setCurrentImageIndex(validIndices[prevPos]);
  };

  const dietaryColors: Record<string, string> = {
    vegetarian: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    vegan: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    "gluten-free": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    spicy: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border-2 transition-all
        ${highlighted ? "border-primary-500 ring-2 ring-primary-200" : "border-transparent"}
      `}
    >
      {/* Image carousel */}
      <div className="relative h-40 bg-gray-100 dark:bg-gray-700">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse bg-gray-200 dark:bg-gray-600 w-full h-full" />
          </div>
        ) : hasImages ? (
          <>
            <img
              src={images[currentImageIndex]}
              alt={dish.name}
              className="w-full h-full object-cover"
              onError={() =>
                setImageError((prev) => ({ ...prev, [currentImageIndex]: true }))
              }
            />
            {validIndices.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {validIndices.slice(0, 5).map((idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full ${
                        idx === currentImageIndex
                          ? "bg-white"
                          : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {dish.name}
          </h3>
          {showPrice && dish.price && (
            <span className="font-medium text-primary-600">
              ${dish.price.toFixed(2)}
            </span>
          )}
        </div>

        {dish.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
            {dish.description}
          </p>
        )}

        {dish.dietary && dish.dietary.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {dish.dietary.map((tag) => (
              <span
                key={tag}
                className={`text-xs px-2 py-0.5 rounded-full ${
                  dietaryColors[tag.toLowerCase()] || dietaryColors.default
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {highlighted && highlightReason && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-primary-600 dark:text-primary-400">
              {highlightReason}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
