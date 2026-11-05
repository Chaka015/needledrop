import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { DefaultCard, OG_SIZE, fetchCovers, loadFonts } from "@/lib/og";

export const runtime = "nodejs";
export const revalidate = 3600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "NeedleDrop, the social network for record collectors, with a row of album covers fans spun recently";

// Covers from the most recent spins, one per album
async function recentCoverUrls(): Promise<string[]> {
  try {
    const logs = await prisma.listeningLog.findMany({
      where: { userDeleted: false, album: { coverUrl: { not: null } } },
      orderBy: { playedAt: "desc" },
      take: 60,
      select: { album: { select: { id: true, coverUrl: true } } },
    });
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const { album } of logs) {
      if (!album.coverUrl || seen.has(album.id)) continue;
      seen.add(album.id);
      urls.push(album.coverUrl);
      if (urls.length === 10) break;
    }
    return urls;
  } catch {
    return []; // DB down → wordmark-only card
  }
}

export default async function Image() {
  const [fonts, urls] = await Promise.all([loadFonts(), recentCoverUrls()]);
  // Fetch a few spares so failed covers can be skipped rather than shown blank
  const covers = (await fetchCovers(urls)).filter((c): c is string => c !== null).slice(0, 7);
  return new ImageResponse(<DefaultCard covers={covers} />, { ...size, fonts });
}
