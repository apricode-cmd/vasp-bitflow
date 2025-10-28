/**
 * Add Step 4 Fields: Intended Use & Expected Activity
 * Run: npx ts-node prisma/add-step4-fields.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Adding Step 4 fields...');

  // 1. Purpose of Account (select)
  await prisma.kycFormField.upsert({
    where: { fieldName: 'purpose' },
    update: {
      label: 'Purpose of Account',
      fieldType: 'select',
      category: 'purpose',
      isRequired: true,
      isEnabled: true,
      priority: 70,
      options: JSON.stringify([
        'personal_buy',
        'investment',
        'remittance',
        'business_payments',
        'trading',
        'other'
      ])
    },
    create: {
      fieldName: 'purpose',
      label: 'Purpose of Account',
      fieldType: 'select',
      category: 'purpose',
      isRequired: true,
      isEnabled: true,
      priority: 70,
      options: JSON.stringify([
        'personal_buy',
        'investment',
        'remittance',
        'business_payments',
        'trading',
        'other'
      ])
    }
  });
  console.log('✅ Purpose field updated');

  // 2. Purpose note (conditional)
  await prisma.kycFormField.upsert({
    where: { fieldName: 'purpose_note' },
    update: {
      label: 'Additional Details (optional)',
      fieldType: 'textarea',
      category: 'purpose',
      isRequired: false,
      isEnabled: true,
      priority: 71,
      validation: JSON.stringify({
        minLength: 10
      })
    },
    create: {
      fieldName: 'purpose_note',
      label: 'Additional Details (optional)',
      fieldType: 'textarea',
      category: 'purpose',
      isRequired: false,
      isEnabled: true,
      priority: 71,
      validation: JSON.stringify({
        minLength: 10
      })
    }
  });
  console.log('✅ Purpose note field created');

  // 3. Primary Source of Funds (already exists in funds category)
  await prisma.kycFormField.updateMany({
    where: { fieldName: 'primary_source_of_funds' },
    data: {
      category: 'funds',
      priority: 72,
      isRequired: true,
      isEnabled: true
    }
  });
  console.log('✅ Primary SoF field updated');

  // 4. Additional Sources (multi-select)
  await prisma.kycFormField.upsert({
    where: { fieldName: 'additional_sources' },
    update: {
      label: 'Additional Sources (optional)',
      fieldType: 'multiselect',
      category: 'funds',
      isRequired: false,
      isEnabled: true,
      priority: 73,
      options: JSON.stringify([
        'salary',
        'business',
        'savings',
        'investments',
        'pension',
        'gift_inheritance',
        'benefits',
        'other'
      ])
    },
    create: {
      fieldName: 'additional_sources',
      label: 'Additional Sources (optional)',
      fieldType: 'multiselect',
      category: 'funds',
      isRequired: false,
      isEnabled: true,
      priority: 73,
      options: JSON.stringify([
        'salary',
        'business',
        'savings',
        'investments',
        'pension',
        'gift_inheritance',
        'benefits',
        'other'
      ])
    }
  });
  console.log('✅ Additional sources field created');

  // 5. Expected Activity fields
  await prisma.kycFormField.upsert({
    where: { fieldName: 'expected_avg_monthly' },
    update: {
      label: 'Average Transaction Amount (monthly)',
      fieldType: 'select',
      category: 'activity',
      isRequired: true,
      isEnabled: true,
      priority: 74,
      options: JSON.stringify([
        '<€200',
        '€200–1k',
        '€1–3k',
        '€3–10k',
        '>€10k'
      ])
    },
    create: {
      fieldName: 'expected_avg_monthly',
      label: 'Average Transaction Amount (monthly)',
      fieldType: 'select',
      category: 'activity',
      isRequired: true,
      isEnabled: true,
      priority: 74,
      options: JSON.stringify([
        '<€200',
        '€200–1k',
        '€1–3k',
        '€3–10k',
        '>€10k'
      ])
    }
  });

  await prisma.kycFormField.upsert({
    where: { fieldName: 'expected_max_ticket' },
    update: {
      label: 'Max Single Transaction',
      fieldType: 'select',
      category: 'activity',
      isRequired: true,
      isEnabled: true,
      priority: 75,
      options: JSON.stringify([
        '<€1k',
        '€1–3k',
        '€3–10k',
        '€10–50k',
        '>€50k'
      ])
    },
    create: {
      fieldName: 'expected_max_ticket',
      label: 'Max Single Transaction',
      fieldType: 'select',
      category: 'activity',
      isRequired: true,
      isEnabled: true,
      priority: 75,
      options: JSON.stringify([
        '<€1k',
        '€1–3k',
        '€3–10k',
        '€10–50k',
        '>€50k'
      ])
    }
  });

  await prisma.kycFormField.upsert({
    where: { fieldName: 'expected_frequency_per_month' },
    update: {
      label: 'Frequency per Month',
      fieldType: 'select',
      category: 'activity',
      isRequired: true,
      isEnabled: true,
      priority: 76,
      options: JSON.stringify([
        '1-2',
        '3-5',
        '6-10',
        '>10'
      ])
    },
    create: {
      fieldName: 'expected_frequency_per_month',
      label: 'Frequency per Month',
      fieldType: 'select',
      category: 'activity',
      isRequired: true,
      isEnabled: true,
      priority: 76,
      options: JSON.stringify([
        '1-2',
        '3-5',
        '6-10',
        '>10'
      ])
    }
  });

  await prisma.kycFormField.upsert({
    where: { fieldName: 'expected_payment_methods' },
    update: {
      label: 'Payment Methods You Plan to Use',
      fieldType: 'multiselect',
      category: 'activity',
      isRequired: true,
      isEnabled: true,
      priority: 77,
      options: JSON.stringify([
        'card',
        'bank'
      ])
    },
    create: {
      fieldName: 'expected_payment_methods',
      label: 'Payment Methods You Plan to Use',
      fieldType: 'multiselect',
      category: 'activity',
      isRequired: true,
      isEnabled: true,
      priority: 77,
      options: JSON.stringify([
        'card',
        'bank'
      ])
    }
  });

  await prisma.kycFormField.upsert({
    where: { fieldName: 'expected_assets' },
    update: {
      label: 'Assets You Expect to Buy',
      fieldType: 'multiselect',
      category: 'activity',
      isRequired: true,
      isEnabled: true,
      priority: 78,
      options: JSON.stringify([
        'BTC',
        'ETH',
        'USDT',
        'USDC',
        'SOL',
        'other'
      ])
    },
    create: {
      fieldName: 'expected_assets',
      label: 'Assets You Expect to Buy',
      fieldType: 'multiselect',
      category: 'activity',
      isRequired: true,
      isEnabled: true,
      priority: 78,
      options: JSON.stringify([
        'BTC',
        'ETH',
        'USDT',
        'USDC',
        'SOL',
        'other'
      ])
    }
  });

  await prisma.kycFormField.upsert({
    where: { fieldName: 'dest_wallet_type' },
    update: {
      label: 'Destination Wallet Type',
      fieldType: 'select',
      category: 'activity',
      isRequired: true,
      isEnabled: true,
      priority: 79,
      options: JSON.stringify([
        'self_custody',
        'custodial'
      ])
    },
    create: {
      fieldName: 'dest_wallet_type',
      label: 'Destination Wallet Type',
      fieldType: 'select',
      category: 'activity',
      isRequired: true,
      isEnabled: true,
      priority: 79,
      options: JSON.stringify([
        'self_custody',
        'custodial'
      ])
    }
  });

  console.log('✅ Expected Activity fields created');

  // Disable old consent fields (moved to step 0)
  await prisma.kycFormField.updateMany({
    where: {
      fieldName: {
        in: ['kyc_consent', 'aml_consent', 'privacy_consent']
      }
    },
    data: {
      isEnabled: false
    }
  });
  console.log('✅ Disabled consent fields (moved to pre-form screen)');

  console.log('✅ All Step 4 fields created successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

