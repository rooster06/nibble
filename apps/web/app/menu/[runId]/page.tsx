"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getMenuData, getMenuImages, Menu, ImagesResponse } from "@/lib/api";
import DishCard from "@/components/DishCard";

type LoadState = "loading" | "loaded" | "error";

export default function MenuPage() {
  const params = useParams();
  const runId = params.runId as string;

  const [menu, setMenu] = useState<Menu | null>(null);
  const [images, setImages] = useState<ImagesResponse | null>(null);
  const [menuState, setMenuState] = useState<LoadState>("loading");
  const [imagesState, setImagesState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

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
        setImagesState("loaded");
      } catch (err) {
        setImagesState("error");
        // Don't set error for images - they're optional
      }
    }

    loadMenu();
    loadImages();
  }, [runId]);

  // Create a map of dish name to images
  const dishImages: Record<string, string[]> = {};
  if (images?.dishes) {
    images.dishes.forEach((d) => {
      dishImages[d.name] = d.images;
    });
  }

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
        <Link
          href="/"
          className="mt-4 inline-block text-primary-600 hover:underline"
        >
          Upload a new menu
        </Link>
      </div>
    );
  }

  const totalDishes = menu.sections.reduce(
    (acc, section) => acc + section.dishes.length,
    0
  );

  // Only show prices if every dish has a price
  const allDishesHavePrices = menu.sections.every((section) =>
    section.dishes.every((dish) => dish.price != null && dish.price > 0)
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {menu.restaurant_name || "Menu"}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {totalDishes} dishes found in {menu.sections.length} section
          {menu.sections.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Get Recommendations CTA */}
      <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Need help deciding?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Get personalized recommendations based on your occasion, group size,
          and preferences.
        </p>
        <Link
          href={`/menu/${runId}/recommend`}
          className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Get Recommendations
        </Link>
      </div>

      {/* Menu Sections */}
      {menu.sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
            {section.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.dishes.map((dish, dishIndex) => (
              <DishCard
                key={dishIndex}
                dish={dish}
                images={dishImages[dish.name] || []}
                loading={imagesState === "loading"}
                showPrice={allDishesHavePrices}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
