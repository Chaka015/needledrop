// Cleanup for double-logged spins from the Now Spinning modal (see find-duplicate-logs.ts).
//
// Matching rules (same as the finder): same fan + same album, within 15 minutes of each
// other, autoImported = false, not userDeleted. Within a match the log with more data
// (rating and/or review) is kept and the bare one (no rating, no review) is deleted.
// If both are bare, the earlier one is kept. Logs that both carry data are left alone.
// Spin rows on a deleted log are deleted first, as app/api/logs/[logId]/route.ts does.
//
// DRY RUN BY DEFAULT — prints what it would delete. Pass --confirm to actually delete.
//
// Run: node --env-file=.env.local scripts/delete-duplicate-logs.ts [--confirm]

import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

const WINDOW_MS = 15 * 60 * 1000;
const CONFIRM = process.argv.includes("--confirm");

type Log = {
  id: string;
  userId: string;
  albumId: string;
  playedAt: Date;
  rating: number | null;
  review: string | null;
  source: string;
  user: { username: string };
  album: { artist: string; title: string };
};

const isBare = (l: Log) => l.rating === null && !l.review;
const score = (l: Log) => (l.rating !== null ? 1 : 0) + (l.review ? 1 : 0);

async function main() {
  const logs: Log[] = await prisma.listeningLog.findMany({
    where: { autoImported: false, userDeleted: false },
    orderBy: [{ userId: "asc" }, { albumId: "asc" }, { playedAt: "asc" }, { id: "asc" }],
    select: {
      id: true, userId: true, albumId: true, playedAt: true,
      rating: true, review: true, source: true,
      user: { select: { username: true } },
      album: { select: { artist: true, title: true } },
    },
  });

  // Group by fan + album
  const groups = new Map<string, Log[]>();
  for (const l of logs) {
    const key = `${l.userId}:${l.albumId}`;
    const g = groups.get(key);
    if (g) g.push(l); else groups.set(key, [l]);
  }

  const toDelete: { log: Log; keptId: string }[] = [];

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    // Most data first, then earliest — so a bare log is only ever deleted in favour of
    // a log with at least as much data, and of two bare logs the earlier one survives.
    const ordered = [...group].sort(
      (a, b) => score(b) - score(a) || a.playedAt.getTime() - b.playedAt.getTime() || a.id.localeCompare(b.id),
    );
    const kept: Log[] = [];
    for (const l of ordered) {
      const keeper = isBare(l)
        ? kept.find((k) => Math.abs(k.playedAt.getTime() - l.playedAt.getTime()) <= WINDOW_MS)
        : undefined;
      if (keeper) toDelete.push({ log: l, keptId: keeper.id });
      else kept.push(l);
    }
  }

  const fmt = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

  console.log(CONFIRM ? "DELETING duplicate logs\n" : "DRY RUN — nothing will be deleted (pass --confirm to delete)\n");

  if (toDelete.length === 0) {
    console.log("No duplicate logs to delete.");
    return;
  }

  console.table(
    toDelete.map(({ log, keptId }) => ({
      fan: log.user.username,
      album: `${log.album.artist} — ${log.album.title}`.slice(0, 48),
      playedAt: fmt(log.playedAt),
      source: log.source,
      deleteId: log.id,
      keepId: keptId,
    })),
  );

  const ids = toDelete.map((d) => d.log.id);
  const spinCount = await prisma.spin.count({ where: { logId: { in: ids } } });

  console.log(`\nLogs ${CONFIRM ? "to delete" : "that would be deleted"}: ${ids.length}`);
  console.log(`Spin rows on those logs ${CONFIRM ? "to delete" : "that would be deleted"}: ${spinCount}`);

  if (!CONFIRM) return;

  const [spins, deleted] = await prisma.$transaction([
    prisma.spin.deleteMany({ where: { logId: { in: ids } } }),
    prisma.listeningLog.deleteMany({ where: { id: { in: ids }, autoImported: false, userDeleted: false } }),
  ]);
  console.log(`\nDeleted ${deleted.count} logs and ${spins.count} spin rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
