/**
 * Disable old purpose_of_account field on REMOTE Supabase
 * 
 * Usage:
 * Run: SUPABASE_URL="postgres://postgres.xxx:password@aws-1-eu-central-1.pooler.supabase.com:5432/postgres" npx tsx prisma/disable-purpose-remote.ts
 */

import { PrismaClient } from '@prisma/client';

// Use DIRECT connection (port 5432) for UPDATE queries, not pooler (6543)
const SUPABASE_DIRECT_URL = process.env.SUPABASE_URL || process.env.DIRECT_URL || 
  'postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

const prisma = new PrismaClient({
  datasourceUrl: SUPABASE_DIRECT_URL
});

async function disablePurposeOfAccount() {
  console.log('🔧 Disabling old purpose_of_account field on REMOTE Supabase...\n');
  
  const host = SUPABASE_DIRECT_URL.split('@')[1]?.split('/')[0] || 'unknown';
  const port = SUPABASE_DIRECT_URL.includes(':5432') ? '5432 (DIRECT)' : '6543 (POOLER)';
  
  console.log('📡 Connected to:', host);
  console.log('🔌 Port:', port);
  console.log('');

  // Disable old purpose_of_account field
  const result = await prisma.kycFormField.updateMany({
    where: {
      fieldName: 'purpose_of_account'
    },
    data: {
      isEnabled: false,
      isRequired: false
    }
  });

  console.log(`✅ Disabled ${result.count} field(s) with fieldName='purpose_of_account'\n`);

  // Check current state
  const purposeFields = await prisma.kycFormField.findMany({
    where: {
      fieldName: {
        in: ['purpose', 'purpose_of_account', 'purpose_note']
      }
    },
    orderBy: { priority: 'asc' }
  });

  console.log('📋 Current purpose-related fields on REMOTE:');
  purposeFields.forEach(f => {
    const status = f.isEnabled ? '✅ ENABLED' : '❌ DISABLED';
    const required = f.isRequired ? 'REQUIRED' : 'optional';
    console.log(`  ${status} - ${f.fieldName} (${f.fieldType}): ${required}, label="${f.label}"`);
  });
  
  console.log('\n💡 Tip: Clear browser cache or open in incognito to see changes immediately');
}

disablePurposeOfAccount()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

