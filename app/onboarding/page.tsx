"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg: "#2D2926",
  surface: "#3D3834",
  surfaceRaised: "#4A4540",
  border: "#524D48",
  text: "#F7F1E3",
  muted: "#A89F94",
  subtle: "#6B6560",
  accent: "#E67E22",
  accentHover: "#CF711E",
};

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
    <div className="flex min-h-screen items-center justify-center px-6" style={{ backgroundColor: C.bg }}>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1" style={{ color: C.text }}>Pick your username</h1>
        <p className="text-sm font-mono mb-8" style={{ color: C.muted }}>
          This is how you'll appear on NeedleDrop.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            className="flex items-center px-4 py-3 transition-colors duration-100"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
          >
            <span className="text-sm font-mono mr-1" style={{ color: C.subtle }}>needledrop.fm/</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="username"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: C.text }}
              autoFocus
              maxLength={30}
            />
          </div>

          {error && <p className="text-xs font-mono" style={{ color: "#C0392B" }}>{error}</p>}

          <button
            type="submit"
            disabled={loading || username.length < 3}
            className="py-3 text-sm font-medium transition-colors duration-100"
            style={{
              backgroundColor: C.accent,
              color: C.text,
              borderRadius: 4,
              opacity: loading || username.length < 3 ? 0.4 : 1,
            }}
            onMouseEnter={(e) => !(loading || username.length < 3) && (e.currentTarget.style.backgroundColor = C.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}
          >
            {loading ? "SAVING..." : "CONTINUE"}
          </button>
        </form>
      </div>
    </div>
  );
}
