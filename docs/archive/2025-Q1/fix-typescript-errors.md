# TypeScript Errors - Fixing Plan

## Critical Errors (Must fix before deploy)

### 1. `/admin/kyc/page.tsx` - Missing fields in KycSession
- ✅ Added `userId`, `kycaidApplicantId`, `metadata` to interface
- ⏳ Need to fix `provider` type (should have `isEnabled`, `status`, `service` fields)
- ⏳ Need to fix document type (should have `verificationData` field)

### 2. Prisma Seed Scripts - Type Issues
- `prisma/seed-payment-accounts.ts` - discriminated union type issues
- `prisma/seed.ts` - OrderStatus should use enum instead of string
- `seed-blockchains.ts` - missing dotenv dependency

### 3. Test Scripts - Type Issues  
- `check-kycaid-applicant.ts` - spread types issue
- `create-verification-for-applicant.ts` - formId property access

### 4. Component Issues
- `src/app/(client)/wallets/page.tsx` - CopyButton props type
- Multiple unused imports across pages

## Non-Critical (Can be fixed later)
- Unused imports (TS6133, TS6192)
- Unused variables (TS6133)

## Action Plan

1. Fix critical type errors in KYC page
2. Fix Prisma seed scripts
3. Remove/ignore test scripts from build
4. Fix component prop types
5. Clean up unused imports (optional)

## Commands

```bash
# Check errors
npx tsc --noEmit

# Build (will fail if critical errors exist)
npm run build

# Exclude test scripts from tsconfig
# Add to tsconfig.json: "exclude": ["**/*.test.ts", "test-*.ts", "check-*.ts", "debug-*.ts", "create-*.ts", "seed-*.ts"]
```

