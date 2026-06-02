-- AlterTable
ALTER TABLE "ListeningLog" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'physical';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nowSpinningSource" TEXT,
ADD COLUMN     "spotifyAccessToken" TEXT,
ADD COLUMN     "spotifyId" TEXT,
ADD COLUMN     "spotifyRefreshToken" TEXT,
ADD COLUMN     "spotifyTokenExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Mix" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MixItem" (
    "id" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "MixItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MixItem_mixId_albumId_key" ON "MixItem"("mixId", "albumId");

-- CreateIndex
CREATE UNIQUE INDEX "MixItem_mixId_position_key" ON "MixItem"("mixId", "position");

-- AddForeignKey
ALTER TABLE "Mix" ADD CONSTRAINT "Mix_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixItem" ADD CONSTRAINT "MixItem_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "Mix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixItem" ADD CONSTRAINT "MixItem_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
