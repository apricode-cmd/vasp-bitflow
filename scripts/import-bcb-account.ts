/**
 * Import existing BCB account into our database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function importBCBAccount() {
  console.log('📥 Importing existing BCB account...\n');
  
  const user = await prisma.user.findUnique({
    where: { email: 'bogdan.apricode@gmail.com' }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  // Use the first Bohdan Kononenko account
  const bcbAccount = {
    correlationId: 'bdf7e09a-b341-4b43-bcc7-b65b570c9c6e',
    iban: 'LU834080000045266012',
    accountNumber: '0045266012',
    bic: 'BCIRLULLXXX',
    name: 'Bohdan Kononenko'
  };

  console.log('Importing BCB account:');
  console.log('  IBAN:', bcbAccount.iban);
  console.log('  Correlation ID:', bcbAccount.correlationId);
  console.log('');

  const imported = await prisma.virtualIbanAccount.create({
    data: {
      userId: user.id,
      providerId: 'BCB_GROUP_VIRTUAL_IBAN',
      providerAccountId: '1208396e-a35e-46b1-b339-c62985bd4699', // BCB account ID
      iban: bcbAccount.iban,
      bic: bcbAccount.bic,
      bankName: 'BCB Partner Bank',
      accountHolder: bcbAccount.name,
      currency: 'EUR',
      country: 'LU',
      status: 'ACTIVE',
      balance: 0,
      lastBalanceUpdate: new Date(),
      metadata: {
        correlationId: bcbAccount.correlationId,
        accountNumber: bcbAccount.accountNumber,
        segregatedAccountId: 93133,
        imported: true,
        importedAt: new Date().toISOString()
      }
    }
  });

  console.log('✅ Account imported successfully!');
  console.log('');
  console.log('Database ID:', imported.id);
  console.log('User can now use this Virtual IBAN');
  console.log('');
  console.log('🔄 Refresh the page to see the account');

  await prisma.$disconnect();
}

importBCBAccount();

