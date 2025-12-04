/**
 * Add Virtual IBAN Balance Payment Method
 * 
 * Создает метод оплаты для использования баланса Virtual IBAN
 * 
 * Usage:
 * npx tsx scripts/add-virtual-iban-payment-method.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Adding Virtual IBAN Balance payment method...\n');

  try {
    const paymentMethod = await prisma.paymentMethod.upsert({
      where: {
        code: 'virtual_iban_balance',
      },
      update: {
        name: 'Virtual IBAN Balance',
        description: 'Pay instantly using your Virtual IBAN account balance',
        type: 'balance',
        direction: 'IN',
        providerType: 'PSP',
        automationLevel: 'FULLY_AUTO',
        currency: 'EUR',
        supportedNetworks: [],
        minAmount: 1.00,
        maxAmount: 999999.00,
        feeFixed: 0.00,
        feePercent: 0.00,
        processingTime: 'Instant',
        instructions: 'Your Virtual IBAN balance will be used for this purchase. The payment is instant and has no fees.',
        iconUrl: null,
        priority: 1,
        config: {
          type: 'virtual_iban_balance',
          instantPayment: true,
          noFees: true,
        },
        isActive: true,
        isAvailableForClients: true,
        updatedAt: new Date(),
      },
      create: {
        code: 'virtual_iban_balance',
        name: 'Virtual IBAN Balance',
        description: 'Pay instantly using your Virtual IBAN account balance',
        type: 'balance',
        direction: 'IN',
        providerType: 'PSP',
        automationLevel: 'FULLY_AUTO',
        currency: 'EUR',
        supportedNetworks: [],
        minAmount: 1.00,
        maxAmount: 999999.00,
        feeFixed: 0.00,
        feePercent: 0.00,
        processingTime: 'Instant',
        instructions: 'Your Virtual IBAN balance will be used for this purchase. The payment is instant and has no fees.',
        iconUrl: null,
        priority: 1,
        config: {
          type: 'virtual_iban_balance',
          instantPayment: true,
          noFees: true,
        },
        isActive: true,
        isAvailableForClients: true,
      },
    });

    console.log('✅ Virtual IBAN Balance payment method created/updated:');
    console.log('   Code:', paymentMethod.code);
    console.log('   Name:', paymentMethod.name);
    console.log('   Type:', paymentMethod.type);
    console.log('   Currency:', paymentMethod.currency);
    console.log('   Direction:', paymentMethod.direction);
    console.log('   Provider Type:', paymentMethod.providerType);
    console.log('   Automation Level:', paymentMethod.automationLevel);
    console.log('   Fee:', `${paymentMethod.feeFixed}€ + ${paymentMethod.feePercent}%`);
    console.log('   Active:', paymentMethod.isActive);
    console.log('   Available for Clients:', paymentMethod.isAvailableForClients);

    console.log('\n💡 Payment method features:');
    console.log('   ✓ Instant payment (no waiting)');
    console.log('   ✓ Zero fees');
    console.log('   ✓ Fully automated');
    console.log('   ✓ EUR only');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
