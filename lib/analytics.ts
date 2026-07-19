import { prisma } from "@/lib/prisma";

export type TimeRange = "month" | "quarter" | "year" | "all";

export function getDateRange(range: TimeRange): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  if (range === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (range === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
  } else if (range === "year") {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    start = new Date(1970, 0, 1);
  }
  return { start, end: now };
}

export async function getStatStrip(userId: string, start: Date, end: Date) {
  const [logs, wantlistCount] = await Promise.all([
    prisma.listeningLog.findMany({
      where: { userId, userDeleted: false, playedAt: { gte: start, lte: end } },
      select: { source: true },
    }),
    prisma.wantlist.count({ where: { userId } }),
  ]);
  return {
    total: logs.length,
    physical: logs.filter((l) => l.source !== "streaming").length,
    streaming: logs.filter((l) => l.source === "streaming").length,
    wantlistCount,
  };
}

export interface GenreDetail {
  genre: string;
  count: number;
  pct: number;
  topArtists: { artist: string; count: number }[];
  topAlbums: { title: string; artist: string; artistMbid: string | null; coverUrl: string | null; discogsId: string; count: number }[];
}

export async function getGenreBreakdown(userId: string, start: Date, end: Date): Promise<GenreDetail[]> {
  const rows = await prisma.$queryRaw<{ genre: string; count: bigint }[]>`
    SELECT INITCAP(TRIM(LOWER(genre))) as genre, COUNT(*)::bigint as count
    FROM (
      SELECT unnest(
        CASE WHEN array_length(a.genres, 1) > 0 THEN a.genres ELSE ARRAY[a.genre] END
      ) as genre
      FROM "ListeningLog" ll
      JOIN "Album" a ON a.id = ll."albumId"
      WHERE ll."userId" = ${userId}
        AND NOT ll."userDeleted"
        AND ll."playedAt" >= ${start}
        AND ll."playedAt" <= ${end}
    ) sub
    WHERE genre IS NOT NULL AND TRIM(genre) != ''
    GROUP BY TRIM(LOWER(genre))
    ORDER BY count DESC
    LIMIT 15
  `;

  const total = rows.reduce((s, r) => s + Number(r.count), 0);
  if (total === 0) return [];

  const details = await Promise.all(rows.slice(0, 10).map(async (row) => {
    const [artists, albums] = await Promise.all([
      prisma.$queryRaw<{ artist: string; count: bigint }[]>`
        SELECT a.artist, COUNT(*)::bigint as count
        FROM "ListeningLog" ll
        JOIN "Album" a ON a.id = ll."albumId"
        WHERE ll."userId" = ${userId}
          AND NOT ll."userDeleted"
          AND ll."playedAt" >= ${start}
          AND ll."playedAt" <= ${end}
          AND (LOWER(array_to_string(a.genres, ',')) LIKE '%' || LOWER(${row.genre}) || '%' OR LOWER(a.genre) = LOWER(${row.genre}))
        GROUP BY a.artist
        ORDER BY count DESC
        LIMIT 5
      `,
      prisma.$queryRaw<{ title: string; artist: string; artistMbid: string | null; coverUrl: string | null; discogsId: string; count: bigint }[]>`
        SELECT a.title, a.artist, a."artistMbid", a."coverUrl", a."discogsId", COUNT(*)::bigint as count
        FROM "ListeningLog" ll
        JOIN "Album" a ON a.id = ll."albumId"
        WHERE ll."userId" = ${userId}
          AND NOT ll."userDeleted"
          AND ll."playedAt" >= ${start}
          AND ll."playedAt" <= ${end}
          AND (LOWER(array_to_string(a.genres, ',')) LIKE '%' || LOWER(${row.genre}) || '%' OR LOWER(a.genre) = LOWER(${row.genre}))
        GROUP BY a.id, a.title, a.artist, a."artistMbid", a."coverUrl", a."discogsId"
        ORDER BY count DESC
        LIMIT 5
      `,
    ]);

    return {
      genre: row.genre,
      count: Number(row.count),
      pct: (Number(row.count) / total) * 100,
      topArtists: artists.map((a) => ({ artist: a.artist, count: Number(a.count) })),
      topAlbums: albums.map((a) => ({
        title: a.title,
        artist: a.artist,
        artistMbid: a.artistMbid,
        coverUrl: a.coverUrl,
        discogsId: a.discogsId,
        count: Number(a.count),
      })),
    };
  }));

  return details;
}

export async function getListeningVelocity(userId: string) {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const rows = await prisma.$queryRaw<{ month: Date; count: bigint }[]>`
    SELECT date_trunc('month', "playedAt")::timestamptz as month, COUNT(*)::bigint as count
    FROM "ListeningLog"
    WHERE "userId" = ${userId}
      AND NOT "userDeleted"
      AND "playedAt" >= ${twelveMonthsAgo}
    GROUP BY month
    ORDER BY month ASC
  `;

  const result: { month: string; label: string; count: number; isCurrent: boolean }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short" });
    const found = rows.find((r) => {
      const rd = new Date(r.month);
      return `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, "0")}` === key;
    });
    result.push({ month: key, label, count: found ? Number(found.count) : 0, isCurrent: i === 0 });
  }
  return result;
}

export async function getFormatPreference(userId: string, start: Date, end: Date) {
  const logs = await prisma.listeningLog.findMany({
    where: { userId, userDeleted: false, playedAt: { gte: start, lte: end } },
    select: { format: true, source: true, rating: true },
  });

  const map: Record<string, { count: number; total: number; rated: number }> = {};
  for (const log of logs) {
    const fmt = log.source === "streaming" ? "Streaming" : (log.format ?? "Unknown");
    if (!map[fmt]) map[fmt] = { count: 0, total: 0, rated: 0 };
    map[fmt].count++;
    if (log.rating !== null) { map[fmt].total += log.rating; map[fmt].rated++; }
  }

  return Object.entries(map)
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([format, v]) => ({
      format,
      count: v.count,
      avgRating: v.rated >= 2 ? Math.round((v.total / v.rated) * 10) / 10 : null,
    }));
}

export interface DecadeDetail {
  decade: number;
  count: number;
  pct: number;
  topAlbums: { title: string; artist: string; artistMbid: string | null; coverUrl: string | null; discogsId: string; count: number }[];
}

export async function getDecadeBreakdown(userId: string, start: Date, end: Date): Promise<DecadeDetail[]> {
  const logs = await prisma.listeningLog.findMany({
    where: { userId, userDeleted: false, playedAt: { gte: start, lte: end } },
    select: {
      album: { select: { releaseYear: true, title: true, artist: true, artistMbid: true, coverUrl: true, discogsId: true } },
    },
  });

  const map: Record<number, {
    count: number;
    albums: Record<string, { title: string; artist: string; artistMbid: string | null; coverUrl: string | null; discogsId: string; count: number }>;
  }> = {};

  for (const log of logs) {
    const yr = log.album.releaseYear;
    if (!yr) continue;
    const decade = Math.floor(yr / 10) * 10;
    if (!map[decade]) map[decade] = { count: 0, albums: {} };
    map[decade].count++;
    const key = log.album.discogsId;
    if (!map[decade].albums[key]) {
      map[decade].albums[key] = { title: log.album.title, artist: log.album.artist, artistMbid: log.album.artistMbid, coverUrl: log.album.coverUrl, discogsId: key, count: 0 };
    }
    map[decade].albums[key].count++;
  }

  const total = Object.values(map).reduce((s, v) => s + v.count, 0);

  return Object.entries(map)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([decade, v]) => ({
      decade: Number(decade),
      count: v.count,
      pct: total > 0 ? (v.count / total) * 100 : 0,
      topAlbums: Object.values(v.albums).sort((a, b) => b.count - a.count).slice(0, 5),
    }));
}

export async function getCollectionBreadth(userId: string) {
  const result = await prisma.$queryRaw<[{ artists: bigint; albums: bigint }]>`
    SELECT COUNT(DISTINCT a.artist)::bigint as artists, COUNT(DISTINCT c."albumId")::bigint as albums
    FROM "Collection" c
    JOIN "Album" a ON a.id = c."albumId"
    WHERE c."userId" = ${userId}
  `;
  const artists = Number(result[0]?.artists ?? 0);
  const albums = Number(result[0]?.albums ?? 0);
  return { artists, albums, avgPerArtist: artists > 0 ? Math.round((albums / artists) * 10) / 10 : 0 };
}

export async function getWantlistOverlap(userId: string, start: Date, end: Date) {
  const [totalSpins, wantResult] = await Promise.all([
    prisma.listeningLog.count({ where: { userId, userDeleted: false, playedAt: { gte: start, lte: end } } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count
      FROM "ListeningLog" ll
      WHERE ll."userId" = ${userId}
        AND NOT ll."userDeleted"
        AND ll."playedAt" >= ${start}
        AND ll."playedAt" <= ${end}
        AND EXISTS (
          SELECT 1 FROM "Wantlist" w WHERE w."userId" = ${userId} AND w."albumId" = ll."albumId"
        )
    `,
  ]);
  const spinsOnWantlist = Number(wantResult[0]?.count ?? 0);
  return {
    totalSpins,
    spinsOnWantlist,
    pct: totalSpins > 0 ? Math.round((spinsOnWantlist / totalSpins) * 1000) / 10 : 0,
  };
}

export async function getTopArtists(userId: string, start: Date, end: Date, limit = 10) {
  const logs = await prisma.listeningLog.findMany({
    where: { userId, userDeleted: false, playedAt: { gte: start, lte: end } },
    select: { album: { select: { artist: true, artistMbid: true } } },
  });
  const map: Record<string, { count: number; mbid: string | null }> = {};
  for (const log of logs) {
    const a = log.album.artist;
    if (!map[a]) map[a] = { count: 0, mbid: log.album.artistMbid };
    map[a].count++;
  }
  return Object.entries(map)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([artist, v]) => ({ artist, count: v.count, mbid: v.mbid }));
}

export async function getTopAlbums(userId: string, start: Date, end: Date, limit = 10) {
  const logs = await prisma.listeningLog.findMany({
    where: { userId, userDeleted: false, playedAt: { gte: start, lte: end } },
    select: { albumId: true, album: { select: { title: true, artist: true, artistMbid: true, coverUrl: true, discogsId: true } } },
  });
  const map: Record<string, { count: number; title: string; artist: string; artistMbid: string | null; coverUrl: string | null; discogsId: string }> = {};
  for (const log of logs) {
    if (!map[log.albumId]) map[log.albumId] = { count: 0, ...log.album };
    map[log.albumId].count++;
  }
  return Object.values(map).sort((a, b) => b.count - a.count).slice(0, limit);
}

export async function getFormatBreakdown(userId: string, start: Date, end: Date) {
  const logs = await prisma.listeningLog.findMany({
    where: { userId, userDeleted: false, playedAt: { gte: start, lte: end } },
    select: { source: true, format: true },
  });
  const map: Record<string, number> = {};
  for (const log of logs) {
    const fmt = log.source === "streaming" ? "Streaming" : (log.format ?? "Unknown");
    map[fmt] = (map[fmt] ?? 0) + 1;
  }
  const total = logs.length;
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([format, count]) => ({ format, count, pct: total > 0 ? (count / total) * 100 : 0 }));
}

export async function getRatingDistribution(userId: string, start: Date, end: Date) {
  const logs = await prisma.listeningLog.findMany({
    where: { userId, userDeleted: false, playedAt: { gte: start, lte: end } },
    select: { rating: true },
  });
  const rated = logs.filter((l) => l.rating !== null);
  const buckets: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const l of rated) {
    const b = String(Math.round(l.rating!));
    if (b in buckets) buckets[b]++;
  }
  return {
    avgRating: rated.length > 0 ? rated.reduce((s, l) => s + l.rating!, 0) / rated.length : null,
    ratedCount: rated.length,
    buckets: [1, 2, 3, 4, 5].map((s) => ({ star: s, count: buckets[String(s)] })),
  };
}

export interface CollectionListeningRow {
  discogsId: string;
  title: string;
  artist: string;
  artistMbid: string | null;
  coverUrl: string | null;
  spinsInRange: number;
  totalSpins: number;
  lastSpunAt: string | null;
  avgRating: number | null;
  addedAt: string;
}

export interface CollectionListeningSummary {
  totalRecords: number;
  spunCount: number;
  neverSpunCount: number;
  pctSpun: number;
  avgSpinsPerRecord: number;
}

export async function getCollectionListening(
  userId: string,
  start: Date,
  end: Date
): Promise<{ records: CollectionListeningRow[]; summary: CollectionListeningSummary }> {
  const collection = await prisma.collection.findMany({
    where: { userId },
    select: {
      addedAt: true,
      album: { select: { id: true, discogsId: true, title: true, artist: true, artistMbid: true, coverUrl: true } },
    },
  });

  const empty = { totalRecords: 0, spunCount: 0, neverSpunCount: 0, pctSpun: 0, avgSpinsPerRecord: 0 };
  if (collection.length === 0) return { records: [], summary: empty };

  const albumIds = collection.map((c) => c.album.id);

  const logs = await prisma.listeningLog.findMany({
    where: { userId, userDeleted: false, source: { not: "streaming" }, albumId: { in: albumIds } },
    select: { albumId: true, playedAt: true, rating: true },
  });

  const byAlbum: Record<string, { totalSpins: number; spinsInRange: number; lastSpunAt: Date | null; ratingSum: number; ratingCount: number }> = {};
  for (const log of logs) {
    if (!byAlbum[log.albumId]) byAlbum[log.albumId] = { totalSpins: 0, spinsInRange: 0, lastSpunAt: null, ratingSum: 0, ratingCount: 0 };
    const entry = byAlbum[log.albumId];
    entry.totalSpins++;
    if (log.playedAt >= start && log.playedAt <= end) entry.spinsInRange++;
    if (!entry.lastSpunAt || log.playedAt > entry.lastSpunAt) entry.lastSpunAt = log.playedAt;
    if (log.rating !== null) { entry.ratingSum += log.rating; entry.ratingCount++; }
  }

  const records: CollectionListeningRow[] = collection.map((c) => {
    const stats = byAlbum[c.album.id];
    return {
      discogsId: c.album.discogsId,
      title: c.album.title,
      artist: c.album.artist,
      artistMbid: c.album.artistMbid,
      coverUrl: c.album.coverUrl,
      spinsInRange: stats?.spinsInRange ?? 0,
      totalSpins: stats?.totalSpins ?? 0,
      lastSpunAt: stats?.lastSpunAt ? stats.lastSpunAt.toISOString() : null,
      avgRating: stats && stats.ratingCount > 0 ? Math.round((stats.ratingSum / stats.ratingCount) * 10) / 10 : null,
      addedAt: c.addedAt.toISOString(),
    };
  });

  const totalRecords = records.length;
  const spunCount = records.filter((r) => r.totalSpins > 0).length;
  const totalSpinsAll = records.reduce((s, r) => s + r.totalSpins, 0);

  return {
    records,
    summary: {
      totalRecords,
      spunCount,
      neverSpunCount: totalRecords - spunCount,
      pctSpun: totalRecords > 0 ? Math.round((spunCount / totalRecords) * 1000) / 10 : 0,
      avgSpinsPerRecord: totalRecords > 0 ? Math.round((totalSpinsAll / totalRecords) * 10) / 10 : 0,
    },
  };
}

export async function getDailyData(userId: string, year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const logs = await prisma.listeningLog.findMany({
    where: { userId, userDeleted: false, playedAt: { gte: start, lte: end } },
    include: { album: { select: { discogsId: true, title: true, artist: true, artistMbid: true, coverUrl: true } } },
    orderBy: { playedAt: "asc" },
  });
  const daily: Record<string, { discogsId: string; title: string; artist: string; artistMbid: string | null; coverUrl: string | null; format: string | null; source: string; rating: number | null }[]> = {};
  for (const log of logs) {
    const key = `${log.playedAt.getFullYear()}-${String(log.playedAt.getMonth() + 1).padStart(2, "0")}-${String(log.playedAt.getDate()).padStart(2, "0")}`;
    if (!daily[key]) daily[key] = [];
    daily[key].push({
      discogsId: log.album.discogsId,
      title: log.album.title,
      artist: log.album.artist,
      artistMbid: log.album.artistMbid,
      coverUrl: log.album.coverUrl,
      format: log.format,
      source: log.source,
      rating: log.rating,
    });
  }
  return daily;
}
