-- AlterTable
ALTER TABLE "users" ADD COLUMN     "weeklyGoalMinutes" INTEGER NOT NULL DEFAULT 360;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "examDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "lesson_progress" ADD COLUMN     "positionSeconds" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "study_days" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "seconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "study_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "study_days_userId_date_key" ON "study_days"("userId", "date");

-- AddForeignKey
ALTER TABLE "study_days" ADD CONSTRAINT "study_days_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
