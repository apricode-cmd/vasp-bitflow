/**
 * Test Pagination Script
 * Creates 150 test users to verify server-side pagination works correctly
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Creating test data for pagination...\n');

  // Find or create admin
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!admin) {
    console.error('❌ No admin found. Please run demo data script first.');
    process.exit(1);
  }

  console.log(`✅ Using admin: ${admin.email}\n`);

  // Create 150 test users
  const hashedPassword = await bcrypt.hash('test123', 10);
  
  console.log('📝 Creating 150 test users...');
  
  for (let i = 1; i <= 150; i++) {
    const email = `testuser${i}@pagination.test`;
    
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`  ⏩ Skipping ${email} (already exists)`);
      continue;
    }

    await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        role: 'CLIENT',
        isActive: Math.random() > 0.2, // 80% active
        profile: {
          create: {
            firstName: `Test`,
            lastName: `User ${i}`,
            phoneNumber: `+1${String(i).padStart(10, '0')}`,
            country: ['US', 'GB', 'DE', 'FR', 'ES'][i % 5],
            dateOfBirth: new Date(1990, 0, i % 28 + 1),
            address: `${i} Test St`,
            city: ['New York', 'London', 'Berlin', 'Paris', 'Madrid'][i % 5],
            postalCode: String(10000 + i),
            idNumber: `TEST${String(i).padStart(6, '0')}`
          }
        }
      }
    });

    if (i % 10 === 0) {
      console.log(`  ✓ Created ${i} users`);
    }
  }

  console.log('\n✅ Test data created successfully!\n');

  // Show stats
  const totalUsers = await prisma.user.count({ where: { role: 'CLIENT' } });
  const activeUsers = await prisma.user.count({ where: { role: 'CLIENT', isActive: true } });

  console.log('📊 Statistics:');
  console.log(`  • Total CLIENT users: ${totalUsers}`);
  console.log(`  • Active users: ${activeUsers}`);
  console.log(`  • Inactive users: ${totalUsers - activeUsers}\n`);

  console.log('🧪 Test pagination at:');
  console.log('  • http://localhost:3000/admin/users');
  console.log('  • Try changing page size (20, 50, 100)');
  console.log('  • Try navigating between pages');
  console.log('  • Try filtering by status\n');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

