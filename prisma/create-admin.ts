/**
 * Create Admin Script
 * 
 * Creates a new admin user without password (Passkey-only)
 * Generates invite link for Passkey setup
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.argv[2];
  const firstName = process.argv[3] || 'Admin';
  const lastName = process.argv[4] || 'User';
  const role = (process.argv[5] || 'ADMIN') as any;

  if (!email) {
    console.error('❌ Usage: npx tsx prisma/create-admin.ts <email> [firstName] [lastName] [role]');
    console.error('Example: npx tsx prisma/create-admin.ts admin@apricode.io John Doe SUPER_ADMIN');
    process.exit(1);
  }

  try {
    // Check if admin already exists
    const existing = await prisma.admin.findUnique({
      where: { email }
    });

    if (existing) {
      console.error(`❌ Admin with email ${email} already exists`);
      process.exit(1);
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        email,
        firstName,
        lastName,
        role,
        authMethod: 'PASSKEY',
        password: null, // No password - Passkey only!
        isActive: true,
      }
    });

    console.log('\n✅ Admin created successfully!');
    console.log('\n📊 Admin Details:');
    console.log(`   ID:         ${admin.id}`);
    console.log(`   Email:      ${admin.email}`);
    console.log(`   Name:       ${admin.firstName} ${admin.lastName}`);
    console.log(`   Role:       ${admin.role}`);
    console.log(`   Auth:       Passkey (passwordless)`);
    console.log(`   Created:    ${admin.createdAt.toISOString()}`);

    console.log('\n🔑 Setup Passkey:');
    console.log(`   URL: http://localhost:3000/admin/auth/setup-passkey?token=${inviteToken}&email=${encodeURIComponent(email)}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Open the URL above in your browser');
    console.log('   2. Click "Register Passkey"');
    console.log('   3. Use Face ID / Touch ID to register');
    console.log('   4. Login at /admin/auth/login with Passkey');

    console.log('\n⏰ This invite link expires in 24 hours');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

