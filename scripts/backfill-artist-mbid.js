// One-time backfill: resolve artistMbid for every distinct artist name that's
// missing one, then apply it to all albums sharing that artist name.
// Mirrors the exact matching logic already used in app/album/[discogsId]/page.tsx's
// "Self-heal missing artistMbid" block, just batched by artist name instead of
// per-album, and rate-limited to MusicBrainz's 1 req/sec.

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MB_HEADERS = { "User-Agent": "NeedleDrop/1.0 (needledrop.app)" };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function resolveArtistMbid(artistName) {
  const q = encodeURIComponent(`artist:"${artistName}"`);
  const res = await fetch(`https://musicbrainz.org/ws/2/artist?query=${q}&limit=5&fmt=json`, {
    headers: MB_HEADERS,
  });
  if (res.status === 429) return { retry: true };
  if (!res.ok) return { mbid: null };
  const data = await res.json();
  const match = (data.artists ?? []).find((a) => !a.type || a.type === "Group" || a.type === "Person");
  return { mbid: match?.id ?? null };
}

async function main() {
  const rows = await prisma.album.findMany({
    where: { artistMbid: null },
    select: { artist: true },
    distinct: ["artist"],
  });

  console.log(`${rows.length} distinct artist names to resolve`);

  let resolved = 0;
  let notFound = 0;
  let albumsUpdated = 0;

  for (let i = 0; i < rows.length; i++) {
    const artist = rows[i].artist;
    let result;
    let attempt = 0;
    do {
      result = await resolveArtistMbid(artist);
      if (result.retry) {
        attempt++;
        await sleep(1500 * attempt);
      }
    } while (result.retry && attempt < 3);

    if (result.mbid) {
      const { count } = await prisma.album.updateMany({
        where: { artist, artistMbid: null },
        data: { artistMbid: result.mbid },
      });
      resolved++;
      albumsUpdated += count;
      console.log(`[${i + 1}/${rows.length}] ${artist} -> ${result.mbid} (${count} albums)`);
    } else {
      notFound++;
      console.log(`[${i + 1}/${rows.length}] ${artist} -> no match`);
    }

    await sleep(1100); // stay under MB's 1 req/sec
  }

  console.log(`\nDone. Resolved ${resolved} artists (${albumsUpdated} albums updated), ${notFound} not found.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
