-- AlterTable
ALTER TABLE "modules" ADD COLUMN "instructorId" TEXT;

-- CreateIndex
CREATE INDEX "modules_instructorId_idx" ON "modules"("instructorId");

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
