/*
  Warnings:

  - You are about to drop the column `currency` on the `PayIn` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `PayOut` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "PayIn" DROP CONSTRAINT "PayIn_cryptocurrency_fkey";

-- DropForeignKey
ALTER TABLE "PayIn" DROP CONSTRAINT "PayIn_fiatCurrency_fkey";

-- DropForeignKey
ALTER TABLE "PayOut" DROP CONSTRAINT "PayOut_cryptocurrency_fkey";

-- DropForeignKey
ALTER TABLE "PayOut" DROP CONSTRAINT "PayOut_fiatCurrency_fkey";

-- AlterTable
ALTER TABLE "PayIn" DROP COLUMN "currency",
ADD COLUMN     "cryptocurrencyCode" TEXT,
ADD COLUMN     "fiatCurrencyCode" TEXT;

-- AlterTable
ALTER TABLE "PayOut" DROP COLUMN "currency",
ADD COLUMN     "cryptocurrencyCode" TEXT,
ADD COLUMN     "fiatCurrencyCode" TEXT;

-- CreateIndex
CREATE INDEX "PayIn_fiatCurrencyCode_idx" ON "PayIn"("fiatCurrencyCode");

-- CreateIndex
CREATE INDEX "PayIn_cryptocurrencyCode_idx" ON "PayIn"("cryptocurrencyCode");

-- CreateIndex
CREATE INDEX "PayOut_fiatCurrencyCode_idx" ON "PayOut"("fiatCurrencyCode");

-- CreateIndex
CREATE INDEX "PayOut_cryptocurrencyCode_idx" ON "PayOut"("cryptocurrencyCode");

-- AddForeignKey
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_fiatCurrencyCode_fkey" FOREIGN KEY ("fiatCurrencyCode") REFERENCES "FiatCurrency"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_cryptocurrencyCode_fkey" FOREIGN KEY ("cryptocurrencyCode") REFERENCES "Currency"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_cryptocurrencyCode_fkey" FOREIGN KEY ("cryptocurrencyCode") REFERENCES "Currency"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_fiatCurrencyCode_fkey" FOREIGN KEY ("fiatCurrencyCode") REFERENCES "FiatCurrency"("code") ON DELETE SET NULL ON UPDATE CASCADE;
