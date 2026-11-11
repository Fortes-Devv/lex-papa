-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "efiChargeId" TEXT,
ADD COLUMN     "efiTxid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_efiTxid_key" ON "orders"("efiTxid");

-- CreateIndex
CREATE UNIQUE INDEX "orders_efiChargeId_key" ON "orders"("efiChargeId");
