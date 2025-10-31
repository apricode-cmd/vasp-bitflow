/**
 * Migrate Admins Script
 * 
 * Migrates existing ADMIN users from User table to new Admin table
 * Preserves all data and creates AdminSettings for each admin
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function migrateAdmins() {
  console.log('🔄 Starting admin migration from User to Admin table...\n');

  try {
    // 1. Find all ADMIN users
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      include: {
        profile: true,
        twoFactorAuth: true,
        adminSettings: true
      }
    });

    console.log(`📊 Found ${adminUsers.length} admin users to migrate`);

    if (adminUsers.length === 0) {
      console.log('✅ No admins to migrate');
      return;
    }

    // 2. Migrate each admin
    for (const user of adminUsers) {
      console.log(`\n🔄 Migrating: ${user.email}`);

      try {
        // Check if already migrated
        const existingAdmin = await prisma.admin.findUnique({
          where: { email: user.email }
        });

        if (existingAdmin) {
          console.log(`  ⏭️  Already migrated (skipping)`);
          continue;
        }

        // Create admin
        const admin = await prisma.admin.create({
          data: {
            email: user.email,
            password: user.password,
            firstName: user.profile?.firstName || 'Admin',
            lastName: user.profile?.lastName || 'User',
            role: 'ADMIN', // Default role, can be changed later
            authMethod: 'PASSWORD',
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        });

        console.log(`  ✅ Admin created: ${admin.id}`);

        // Create AdminTwoFactorAuth if exists
        if (user.twoFactorAuth) {
          await prisma.adminTwoFactorAuth.create({
            data: {
              adminId: admin.id,
              totpEnabled: user.twoFactorAuth.totpEnabled,
              totpSecret: user.twoFactorAuth.totpSecret,
              totpVerifiedAt: user.twoFactorAuth.totpVerifiedAt,
              webAuthnEnabled: false,
              webAuthnRequired: false,
              backupCodes: user.twoFactorAuth.backupCodes,
              preferredMethod: 'TOTP'
            }
          });
          console.log(`  ✅ 2FA settings migrated`);
        }

        // Create AdminSettings
        if (user.adminSettings) {
          await prisma.adminSettings.create({
            data: {
              adminId: admin.id,
              idleTimeout: 15, // New default
              maxSessionDuration: 8,
              sessionTimeout: user.adminSettings.sessionTimeout,
              twoFactorEnabled: user.adminSettings.twoFactorEnabled,
              twoFactorMethod: user.adminSettings.twoFactorMethod,
              loginNotifications: user.adminSettings.loginNotifications,
              activityDigest: user.adminSettings.activityDigest,
              securityAlerts: user.adminSettings.securityAlerts,
              allowedIPs: user.adminSettings.allowedIPs,
              blockUnknownDevices: user.adminSettings.blockUnknownDevices,
              logAllActions: user.adminSettings.logAllActions,
              retainLogsFor: user.adminSettings.retainLogsFor
            }
          });
          console.log(`  ✅ AdminSettings migrated`);
        } else {
          // Create default settings
          await prisma.adminSettings.create({
            data: {
              adminId: admin.id,
              idleTimeout: 15,
              maxSessionDuration: 8
            }
          });
          console.log(`  ✅ Default AdminSettings created`);
        }

        console.log(`  ✨ Migration complete for ${user.email}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate ${user.email}:`, error);
      }
    }

    // 3. Summary
    const totalAdmins = await prisma.admin.count();
    console.log(`\n✅ Migration complete!`);
    console.log(`📊 Total admins in Admin table: ${totalAdmins}`);

    // 4. Optionally update audit logs to point to new admin IDs
    console.log(`\n🔄 Updating audit logs...`);
    
    for (const user of adminUsers) {
      const admin = await prisma.admin.findUnique({
        where: { email: user.email }
      });

      if (admin) {
        // Update audit logs
        const updated = await prisma.auditLog.updateMany({
          where: { userId: user.id },
          data: { 
            adminId: admin.id,
            userEmail: admin.email,
            userRole: admin.role
          }
        });

        if (updated.count > 0) {
          console.log(`  ✅ Updated ${updated.count} audit logs for ${admin.email}`);
        }
      }
    }

    console.log(`\n✅ All done!`);
    console.log(`\n⚠️  NOTE: Original User records are NOT deleted.`);
    console.log(`   You can manually delete them after verifying the migration.`);
    console.log(`   Or keep them for historical purposes.`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateAdmins()
  .then(() => {
    console.log('\n🎉 Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });

