import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function seedBlockchains() {
  console.log('🌐 Seeding blockchain networks...\n');

  const blockchains = [
    {
      code: 'BITCOIN',
      name: 'Bitcoin',
      nativeToken: 'BTC',
      nativeAsset: 'BTC',
      explorerUrl: 'https://blockstream.info',
      rpcUrl: null,
      chainId: null,
      minConfirmations: 6,
      confirmations: 6,
      isActive: true,
      priority: 0
    },
    {
      code: 'ETHEREUM',
      name: 'Ethereum',
      nativeToken: 'ETH',
      nativeAsset: 'ETH',
      explorerUrl: 'https://etherscan.io',
      rpcUrl: 'https://mainnet.infura.io',
      chainId: 1,
      minConfirmations: 12,
      confirmations: 12,
      isActive: true,
      priority: 1
    },
    {
      code: 'BSC',
      name: 'Binance Smart Chain',
      nativeToken: 'BNB',
      nativeAsset: 'BNB',
      explorerUrl: 'https://bscscan.com',
      rpcUrl: 'https://bsc-dataseed.binance.org',
      chainId: 56,
      minConfirmations: 15,
      confirmations: 15,
      isActive: true,
      priority: 2
    },
    {
      code: 'POLYGON',
      name: 'Polygon',
      nativeToken: 'MATIC',
      nativeAsset: 'MATIC',
      explorerUrl: 'https://polygonscan.com',
      rpcUrl: 'https://polygon-rpc.com',
      chainId: 137,
      minConfirmations: 128,
      confirmations: 128,
      isActive: true,
      priority: 3
    },
    {
      code: 'TRON',
      name: 'Tron',
      nativeToken: 'TRX',
      nativeAsset: 'TRX',
      explorerUrl: 'https://tronscan.org',
      rpcUrl: 'https://api.trongrid.io',
      chainId: null,
      minConfirmations: 19,
      confirmations: 19,
      isActive: true,
      priority: 4
    },
    {
      code: 'SOLANA',
      name: 'Solana',
      nativeToken: 'SOL',
      nativeAsset: 'SOL',
      explorerUrl: 'https://explorer.solana.com',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      chainId: null,
      minConfirmations: 32,
      confirmations: 32,
      isActive: true,
      priority: 5
    }
  ];

  for (const blockchain of blockchains) {
    try {
      const created = await prisma.blockchainNetwork.upsert({
        where: { code: blockchain.code },
        update: {},
        create: blockchain
      });
      console.log(`✅ ${created.name} (${created.code})`);
    } catch (error) {
      console.error(`❌ Failed to create ${blockchain.code}:`, error);
    }
  }

  console.log('\n✨ Blockchain networks seeding complete!');
}

seedBlockchains()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
