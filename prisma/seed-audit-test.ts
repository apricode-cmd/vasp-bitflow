/**
 * Seed test audit logs for testing the audit UI
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test audit logs...');

  // Get first admin
  const admin = await prisma.admin.findFirst();
  if (!admin) {
    console.error('❌ No admin found. Please create an admin first.');
    return;
  }

  console.log(`✅ Found admin: ${admin.email}`);

  // Create test AdminAuditLog entries
  const adminLogs = [
    {
      adminId: admin.id,
      adminEmail: admin.email,
      adminRole: admin.role,
      action: 'ADMIN_INVITED',
      entityType: 'Admin',
      entityId: 'test-admin-id-1',
      diffAfter: { email: 'newadmin@test.com', role: 'ADMIN' },
      context: { ipAddress: '192.168.1.1', userAgent: 'Test Browser' },
      severity: 'WARNING',
      mfaRequired: true,
      mfaMethod: 'WEBAUTHN',
      freezeChecksum: crypto.randomBytes(32).toString('hex'),
    },
    {
      adminId: admin.id,
      adminEmail: admin.email,
      adminRole: admin.role,
      action: 'PAYOUT_APPROVED',
      entityType: 'PayOut',
      entityId: 'test-payout-id-1',
      diffBefore: { status: 'PENDING' },
      diffAfter: { status: 'SENT' },
      context: { ipAddress: '192.168.1.1', userAgent: 'Test Browser' },
      severity: 'CRITICAL',
      mfaRequired: true,
      mfaMethod: 'WEBAUTHN',
      isReviewable: true,
      freezeChecksum: crypto.randomBytes(32).toString('hex'),
    },
    {
      adminId: admin.id,
      adminEmail: admin.email,
      adminRole: admin.role,
      action: 'API_KEY_CREATED',
      entityType: 'ApiKey',
      entityId: 'test-apikey-id-1',
      diffAfter: { name: 'Test API Key', permissions: ['READ', 'WRITE'] },
      context: { ipAddress: '192.168.1.1', userAgent: 'Test Browser' },
      severity: 'CRITICAL',
      mfaRequired: true,
      mfaMethod: 'WEBAUTHN',
      freezeChecksum: crypto.randomBytes(32).toString('hex'),
    },
    {
      adminId: admin.id,
      adminEmail: admin.email,
      adminRole: admin.role,
      action: 'ORDER_STATUS_CHANGED',
      entityType: 'Order',
      entityId: 'test-order-id-1',
      diffBefore: { status: 'PENDING' },
      diffAfter: { status: 'COMPLETED' },
      context: { ipAddress: '192.168.1.1', userAgent: 'Test Browser' },
      severity: 'INFO',
      freezeChecksum: crypto.randomBytes(32).toString('hex'),
    },
  ];

  for (const log of adminLogs) {
    await prisma.adminAuditLog.create({ data: log });
  }

  console.log(`✅ Created ${adminLogs.length} admin audit logs`);

  // Get first user
  const user = await prisma.user.findFirst();
  if (user) {
    // Create test UserAuditLog entries
    const userLogs = [
      {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'ORDER_CREATED',
        entityType: 'Order',
        entityId: 'test-order-id-2',
        diffAfter: { amount: 1000, currency: 'BTC' },
        context: { ipAddress: '10.0.0.1', userAgent: 'Client Browser' },
        freezeChecksum: crypto.randomBytes(32).toString('hex'),
      },
      {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'KYC_SUBMITTED',
        entityType: 'KycSession',
        entityId: 'test-kyc-id-1',
        diffAfter: { status: 'PENDING' },
        context: { ipAddress: '10.0.0.1', userAgent: 'Client Browser' },
        freezeChecksum: crypto.randomBytes(32).toString('hex'),
      },
      {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'PROFILE_UPDATED',
        entityType: 'Profile',
        entityId: user.id,
        diffBefore: { firstName: 'Old Name' },
        diffAfter: { firstName: 'New Name' },
        context: { ipAddress: '10.0.0.1', userAgent: 'Client Browser' },
        freezeChecksum: crypto.randomBytes(32).toString('hex'),
      },
    ];

    for (const log of userLogs) {
      await prisma.userAuditLog.create({ data: log });
    }

    console.log(`✅ Created ${userLogs.length} user audit logs`);
  } else {
    console.log('⚠️ No user found, skipping user logs');
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

