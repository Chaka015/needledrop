// READ-ONLY report: likely double-logged spins from the Now Spinning modal.
//
// Before the fix, picking a record called POST /api/now-spinning (which created a bare
// ListeningLog) and then LogListenModal submitted /api/logs/add (a second log, often with
// the rating/review). This finds pairs of logs with the same fan + album within 15 minutes
// of each other where at least one of the two is "bare": no rating, no review, not
// auto-imported. Soft-deleted logs (userDeleted) are ignored.
//
// Nothing is deleted or updated. All queries run inside a READ ONLY transaction.
//
// Run: node scripts/find-duplicate-logs.ts   (Node 22.18+/24 strips the types natively)

import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

type PairRow = {
  username: string;
  artist: string;
  title: string;
  firstId: string;
  firstAt: Date;
  firstRating: number | null;
  firstReview: string | null;
  firstSource: string;
  secondId: string;
  secondAt: Date;
  secondRating: number | null;
  secondReview: string | null;
  secondSource: string;
  gapSeconds: number;
};

type UserRow = { username: string; pairs: number; bareLogs: number };

async function main() {
  const { pairs, perUser } = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");

    const pairs = await tx.$queryRaw<PairRow[]>`
      SELECT
        u.username,
        al.artist,
        al.title,
        a.id          AS "firstId",
        a."playedAt"  AS "firstAt",
        a.rating      AS "firstRating",
        a.review      AS "firstReview",
        a.source      AS "firstSource",
        b.id          AS "secondId",
        b."playedAt"  AS "secondAt",
        b.rating      AS "secondRating",
        b.review      AS "secondReview",
        b.source      AS "secondSource",
        EXTRACT(EPOCH FROM (b."playedAt" - a."playedAt"))::int AS "gapSeconds"
      FROM "ListeningLog" a
      JOIN "ListeningLog" b
        ON  b."userId"  = a."userId"
        AND b."albumId" = a."albumId"
        AND (b."playedAt", b.id) > (a."playedAt", a.id)
        AND b."playedAt" - a."playedAt" <= INTERVAL '15 minutes'
      JOIN "User"  u  ON u.id  = a."userId"
      JOIN "Album" al ON al.id = a."albumId"
      WHERE NOT a."userDeleted" AND NOT b."userDeleted"
        AND (
          (a.rating IS NULL AND a.review IS NULL AND NOT a."autoImported")
          OR
          (b.rating IS NULL AND b.review IS NULL AND NOT b."autoImported")
        )
      ORDER BY b."playedAt" DESC
    `;

    // bareLogs = distinct bare logs that sit in at least one pair (an upper bound on cleanup)
    const perUser = await tx.$queryRaw<UserRow[]>`
      WITH pairs AS (
        SELECT a."userId", a.id AS a_id, b.id AS b_id,
               (a.rating IS NULL AND a.review IS NULL AND NOT a."autoImported") AS a_bare,
               (b.rating IS NULL AND b.review IS NULL AND NOT b."autoImported") AS b_bare
        FROM "ListeningLog" a
        JOIN "ListeningLog" b
          ON  b."userId"  = a."userId"
          AND b."albumId" = a."albumId"
          AND (b."playedAt", b.id) > (a."playedAt", a.id)
          AND b."playedAt" - a."playedAt" <= INTERVAL '15 minutes'
        WHERE NOT a."userDeleted" AND NOT b."userDeleted"
      ),
      flagged AS (
        SELECT * FROM pairs WHERE a_bare OR b_bare
      ),
      bare AS (
        SELECT "userId", a_id AS id FROM flagged WHERE a_bare
        UNION
        SELECT "userId", b_id AS id FROM flagged WHERE b_bare
      )
      SELECT u.username,
             (SELECT COUNT(*) FROM flagged f WHERE f."userId" = u.id)::int AS pairs,
             (SELECT COUNT(*) FROM bare    x WHERE x."userId" = u.id)::int AS "bareLogs"
      FROM "User" u
      WHERE EXISTS (SELECT 1 FROM flagged f WHERE f."userId" = u.id)
      ORDER BY pairs DESC, u.username
    `;

    return { pairs, perUser };
  });

  const totalPairs = perUser.reduce((n, r) => n + r.pairs, 0);
  const totalBare = perUser.reduce((n, r) => n + r.bareLogs, 0);

  console.log("Likely duplicate spins (same fan + album, ≤15 min apart, ≥1 bare log)\n");
  console.log(`Pairs: ${totalPairs}   Distinct bare logs involved: ${totalBare}   Fans affected: ${perUser.length}\n`);

  if (perUser.length === 0) {
    console.log("No likely duplicates found.");
    return;
  }

  console.log("Per fan:");
  console.table(perUser.map((r) => ({ fan: r.username, pairs: r.pairs, bareLogs: r.bareLogs })));

  const describe = (rating: number | null, review: string | null, source: string) =>
    [source, rating !== null ? `★${rating}` : null, review ? "review" : null]
      .filter(Boolean)
      .join(" ") || source;

  console.log(`\nFirst ${Math.min(20, pairs.length)} examples (newest first):`);
  console.table(
    pairs.slice(0, 20).map((p) => ({
      fan: p.username,
      album: `${p.artist} — ${p.title}`.slice(0, 48),
      first: `${p.firstAt.toISOString().slice(0, 16).replace("T", " ")} ${describe(p.firstRating, p.firstReview, p.firstSource)}`,
      second: `${p.secondAt.toISOString().slice(0, 16).replace("T", " ")} ${describe(p.secondRating, p.secondReview, p.secondSource)}`,
      gap: `${p.gapSeconds}s`,
      ids: `${p.firstId} / ${p.secondId}`,
    }))
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
