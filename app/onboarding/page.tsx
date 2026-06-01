"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Only letters, numbers, and underscores allowed.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    router.push(`/${username}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-sm px-6">
        <h1 className="text-2xl font-bold mb-2">Pick your username</h1>
        <p className="text-zinc-400 text-sm mb-8">
          This is how you'll appear on NeedleDrop.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 focus-within:border-zinc-400 transition-colors">
            <span className="text-zinc-500 mr-1">needledrop.fm/</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="username"
              className="flex-1 bg-transparent outline-none text-white placeholder-zinc-600"
              autoFocus
              maxLength={30}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || username.length < 3}
            className="mt-2 px-6 py-3 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
