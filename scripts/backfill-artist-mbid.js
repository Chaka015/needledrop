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

// Discogs disambiguates same-named artists with a trailing " (2)", " (3)", etc.
// — strip that (and stray whitespace) before searching MusicBrainz, which has
// no concept of it and would otherwise never match.
function cleanArtistName(name) {
  return name.replace(/\s*\(\d+\)\s*$/, "").trim();
}

// Word-level (Unicode-aware, so "Björk" isn't fragmented by the accent),
// stopword-stripped token set — used to sanity-check fuzzy fallback matches.
// Word-level, not raw character substring, so "Eulogy" can't pass as a match
// for "No Eulogy", and "Ideas" can't pass for "Sound Ideas".
const STOPWORDS = new Set(["the", "a", "an", "and", "with"]);
function tokens(name) {
  return name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w && !STOPWORDS.has(w));
}

// A fuzzy top hit is only trustworthy if it shares real word-level overlap
// with the query — not just one short/common token in common (that's how
// "War Child" ended up standing in for an unrelated "War Child Records", and
// "Eulogy" for "No Eulogy"). Single-word-vs-single-word names must match
// exactly; anything longer needs at least two shared words.
function isGoodFuzzyMatch(queryName, candidateName) {
  const q = tokens(queryName);
  const c = tokens(candidateName);
  if (q.length === 0 || c.length === 0) return false;
  if (q.length === 1 && c.length === 1) return q[0] === c[0];
  const cSet = new Set(c);
  const shared = q.filter((w) => cSet.has(w)).length;
  return shared >= 2;
}

// MusicBrainz's own placeholder pseudo-artists — a fuzzy search can rank these
// #1 for near-empty/generic queries (e.g. "Sound Ideas"); never accept them.
const MB_PLACEHOLDERS = new Set(["[no artist]", "[unknown]", "[data]", "[anonymous]", "[traditional]", "[dialogue]", "[silence]"]);

// MBIDs manually confirmed wrong during review — the word-overlap check can't
// catch a same-name collision with an unrelated artist (e.g. "War Child
// Records" fuzzy-matching an obscure unrelated "War Child" MBID). Block them
// so reruns don't keep reintroducing the same bad match.
const KNOWN_BAD_MBIDS = new Set([
  "e1c0d5d7-8357-4fb7-91bc-d318612ea660", // "War Child" (disambig: "feat. w. Groovyboypng") — not War Child Records
]);

async function mbArtistSearch(query) {
  const res = await fetch(`https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(query)}&limit=5&fmt=json`, {
    headers: MB_HEADERS,
  });
  if (res.status === 429) return { retry: true };
  if (!res.ok) return { artists: [] };
  const data = await res.json();
  return { artists: (data.artists ?? []).filter((a) => !MB_PLACEHOLDERS.has(a.name) && !KNOWN_BAD_MBIDS.has(a.id)) };
}

async function resolveArtistMbid(artistName) {
  const cleaned = cleanArtistName(artistName);

  // Pass 1: exact quoted field match — high precision, but brittle against any
  // formatting difference from MusicBrainz's canonical name.
  const exact = await mbArtistSearch(`artist:"${cleaned}"`);
  if (exact.retry) return { retry: true };
  if (exact.artists[0]) return { mbid: exact.artists[0].id };

  // Pass 2: plain fuzzy search — much more forgiving (case, "&" vs "and" vs
  // "+", accents), but MusicBrainz's relevance score alone isn't trustworthy
  // (it can rank a same-length but unrelated name #1 with score 100 — e.g.
  // "Studio 99" for "The Tomb Studio"). Only accept the top hit if it passes
  // the word-overlap check above.
  await sleep(1100); // separate the two MB calls within one artist to stay under the rate limit
  const fuzzy = await mbArtistSearch(cleaned);
  if (fuzzy.retry) return { retry: true };
  const top = fuzzy.artists[0];
  if (top && isGoodFuzzyMatch(cleaned, top.name)) {
    return { mbid: top.id };
  }

  return { mbid: null };
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
