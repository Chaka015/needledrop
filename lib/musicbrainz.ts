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

export async function fetchArtist(mbid: string): Promise<MBArtist | null> {
  try {
    const res = await fetch(
      `${MB_BASE}/artist/${mbid}?inc=url-rels+tags&fmt=json`,
      { headers: MB_HEADERS, next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function fetchArtistReleases(mbid: string): Promise<MBRelease[]> {
  try {
    const res = await fetch(
      `${MB_BASE}/release-group?artist=${mbid}&limit=100&fmt=json`,
      { headers: MB_HEADERS, next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data["release-groups"] ?? [];
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
