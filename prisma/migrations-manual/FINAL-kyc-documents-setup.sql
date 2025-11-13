-- ================================================================
-- 🚀 FINAL KYC Documents Setup for Supabase
-- ================================================================
-- Этот скрипт выполняет:
-- 1. Добавляет поля dependsOn и showWhen (conditional logic)
-- 2. Добавляет новые поля документов (passport, proof of address)
-- 3. Обновляет id_type options
-- 4. Настраивает conditional logic для всех документов
-- 
-- ⚠️ ВАЖНО: Запускать в Supabase SQL Editor
-- ================================================================

-- ================================================================
-- STEP 1: Add conditional logic fields (dependsOn, showWhen)
-- ================================================================
ALTER TABLE "KycFormField" 
ADD COLUMN IF NOT EXISTS "dependsOn" TEXT,
ADD COLUMN IF NOT EXISTS "showWhen" JSONB;

CREATE INDEX IF NOT EXISTS "KycFormField_dependsOn_idx" 
ON "KycFormField"("dependsOn");

-- ================================================================
-- STEP 2: Update id_issuing_country to use 'country' fieldType
-- ================================================================
UPDATE "KycFormField"
SET 
  "fieldType" = 'country',
  "options" = NULL,
  "updatedAt" = NOW()
WHERE "fieldName" = 'id_issuing_country';

-- ================================================================
-- STEP 3: Add passport_number field
-- ================================================================
INSERT INTO "KycFormField" (
  "id",
  "fieldName",
  "label",
  "fieldType",
  "category",
  "isRequired",
  "isEnabled",
  "priority",
  "validation",
  "dependsOn",
  "showWhen",
  "createdAt",
  "updatedAt"
)
VALUES (
  'kyc-field-passport_number',
  'passport_number',
  'Passport Number',
  'text',
  'documents',
  false,
  true,
  28,
  '{"minLength": 5, "maxLength": 20}'::jsonb,
  'id_type',
  '{"operator": "==", "value": "passport"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT ("fieldName") 
DO UPDATE SET
  "label" = EXCLUDED."label",
  "fieldType" = EXCLUDED."fieldType",
  "category" = EXCLUDED."category",
  "isRequired" = EXCLUDED."isRequired",
  "isEnabled" = EXCLUDED."isEnabled",
  "priority" = EXCLUDED."priority",
  "validation" = EXCLUDED."validation",
  "dependsOn" = EXCLUDED."dependsOn",
  "showWhen" = EXCLUDED."showWhen",
  "updatedAt" = NOW();

-- ================================================================
-- STEP 4: Add passport_scan field
-- ================================================================
INSERT INTO "KycFormField" (
  "id",
  "fieldName",
  "label",
  "fieldType",
  "category",
  "isRequired",
  "isEnabled",
  "priority",
  "validation",
  "dependsOn",
  "showWhen",
  "createdAt",
  "updatedAt"
)
VALUES (
  'kyc-field-passport_scan',
  'passport_scan',
  'Passport Scan',
  'file',
  'documents',
  false,
  true,
  29,
  '{"acceptedFormats": ["image/jpeg", "image/png", "application/pdf"], "maxSize": 10485760}'::jsonb,
  'id_type',
  '{"operator": "==", "value": "passport"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT ("fieldName") 
DO UPDATE SET
  "label" = EXCLUDED."label",
  "fieldType" = EXCLUDED."fieldType",
  "category" = EXCLUDED."category",
  "isRequired" = EXCLUDED."isRequired",
  "isEnabled" = EXCLUDED."isEnabled",
  "priority" = EXCLUDED."priority",
  "validation" = EXCLUDED."validation",
  "dependsOn" = EXCLUDED."dependsOn",
  "showWhen" = EXCLUDED."showWhen",
  "updatedAt" = NOW();

-- ================================================================
-- STEP 5: Update id_type options
-- ================================================================
UPDATE "KycFormField"
SET 
  "options" = '["passport", "id_card", "drivers_license"]'::jsonb,
  "updatedAt" = NOW()
WHERE "fieldName" = 'id_type';

-- ================================================================
-- STEP 6: Add conditional logic to id_number
-- ================================================================
UPDATE "KycFormField"
SET 
  "dependsOn" = 'id_type',
  "showWhen" = '{"operator": "in", "value": ["id_card", "drivers_license"]}'::jsonb,
  "isRequired" = true,
  "updatedAt" = NOW()
WHERE "fieldName" = 'id_number';

-- ================================================================
-- STEP 7: Add conditional logic to id_scan_front (REQUIRED!)
-- ================================================================
UPDATE "KycFormField"
SET 
  "dependsOn" = 'id_type',
  "showWhen" = '{"operator": "in", "value": ["id_card", "drivers_license"]}'::jsonb,
  "isRequired" = true,
  "updatedAt" = NOW()
WHERE "fieldName" = 'id_scan_front';

-- ================================================================
-- STEP 8: Add conditional logic to id_scan_back (REQUIRED!)
-- ================================================================
UPDATE "KycFormField"
SET 
  "dependsOn" = 'id_type',
  "showWhen" = '{"operator": "in", "value": ["id_card", "drivers_license"]}'::jsonb,
  "isRequired" = true,
  "updatedAt" = NOW()
WHERE "fieldName" = 'id_scan_back';

-- ================================================================
-- STEP 9: Add conditional logic to date fields
-- ================================================================
UPDATE "KycFormField"
SET 
  "dependsOn" = 'id_type',
  "showWhen" = '{"operator": "in", "value": ["id_card", "drivers_license"]}'::jsonb,
  "updatedAt" = NOW()
WHERE "fieldName" = 'id_issue_date';

UPDATE "KycFormField"
SET 
  "dependsOn" = 'id_type',
  "showWhen" = '{"operator": "in", "value": ["passport", "id_card", "drivers_license"]}'::jsonb,
  "isRequired" = true,
  "updatedAt" = NOW()
WHERE "fieldName" = 'id_expiry_date';

UPDATE "KycFormField"
SET 
  "dependsOn" = 'id_type',
  "showWhen" = '{"operator": "in", "value": ["passport", "id_card", "drivers_license"]}'::jsonb,
  "updatedAt" = NOW()
WHERE "fieldName" = 'id_issuing_authority';

-- ================================================================
-- STEP 10: Add proof_of_address_type field (in address category!)
-- ================================================================
INSERT INTO "KycFormField" (
  "id",
  "fieldName",
  "label",
  "fieldType",
  "category",
  "isRequired",
  "isEnabled",
  "priority",
  "options",
  "createdAt",
  "updatedAt"
)
VALUES (
  'kyc-field-proof_of_address_type',
  'proof_of_address_type',
  'Proof of Address Type',
  'select',
  'address',
  false,
  true,
  25,
  '["utility_bill", "bank_statement", "tax_statement", "rental_agreement", "other"]'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT ("fieldName") 
DO UPDATE SET
  "label" = EXCLUDED."label",
  "fieldType" = EXCLUDED."fieldType",
  "category" = EXCLUDED."category",
  "isRequired" = EXCLUDED."isRequired",
  "isEnabled" = EXCLUDED."isEnabled",
  "priority" = EXCLUDED."priority",
  "options" = EXCLUDED."options",
  "updatedAt" = NOW();

-- ================================================================
-- STEP 11: Add proof_of_address field (REQUIRED, in address category!)
-- ================================================================
INSERT INTO "KycFormField" (
  "id",
  "fieldName",
  "label",
  "fieldType",
  "category",
  "isRequired",
  "isEnabled",
  "priority",
  "validation",
  "createdAt",
  "updatedAt"
)
VALUES (
  'kyc-field-proof_of_address',
  'proof_of_address',
  'Proof of Address',
  'file',
  'address',
  true,
  true,
  26,
  '{"acceptedFormats": ["image/jpeg", "image/png", "application/pdf"], "maxSize": 10485760}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT ("fieldName") 
DO UPDATE SET
  "label" = EXCLUDED."label",
  "fieldType" = EXCLUDED."fieldType",
  "category" = EXCLUDED."category",
  "isRequired" = EXCLUDED."isRequired",
  "isEnabled" = EXCLUDED."isEnabled",
  "priority" = EXCLUDED."priority",
  "validation" = EXCLUDED."validation",
  "updatedAt" = NOW();

-- ================================================================
-- ✅ VERIFICATION QUERY (run after migration)
-- ================================================================
-- SELECT 
--   "fieldName", 
--   "fieldType", 
--   "category", 
--   "isRequired", 
--   "isEnabled", 
--   "priority",
--   "dependsOn",
--   "showWhen"
-- FROM "KycFormField"
-- WHERE "category" = 'documents'
-- ORDER BY "priority" ASC;

-- ================================================================
-- ✅ EXPECTED RESULT (documents category):
-- ================================================================
-- passport_number       | text    | documents | false | true  | 28   | id_type | {"operator":"==","value":"passport"}
-- passport_scan         | file    | documents | false | true  | 29   | id_type | {"operator":"==","value":"passport"}
-- id_type               | select  | documents | true  | true  | 30   | NULL    | NULL
-- id_number             | text    | documents | true  | true  | 31   | id_type | {"operator":"in","value":["id_card","drivers_license"]}
-- id_issuing_country    | country | documents | true  | true  | 32   | id_type | {"operator":"in","value":["passport","id_card","drivers_license"]}
-- id_issuing_authority  | text    | documents | false | true  | 33   | id_type | {"operator":"in","value":["passport","id_card","drivers_license"]}
-- id_issue_date         | date    | documents | false | true  | 34   | id_type | {"operator":"in","value":["id_card","drivers_license"]}
-- id_expiry_date        | date    | documents | true  | true  | 35   | id_type | {"operator":"in","value":["passport","id_card","drivers_license"]}
-- id_scan_front         | file    | documents | true  | true  | 36   | id_type | {"operator":"in","value":["id_card","drivers_license"]}
-- id_scan_back          | file    | documents | true  | true  | 37   | id_type | {"operator":"in","value":["id_card","drivers_license"]}
-- liveness_selfie       | file    | documents | false | true  | 38   | NULL    | NULL
--
-- ✅ EXPECTED RESULT (address category):
-- ================================================================
-- proof_of_address_type | select  | address   | false | true  | 25   | NULL    | NULL
-- proof_of_address      | file    | address   | true  | true  | 26   | NULL    | NULL

-- ================================================================
-- 🎉 SUCCESS! All document fields configured with conditional logic
-- ================================================================

-- ================================================================
-- STEP 12: ADD userId TO KycDocument (Allow uploads before session)
-- ================================================================

-- Add userId column
ALTER TABLE "KycDocument"
ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Populate userId from existing kycSessions (for existing records)
UPDATE "KycDocument" d
SET "userId" = s."userId"
FROM "KycSession" s
WHERE d."kycSessionId" = s."id"
AND d."userId" IS NULL;

-- Set NOT NULL constraint (after populating)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'KycDocument' 
    AND column_name = 'userId' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "KycDocument"
    ALTER COLUMN "userId" SET NOT NULL;
  END IF;
END $$;

-- Make kycSessionId optional (drop NOT NULL)
ALTER TABLE "KycDocument"
ALTER COLUMN "kycSessionId" DROP NOT NULL;

-- Add foreign key constraint for userId (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'KycDocument_userId_fkey'
  ) THEN
    ALTER TABLE "KycDocument"
    ADD CONSTRAINT "KycDocument_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Add index on userId (if not exists)
CREATE INDEX IF NOT EXISTS "KycDocument_userId_idx" ON "KycDocument"("userId");

-- ================================================================
-- STEP 8: Add gender field to Profile (UserProfile)
-- ================================================================
-- Required for Sumsub APPLICANT_DATA completion
ALTER TABLE "Profile" 
ADD COLUMN IF NOT EXISTS "gender" TEXT;

-- Add constraint for valid values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'Profile_gender_check'
  ) THEN
    ALTER TABLE "Profile"
    ADD CONSTRAINT "Profile_gender_check" 
    CHECK ("gender" IS NULL OR "gender" IN ('M', 'F', 'O'));
  END IF;
END $$;

-- Add gender field to Sumsub KYC form (Step 1: Personal Information)
INSERT INTO "KycFormField" (
  "id",
  "fieldName",
  "label",
  "fieldType",
  "category",
  "isRequired",
  "isEnabled",
  "priority",
  "validation",
  "createdAt",
  "updatedAt"
)
SELECT 
  gen_random_uuid(),
  'gender',
  'Gender',
  'select',
  'Personal Information',
  false,
  true,
  85,
  jsonb_build_object(
    'options', jsonb_build_array(
      jsonb_build_object('value', 'M', 'label', 'Male'),
      jsonb_build_object('value', 'F', 'label', 'Female'),
      jsonb_build_object('value', 'O', 'label', 'Other')
    )
  ),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "KycFormField" 
  WHERE "fieldName" = 'gender'
);

-- ================================================================
-- 🎉 FINAL SUCCESS!
-- Now users can:
-- 1. Upload documents BEFORE completing KYC form
-- 2. Documents stored in Vercel Blob → sent to Sumsub on final submit
-- 3. Complete APPLICANT_DATA with all required fields (including gender)
-- ================================================================

