"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  shouldSync: boolean;       // full recent-plays import (15-min throttle)
  spotifyConnected: boolean; // whether to poll now-playing at all
}

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export default function SpotifyAutoSync({ shouldSync, spotifyConnected }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!spotifyConnected) return;

    async function checkNowPlaying() {
      try {
        const res = await fetch("/api/spotify/now-playing", { method: "POST" });
        if (!res.ok) return;
        const data = await res.json();
        // Refresh server components when a new active track is found
        if (data?.playing) router.refresh();
      } catch { /* network error — silent */ }
    }

    // Fire immediately on mount so every page load gets a fresh check,
    // then poll every 30 s to keep the Now Spinning badge live.
    checkNowPlaying();
    const interval = setInterval(checkNowPlaying, POLL_INTERVAL_MS);

    // Full recent-plays import runs on a separate 15-min throttle
    if (shouldSync) {
      fetch("/api/spotify/sync", { method: "POST" }).catch(() => null);
    }

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
