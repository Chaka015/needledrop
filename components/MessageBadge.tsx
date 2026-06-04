"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const C = {
  muted:  "var(--skin-muted)",
  accent: "var(--skin-accent)",
  text:   "var(--skin-text)",
};

export default function MessageBadge() {
  const [count, setCount] = useState(0);

  function fetchCount() {
    fetch("/api/messages/unread")
      .then((r) => r.json())
      .then((d) => setCount(d.count ?? 0));
  }

  useEffect(() => {
    fetchCount();
    function onFocus() { fetchCount(); }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <Link href="/messages"
      className="relative flex items-center justify-center w-8 h-8 text-sm transition-colors duration-100"
      style={{ color: count > 0 ? C.accent : C.muted }}
      title="Messages">
      ✉
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center text-xs font-bold"
          style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: C.accent, color: C.text, fontSize: 10 }}>
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
