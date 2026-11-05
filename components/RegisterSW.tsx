"use client";

import { useEffect } from "react";

// Registers /sw.js in production only (dev would fight Fast Refresh).
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* offline support is a nice-to-have; never surface this */
    });
  }, []);
  return null;
}
