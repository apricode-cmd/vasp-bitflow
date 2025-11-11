/**
 * Database Seeding Script - UPDATED FOR NEW SCHEMA
 * 
 * Seeds the database with:
 * - Admin user
 * - Test client user with APPROVED KYC
 * - Cryptocurrencies with all new fields
 * - Fiat currencies with symbols
 * - Trading pairs
 * - Bank details
 * - Sample orders with new structure
 * - System settings
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedPaymentAccounts } from './seed-payment-accounts.js';
import { seedKycFormFields } from './seed-kyc-fields.js';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main(): Promise<void> {
  console.log('🌱 Starting database seeding...\n');

  // Get admin credentials from environment
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@apricode.io';
  const adminPassword = process.env.ADMIN_PASSWORD || 'SecureAdmin123!';

  // 1. Create Admin User
  console.log('👤 Creating admin user...');
  const adminPasswordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
  
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
      profile: {
        create: {
          firstName: 'Admin',
          lastName: 'User',
          country: 'PL'
        }
      }
    }
  });
  console.log(`✅ Admin created: ${admin.email}\n`);

  // 2. Create Test Client User with APPROVED KYC
  console.log('👤 Creating test client user...');
  const testClientPasswordHash = await bcrypt.hash('TestClient123!', SALT_ROUNDS);
  
  const testClient = await prisma.user.upsert({
    where: { email: 'client@test.com' },
    update: {},
    create: {
      email: 'client@test.com',
      password: testClientPasswordHash,
      role: 'CLIENT',
      isActive: true,
      profile: {
        create: {
          firstName: 'Test',
          lastName: 'Client',
          phoneNumber: '+48123456789',
          country: 'PL',
          city: 'Warsaw',
          dateOfBirth: new Date('1990-01-01')
        }
      },
      kycSession: {
        create: {
          status: 'APPROVED',
          submittedAt: new Date(),
          reviewedAt: new Date(),
          completedAt: new Date(),
          kycaidVerificationId: 'test-verification-id',
          kycaidApplicantId: 'test-applicant-id'
        }
      }
    }
  });
  console.log(`✅ Test client created: ${testClient.email}\n`);

  // 3. Create Cryptocurrencies (with new fields)
  console.log('💰 Creating cryptocurrencies...');
  
  const currencies = [
    {
      code: 'BTC',
      name: 'Bitcoin',
      symbol: '₿',
      decimals: 8,
      coingeckoId: 'bitcoin',
      isActive: true,
      priority: 1
    },
    {
      code: 'ETH',
      name: 'Ethereum',
      symbol: 'Ξ',
      decimals: 6,
      coingeckoId: 'ethereum',
      isActive: true,
      priority: 2
    },
    {
      code: 'USDT',
      name: 'Tether',
      symbol: '₮',
      decimals: 2,
      coingeckoId: 'tether',
      isActive: true,
      priority: 3
    },
    {
      code: 'SOL',
      name: 'Solana',
      symbol: '◎',
      decimals: 4,
      coingeckoId: 'solana',
      isActive: true,
      priority: 4
    }
  ];

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: currency
    });
    console.log(`  ✓ ${currency.name} (${currency.code}) - ${currency.symbol}`);
  }
  console.log('');

  // 4. Create Fiat Currencies (with symbols)
  console.log('💵 Creating fiat currencies...');
  
  const fiatCurrencies = [
    { 
      code: 'EUR', 
      name: 'Euro', 
      symbol: '€',
      isActive: true,
      priority: 1
    },
    { 
      code: 'PLN', 
      name: 'Polish Zloty', 
      symbol: 'zł',
      isActive: true,
      priority: 2
    }
  ];

  for (const fiat of fiatCurrencies) {
    await prisma.fiatCurrency.upsert({
      where: { code: fiat.code },
      update: {},
      create: fiat
    });
    console.log(`  ✓ ${fiat.name} (${fiat.code}) - ${fiat.symbol}`);
  }
  console.log('');

  // 5. Create Trading Pairs
  console.log('📊 Creating trading pairs...');
  
  const tradingPairs = [
    // BTC pairs
    { cryptoCode: 'BTC', fiatCode: 'EUR', minCryptoAmount: 0.001, maxCryptoAmount: 10, minFiatAmount: 50, maxFiatAmount: 500000, feePercent: 1.5, isActive: true, priority: 1 },
    { cryptoCode: 'BTC', fiatCode: 'PLN', minCryptoAmount: 0.001, maxCryptoAmount: 10, minFiatAmount: 200, maxFiatAmount: 2000000, feePercent: 1.5, isActive: true, priority: 2 },
    // ETH pairs
    { cryptoCode: 'ETH', fiatCode: 'EUR', minCryptoAmount: 0.01, maxCryptoAmount: 100, minFiatAmount: 30, maxFiatAmount: 300000, feePercent: 1.5, isActive: true, priority: 3 },
    { cryptoCode: 'ETH', fiatCode: 'PLN', minCryptoAmount: 0.01, maxCryptoAmount: 100, minFiatAmount: 120, maxFiatAmount: 1200000, feePercent: 1.5, isActive: true, priority: 4 },
    // USDT pairs
    { cryptoCode: 'USDT', fiatCode: 'EUR', minCryptoAmount: 10, maxCryptoAmount: 100000, minFiatAmount: 10, maxFiatAmount: 100000, feePercent: 1.5, isActive: true, priority: 5 },
    { cryptoCode: 'USDT', fiatCode: 'PLN', minCryptoAmount: 10, maxCryptoAmount: 100000, minFiatAmount: 40, maxFiatAmount: 400000, feePercent: 1.5, isActive: true, priority: 6 },
    // SOL pairs
    { cryptoCode: 'SOL', fiatCode: 'EUR', minCryptoAmount: 0.1, maxCryptoAmount: 1000, minFiatAmount: 10, maxFiatAmount: 150000, feePercent: 1.5, isActive: true, priority: 7 },
    { cryptoCode: 'SOL', fiatCode: 'PLN', minCryptoAmount: 0.1, maxCryptoAmount: 1000, minFiatAmount: 40, maxFiatAmount: 600000, feePercent: 1.5, isActive: true, priority: 8 }
  ];

  for (const pair of tradingPairs) {
    await prisma.tradingPair.upsert({
      where: {
        cryptoCode_fiatCode: {
          cryptoCode: pair.cryptoCode,
          fiatCode: pair.fiatCode
        }
      },
      update: {},
      create: pair
    });
    console.log(`  ✓ ${pair.cryptoCode}/${pair.fiatCode}`);
  }
  console.log('');

  // 6. Create Bank Details (with new fields)
  console.log('🏦 Creating bank details...');
  
  await prisma.bankDetails.upsert({
    where: { id: 'eur-bank-1' },
    update: {},
    create: {
      id: 'eur-bank-1',
      currency: 'EUR',
      bankName: 'European Bank',
      bankAddress: 'Main Street 123, Warsaw, Poland',
      accountHolder: 'Apricode Exchange Ltd.',
      iban: 'PL61109010140000071219812874',
      swift: 'WBKPPLPP',
      bic: 'WBKPPLPP',
      referenceTemplate: 'APR-{orderId}',
      instructions: 'Please include the reference number APR-{orderId} in your bank transfer. Payment processing may take 1-2 business days.',
      isActive: true,
      priority: 1
    }
  });
  console.log(`  ✓ EUR bank details created`);

  await prisma.bankDetails.upsert({
    where: { id: 'pln-bank-1' },
    update: {},
    create: {
      id: 'pln-bank-1',
      currency: 'PLN',
      bankName: 'Polski Bank',
      bankAddress: 'ul. Bankowa 1, 00-001 Warszawa',
      accountHolder: 'Apricode Exchange Sp. z o.o.',
      iban: 'PL27114020040000300201355387',
      swift: 'PKOPPLPW',
      bic: 'PKOPPLPW',
      referenceTemplate: 'APR-{orderId}',
      instructions: 'Prosimy o podanie numeru referencyjnego APR-{orderId} w tytule przelewu. Przetwarzanie płatności może potrwać 1-2 dni robocze.',
      isActive: true,
      priority: 1
    }
  });
  console.log(`  ✓ PLN bank details created\n`);

  // 7. Create Sample Orders (with new structure)
  console.log('📦 Creating sample orders...');
  
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const sampleOrders = [
    {
      userId: testClient.id,
      currencyCode: 'BTC',
      fiatCurrencyCode: 'EUR',
      paymentReference: 'APR-2025-TEST001',
      cryptoAmount: 0.01,
      fiatAmount: 500,
      rate: 50000,
      feePercent: 1.5,
      feeAmount: 7.5,
      totalFiat: 507.5,
      walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      status: 'PENDING',
      expiresAt: tomorrow
    },
    {
      userId: testClient.id,
      currencyCode: 'ETH',
      fiatCurrencyCode: 'PLN',
      paymentReference: 'APR-2025-TEST002',
      cryptoAmount: 0.5,
      fiatAmount: 5000,
      rate: 10000,
      feePercent: 1.5,
      feeAmount: 75,
      totalFiat: 5075,
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      status: 'PROCESSING',
      expiresAt: tomorrow
    },
    {
      userId: testClient.id,
      currencyCode: 'USDT',
      fiatCurrencyCode: 'EUR',
      paymentReference: 'APR-2025-TEST003',
      cryptoAmount: 1000,
      fiatAmount: 950,
      rate: 0.95,
      feePercent: 1.5,
      feeAmount: 14.25,
      totalFiat: 964.25,
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      status: 'COMPLETED',
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      processedBy: admin.id,
      processedAt: now,
      expiresAt: tomorrow
    }
  ];

  for (const order of sampleOrders) {
    await prisma.order.upsert({
      where: { paymentReference: order.paymentReference },
      update: {},
      create: {
        ...order,
        expiresAt: order.expiresAt || tomorrow
      } 
    });
    console.log(`  ✓ ${order.status} order: ${order.cryptoAmount} ${order.currencyCode} (${order.paymentReference})`);
  }
  console.log('');

  // 8. Create System Settings
  console.log('⚙️  Creating system settings...');
  
  const settings = [
    // Trading settings
    { key: 'platform_fee', value: '1.5', type: 'NUMBER' as const, category: 'trading', description: 'Platform fee percentage', isPublic: true },
    { key: 'order_expiry_hours', value: '24', type: 'NUMBER' as const, category: 'trading', description: 'Hours until order expires', isPublic: false },
    { key: 'kyc_expiry_months', value: '12', type: 'NUMBER' as const, category: 'kyc', description: 'Months until KYC needs renewal', isPublic: false },
    { key: 'min_order_eur', value: '10', type: 'NUMBER' as const, category: 'trading', description: 'Minimum order value in EUR', isPublic: true },
    { key: 'max_order_eur', value: '100000', type: 'NUMBER' as const, category: 'trading', description: 'Maximum order value in EUR', isPublic: true },
    
    // General settings
    { key: 'support_email', value: 'support@apricode.io', type: 'STRING' as const, category: 'general', description: 'Support email address', isPublic: true },
    { key: 'platform_name', value: 'Apricode Exchange', type: 'STRING' as const, category: 'general', description: 'Platform name', isPublic: true },
    
    // Legal company information (for invoices and legal documents)
    { key: 'companyLegalName', value: 'Apricode Exchange Ltd.', type: 'STRING' as const, category: 'legal', description: 'Official registered company name', isPublic: false },
    { key: 'companyRegistrationNumber', value: 'KRS 0000123456', type: 'STRING' as const, category: 'legal', description: 'Company registration number', isPublic: false },
    { key: 'companyTaxNumber', value: 'PL1234567890', type: 'STRING' as const, category: 'legal', description: 'Tax identification number (VAT/NIP)', isPublic: false },
    { key: 'companyLicenseNumber', value: 'VASP-2024-001', type: 'STRING' as const, category: 'legal', description: 'VASP license number (optional)', isPublic: false },
    { key: 'companyAddress', value: 'ul. Przykładowa 123, 00-001 Warszawa, Poland', type: 'STRING' as const, category: 'legal', description: 'Company legal address', isPublic: false },
    { key: 'companyPhone', value: '+48 22 123 45 67', type: 'STRING' as const, category: 'legal', description: 'Company contact phone', isPublic: false },
    { key: 'companyEmail', value: 'legal@apricode.exchange', type: 'STRING' as const, category: 'legal', description: 'Company legal email', isPublic: false },
    { key: 'companyWebsite', value: 'https://apricode.exchange', type: 'STRING' as const, category: 'legal', description: 'Company website URL', isPublic: false }
  ];

  for (const setting of settings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting
    });
    console.log(`  ✓ ${setting.key}: ${setting.value}`);
  }
  console.log('');

  // 9. Create Blockchain Networks
  console.log('⛓️  Creating blockchain networks...');
  
  const blockchains = [
    {
      code: 'BITCOIN',
      name: 'Bitcoin',
      nativeToken: 'BTC',
      explorerUrl: 'https://blockchair.com/bitcoin',
      confirmations: 6,
      isActive: true,
      priority: 1
    },
    {
      code: 'ETHEREUM',
      name: 'Ethereum',
      nativeToken: 'ETH',
      explorerUrl: 'https://etherscan.io',
      rpcUrl: 'https://eth.llamarpc.com',
      chainId: 1,
      confirmations: 12,
      isActive: true,
      priority: 2
    },
    {
      code: 'BSC',
      name: 'Binance Smart Chain',
      nativeToken: 'BNB',
      explorerUrl: 'https://bscscan.com',
      rpcUrl: 'https://bsc-dataseed.binance.org',
      chainId: 56,
      confirmations: 15,
      isActive: true,
      priority: 3
    },
    {
      code: 'POLYGON',
      name: 'Polygon',
      nativeToken: 'MATIC',
      explorerUrl: 'https://polygonscan.com',
      rpcUrl: 'https://polygon-rpc.com',
      chainId: 137,
      confirmations: 128,
      isActive: true,
      priority: 4
    },
    {
      code: 'SOLANA',
      name: 'Solana',
      nativeToken: 'SOL',
      explorerUrl: 'https://solscan.io',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      confirmations: 32,
      isActive: true,
      priority: 5
    }
  ];

  for (const blockchain of blockchains) {
    await prisma.blockchainNetwork.upsert({
      where: { code: blockchain.code },
      update: {},
      create: blockchain
    });
    console.log(`  ✓ ${blockchain.name} (${blockchain.code})`);
  }
  console.log('');

  // 10. Create Platform Wallets
  console.log('💼 Creating platform wallets...');
  
  const platformWallets = [
    {
      currencyCode: 'BTC',
      blockchainCode: 'BITCOIN',
      address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      label: 'Main BTC Hot Wallet',
      isActive: true
    },
    {
      currencyCode: 'ETH',
      blockchainCode: 'ETHEREUM',
      address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      label: 'Main ETH Hot Wallet',
      isActive: true
    },
    {
      currencyCode: 'USDT',
      blockchainCode: 'ETHEREUM',
      address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      label: 'USDT ERC-20 Wallet',
      isActive: true
    },
    {
      currencyCode: 'SOL',
      blockchainCode: 'SOLANA',
      address: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi',
      label: 'Main SOL Wallet',
      isActive: true
    }
  ];

  for (const wallet of platformWallets) {
    await prisma.platformWallet.upsert({
      where: { address: wallet.address },
      update: {},
      create: wallet
    });
    console.log(`  ✓ ${wallet.label} (${wallet.currencyCode})`);
  }
  console.log('');

  // 11. Create Payment Methods (CRM format)
  console.log('💳 Creating payment methods...');
  
  const paymentMethods = [
    {
      code: 'sepa_eur',
      type: 'bank_transfer',
      name: 'SEPA Bank Transfer',
      direction: 'IN' as const,
      providerType: 'MANUAL' as const,
      automationLevel: 'MANUAL' as const,
      currency: 'EUR',
      isActive: true,
      processingTime: '1-2 business days',
      minAmount: 10,
      maxAmount: 50000,
      feeFixed: 0,
      feePercent: 0,
      instructions: 'Use the provided IBAN for SEPA transfer. Include the payment reference in the transfer description.',
      priority: 1
    },
    {
      code: 'bank_pln',
      type: 'bank_transfer',
      name: 'Domestic Bank Transfer PLN',
      direction: 'IN' as const,
      providerType: 'MANUAL' as const,
      automationLevel: 'MANUAL' as const,
      currency: 'PLN',
      isActive: true,
      processingTime: '1-2 business days',
      minAmount: 40,
      maxAmount: 200000,
      feeFixed: 0,
      feePercent: 0,
      instructions: 'Przelew krajowy PLN. Uwzględnij numer referencyjny w tytule przelewu.',
      priority: 2
    },
    {
      code: 'card_eur',
      type: 'card_payment',
      name: 'Credit/Debit Card EUR',
      direction: 'IN' as const,
      providerType: 'PSP' as const,
      automationLevel: 'FULLY_AUTO' as const,
      currency: 'EUR',
      isActive: false,
      processingTime: 'Instant',
      minAmount: 20,
      maxAmount: 5000,
      feeFixed: 0.5,
      feePercent: 2.5,
      instructions: 'Card payment (coming soon)',
      priority: 3
    }
  ];

  for (const method of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { code: method.code },
      update: {},
      create: method
    });
    console.log(`  ✓ ${method.name} (${method.currency})`);
  }
  console.log('');

  // 12. Create KYC Form Fields
  console.log('📋 Creating KYC form fields...');
  
  const kycFields = [
    { fieldName: 'first_name', label: 'First Name', fieldType: 'text', isRequired: true, isEnabled: true, category: 'personal', priority: 1 },
    { fieldName: 'last_name', label: 'Last Name', fieldType: 'text', isRequired: true, isEnabled: true, category: 'personal', priority: 2 },
    { fieldName: 'date_of_birth', label: 'Date of Birth', fieldType: 'date', isRequired: true, isEnabled: true, category: 'personal', priority: 3 },
    { fieldName: 'nationality', label: 'Nationality', fieldType: 'text', isRequired: true, isEnabled: true, category: 'personal', priority: 4 },
    { fieldName: 'country', label: 'Country of Residence', fieldType: 'select', isRequired: true, isEnabled: true, category: 'address', priority: 5 },
    { fieldName: 'city', label: 'City', fieldType: 'text', isRequired: true, isEnabled: true, category: 'address', priority: 6 },
    { fieldName: 'address', label: 'Street Address', fieldType: 'text', isRequired: true, isEnabled: true, category: 'address', priority: 7 },
    { fieldName: 'postal_code', label: 'Postal Code', fieldType: 'text', isRequired: true, isEnabled: true, category: 'address', priority: 8 },
    { fieldName: 'phone_number', label: 'Phone Number', fieldType: 'text', isRequired: true, isEnabled: true, category: 'personal', priority: 9 },
    { fieldName: 'passport_number', label: 'Passport Number', fieldType: 'text', isRequired: false, isEnabled: true, category: 'documents', priority: 10 },
    { fieldName: 'id_number', label: 'ID Card Number', fieldType: 'text', isRequired: false, isEnabled: true, category: 'documents', priority: 11 },
    { fieldName: 'document_front', label: 'ID Document Front', fieldType: 'file', isRequired: true, isEnabled: true, category: 'documents', priority: 12 },
    { fieldName: 'document_back', label: 'ID Document Back', fieldType: 'file', isRequired: true, isEnabled: true, category: 'documents', priority: 13 },
    { fieldName: 'selfie', label: 'Selfie with Document', fieldType: 'file', isRequired: true, isEnabled: true, category: 'documents', priority: 14 }
  ];

  for (const field of kycFields) {
    await prisma.kycFormField.upsert({
      where: { fieldName: field.fieldName },
      update: {},
      create: field
    });
    console.log(`  ✓ ${field.label} (${field.fieldName})`);
  }
  console.log('');

  // 13. Create User Wallet for Test Client
  console.log('👛 Creating user wallets...');
  
  await prisma.userWallet.upsert({
    where: {
      userId_address: {
        userId: testClient.id,
        address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
      }
    },
    update: {},
    create: {
      userId: testClient.id,
      blockchainCode: 'BITCOIN',
      currencyCode: 'BTC',
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      label: 'My Bitcoin Wallet',
      isVerified: true,
      isDefault: true
    }
  });
  console.log(`  ✓ Test client BTC wallet created`);

  await prisma.userWallet.upsert({
    where: {
      userId_address: {
        userId: testClient.id,
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
      }
    },
    update: {},
    create: {
      userId: testClient.id,
      blockchainCode: 'ETHEREUM',
      currencyCode: 'ETH',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      label: 'My Ethereum Wallet',
      isVerified: true,
      isDefault: true
    }
  });
  console.log(`  ✓ Test client ETH wallet created\n`);

  // 14. Create Integration Settings
  console.log('🔌 Creating integration settings...');
  
  const integrations = [
    {
      service: 'kycaid',
      isEnabled: true,
      status: 'active',
      config: {
        apiKey: process.env.KYCAID_API_KEY || 'test-key',
        formId: process.env.KYCAID_FORM_ID || 'test-form',
        webhookSecret: process.env.KYCAID_WEBHOOK_SECRET || 'test-secret'
      }
    },
    {
      service: 'resend',
      isEnabled: true,
      status: 'active',
      config: {
        apiKey: process.env.RESEND_API_KEY || 'test-key',
        fromEmail: process.env.EMAIL_FROM || 'noreply@apricode.io'
      }
    },
    {
      service: 'coingecko',
      isEnabled: true,
      status: 'active',
      config: {
        baseUrl: 'https://api.coingecko.com/api/v3',
        cacheDuration: 60000
      }
    },
    {
      service: 'tatum',
      isEnabled: true,
      status: 'active',
      config: {
        apiKey: process.env.TATUM_API_KEY || 'test-key',
        network: 'mainnet'
      }
    }
  ];

  for (const integration of integrations) {
    // Create in IntegrationSetting (old table)
    await prisma.integrationSetting.upsert({
      where: { service: integration.service },
      update: {},
      create: integration
    });
    
    // Also create in Integration (new table for IntegrationFactory)
    await prisma.integration.upsert({
      where: { service: integration.service },
      update: {
        isEnabled: integration.isEnabled,
        status: integration.status,
        config: integration.config
      },
      create: {
        service: integration.service,
        isEnabled: integration.isEnabled,
        status: integration.status,
        config: integration.config
      }
    });
    
    console.log(`  ✓ ${integration.service}`);
  }
  console.log('');

  // 15. Create CRM Reference Tables

  // Rate Providers
  console.log('📊 Creating rate providers...');
  const rateProviders = [
    { code: 'coingecko', name: 'CoinGecko', type: 'market', weight: 1.0, isActive: true, priority: 1 },
    { code: 'binance', name: 'Binance', type: 'market', weight: 1.5, isActive: false, priority: 2 },
    { code: 'kraken', name: 'Kraken', type: 'market', weight: 1.2, isActive: false, priority: 3 }
  ];
  
  for (const provider of rateProviders) {
    await prisma.rateProvider.upsert({
      where: { code: provider.code },
      update: {},
      create: provider
    });
    console.log(`  ✓ ${provider.name}`);
  }
  console.log('');

  // Fee Profiles
  console.log('💵 Creating fee profiles...');
  const feeProfiles = [
    {
      code: 'standard',
      name: 'Standard Fee',
      spreadBps: 150, // 1.5%
      fixedFeeFiat: 0,
      networkFeePolicy: 'pass-through',
      isActive: true,
      priority: 1
    },
    {
      code: 'vip',
      name: 'VIP Client',
      spreadBps: 75, // 0.75%
      fixedFeeFiat: 0,
      networkFeePolicy: 'pass-through',
      isActive: true,
      priority: 2
    }
  ];
  
  for (const profile of feeProfiles) {
    await prisma.feeProfile.upsert({
      where: { code: profile.code },
      update: {},
      create: profile
    });
    console.log(`  ✓ ${profile.name}`);
  }
  console.log('');

  // KYC Levels
  console.log('🎯 Creating KYC levels...');
  const kycLevels = [
    {
      code: 'L0',
      name: 'Unverified',
      description: 'No verification required',
      allowMethods: ['bank'],
      dailyLimit: 100,
      monthlyLimit: 1000,
      isActive: true,
      priority: 1
    },
    {
      code: 'L1',
      name: 'Basic',
      description: 'Basic identity verification',
      allowMethods: ['bank', 'card'],
      dailyLimit: 1000,
      monthlyLimit: 10000,
      isActive: true,
      priority: 2
    },
    {
      code: 'L2',
      name: 'Advanced',
      description: 'Full KYC verification',
      allowMethods: ['bank', 'card', 'swift'],
      dailyLimit: 10000,
      monthlyLimit: 100000,
      isActive: true,
      priority: 3
    }
  ];
  
  for (const level of kycLevels) {
    await prisma.kycLevel.upsert({
      where: { code: level.code },
      update: {},
      create: level
    });
    console.log(`  ✓ ${level.name} (${level.code})`);
  }
  console.log('');

  // PSP Connectors
  console.log('🔌 Creating PSP connectors...');
  const pspConnectors = [
    {
      code: 'manual',
      name: 'Manual Processing',
      capabilities: ['bank'],
      settlementCurrency: 'EUR',
      isEnabled: true,
      status: 'active'
    },
    {
      code: 'tpay',
      name: 'TPay',
      capabilities: ['card', 'bank', 'blik'],
      settlementCurrency: 'PLN',
      isEnabled: false,
      status: 'unconfigured'
    },
    {
      code: 'stripe',
      name: 'Stripe',
      capabilities: ['card'],
      settlementCurrency: 'EUR',
      isEnabled: false,
      status: 'unconfigured'
    }
  ];
  
  for (const psp of pspConnectors) {
    await prisma.pspConnector.upsert({
      where: { code: psp.code },
      update: {},
      create: psp
    });
    console.log(`  ✓ ${psp.name}`);
  }
  console.log('');

  // Order Status Configs
  console.log('📋 Creating order status configs...');
  const orderStatuses = [
    { code: 'created', name: 'Created', color: '#6b7280', priority: 1, nextStatuses: ['kyc_pending', 'payment_pending'] },
    { code: 'kyc_pending', name: 'KYC Pending', color: '#f59e0b', priority: 2, nextStatuses: ['payment_pending', 'cancelled'] },
    { code: 'payment_pending', name: 'Payment Pending', color: '#3b82f6', priority: 3, nextStatuses: ['payment_received', 'expired', 'cancelled'] },
    { code: 'payment_received', name: 'Payment Received', color: '#8b5cf6', priority: 4, nextStatuses: ['processing'] },
    { code: 'processing', name: 'Processing', color: '#ec4899', priority: 5, nextStatuses: ['completed', 'failed'] },
    { code: 'completed', name: 'Completed', color: '#10b981', isTerminal: true, priority: 6, nextStatuses: [] },
    { code: 'cancelled', name: 'Cancelled', color: '#ef4444', isTerminal: true, priority: 7, nextStatuses: [] },
    { code: 'expired', name: 'Expired', color: '#6b7280', isTerminal: true, priority: 8, nextStatuses: [] },
    { code: 'failed', name: 'Failed', color: '#dc2626', isTerminal: true, priority: 9, nextStatuses: [] }
  ];
  
  for (const status of orderStatuses) {
    await prisma.orderStatusConfig.upsert({
      where: { code: status.code },
      update: {},
      create: status
    });
    console.log(`  ✓ ${status.name}`);
  }
  console.log('');

  // Transaction Status Configs
  console.log('⛓️  Creating transaction status configs...');
  const txStatuses = [
    { code: 'queued', name: 'Queued', color: '#6b7280', priority: 1 },
    { code: 'broadcast', name: 'Broadcasting', color: '#f59e0b', priority: 2 },
    { code: 'confirming', name: 'Confirming', color: '#3b82f6', priority: 3 },
    { code: 'confirmed', name: 'Confirmed', color: '#10b981', isTerminal: true, priority: 4 },
    { code: 'failed', name: 'Failed', color: '#ef4444', isTerminal: true, priority: 5 }
  ];
  
  for (const status of txStatuses) {
    await prisma.transactionStatusConfig.upsert({
      where: { code: status.code },
      update: {},
      create: status
    });
    console.log(`  ✓ ${status.name}`);
  }
  console.log('');

  // Widget Config
  console.log('🎨 Creating widget config...');
  await prisma.widgetConfig.upsert({
    where: { code: 'main' },
    update: {},
    create: {
      code: 'main',
      name: 'Main Widget',
      supportedPairs: ['EUR→BTC', 'EUR→ETH', 'PLN→BTC', 'PLN→ETH'],
      defaultFiat: 'EUR',
      defaultCrypto: 'BTC',
      theme: {
        logo: '/logo.png',
        primaryColor: '#3b82f6',
        fontFamily: 'Inter'
      },
      minKycForMethods: {
        card: 'L1',
        bank: 'L0'
      },
      allowedMethods: ['sepa_eur', 'bank_pln'],
      isActive: true
    }
  });
  console.log('  ✓ Main widget config created\n');

  // User KYC Levels (assign test client to L1)
  console.log('👤 Assigning KYC levels...');
  await prisma.userKycLevel.upsert({
    where: { userId: testClient.id },
    update: { kycLevel: 'L1' },
    create: {
      userId: testClient.id,
      kycLevel: 'L1'
    }
  });
  console.log('  ✓ Test client assigned to L1\n');

  console.log('\n📝 Test Accounts:');
  console.log(`   Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`   Client: client@test.com / TestClient123!`);
  console.log('\n📊 Created:');
  console.log(`   - 2 Users (1 Admin, 1 Client)`);
  console.log(`   - 4 Cryptocurrencies (BTC, ETH, USDT, SOL)`);
  console.log(`   - 2 Fiat Currencies (EUR, PLN)`);
  console.log(`   - 8 Trading Pairs`);
  console.log(`   - 2 Bank Accounts (EUR, PLN)`);
  console.log(`   - 3 Sample Orders`);
  console.log(`   - 7 System Settings`);
  console.log(`   - 5 Blockchain Networks`);
  console.log(`   - 4 Platform Wallets`);
  console.log(`   - 3 Payment Methods`);
  console.log(`   - 14 KYC Form Fields`);
  console.log(`   - 2 User Wallets`);
  console.log(`   - 4 Integration Settings (kycaid, resend, coingecko, tatum)`);
  console.log('\n📋 CRM Reference Tables:');
  console.log(`   - 3 Rate Providers`);
  console.log(`   - 2 Fee Profiles`);
  console.log(`   - 3 KYC Levels`);
  console.log(`   - 3 PSP Connectors`);
  console.log(`   - 9 Order Status Configs`);
  console.log(`   - 5 Transaction Status Configs`);
  console.log(`   - 1 Widget Config`);
  console.log(`   - 1 User KYC Level Assignment`);
  
  // NEW: Seed Payment Accounts
  await seedPaymentAccounts();
  console.log(`   - 10+ Payment Accounts (Bank + Crypto)`);
  
  // NEW: Seed KYC Form Fields
  await seedKycFormFields();
  console.log(`   - 37+ KYC Form Fields`);
  
  // NEW: Seed Event Categories
  console.log('\n📂 Seeding event categories...');
  const eventCategories = [
    {
      code: 'ORDER',
      name: 'Order Management',
      description: 'Events related to order lifecycle',
      icon: 'ShoppingCart',
      color: '#3B82F6', // blue-500
      isSystem: true,
      isActive: true,
      sortOrder: 1,
    },
    {
      code: 'KYC',
      name: 'KYC & Verification',
      description: 'Events related to identity verification',
      icon: 'Shield',
      color: '#10B981', // green-500
      isSystem: true,
      isActive: true,
      sortOrder: 2,
    },
    {
      code: 'PAYMENT',
      name: 'Payments',
      description: 'Events related to payment processing',
      icon: 'CreditCard',
      color: '#8B5CF6', // violet-500
      isSystem: true,
      isActive: true,
      sortOrder: 3,
    },
    {
      code: 'SECURITY',
      name: 'Security & Auth',
      description: 'Events related to security and authentication',
      icon: 'Lock',
      color: '#EF4444', // red-500
      isSystem: true,
      isActive: true,
      sortOrder: 4,
    },
    {
      code: 'SYSTEM',
      name: 'System Events',
      description: 'Internal system events and maintenance',
      icon: 'Settings',
      color: '#6B7280', // gray-500
      isSystem: true,
      isActive: true,
      sortOrder: 5,
    },
    {
      code: 'ADMIN',
      name: 'Admin Actions',
      description: 'Events related to admin panel actions',
      icon: 'UserCog',
      color: '#F59E0B', // amber-500
      isSystem: true,
      isActive: true,
      sortOrder: 6,
    },
    {
      code: 'MARKETING',
      name: 'Marketing & Promo',
      description: 'Events related to marketing campaigns',
      icon: 'Megaphone',
      color: '#EC4899', // pink-500
      isSystem: true,
      isActive: true,
      sortOrder: 7,
    },
  ];

  const categoryMap: Record<string, string> = {};
  for (const category of eventCategories) {
    const created = await prisma.notificationEventCategory.upsert({
      where: { code: category.code },
      update: {},
      create: category,
    });
    categoryMap[category.code] = created.id;
  }
  console.log(`  ✓ ${eventCategories.length} event categories created\n`);
  
  // NEW: Seed Notification Events
  console.log('\n📬 Seeding notification events...');
  const notificationEvents = [
    // ORDER EVENTS
    {
      eventKey: 'ORDER_CREATED',
      name: 'Order Created',
      description: 'New order has been created',
      category: 'ORDER' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'NORMAL' as const,
      isSystem: true,
      isActive: true,
    },
    {
      eventKey: 'ORDER_PAYMENT_RECEIVED',
      name: 'Payment Received',
      description: 'Payment for order has been received',
      category: 'ORDER' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'HIGH' as const,
      isSystem: true,
      isActive: true,
    },
    {
      eventKey: 'ORDER_COMPLETED',
      name: 'Order Completed',
      description: 'Order has been completed successfully',
      category: 'ORDER' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'HIGH' as const,
      isSystem: true,
      isActive: true,
    },
    {
      eventKey: 'ORDER_CANCELLED',
      name: 'Order Cancelled',
      description: 'Order has been cancelled',
      category: 'ORDER' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'NORMAL' as const,
      isSystem: true,
      isActive: true,
    },
    
    // KYC EVENTS
    {
      eventKey: 'KYC_SUBMITTED',
      name: 'KYC Submitted',
      description: 'KYC verification has been submitted',
      category: 'KYC' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'NORMAL' as const,
      isSystem: true,
      isActive: true,
    },
    {
      eventKey: 'KYC_APPROVED',
      name: 'KYC Approved',
      description: 'KYC verification has been approved',
      category: 'KYC' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'HIGH' as const,
      isSystem: true,
      isActive: true,
    },
    {
      eventKey: 'KYC_REJECTED',
      name: 'KYC Rejected',
      description: 'KYC verification has been rejected',
      category: 'KYC' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'HIGH' as const,
      isSystem: true,
      isActive: true,
    },
    {
      eventKey: 'KYC_DOCUMENTS_REQUIRED',
      name: 'KYC Documents Required',
      description: 'Additional documents are required for KYC',
      category: 'KYC' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'HIGH' as const,
      isSystem: true,
      isActive: true,
    },
    
    // PAYMENT EVENTS
    {
      eventKey: 'PAYMENT_PENDING',
      name: 'Payment Pending',
      description: 'Payment is pending confirmation',
      category: 'PAYMENT' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'NORMAL' as const,
      isSystem: true,
      isActive: true,
    },
    {
      eventKey: 'PAYMENT_CONFIRMED',
      name: 'Payment Confirmed',
      description: 'Payment has been confirmed',
      category: 'PAYMENT' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'HIGH' as const,
      isSystem: true,
      isActive: true,
    },
    {
      eventKey: 'PAYMENT_FAILED',
      name: 'Payment Failed',
      description: 'Payment has failed',
      category: 'PAYMENT' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'URGENT' as const,
      isSystem: true,
      isActive: true,
    },
    
    // SECURITY EVENTS
    {
      eventKey: 'SECURITY_LOGIN',
      name: 'New Login',
      description: 'New login detected from a new device or location',
      category: 'SECURITY' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'HIGH' as const,
      isSystem: true,
      isActive: true,
    },
    {
      eventKey: 'SECURITY_PASSWORD_CHANGED',
      name: 'Password Changed',
      description: 'Password has been changed',
      category: 'SECURITY' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'URGENT' as const,
      isSystem: true,
      isActive: true,
    },
    {
      eventKey: 'SECURITY_2FA_ENABLED',
      name: '2FA Enabled',
      description: 'Two-factor authentication has been enabled',
      category: 'SECURITY' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'HIGH' as const,
      isSystem: true,
      isActive: true,
    },
    {
      eventKey: 'SECURITY_SUSPICIOUS_ACTIVITY',
      name: 'Suspicious Activity',
      description: 'Suspicious activity detected on your account',
      category: 'SECURITY' as const,
      channels: ['EMAIL', 'IN_APP', 'SMS'] as const,
      priority: 'URGENT' as const,
      isSystem: true,
      isActive: true,
    },
    
    // SYSTEM EVENTS
    {
      eventKey: 'SYSTEM_MAINTENANCE',
      name: 'System Maintenance',
      description: 'System maintenance scheduled',
      category: 'SYSTEM' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'NORMAL' as const,
      isSystem: true,
      isActive: true,
    },
    {
      eventKey: 'SYSTEM_UPDATE',
      name: 'System Update',
      description: 'New system features or updates available',
      category: 'SYSTEM' as const,
      channels: ['IN_APP'] as const,
      priority: 'LOW' as const,
      isSystem: true,
      isActive: true,
    },
    {
      eventKey: 'WELCOME_EMAIL',
      name: 'Welcome Email',
      description: 'Welcome email sent to new users after registration',
      category: 'SYSTEM' as const,
      channels: ['EMAIL', 'IN_APP'] as const,
      priority: 'NORMAL' as const,
      isSystem: true,
      isActive: true,
    },
  ];

  // Create events with proper category and template links
  for (const event of notificationEvents) {
    // Get categoryId from categoryMap
    const categoryId = categoryMap[event.category];
    
    // Try to find matching email template
    const template = await prisma.emailTemplate.findFirst({
      where: { 
        key: event.eventKey,
        status: 'PUBLISHED',
        isActive: true
      }
    });
    
    await prisma.notificationEvent.upsert({
      where: { eventKey: event.eventKey },
      update: {
        categoryId: categoryId,
        templateId: template?.id || undefined,
      },
      create: {
        ...event,
        categoryId: categoryId,
        templateId: template?.id || undefined,
      },
    });
  }
  console.log(`  ✓ ${notificationEvents.length} notification events created with proper links\n`);
  
  // Seed Email Templates
  console.log('\n📧 Seeding email templates...');
  const fs = await import('fs/promises');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Import getBaseEmailLayout
  const { getBaseEmailLayout } = await import('../src/lib/email-templates/base-layout.js');
  
  const presetsPath = path.join(__dirname, '../src/lib/email-templates/presets.json');
  const presetsData = await fs.readFile(presetsPath, 'utf-8');
  const emailTemplates = JSON.parse(presetsData);
  
  for (const template of emailTemplates) {
    // Check if template already exists
    const existing = await prisma.emailTemplate.findFirst({
      where: { 
        key: template.key,
        orgId: null,
      },
    });

    if (!existing) {
      // Wrap body content in base layout with white-label placeholders
      const fullHtmlContent = getBaseEmailLayout(template.bodyContent, {
        brandName: '{{brandName}}',
        brandLogo: '{{brandLogo}}',
        primaryColor: '{{primaryColor}}',
        supportEmail: '{{supportEmail}}',
        supportPhone: '{{supportPhone}}',
      });

      await prisma.emailTemplate.create({
        data: {
          key: template.key,
          name: template.name,
          description: template.description,
          category: template.category,
          subject: template.subject,
          preheader: template.preheader,
          htmlContent: fullHtmlContent,
          textContent: '', // Will be generated from HTML
          layout: template.layout,
          variables: template.variables,
          version: 1,
          isActive: true,
          isDefault: true,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
    }
  }
  console.log(`  ✓ ${emailTemplates.length} email templates created\n`);
  
  console.log('\n✅ Database seeding completed successfully!\n');
}

main()
  .catch((error) => {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
