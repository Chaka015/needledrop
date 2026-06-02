// Fetch album duration from MusicBrainz by release MBID or title+artist search
// Falls back to genre-based average (42 min = 2,520,000 ms)

const FALLBACK_MS = 42 * 60 * 1000; // 42 minutes

interface MBRecording {
  length?: number; // ms
}
interface MBRelease {
  media?: { tracks?: MBRecording[] }[];
}

export async function fetchAlbumDurationMs(opts: {
  mbid?: string | null;
  title: string;
  artist: string;
}): Promise<number> {
  try {
    let release: MBRelease | null = null;

    if (opts.mbid) {
      const res = await fetch(
        `https://musicbrainz.org/ws/2/release/${opts.mbid}?inc=recordings&fmt=json`,
        { headers: { "User-Agent": "NeedleDrop/1.0 (needledrop.app)" } }
      );
      if (res.ok) release = await res.json();
    }

    if (!release) {
      // Search by title + artist
      const q = encodeURIComponent(`release:"${opts.title}" AND artist:"${opts.artist}"`);
      const res = await fetch(
        `https://musicbrainz.org/ws/2/release/?query=${q}&limit=1&fmt=json`,
        { headers: { "User-Agent": "NeedleDrop/1.0 (needledrop.app)" } }
      );
      if (res.ok) {
        const data = await res.json();
        const first = data.releases?.[0];
        if (first?.id) {
          const r2 = await fetch(
            `https://musicbrainz.org/ws/2/release/${first.id}?inc=recordings&fmt=json`,
            { headers: { "User-Agent": "NeedleDrop/1.0 (needledrop.app)" } }
          );
          if (r2.ok) release = await r2.json();
        }
      }
    }

    if (release?.media) {
      let total = 0;
      for (const medium of release.media) {
        for (const track of medium.tracks ?? []) {
          if (track.length) total += track.length;
        }
      }
      if (total > 0) return total;
    }
  } catch {
    // network error or rate limit — use fallback
  }
  return FALLBACK_MS;
}
