-- Migration: Currency <-> BlockchainNetwork Many-to-Many Relationship
-- This allows currencies like USDC to exist on multiple blockchains (Ethereum, Polygon, Solana, etc.)

-- 1. Create the CurrencyBlockchainNetwork join table
CREATE TABLE "CurrencyBlockchainNetwork" (
    "id" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "blockchainCode" TEXT NOT NULL,
    "contractAddress" TEXT,
    "isNative" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencyBlockchainNetwork_pkey" PRIMARY KEY ("id")
);

-- 2. Add unique constraint for currency-blockchain pair
CREATE UNIQUE INDEX "CurrencyBlockchainNetwork_currencyCode_blockchainCode_key" ON "CurrencyBlockchainNetwork"("currencyCode", "blockchainCode");

-- 3. Add indexes for performance
CREATE INDEX "CurrencyBlockchainNetwork_currencyCode_idx" ON "CurrencyBlockchainNetwork"("currencyCode");
CREATE INDEX "CurrencyBlockchainNetwork_blockchainCode_idx" ON "CurrencyBlockchainNetwork"("blockchainCode");
CREATE INDEX "CurrencyBlockchainNetwork_isActive_idx" ON "CurrencyBlockchainNetwork"("isActive");

-- 4. Add foreign key constraints
ALTER TABLE "CurrencyBlockchainNetwork" ADD CONSTRAINT "CurrencyBlockchainNetwork_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurrencyBlockchainNetwork" ADD CONSTRAINT "CurrencyBlockchainNetwork_blockchainCode_fkey" FOREIGN KEY ("blockchainCode") REFERENCES "BlockchainNetwork"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Migrate existing data from Currency.chain to CurrencyBlockchainNetwork
-- Insert records for tokens that have a chain specified
INSERT INTO "CurrencyBlockchainNetwork" ("id", "currencyCode", "blockchainCode", "contractAddress", "isNative", "isActive", "priority", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    "code",
    "chain",
    "contractAddress",
    false, -- isNative = false for tokens
    "isActive",
    0, -- priority
    NOW(),
    NOW()
FROM "Currency"
WHERE "chain" IS NOT NULL AND "isToken" = true;

-- Insert records for native coins (BTC, ETH, SOL, etc.)
-- BTC on BITCOIN
INSERT INTO "CurrencyBlockchainNetwork" ("id", "currencyCode", "blockchainCode", "contractAddress", "isNative", "isActive", "priority", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    'BTC',
    'BITCOIN',
    NULL,
    true, -- isNative
    true,
    0,
    NOW(),
    NOW()
WHERE EXISTS (SELECT 1 FROM "Currency" WHERE "code" = 'BTC')
  AND EXISTS (SELECT 1 FROM "BlockchainNetwork" WHERE "code" = 'BITCOIN')
  AND NOT EXISTS (SELECT 1 FROM "CurrencyBlockchainNetwork" WHERE "currencyCode" = 'BTC' AND "blockchainCode" = 'BITCOIN');

-- ETH on ETHEREUM
INSERT INTO "CurrencyBlockchainNetwork" ("id", "currencyCode", "blockchainCode", "contractAddress", "isNative", "isActive", "priority", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    'ETH',
    'ETHEREUM',
    NULL,
    true,
    true,
    0,
    NOW(),
    NOW()
WHERE EXISTS (SELECT 1 FROM "Currency" WHERE "code" = 'ETH')
  AND EXISTS (SELECT 1 FROM "BlockchainNetwork" WHERE "code" = 'ETHEREUM')
  AND NOT EXISTS (SELECT 1 FROM "CurrencyBlockchainNetwork" WHERE "currencyCode" = 'ETH' AND "blockchainCode" = 'ETHEREUM');

-- SOL on SOLANA
INSERT INTO "CurrencyBlockchainNetwork" ("id", "currencyCode", "blockchainCode", "contractAddress", "isNative", "isActive", "priority", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    'SOL',
    'SOLANA',
    NULL,
    true,
    true,
    0,
    NOW(),
    NOW()
WHERE EXISTS (SELECT 1 FROM "Currency" WHERE "code" = 'SOL')
  AND EXISTS (SELECT 1 FROM "BlockchainNetwork" WHERE "code" = 'SOLANA')
  AND NOT EXISTS (SELECT 1 FROM "CurrencyBlockchainNetwork" WHERE "currencyCode" = 'SOL' AND "blockchainCode" = 'SOLANA');

-- TRX on TRON
INSERT INTO "CurrencyBlockchainNetwork" ("id", "currencyCode", "blockchainCode", "contractAddress", "isNative", "isActive", "priority", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    'TRX',
    'TRON',
    NULL,
    true,
    true,
    0,
    NOW(),
    NOW()
WHERE EXISTS (SELECT 1 FROM "Currency" WHERE "code" = 'TRX')
  AND EXISTS (SELECT 1 FROM "BlockchainNetwork" WHERE "code" = 'TRON')
  AND NOT EXISTS (SELECT 1 FROM "CurrencyBlockchainNetwork" WHERE "currencyCode" = 'TRX' AND "blockchainCode" = 'TRON');

-- 6. Add minOrderAmount and maxOrderAmount to Currency table
ALTER TABLE "Currency" ADD COLUMN IF NOT EXISTS "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.001;
ALTER TABLE "Currency" ADD COLUMN IF NOT EXISTS "maxOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 100;

-- 7. Add symbol to BlockchainNetwork (if not exists)
ALTER TABLE "BlockchainNetwork" ADD COLUMN IF NOT EXISTS "symbol" TEXT;

-- 8. Drop old columns from Currency (chain, contractAddress) - moved to CurrencyBlockchainNetwork
ALTER TABLE "Currency" DROP COLUMN IF EXISTS "chain";
ALTER TABLE "Currency" DROP COLUMN IF EXISTS "contractAddress";

-- 9. Drop old index on chain (no longer exists)
DROP INDEX IF EXISTS "Currency_chain_idx";

