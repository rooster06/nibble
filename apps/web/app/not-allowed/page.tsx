"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

export default function NotAllowedPage() {
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, signOut } = useAuth();

  const supabase = createClient();

  const handleRequestAccess = async () => {
    if (!user?.email) return;

    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from("access_requests").insert({
      email: user.email,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        // Duplicate - request already exists
        setRequested(true);
      } else {
        setError(insertError.message);
      }
    } else {
      setRequested(true);
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-yellow-600 dark:text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Restricted
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Nibble is currently invite-only. Your email{" "}
            <span className="font-medium text-gray-900 dark:text-white">
              {user?.email}
            </span>{" "}
            is not on the approved list.
          </p>

          {requested ? (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-lg mb-6">
              Access requested! We&apos;ll notify you when approved.
            </div>
          ) : (
            <button
              onClick={handleRequestAccess}
              disabled={loading}
              className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {loading ? "Requesting..." : "Request Access"}
            </button>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSignOut}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm underline"
          >
            Sign out and try a different email
          </button>
        </div>
      </div>
    </div>
  );
}
