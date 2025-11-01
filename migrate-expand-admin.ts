#!/usr/bin/env ts-node
/**
 * Migration Script: Expand Admin Profile
 * 
 * Adds required fields to existing Admin records:
 * - workEmail (copy from email)
 * - jobTitle (derived from role)
 * - locale, timezone (defaults)
 * - status enum conversion
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Role to Job Title mapping
const roleToJobTitle: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrator',
  ADMIN: 'Administrator',
  COMPLIANCE: 'Compliance Officer',
  TREASURY_APPROVER: 'Treasury Approver',
  FINANCE: 'Finance Manager',
  SUPPORT: 'Support Specialist',
  READ_ONLY: 'Observer',
};

async function main() {
  console.log('🔄 Starting Admin Profile migration...\n');

  // Get all existing admins
  const admins = await prisma.$queryRaw<any[]>`
    SELECT id, email, "firstName", "lastName", role, "isActive", "isSuspended"
    FROM "Admin"
  `;

  console.log(`📊 Found ${admins.length} admin(s) to migrate\n`);

  for (const admin of admins) {
    console.log(`Processing: ${admin.email} (${admin.role})`);

    // Derive job title from role
    const jobTitle = roleToJobTitle[admin.role] || 'Administrator';

    // Determine status
    let status = 'ACTIVE';
    if (admin.isSuspended) {
      status = 'SUSPENDED';
    } else if (!admin.isActive) {
      status = 'TERMINATED';
    }

    // Update admin with new fields
    await prisma.$executeRaw`
      UPDATE "Admin"
      SET 
        "workEmail" = ${admin.email},
        "jobTitle" = ${jobTitle},
        "locale" = 'en',
        "timezone" = 'UTC',
        "status" = ${status}::"AdminStatus",
        "orgId" = 'default',
        "canInitiatePayout" = ${admin.role === 'ADMIN' || admin.role === 'SUPER_ADMIN'},
        "canApprovePayout" = ${admin.role === 'TREASURY_APPROVER' || admin.role === 'SUPER_ADMIN'}
      WHERE id = ${admin.id}
    `;

    console.log(`✅ Updated: ${admin.email} → ${jobTitle}`);
  }

  console.log(`\n✨ Migration completed successfully!\n`);
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

