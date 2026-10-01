-- DropForeignKey
ALTER TABLE "modules" DROP CONSTRAINT "modules_courseId_fkey";

-- DropIndex
DROP INDEX "modules_courseId_idx";

-- DropIndex
DROP INDEX "quiz_attempts_quizId_userId_idx";

-- DropIndex
DROP INDEX "lesson_progress_userId_lessonId_key";

-- AlterTable
ALTER TABLE "modules" DROP COLUMN "courseId",
DROP COLUMN "isPublished",
DROP COLUMN "order";

-- AlterTable
ALTER TABLE "quiz_attempts" ADD COLUMN     "courseId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "lesson_progress" ADD COLUMN     "courseId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "course_modules" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_modules_moduleId_idx" ON "course_modules"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "course_modules_courseId_moduleId_key" ON "course_modules"("courseId", "moduleId");

-- CreateIndex
CREATE INDEX "quiz_attempts_quizId_userId_courseId_idx" ON "quiz_attempts"("quizId", "userId", "courseId");

-- CreateIndex
CREATE INDEX "lesson_progress_lessonId_idx" ON "lesson_progress"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_userId_courseId_lessonId_key" ON "lesson_progress"("userId", "courseId", "lessonId");

-- AddForeignKey
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

