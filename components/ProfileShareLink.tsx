"use client";

import { useEffect, useRef, useState } from "react";

// The profile URL line: copies the link on click, or opens the native share
// sheet on touch devices that have one.
export default function ProfileShareLink({ url, label, username }: { url: string; label: string; username: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${username} on NeedleDrop`, url });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return; // fan closed the sheet
        // otherwise fall through to copying
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers: hidden textarea fallback
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* give up quietly */ }
      ta.remove();
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  return (
    <a href={url} onClick={handleClick} className="ms-url" title="Copy profile link" aria-live="polite">
      <span className="ms-url-text">{label}</span>
      <span className="ms-url-cta">{copied ? "Copied ✓" : "Share"}</span>
    </a>
  );
}
