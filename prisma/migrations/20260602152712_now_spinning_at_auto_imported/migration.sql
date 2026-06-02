-- AlterTable
ALTER TABLE "ListeningLog" ADD COLUMN     "autoImported" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nowSpinningAt" TIMESTAMP(3);
