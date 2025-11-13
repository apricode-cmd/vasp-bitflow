#!/usr/bin/env tsx
/**
 * Check admin status by email
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'admin@apricode.agecny';
  
  console.log(`🔍 Checking admin: ${email}\n`);

  const admin = await prisma.admin.findFirst({
    where: {
      OR: [
        { email },
        { workEmail: email }
      ]
    },
    include: {
      twoFactorAuth: true
    }
  });

  if (!admin) {
    console.log('❌ Admin not found');
    return;
  }

  console.log('📊 Admin Status:');
  console.log(`   ID: ${admin.id}`);
  console.log(`   Email: ${admin.email || admin.workEmail}`);
  console.log(`   Status: ${admin.status}`);
  console.log(`   isActive: ${admin.isActive}`);
  console.log(`   isSuspended: ${admin.isSuspended}`);
  console.log(`   authMethod: ${admin.authMethod}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   Has Password: ${!!admin.password}`);
  console.log(`   TOTP Enabled: ${admin.twoFactorAuth?.totpEnabled || false}`);
  console.log(`   Last Login: ${admin.lastLogin?.toISOString() || 'Never'}`);
  console.log('');

  if (admin.status !== 'ACTIVE') {
    console.log('⚠️  Admin is not ACTIVE');
    console.log('   Run fix: npx tsx scripts/activate-admin.ts', email);
  }

  if (!admin.isActive) {
    console.log('⚠️  isActive is false');
  }

  if (admin.isSuspended) {
    console.log('⚠️  Admin is suspended');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

