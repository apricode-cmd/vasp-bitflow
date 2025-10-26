import { PrismaClient, PaymentAccountType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPaymentAccounts() {
  console.log('🏦 Seeding Payment Accounts...');
  
  // Проверяем существование необходимых валют и сетей
  const existingCryptos = await prisma.currency.findMany({
    where: { code: { in: ['BTC', 'ETH', 'USDT'] } },
    select: { code: true }
  });
  
  const existingFiats = await prisma.fiatCurrency.findMany({
    where: { code: { in: ['EUR', 'PLN'] } },
    select: { code: true }
  });
  
  const existingNetworks = await prisma.blockchainNetwork.findMany({
    where: { code: { in: ['BITCOIN', 'ETHEREUM', 'BSC', 'POLYGON'] } },
    select: { code: true }
  });
  
  const cryptoCodes = new Set(existingCryptos.map(c => c.code));
  const fiatCodes = new Set(existingFiats.map(f => f.code));
  const networkCodes = new Set(existingNetworks.map(n => n.code));
  
  console.log(`  Found ${cryptoCodes.size} cryptos, ${fiatCodes.size} fiats, ${networkCodes.size} networks`);

  // FIAT: Bank Accounts
  const bankAccounts = [
    {
      code: 'sepa_eur_main',
      name: 'Main EUR SEPA Account',
      type: PaymentAccountType.BANK_ACCOUNT,
      description: 'Primary SEPA account for EUR transactions',
      fiatCurrencyCode: 'EUR',
      bankName: 'Deutsche Bank AG',
      bankAddress: 'Frankfurt, Germany',
      accountHolder: 'Apricode Exchange Ltd',
      iban: 'DE89370400440532013000',
      swift: 'COBADEFFXXX',
      bic: 'COBADEFFXXX',
      referenceTemplate: 'APR-{orderId}',
      instructions: 'Please include the reference number in your transfer',
      isActive: true,
      isDefault: true,
      priority: 1,
    },
    {
      code: 'sepa_eur_backup',
      name: 'Backup EUR SEPA Account',
      type: PaymentAccountType.BANK_ACCOUNT,
      fiatCurrencyCode: 'EUR',
      bankName: 'Commerzbank AG',
      bankAddress: 'Frankfurt, Germany',
      accountHolder: 'Apricode Exchange Ltd',
      iban: 'DE12500105170648489890',
      swift: 'COBADEFF',
      referenceTemplate: 'APR-{orderId}',
      isActive: true,
      priority: 2,
    },
    {
      code: 'swift_pln_main',
      name: 'Main PLN Business Account',
      type: PaymentAccountType.BANK_ACCOUNT,
      fiatCurrencyCode: 'PLN',
      bankName: 'PKO Bank Polski',
      bankAddress: 'Warsaw, Poland',
      accountHolder: 'Apricode Exchange Sp. z o.o.',
      iban: 'PL61109010140000071219812874',
      swift: 'BPKOPLPW',
      referenceTemplate: 'APR-{orderId}',
      isActive: true,
      isDefault: true,
      priority: 1,
    },
  ];

  // CRYPTO: Wallet Accounts
  const cryptoWallets = [
    {
      code: 'btc_hot_wallet',
      name: 'BTC Hot Wallet',
      type: PaymentAccountType.CRYPTO_WALLET,
      description: 'Main Bitcoin hot wallet for payouts',
      cryptocurrencyCode: 'BTC',
      blockchainCode: 'BITCOIN',
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      balance: 0.5,
      minBalance: 0.1,
      isActive: true,
      isDefault: true,
      priority: 1,
      alertsEnabled: true,
    },
    {
      code: 'btc_cold_storage',
      name: 'BTC Cold Storage',
      type: PaymentAccountType.CRYPTO_WALLET,
      description: 'Bitcoin cold storage (offline)',
      cryptocurrencyCode: 'BTC',
      blockchainCode: 'BITCOIN',
      address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      balance: 10.0,
      isActive: false,
      priority: 10,
      alertsEnabled: false,
    },
    {
      code: 'eth_main_wallet',
      name: 'ETH Main Wallet',
      type: PaymentAccountType.CRYPTO_WALLET,
      cryptocurrencyCode: 'ETH',
      blockchainCode: 'ETHEREUM',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
      balance: 5.0,
      minBalance: 1.0,
      isActive: true,
      isDefault: true,
      priority: 1,
    },
    {
      code: 'usdt_eth_wallet',
      name: 'USDT (Ethereum)',
      type: PaymentAccountType.CRYPTO_WALLET,
      cryptocurrencyCode: 'USDT',
      blockchainCode: 'ETHEREUM',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
      balance: 10000,
      minBalance: 1000,
      isActive: true,
      isDefault: true,
      priority: 1,
    },
    {
      code: 'usdt_bsc_wallet',
      name: 'USDT (BSC)',
      type: PaymentAccountType.CRYPTO_WALLET,
      cryptocurrencyCode: 'USDT',
      blockchainCode: 'BSC',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
      balance: 5000,
      minBalance: 500,
      isActive: true,
      priority: 2,
    },
    {
      code: 'usdt_polygon_wallet',
      name: 'USDT (Polygon)',
      type: PaymentAccountType.CRYPTO_WALLET,
      cryptocurrencyCode: 'USDT',
      blockchainCode: 'POLYGON',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
      balance: 3000,
      isActive: true,
      priority: 3,
    },
    // TRX removed - add TRX currency first in main seed.ts
  ];

  // Фильтруем аккаунты - создаем только те, для которых существуют валюты и сети
  const validBankAccounts = bankAccounts.filter(acc => 
    acc.fiatCurrencyCode && fiatCodes.has(acc.fiatCurrencyCode)
  );
  
  const validCryptoWallets = cryptoWallets.filter(acc => 
    acc.cryptocurrencyCode && 
    acc.blockchainCode &&
    cryptoCodes.has(acc.cryptocurrencyCode) &&
    networkCodes.has(acc.blockchainCode)
  );
  
  const skippedAccounts = (bankAccounts.length + cryptoWallets.length) - (validBankAccounts.length + validCryptoWallets.length);
  if (skippedAccounts > 0) {
    console.log(`  ⚠️  Skipped ${skippedAccounts} accounts (missing currency/network)`);
  }

  // Create all valid accounts
  for (const account of [...validBankAccounts, ...validCryptoWallets]) {
    // Prepare data for Prisma with correct relations
    const { fiatCurrencyCode, cryptocurrencyCode, blockchainCode, ...baseAccount } = account;
    
    const accountData: any = { ...baseAccount };
    
    // Add relations using connect
    if (fiatCurrencyCode) {
      accountData.fiatCurrency = { connect: { code: fiatCurrencyCode } };
    }
    if (cryptocurrencyCode) {
      accountData.cryptocurrency = { connect: { code: cryptocurrencyCode } };
    }
    if (blockchainCode) {
      accountData.blockchain = { connect: { code: blockchainCode } };
    }
    
    await prisma.paymentAccount.upsert({
      where: { code: account.code },
      update: accountData,
      create: accountData,
    });
    console.log(`✅ Created/Updated: ${account.name}`);
  }

  console.log('✅ Payment Accounts seeded successfully!\n');
}

export { seedPaymentAccounts };

