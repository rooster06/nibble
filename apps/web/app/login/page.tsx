"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setStep("code");
      setMessage({
        type: "success",
        text: "Check your email for the verification code.",
      });
    }

    setLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      router.push("/");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to Nibble
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in with your email to continue
            </p>
          </div>

          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Code sent to <span className="font-medium text-gray-900 dark:text-white">{email}</span>
              </p>

              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Verification code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="00000000"
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-center text-2xl tracking-[0.3em] font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 8}
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Sign In"}
              </button>

              <button
                type="button"
                onClick={() => { setStep("email"); setOtp(""); setMessage(null); }}
                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
              >
                Use a different email
              </button>
            </form>
          )}

          {message && (
            <div
              className={`mt-6 p-4 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            This is an invite-only app. Only approved users can access Nibble.
          </p>
        </div>
      </div>
    </div>
  );
}
