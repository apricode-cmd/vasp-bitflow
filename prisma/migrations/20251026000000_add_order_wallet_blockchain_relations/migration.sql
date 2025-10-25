-- AlterTable: Add wallet and blockchain relations to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "userWalletId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "blockchainCode" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_userWalletId_idx" ON "Order"("userWalletId");
CREATE INDEX IF NOT EXISTS "Order_blockchainCode_idx" ON "Order"("blockchainCode");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userWalletId_fkey" FOREIGN KEY ("userWalletId") REFERENCES "UserWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_blockchainCode_fkey" FOREIGN KEY ("blockchainCode") REFERENCES "BlockchainNetwork"("code") ON DELETE SET NULL ON UPDATE CASCADE;
