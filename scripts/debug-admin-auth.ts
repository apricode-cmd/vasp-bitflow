#!/usr/bin/env tsx
/**
 * Debug script for admin auth configuration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Admin Auth Configuration\n');

  // 1. Check feature flags
  console.log('1️⃣ Feature Flags:');
  const authEnabled = await prisma.systemSettings.findUnique({
    where: { key: 'adminPasswordAuthEnabled' }
  });
  const authRoles = await prisma.systemSettings.findUnique({
    where: { key: 'adminPasswordAuthForRoles' }
  });

  console.log('   adminPasswordAuthEnabled:', authEnabled?.value || 'NOT SET');
  console.log('   adminPasswordAuthForRoles:', authRoles?.value || 'NOT SET');
  console.log('');

  // 2. Check test admin
  const admin = await prisma.admin.findFirst({
    include: {
      twoFactorAuth: true
    }
  });

  if (admin) {
    console.log('2️⃣ Test Admin:', admin.email);
    console.log('   Role:', admin.role);
    console.log('   Has TOTP:', admin.twoFactorAuth?.totpEnabled || false);
    console.log('   Has Passkeys:', (admin.twoFactorAuth?.passkeyCount || 0) > 0);
  } else {
    console.log('2️⃣ No admin found in database');
  }

  console.log('\n✅ Diagnosis:');
  if (authEnabled?.value === 'false') {
    console.log('   ⚠️  Password+TOTP is DISABLED');
    console.log('   ➡️  Go to /admin/settings → Security tab → Enable it');
  } else if (authEnabled?.value === 'true') {
    console.log('   ✅ Password+TOTP is ENABLED');
    console.log('   ➡️  Try logging in with test admin email');
  } else {
    console.log('   ⚠️  Feature flag not set in database');
    console.log('   ➡️  Run: npm run seed-settings');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

