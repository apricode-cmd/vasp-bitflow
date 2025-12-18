/**
 * Get full details of PENDING account
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getPendingAccountDetails() {
  const account = await prisma.virtualIbanAccount.findFirst({
    where: {
      status: 'PENDING'
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      user: {
        include: {
          profile: true
        }
      }
    }
  });

  if (!account) {
    console.log('No PENDING accounts found');
    return;
  }

  console.log('📋 PENDING Account Details:\n');
  console.log(JSON.stringify(account, null, 2));

  await prisma.$disconnect();
}

getPendingAccountDetails();

