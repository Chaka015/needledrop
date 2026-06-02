"use client";

import { useRouter } from "next/navigation";

const C = {
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  muted:         "var(--skin-muted)",
  text:          "var(--skin-text)",
};

export default function MessageButton({ username }: { username: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/messages/${username}`)}
      className="px-5 py-2 text-xs font-mono transition-colors duration-100"
      style={{ backgroundColor: C.surfaceRaised, color: C.muted, borderRadius: 4, border: `1px solid ${C.border}` }}
      onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
      onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}>
      MESSAGE
    </button>
  );
}
