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
-- STEP 10: Add proof_of_address_type field
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
  'documents',
  false,
  true,
  38.5,
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
-- STEP 11: Add proof_of_address field (REQUIRED!)
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
  'documents',
  true,
  true,
  39,
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
-- ✅ EXPECTED RESULT:
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
-- proof_of_address_type | select  | documents | false | true  | 38.5 | NULL    | NULL
-- proof_of_address      | file    | documents | true  | true  | 39   | NULL    | NULL

-- ================================================================
-- 🎉 SUCCESS! All document fields configured with conditional logic
-- ================================================================

