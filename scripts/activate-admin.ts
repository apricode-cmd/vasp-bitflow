#!/usr/bin/env tsx
/**
 * Activate admin manually (set isActive = true)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx tsx scripts/activate-admin.ts <email>');
    process.exit(1);
  }

  console.log(`🔧 Activating admin: ${email}\n`);

  const admin = await prisma.admin.findFirst({
    where: {
      OR: [
        { email },
        { workEmail: email }
      ]
    }
  });

  if (!admin) {
    console.error('❌ Admin not found');
    process.exit(1);
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      isActive: true
    }
  });

  console.log('✅ Admin activated successfully!');
  console.log(`   ID: ${admin.id}`);
  console.log(`   Email: ${admin.email || admin.workEmail}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

