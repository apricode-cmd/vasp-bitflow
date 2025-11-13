#!/usr/bin/env tsx
/**
 * List all admins in the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('👥 List of Admins:\n');

  const admins = await prisma.admin.findMany({
    include: {
      twoFactorAuth: true,
      webAuthnCreds: true
    }
  });

  if (admins.length === 0) {
    console.log('   ⚠️  No admins found in database');
    return;
  }

  admins.forEach((admin, i) => {
    console.log(`${i + 1}. Email: ${admin.email || admin.workEmail || 'N/A'}`);
    console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Active: ${admin.isActive ? '✅' : '❌'}`);
    console.log(`   Has Password: ${admin.password ? '✅' : '❌'}`);
    console.log(`   TOTP Enabled: ${admin.twoFactorAuth?.totpEnabled ? '✅' : '❌'}`);
    console.log(`   Passkeys: ${admin.webAuthnCreds.length}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

