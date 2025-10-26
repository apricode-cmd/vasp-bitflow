-- Add CurrencyType enum
CREATE TYPE "CurrencyType" AS ENUM ('FIAT', 'CRYPTO');

-- Update PayIn table
ALTER TABLE "PayIn" ADD COLUMN IF NOT EXISTS "currencyType" "CurrencyType" NOT NULL DEFAULT 'FIAT';
ALTER TABLE "PayIn" ADD COLUMN IF NOT EXISTS "networkCode" TEXT;
ALTER TABLE "PayIn" ADD COLUMN IF NOT EXISTS "senderAddress" TEXT;
ALTER TABLE "PayIn" ADD COLUMN IF NOT EXISTS "transactionHash" TEXT;
ALTER TABLE "PayIn" ADD COLUMN IF NOT EXISTS "blockNumber" INTEGER;
ALTER TABLE "PayIn" ADD COLUMN IF NOT EXISTS "confirmations" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PayIn" ADD COLUMN IF NOT EXISTS "explorerUrl" TEXT;
ALTER TABLE "PayIn" ALTER COLUMN "paymentMethodCode" DROP NOT NULL;

-- Add indexes for PayIn
CREATE INDEX IF NOT EXISTS "PayIn_transactionHash_idx" ON "PayIn"("transactionHash");
CREATE INDEX IF NOT EXISTS "PayIn_currencyType_idx" ON "PayIn"("currencyType");

-- Update PayOut table  
ALTER TABLE "PayOut" ADD COLUMN IF NOT EXISTS "currencyType" "CurrencyType" NOT NULL DEFAULT 'CRYPTO';
ALTER TABLE "PayOut" ADD COLUMN IF NOT EXISTS "recipientName" TEXT;
ALTER TABLE "PayOut" ADD COLUMN IF NOT EXISTS "recipientAccount" TEXT;
ALTER TABLE "PayOut" ADD COLUMN IF NOT EXISTS "recipientBank" TEXT;
ALTER TABLE "PayOut" ADD COLUMN IF NOT EXISTS "paymentReference" TEXT;
ALTER TABLE "PayOut" ADD COLUMN IF NOT EXISTS "bankTransactionId" TEXT;
ALTER TABLE "PayOut" ADD COLUMN IF NOT EXISTS "paymentMethodCode" TEXT;
ALTER TABLE "PayOut" ALTER COLUMN "networkCode" DROP NOT NULL;
ALTER TABLE "PayOut" ALTER COLUMN "destinationAddress" DROP NOT NULL;
ALTER TABLE "PayOut" ALTER COLUMN "networkFee" DROP NOT NULL;
ALTER TABLE "PayOut" ALTER COLUMN "networkFeeCurrency" DROP NOT NULL;

-- Add indexes for PayOut
CREATE INDEX IF NOT EXISTS "PayOut_currencyType_idx" ON "PayOut"("currencyType");

-- Add foreign key constraints
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_networkCode_fkey" 
  FOREIGN KEY ("networkCode") REFERENCES "BlockchainNetwork"("code") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_paymentMethodCode_fkey" 
  FOREIGN KEY ("paymentMethodCode") REFERENCES "PaymentMethod"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update currencyType based on existing data
UPDATE "PayIn" 
SET "currencyType" = CASE 
  WHEN "currency" IN ('BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'MATIC', 'SOL', 'TRX') THEN 'CRYPTO'::"CurrencyType"
  ELSE 'FIAT'::"CurrencyType"
END;

UPDATE "PayOut" 
SET "currencyType" = CASE 
  WHEN "currency" IN ('BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'MATIC', 'SOL', 'TRX') THEN 'CRYPTO'::"CurrencyType"
  ELSE 'FIAT'::"CurrencyType"
END;

