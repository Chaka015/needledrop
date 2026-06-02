"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SpotifyAutoSync({ shouldSync }: { shouldSync: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!shouldSync) return;

    async function run() {
      // Run both in parallel
      const [, npRes] = await Promise.all([
        fetch("/api/spotify/sync", { method: "POST" }).catch(() => null),
        fetch("/api/spotify/now-playing", { method: "POST" }).catch(() => null),
      ]);

      // If now-playing updated the DB with an active track, refresh server components
      // so the navbar NOW SPINNING badge reflects the current state
      if (npRes?.ok) {
        try {
          const data = await npRes.json();
          if (data?.playing) router.refresh();
        } catch { /* ignore */ }
      }
    }

    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
