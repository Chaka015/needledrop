"use client";

import { useEffect } from "react";

interface Props {
  shouldSync: boolean;       // pre-computed server-side: connected + stale
  onNowPlayingUpdate?: () => void;
}

export default function SpotifyAutoSync({ shouldSync }: Props) {
  useEffect(() => {
    if (!shouldSync) return;

    // Fire both in parallel — sync recent plays + update now-spinning
    fetch("/api/spotify/sync", { method: "POST" }).catch(() => {});
    fetch("/api/spotify/now-playing", { method: "POST" }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
