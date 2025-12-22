/**
 * Check if we have Bohdan Kononenko accounts in our database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findKononenkoAccounts() {
  console.log('🔍 Searching for Bohdan Kononenko accounts in database...\n');
  
  // BCB correlationIds from previous search
  const bcbCorrelationIds = [
    'bdf7e09a-b341-4b43-bcc7-b65b570c9c6e',
    'd07ba202-9619-4b17-9bc6-f5a2ae24a931'
  ];

  console.log('BCB has these accounts:');
  console.log('  1. correlationId:', bcbCorrelationIds[0]);
  console.log('     IBAN: LU834080000045266012');
  console.log('');
  console.log('  2. correlationId:', bcbCorrelationIds[1]);
  console.log('     IBAN: LU594080000045266153');
  console.log('');

  // Check our database
  const accounts = await prisma.virtualIbanAccount.findMany({
    where: {
      OR: [
        { iban: 'LU834080000045266012' },
        { iban: 'LU594080000045266153' }
      ]
    },
    include: {
      user: {
        select: {
          email: true
        }
      }
    }
  });

  if (accounts.length > 0) {
    console.log('✅ Found in our database:\n');
    accounts.forEach((acc, i) => {
      console.log(`${i + 1}. ID: ${acc.id}`);
      console.log(`   IBAN: ${acc.iban}`);
      console.log(`   Status: ${acc.status}`);
      console.log(`   User: ${acc.user.email}`);
      console.log(`   Created: ${acc.createdAt.toISOString()}`);
      console.log('');
    });
  } else {
    console.log('❌ NOT found in our database');
    console.log('');
    console.log('💡 This means:');
    console.log('   - Accounts exist in BCB');
    console.log('   - But not linked to any user in our system');
    console.log('   - Possibly created manually or deleted from our DB');
  }

  await prisma.$disconnect();
}

findKononenkoAccounts();

