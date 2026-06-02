"use client";

import { useEffect } from "react";

interface SkinApplicatorProps {
  vars: Record<string, string>;
}

// Sets skin CSS variables on <html> so they cascade to the navbar and all elements.
// Cleans up on unmount (navigation away) so non-profile pages fall back to :root defaults.
export default function SkinApplicator({ vars }: SkinApplicatorProps) {
  useEffect(() => {
    const el = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
    return () => {
      Object.keys(vars).forEach((k) => el.style.removeProperty(k));
    };
  }, [vars]);

  return null;
}
