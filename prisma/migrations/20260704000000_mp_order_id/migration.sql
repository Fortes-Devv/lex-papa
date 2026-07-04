-- AlterTable
ALTER TABLE "orders" ADD COLUMN "mpOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_mpOrderId_key" ON "orders"("mpOrderId");
