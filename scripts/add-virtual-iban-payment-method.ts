/**
 * Script to add VIRTUAL_IBAN payment method to database
 * 
 * Run with: npx ts-node scripts/add-virtual-iban-payment-method.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Adding VIRTUAL_IBAN payment method...\n');

  try {
    const paymentMethod = await prisma.paymentMethod.upsert({
      where: {
        code: 'VIRTUAL_IBAN',
      },
      update: {
        name: 'Virtual IBAN Balance',
        description: 'Pay instantly using your Virtual IBAN balance',
        type: 'VIRTUAL_IBAN',
        direction: 'IN',
        providerType: 'PSP',
        automationLevel: 'FULLY_AUTO',
        currency: 'EUR',
        supportedNetworks: [],
        minAmount: 1.00,
        maxAmount: 999999.00,
        feeFixed: 0.00,
        feePercent: 0.00,
        processingTime: 'instant',
        instructions: 'Your Virtual IBAN balance will be deducted immediately after order confirmation.',
        priority: 1,
        isActive: true,
        isAvailableForClients: true,
        updatedAt: new Date(),
      },
      create: {
        code: 'VIRTUAL_IBAN',
        name: 'Virtual IBAN Balance',
        description: 'Pay instantly using your Virtual IBAN balance',
        type: 'VIRTUAL_IBAN',
        direction: 'IN',
        providerType: 'PSP',
        automationLevel: 'FULLY_AUTO',
        currency: 'EUR',
        supportedNetworks: [],
        minAmount: 1.00,
        maxAmount: 999999.00,
        feeFixed: 0.00,
        feePercent: 0.00,
        processingTime: 'instant',
        instructions: 'Your Virtual IBAN balance will be deducted immediately after order confirmation.',
        priority: 1,
        isActive: true,
        isAvailableForClients: true,
      },
    });

    console.log('✅ VIRTUAL_IBAN payment method added successfully!');
    console.log('\nDetails:');
    console.log(`  Code: ${paymentMethod.code}`);
    console.log(`  Name: ${paymentMethod.name}`);
    console.log(`  Type: ${paymentMethod.type}`);
    console.log(`  Currency: ${paymentMethod.currency}`);
    console.log(`  Processing: ${paymentMethod.processingTime}`);
    console.log(`  Fee: ${paymentMethod.feePercent}%`);
    console.log(`  Min: €${paymentMethod.minAmount}`);
    console.log(`  Max: €${paymentMethod.maxAmount}`);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to add VIRTUAL_IBAN payment method:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

