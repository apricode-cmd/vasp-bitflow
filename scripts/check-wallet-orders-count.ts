/**
 * Check UserWallet orders count
 * Verify that _count.orders returns correct data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWalletOrdersCount() {
  try {
    console.log('🔍 Checking UserWallet orders count...\n');

    // Get wallets with _count
    const wallets = await prisma.userWallet.findMany({
      take: 5,
      include: {
        user: {
          select: {
            email: true
          }
        },
        currency: {
          select: {
            code: true,
            symbol: true
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${wallets.length} wallets:\n`);

    for (const wallet of wallets) {
      console.log(`Wallet ID: ${wallet.id}`);
      console.log(`  Address: ${wallet.address}`);
      console.log(`  Currency: ${wallet.currency.symbol} ${wallet.currency.code}`);
      console.log(`  User: ${wallet.user.email}`);
      console.log(`  _count.orders: ${wallet._count.orders}`);

      // Manual count to verify
      const manualCount = await prisma.order.count({
        where: {
          userWalletId: wallet.id
        }
      });

      console.log(`  Manual count: ${manualCount}`);
      
      if (wallet._count.orders !== manualCount) {
        console.log(`  ⚠️  MISMATCH! _count=${wallet._count.orders}, manual=${manualCount}`);
      } else {
        console.log(`  ✅ Match!`);
      }

      // Show actual orders if any
      if (manualCount > 0) {
        const orders = await prisma.order.findMany({
          where: {
            userWalletId: wallet.id
          },
          select: {
            id: true,
            paymentReference: true,
            status: true,
            cryptoAmount: true
          },
          take: 3
        });

        console.log(`  Orders (${manualCount} total):`);
        orders.forEach(order => {
          console.log(`    - ${order.paymentReference}: ${order.status} (${order.cryptoAmount})`);
        });
      }

      console.log('');
    }

    // Check if there are any wallets with NULL userWalletId in orders
    const ordersWithoutWallet = await prisma.order.count({
      where: {
        userWalletId: null
      }
    });

    console.log(`\n📊 Statistics:`);
    console.log(`  Total orders without wallet: ${ordersWithoutWallet}`);

    const totalOrders = await prisma.order.count();
    const ordersWithWallet = await prisma.order.count({
      where: {
        userWalletId: {
          not: null
        }
      }
    });

    console.log(`  Total orders: ${totalOrders}`);
    console.log(`  Orders with wallet: ${ordersWithWallet}`);
    console.log(`  Orders without wallet: ${ordersWithoutWallet}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWalletOrdersCount();

