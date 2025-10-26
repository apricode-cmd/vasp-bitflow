-- AlterTable: Add keyHash column to ApiKey
-- This migration adds encrypted storage for API keys

-- Step 1: Add new column (nullable first)
ALTER TABLE "ApiKey" ADD COLUMN "keyHash" TEXT;

-- Step 2: Remove unique constraint from 'key' column
ALTER TABLE "ApiKey" DROP CONSTRAINT IF EXISTS "ApiKey_key_key";

-- Step 3: Create unique index on keyHash
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- Step 4: Create index for fast lookups
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- Step 5: Remove old key index if it exists
DROP INDEX IF EXISTS "ApiKey_key_idx";

-- Note: Existing API keys will need to be regenerated as they were hashed with bcrypt
-- The new system uses AES-256-GCM encryption for secure storage

