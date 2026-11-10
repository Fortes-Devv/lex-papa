-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "youtubePlaylistId" TEXT,
ADD COLUMN     "youtubeAutoPublish" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "youtubeSyncedAt" TIMESTAMP(3);
