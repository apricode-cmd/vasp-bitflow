/**
 * Full sync from production database
 * Order matters due to foreign keys!
 */

import { PrismaClient, Prisma, PaymentDirection, PaymentAccountType } from '@prisma/client';

const PROD_DATABASE_URL = 'postgresql://postgres.zjrroaymcsanrmotmars:6xcTBfcCr9whnJ1@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10';

async function main() {
  console.log('🔄 Full sync from production...\n');

  const prod = new PrismaClient({ datasources: { db: { url: PROD_DATABASE_URL } } });
  const local = new PrismaClient();

  try {
    await prod.$connect();
    await local.$connect();

    // 1. BlockchainNetwork (no deps)
    console.log('📦 BlockchainNetwork...');
    const networks = await prod.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "BlockchainNetwork"`;
    await local.blockchainNetwork.deleteMany();
    for (const n of networks) {
      await local.blockchainNetwork.create({
        data: {
          id: String(n.id),
          code: String(n.code || ''),
          name: String(n.name),
          symbol: n.symbol ? String(n.symbol) : null,
          nativeToken: String(n.nativeToken || 'ETH'),
          nativeAsset: n.nativeAsset ? String(n.nativeAsset) : null,
          explorerUrl: String(n.explorerUrl || ''),
          rpcUrl: n.rpcUrl ? String(n.rpcUrl) : null,
          chainId: n.chainId ? Number(n.chainId) : null,
          minConfirmations: Number(n.minConfirmations || 12),
          confirmations: Number(n.confirmations || 12),
          isActive: Boolean(n.isActive ?? true),
          priority: Number(n.priority || 0),
        },
      });
    }
    console.log(`   ✅ ${networks.length} networks`);

    // 2. FiatCurrency (no deps)
    console.log('📦 FiatCurrency...');
    const fiats = await prod.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "FiatCurrency"`;
    await local.fiatCurrency.deleteMany();
    for (const f of fiats) {
      await local.fiatCurrency.create({
        data: {
          code: String(f.code),
          name: String(f.name),
          symbol: String(f.symbol || f.code),
          precision: Number(f.precision || 2),
          isActive: Boolean(f.isActive ?? true),
          priority: Number(f.priority || 0),
        },
      });
    }
    console.log(`   ✅ ${fiats.length} fiat currencies`);

    // 3. Currency (crypto, no deps)
    console.log('📦 Currency (Crypto)...');
    const cryptos = await prod.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "Currency"`;
    await local.currency.deleteMany();
    for (const c of cryptos) {
      await local.currency.create({
        data: {
          code: String(c.code),
          name: String(c.name),
          symbol: String(c.symbol || c.code),
          decimals: Number(c.decimals || 8),
          precision: Number(c.precision || 8),
          coingeckoId: String(c.coingeckoId || String(c.code).toLowerCase()),
          isActive: Boolean(c.isActive ?? true),
          priority: Number(c.priority || 0),
          isToken: Boolean(c.isToken ?? false),
          iconUrl: c.iconUrl ? String(c.iconUrl) : null,
          minOrderAmount: Number(c.minOrderAmount || 0.001),
          maxOrderAmount: Number(c.maxOrderAmount || 100),
        },
      });
    }
    console.log(`   ✅ ${cryptos.length} cryptocurrencies`);

    // 4. TradingPair (depends on Currency + FiatCurrency)
    console.log('📦 TradingPair...');
    const pairs = await prod.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "TradingPair"`;
    await local.tradingPair.deleteMany();
    for (const p of pairs) {
      await local.tradingPair.create({
        data: {
          id: String(p.id),
          cryptoCode: String(p.cryptoCode),
          fiatCode: String(p.fiatCode),
          isActive: Boolean(p.isActive ?? true),
          minCryptoAmount: Number(p.minCryptoAmount || 0),
          maxCryptoAmount: Number(p.maxCryptoAmount || 1000000),
          minFiatAmount: Number(p.minFiatAmount || 0),
          maxFiatAmount: Number(p.maxFiatAmount || 1000000),
          feePercent: Number(p.feePercent || 1.5),
          priority: Number(p.priority || 0),
        },
      });
    }
    console.log(`   ✅ ${pairs.length} trading pairs`);

    // 5. CurrencyBlockchainNetwork (depends on Currency + BlockchainNetwork)
    console.log('📦 CurrencyBlockchainNetwork...');
    const cbn = await prod.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "CurrencyBlockchainNetwork"`;
    await local.currencyBlockchainNetwork.deleteMany();
    for (const c of cbn) {
      await local.currencyBlockchainNetwork.create({
        data: {
          id: String(c.id),
          currencyCode: String(c.currencyCode),
          blockchainCode: String(c.blockchainCode),
          contractAddress: c.contractAddress ? String(c.contractAddress) : null,
          isNative: Boolean(c.isNative ?? false),
          isActive: Boolean(c.isActive ?? true),
          priority: Number(c.priority || 0),
        },
      });
    }
    console.log(`   ✅ ${cbn.length} currency-network links`);

    // 6. BankDetails (depends on FiatCurrency)
    console.log('📦 BankDetails...');
    const banks = await prod.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "BankDetails"`;
    await local.bankDetails.deleteMany();
    for (const b of banks) {
      await local.bankDetails.create({
        data: {
          id: String(b.id),
          currency: String(b.currency),
          bankName: String(b.bankName),
          bankAddress: b.bankAddress ? String(b.bankAddress) : null,
          accountHolder: String(b.accountHolder),
          iban: String(b.iban),
          swift: b.swift ? String(b.swift) : null,
          bic: b.bic ? String(b.bic) : null,
          sortCode: b.sortCode ? String(b.sortCode) : null,
          referenceTemplate: String(b.referenceTemplate || 'APR-{orderId}'),
          instructions: b.instructions ? String(b.instructions) : null,
          isActive: Boolean(b.isActive ?? true),
          priority: Number(b.priority || 0),
        },
      });
    }
    console.log(`   ✅ ${banks.length} bank details`);

    // 7. PaymentAccount (depends on Currency + BlockchainNetwork)
    console.log('📦 PaymentAccount...');
    const accounts = await prod.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "PaymentAccount"`;
    await local.paymentAccount.deleteMany();
    for (const a of accounts) {
      const typeVal = String(a.type || 'BANK_ACCOUNT');
      const type: PaymentAccountType = typeVal.includes('CRYPTO') || typeVal.includes('WALLET') ? 'CRYPTO_WALLET' : 'BANK_ACCOUNT';
      
      await local.paymentAccount.create({
        data: {
          id: String(a.id),
          code: String(a.code),
          name: String(a.name),
          type: type,
          description: a.description ? String(a.description) : null,
          currency: a.currency ? String(a.currency) : null,
          bankName: a.bankName ? String(a.bankName) : null,
          bankAddress: a.bankAddress ? String(a.bankAddress) : null,
          accountHolder: a.accountHolder ? String(a.accountHolder) : null,
          iban: a.iban ? String(a.iban) : null,
          swift: a.swift ? String(a.swift) : null,
          bic: a.bic ? String(a.bic) : null,
          sortCode: a.sortCode ? String(a.sortCode) : null,
          referenceTemplate: a.referenceTemplate ? String(a.referenceTemplate) : null,
          cryptocurrencyCode: a.cryptocurrencyCode ? String(a.cryptocurrencyCode) : null,
          blockchainCode: a.blockchainCode ? String(a.blockchainCode) : null,
          address: a.address ? String(a.address) : null,
          balance: a.balance ? Number(a.balance) : null,
          minBalance: a.minBalance ? Number(a.minBalance) : null,
          instructions: a.instructions ? String(a.instructions) : null,
          isActive: Boolean(a.isActive ?? true),
          isDefault: Boolean(a.isDefault ?? false),
          priority: Number(a.priority || 0),
        },
      });
    }
    console.log(`   ✅ ${accounts.length} payment accounts`);

    // 8. PlatformWallet (depends on Currency + BlockchainNetwork)
    console.log('📦 PlatformWallet...');
    const wallets = await prod.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "PlatformWallet"`;
    await local.platformWallet.deleteMany();
    for (const w of wallets) {
      await local.platformWallet.create({
        data: {
          id: String(w.id),
          currencyCode: String(w.currencyCode),
          blockchainCode: String(w.blockchainCode),
          address: String(w.address),
          label: String(w.label),
          isActive: Boolean(w.isActive ?? true),
          balance: Number(w.balance || 0),
        },
      });
    }
    console.log(`   ✅ ${wallets.length} platform wallets`);

    // 9. PaymentMethod (refresh with bank details link)
    console.log('📦 PaymentMethod...');
    const methods = await prod.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "PaymentMethod"`;
    await local.paymentMethod.deleteMany();
    for (const m of methods) {
      const dir = String(m.direction || 'IN');
      await local.paymentMethod.create({
        data: {
          code: String(m.code),
          name: String(m.name),
          description: m.description ? String(m.description) : null,
          type: String(m.type || 'BANK_TRANSFER'),
          direction: (dir === 'OUT' ? 'OUT' : dir === 'BOTH' ? 'BOTH' : 'IN') as PaymentDirection,
          currency: String(m.currency || 'EUR'),
          minAmount: m.minAmount ? Number(m.minAmount) : null,
          maxAmount: m.maxAmount ? Number(m.maxAmount) : null,
          feeFixed: Number(m.feeFixed || 0),
          feePercent: Number(m.feePercent || 0),
          processingTime: m.processingTime ? String(m.processingTime) : null,
          instructions: m.instructions ? String(m.instructions) : null,
          iconUrl: m.iconUrl ? String(m.iconUrl) : null,
          priority: Number(m.priority || 0),
          isActive: Boolean(m.isActive ?? true),
          isAvailableForClients: Boolean(m.isAvailableForClients ?? true),
          paymentAccountId: m.paymentAccountId ? String(m.paymentAccountId) : null,
          bankAccountId: m.bankAccountId ? String(m.bankAccountId) : null,
        },
      });
    }
    console.log(`   ✅ ${methods.length} payment methods`);

    // 10. KycFormField
    console.log('📦 KycFormField...');
    const fields = await prod.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "KycFormField"`;
    await local.kycFormField.deleteMany();
    for (const f of fields) {
      await local.kycFormField.create({
        data: {
          id: String(f.id),
          fieldName: String(f.fieldName),
          label: String(f.label),
          fieldType: String(f.fieldType),
          isRequired: Boolean(f.isRequired),
          isEnabled: Boolean(f.isEnabled ?? true),
          category: String(f.category || 'personal'),
          validation: f.validation ? (f.validation as Prisma.InputJsonValue) : Prisma.JsonNull,
          options: f.options ? (f.options as Prisma.InputJsonValue) : Prisma.JsonNull,
          dependsOn: f.dependsOn ? String(f.dependsOn) : null,
          showWhen: f.showWhen ? (f.showWhen as Prisma.InputJsonValue) : Prisma.JsonNull,
          priority: Number(f.priority || 0),
          placeholder: f.placeholder ? String(f.placeholder) : null,
          helpText: f.helpText ? String(f.helpText) : null,
        },
      });
    }
    console.log(`   ✅ ${fields.length} KYC fields`);

    // 11. RoleModel
    console.log('📦 RoleModel...');
    try {
      const roles = await prod.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "Role_"`;
      for (const r of roles) {
        await local.roleModel.upsert({
          where: { code: String(r.code) },
          update: { name: String(r.name), description: r.description ? String(r.description) : null },
          create: {
            code: String(r.code),
            name: String(r.name),
            description: r.description ? String(r.description) : null,
            isSystem: Boolean(r.isSystem ?? false),
          },
        });
      }
      console.log(`   ✅ ${roles.length} roles`);
    } catch {
      console.log('   ⚠️  RoleModel skipped');
    }

    console.log('\n✅ Full sync completed!');

  } finally {
    await prod.$disconnect();
    await local.$disconnect();
  }
}

main().catch(console.error);
