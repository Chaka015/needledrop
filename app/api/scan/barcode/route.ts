import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface Candidate {
  releaseId: string;
  masterId: string | null;
  title: string;
  artist: string;
  releaseYear: number | null;
  coverUrl: string | null;
  label: string | null;
  catalogNumber: string | null;
  format: string | null;
}

class DiscogsError extends Error {}

async function searchDiscogs(barcode: string, token: string): Promise<any[]> {
  const res = await fetch(
    `https://api.discogs.com/database/search?barcode=${encodeURIComponent(barcode)}&type=release&per_page=25`,
    {
      headers: {
        Authorization: `Discogs token=${token}`,
        "User-Agent": "NeedleDrop/1.0",
      },
    }
  );
  if (!res.ok) throw new DiscogsError(`Discogs API error (${res.status})`);
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

function toCandidate(item: any): Candidate {
  const fullTitle: string = item.title ?? "";
  const [artistPart, ...titleParts] = fullTitle.split(" - ");
  const masterId = item.master_id ? String(item.master_id) : null;
  return {
    releaseId: String(item.id),
    masterId: masterId && masterId !== "0" ? masterId : null,
    title: titleParts.length ? titleParts.join(" - ") : fullTitle,
    artist: artistPart || fullTitle,
    releaseYear: item.year ? parseInt(item.year) || null : null,
    coverUrl: item.cover_image ?? item.thumb ?? null,
    label: item.label?.[0] ?? null,
    catalogNumber: item.catno && item.catno !== "none" ? item.catno : null,
    format: item.format?.[0] ?? null,
  };
}

export async function GET(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") ?? "").replace(/\D/g, "");
  if (!code) {
    return NextResponse.json({ error: "Missing barcode" }, { status: 400 });
  }

  const token = process.env.DISCOGS_TOKEN;
  if (!token) {
    return NextResponse.json({ owned: null, candidates: [], error: "Missing Discogs token" }, { status: 502 });
  }

  let results: any[];
  try {
    results = await searchDiscogs(code, token);
    if (results.length === 0) {
      // UPC-A ↔ EAN-13: same code, Discogs may have stored either form
      if (code.length === 12) results = await searchDiscogs(`0${code}`, token);
      else if (code.length === 13 && code.startsWith("0")) results = await searchDiscogs(code.slice(1), token);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Discogs lookup failed";
    return NextResponse.json({ owned: null, candidates: [], error: message }, { status: 502 });
  }

  const all = results.map(toCandidate);

  // Album.discogsId holds a release ID (Discogs import) or a master ID (added via dig),
  // so check the fan's collection against both.
  const ids = new Set<string>();
  for (const c of all) {
    ids.add(c.releaseId);
    if (c.masterId) ids.add(c.masterId);
  }

  let owned = null;
  if (ids.size > 0) {
    const entries = await prisma.collection.findMany({
      where: { userId: user.id, album: { discogsId: { in: [...ids] } } },
      include: { album: true },
    });
    if (entries.length > 0) {
      // Prefer the best-ranked Discogs match among owned albums
      const byDiscogsId = new Map(entries.map((e) => [e.album.discogsId, e.album]));
      let match = null;
      for (const c of all) {
        match = byDiscogsId.get(c.releaseId) ?? (c.masterId ? byDiscogsId.get(c.masterId) : undefined) ?? null;
        if (match) break;
      }
      const a = match ?? entries[0].album;
      owned = {
        id: a.id,
        discogsId: a.discogsId,
        title: a.title,
        artist: a.artist,
        coverUrl: a.coverUrl,
        releaseYear: a.releaseYear,
        label: a.label,
        genre: a.genre,
      };
    }
  }

  const seenMasters = new Set<string>();
  const candidates: Candidate[] = [];
  for (const c of all) {
    if (c.masterId) {
      if (seenMasters.has(c.masterId)) continue;
      seenMasters.add(c.masterId);
    }
    candidates.push(c);
    if (candidates.length === 5) break;
  }

  return NextResponse.json({ owned, candidates });
}
