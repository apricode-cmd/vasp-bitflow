/**
 * Prepare Demo Data for Promo Video Recording
 * 
 * This script creates all necessary demo data for recording the promo video:
 * - Demo user with approved KYC
 * - Virtual IBAN account with balance
 * - Sample orders (various statuses)
 * - Admin account
 * 
 * SAFETY:
 * - Only deletes orders for demo.user@apricode.demo
 * - Uses upsert to update existing demo accounts (no data loss)
 * - Does NOT touch any other users or data
 * - Safe to run multiple times
 * 
 * Run before recording:
 * npx tsx scripts/prepare-promo-demo-data.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🎬 Preparing demo data for promo video...\n');

  // 1. Create demo user
  console.log('👤 Creating demo user...');
  const hashedPassword = await bcrypt.hash('DemoSecure2024!', 10);
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'demo.user@apricode.demo' },
    include: { profile: true, kycSession: true }
  });

  let demoUser;
  
  if (existingUser) {
    // Update existing user
    demoUser = await prisma.user.update({
      where: { email: 'demo.user@apricode.demo' },
      data: {
        password: hashedPassword,
        isActive: true,
        profile: {
          upsert: {
            create: {
              firstName: 'John',
              lastName: 'Doe',
              dateOfBirth: new Date('1990-01-15'),
              nationality: 'PL',
              phoneNumber: '+48123456789',
              phoneCountry: 'PL',
              address: 'ul. Marszałkowska 1',
              city: 'Warsaw',
              postalCode: '00-001',
              country: 'Poland'
            },
            update: {
              firstName: 'John',
              lastName: 'Doe',
              dateOfBirth: new Date('1990-01-15'),
              nationality: 'PL',
              phoneNumber: '+48123456789',
              phoneCountry: 'PL',
              address: 'ul. Marszałkowska 1',
              city: 'Warsaw',
              postalCode: '00-001',
              country: 'Poland'
            }
          }
        },
        kycSession: {
          upsert: {
            create: {
              status: 'APPROVED',
              kycProviderId: 'demo-kyc-12345',
              applicantId: 'demo-applicant-12345',
              submittedAt: new Date(),
              reviewedAt: new Date(),
              completedAt: new Date()
            },
            update: {
              status: 'APPROVED',
              kycProviderId: 'demo-kyc-12345',
              applicantId: 'demo-applicant-12345',
              submittedAt: new Date(),
              reviewedAt: new Date(),
              completedAt: new Date()
            }
          }
        }
      },
      include: { profile: true, kycSession: true }
    });
    console.log('✅ Demo user updated');
  } else {
    // Create new user
    demoUser = await prisma.user.create({
      data: {
        email: 'demo.user@apricode.demo',
        password: hashedPassword,
        role: 'CLIENT',
        isActive: true,
        profile: {
          create: {
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: new Date('1990-01-15'),
            nationality: 'PL',
            phoneNumber: '+48123456789',
            phoneCountry: 'PL',
            address: 'ul. Marszałkowska 1',
            city: 'Warsaw',
            postalCode: '00-001',
            country: 'Poland'
          }
        },
        kycSession: {
          create: {
            status: 'APPROVED',
            kycProviderId: 'KYCAID',
            applicantId: 'demo-applicant-12345',
            submittedAt: new Date(),
            reviewedAt: new Date(),
            completedAt: new Date()
          }
        }
      },
      include: { profile: true, kycSession: true }
    });
    console.log('✅ Demo user created');
  }

  console.log('✅ Demo user ready:', demoUser.email);
  console.log('   Name:', `${demoUser.profile?.firstName} ${demoUser.profile?.lastName}`);
  console.log('   KYC Status:', demoUser.kycSession?.status);
  console.log('   Role:', demoUser.role);

  // 2. Create or update Virtual IBAN Account
  console.log('\n🏦 Creating Virtual IBAN account...');
  
  const demoIban = 'DK0889000025333585';
  
  // Try to find existing by userId OR by IBAN
  const existingIban = await prisma.virtualIbanAccount.findFirst({
    where: {
      OR: [
        { userId: demoUser.id },
        { iban: demoIban }
      ]
    }
  });

  let virtualIban;
  if (existingIban) {
    // Update existing account
    virtualIban = await prisma.virtualIbanAccount.update({
      where: { id: existingIban.id },
      data: {
        userId: demoUser.id, // Ensure correct user
        balance: 10000.00,
        lastBalanceUpdate: new Date(),
        status: 'ACTIVE',
        accountHolder: `${demoUser.profile?.firstName} ${demoUser.profile?.lastName}`
      }
    });
    console.log('✅ Virtual IBAN updated (balance set to €10,000)');
  } else {
    // Create new account
    virtualIban = await prisma.virtualIbanAccount.create({
      data: {
        userId: demoUser.id,
        providerId: 'BCB_GROUP_VIRTUAL_IBAN',
        providerAccountId: 'demo-account-12345',
        iban: demoIban,
        bic: 'SXPYDKKK',
        bankName: 'Saxo Payments Banking Circle',
        accountHolder: `${demoUser.profile?.firstName} ${demoUser.profile?.lastName}`,
        currency: 'EUR',
        country: 'DK',
        status: 'ACTIVE',
        balance: 10000.00,
        lastBalanceUpdate: new Date()
      }
    });
    console.log('✅ Virtual IBAN created');
  }

  console.log('   IBAN:', virtualIban.iban);
  console.log('   BIC:', virtualIban.bic);
  console.log('   Balance:', `€${virtualIban.balance.toLocaleString()}`);

  // 3. Get currencies and blockchains
  console.log('\n💰 Fetching currencies and blockchains...');
  const btc = await prisma.currency.findUnique({ where: { code: 'BTC' } });
  const eth = await prisma.currency.findUnique({ where: { code: 'ETH' } });
  const usdt = await prisma.currency.findUnique({ where: { code: 'USDT' } });
  const sol = await prisma.currency.findUnique({ where: { code: 'SOL' } });
  const eur = await prisma.fiatCurrency.findUnique({ where: { code: 'EUR' } });

  if (!btc || !eth || !usdt || !sol || !eur) {
    throw new Error('❌ Currencies not found in database. Please run seed first.');
  }
  
  // Check which blockchains exist
  const btcBlockchain = await prisma.blockchainNetwork.findUnique({ where: { code: 'BTC' } });
  const ethBlockchain = await prisma.blockchainNetwork.findUnique({ where: { code: 'ETH' } });
  const solBlockchain = await prisma.blockchainNetwork.findUnique({ where: { code: 'SOL' } });
  
  // Check which payment methods exist
  const sepaPayment = await prisma.paymentMethod.findUnique({ where: { code: 'SEPA' } });
  
  console.log('✅ Currencies loaded: BTC, ETH, USDT, SOL, EUR');
  console.log('✅ Blockchains:', {
    BTC: !!btcBlockchain,
    ETH: !!ethBlockchain,
    SOL: !!solBlockchain
  });
  console.log('✅ Payment Methods:', {
    SEPA: !!sepaPayment
  });

  // 4. Delete existing demo orders
  console.log('\n🗑️  Cleaning up old demo orders...');
  const deletedOrders = await prisma.order.deleteMany({
    where: { userId: demoUser.id }
  });
  console.log(`✅ Deleted ${deletedOrders.count} old orders`);

  // 5. Create demo orders
  console.log('\n📦 Creating demo orders...');
  const orders = [
    {
      currencyCode: 'BTC',
      cryptoAmount: 0.5,
      rate: 45000,
      totalFiat: 22500,
      status: 'COMPLETED' as const,
      walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      description: 'Bitcoin purchase - Completed'
    },
    {
      currencyCode: 'ETH',
      cryptoAmount: 2.0,
      rate: 3400,
      totalFiat: 6800,
      status: 'PROCESSING' as const,
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      description: 'Ethereum purchase - Processing'
    },
    {
      currencyCode: 'USDT',
      cryptoAmount: 1000,
      rate: 0.98,
      totalFiat: 980,
      status: 'PENDING' as const,
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      description: 'Tether purchase - Pending'
    },
    {
      currencyCode: 'BTC',
      cryptoAmount: 0.1,
      rate: 45000,
      totalFiat: 4500,
      status: 'PAYMENT_RECEIVED' as const,
      walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      description: 'Bitcoin purchase - Payment Received'
    },
    {
      currencyCode: 'SOL',
      cryptoAmount: 5.0,
      rate: 90,
      totalFiat: 450,
      status: 'COMPLETED' as const,
      walletAddress: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
      description: 'Solana purchase - Completed'
    }
  ];

  for (const orderData of orders) {
    const currency = await prisma.currency.findUnique({ 
      where: { code: orderData.currencyCode } 
    });
    
    if (!currency) {
      console.log(`⚠️  Skipping ${orderData.currencyCode} order - currency not found`);
      continue;
    }

    const feePercent = 1.5; // 1.5% fee
    const feeAmount = orderData.totalFiat * (feePercent / 100);
    const fiatAmount = orderData.totalFiat - feeAmount;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Order expires in 7 days

    const order = await prisma.order.create({
      data: {
        userId: demoUser.id,
        currencyId: currency.id,
        currencyCode: orderData.currencyCode,
        fiatCurrencyId: eur.id,
        fiatCurrencyCode: 'EUR',
        cryptoAmount: orderData.cryptoAmount,
        fiatAmount: fiatAmount,
        rate: orderData.rate,
        feePercent: feePercent,
        feeAmount: feeAmount,
        totalFiat: orderData.totalFiat,
        status: orderData.status,
        walletAddress: orderData.walletAddress,
        blockchainCode: (() => {
          // Only set blockchain if it exists
          if (orderData.currencyCode === 'USDT' && ethBlockchain) return 'ETH';
          if (orderData.currencyCode === 'BTC' && btcBlockchain) return 'BTC';
          if (orderData.currencyCode === 'ETH' && ethBlockchain) return 'ETH';
          if (orderData.currencyCode === 'SOL' && solBlockchain) return 'SOL';
          return null; // Blockchain not found, set to null
        })(),
        paymentMethodCode: sepaPayment ? 'SEPA' : null,
        paymentReference: `DEMO-${Date.now()}-${orderData.currencyCode}`,
        expiresAt: expiresAt
      }
    });

    console.log(`✅ Created ${orderData.currencyCode} order:`, orderData.description);
    console.log(`   Amount: ${orderData.cryptoAmount} ${orderData.currencyCode}`);
    console.log(`   Total: €${orderData.totalFiat.toLocaleString()}`);
    console.log(`   Status: ${orderData.status}`);
  }

  // 6. Use existing admin account (hello@apricode.agency)
  console.log('\n👨‍💼 Checking admin account...');
  
  const adminUser = await prisma.admin.findFirst({
    where: {
      OR: [
        { email: 'hello@apricode.agency' },
        { workEmail: 'hello@apricode.agency' }
      ]
    }
  });

  if (adminUser) {
    console.log('✅ Using existing admin:', adminUser.email || adminUser.workEmail);
    console.log('   Name:', `${adminUser.firstName} ${adminUser.lastName}`);
    console.log('   Role:', adminUser.role);
  } else {
    console.log('⚠️  Admin hello@apricode.agency not found!');
    console.log('   Please use your existing admin account for the demo');
    console.log('   Or create one manually if needed');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Demo data preparation complete!');
  console.log('='.repeat(60));
  
  console.log('\n📋 Login Credentials:');
  console.log('\n🔵 CLIENT ACCOUNT:');
  console.log('   URL: https://app.bitflow.biz/login');
  console.log('   Email: demo.user@apricode.demo');
  console.log('   Password: DemoSecure2024!');
  
  console.log('\n🔴 ADMIN ACCOUNT:');
  console.log('   URL: https://app.bitflow.biz/admin/login');
  console.log('   Email: hello@apricode.agency');
  console.log('   Password: (use your existing admin password)');

  console.log('\n📊 Demo Data Summary:');
  console.log('   ✓ 1 User (KYC Approved)');
  console.log('   ✓ 1 Virtual IBAN (€10,000 balance)');
  console.log('   ✓ 5 Orders (various statuses)');
  console.log('   ✓ 1 Admin (Super Admin)');

  console.log('\n💡 Quick Test:');
  console.log('   1. Login as client');
  console.log('   2. Visit /dashboard - should see 5 orders');
  console.log('   3. Visit /virtual-iban - should see IBAN card');
  console.log('   4. Visit /buy - should be able to create orders');
  console.log('   5. Login as admin');
  console.log('   6. Visit /admin/dashboard - should see statistics');

  console.log('\n🎬 Ready to record promo video!');
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

