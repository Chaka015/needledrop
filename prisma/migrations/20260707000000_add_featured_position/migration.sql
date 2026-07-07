-- AlterTable
ALTER TABLE "Collection" ADD COLUMN "featuredPosition" INTEGER;

-- Backfill: preserve current display order (by addedAt desc, matching existing query) as position
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "addedAt" DESC) AS rn
  FROM "Collection"
  WHERE "isFeatured" = true
)
UPDATE "Collection" c
SET "featuredPosition" = ranked.rn
FROM ranked
WHERE c."id" = ranked."id";
