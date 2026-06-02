-- AlterTable
ALTER TABLE "Album" ADD COLUMN     "artistMbid" TEXT,
ADD COLUMN     "durationMs" BIGINT,
ADD COLUMN     "mbid" TEXT;

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "pressingId" TEXT;

-- AlterTable
ALTER TABLE "ListeningLog" ADD COLUMN     "durationMs" BIGINT;

-- AlterTable
ALTER TABLE "Mix" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "MixItem" ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "spotifyConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "spotifyConnectedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AlbumComment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlbumComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowAttendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "setlistFmId" TEXT NOT NULL,
    "artistMbid" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "venueCity" TEXT NOT NULL,
    "showDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShowAttendance_userId_setlistFmId_key" ON "ShowAttendance"("userId", "setlistFmId");

-- AddForeignKey
ALTER TABLE "AlbumComment" ADD CONSTRAINT "AlbumComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumComment" ADD CONSTRAINT "AlbumComment_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowAttendance" ADD CONSTRAINT "ShowAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
