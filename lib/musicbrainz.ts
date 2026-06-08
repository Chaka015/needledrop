// MusicBrainz API helpers

const MB_BASE = "https://musicbrainz.org/ws/2";
const MB_HEADERS = { "User-Agent": "NeedleDrop/1.0 (needledrop.app)" };

export interface MBArtist {
  id: string;
  name: string;
  "sort-name": string;
  disambiguation?: string;
  type?: string;
  area?: { name: string };
  "life-span"?: { begin?: string; end?: string; ended?: boolean };
  tags?: { name: string; count: number }[];
  relations?: { type: string; url?: { resource: string } }[];
}

export interface MBRelease {
  id: string;
  title: string;
  date?: string;
  status?: string;
  "primary-type"?: string;
  "secondary-types"?: string[];
  "artist-credit"?: { name?: string; artist: { name: string } }[];
  "cover-art-archive"?: { front: boolean };
  "label-info"?: { label?: { name: string } }[];
}

async function mbFetch(url: string, retries = 2): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: MB_HEADERS, next: { revalidate: 3600 } });
      if (res.status === 429) {
        // Rate limited — wait and retry
        await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
        continue;
      }
      return res;
    } catch { /* network error — retry */ }
  }
  return null;
}

export async function fetchArtist(mbid: string): Promise<MBArtist | null> {
  try {
    const res = await mbFetch(`${MB_BASE}/artist/${mbid}?inc=url-rels+tags&fmt=json`);
    if (!res?.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function fetchArtistReleases(mbid: string): Promise<MBRelease[]> {
  try {
    // Small delay so this doesn't fire simultaneously with fetchArtist
    await new Promise((r) => setTimeout(r, 300));
    const res = await mbFetch(`${MB_BASE}/release-group?artist=${mbid}&limit=100&fmt=json`);
    if (!res?.ok) return [];
    const data = await res.json();
    return data["release-groups"] ?? [];
  } catch { return []; }
}

export interface MBArtistSearchResult {
  id: string;
  name: string;
  disambiguation?: string;
  type?: string;
  area?: { name: string };
  "life-span"?: { begin?: string; ended?: boolean };
  score: number;
}

export async function searchArtists(query: string): Promise<MBArtistSearchResult[]> {
  try {
    const res = await fetch(
      `${MB_BASE}/artist?query=${encodeURIComponent(query)}&limit=5&fmt=json`,
      { headers: MB_HEADERS, next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.artists ?? [];
  } catch { return []; }
}

export async function fetchWikipediaSummary(title: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.extract ?? null;
  } catch { return null; }
}
