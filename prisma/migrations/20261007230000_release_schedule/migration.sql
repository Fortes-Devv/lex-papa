-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "pdfReleaseDays" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "course_modules" ADD COLUMN     "releaseAfterDays" INTEGER NOT NULL DEFAULT 0;
