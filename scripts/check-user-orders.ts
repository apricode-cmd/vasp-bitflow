/**
 * Check specific user's orders and wallet relationship
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserOrders() {
  try {
    const email = 'bogdan.apricode@gmail.com';
    
    console.log(`🔍 Checking orders for ${email}\n`);

    // Get user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true
      }
    });

    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log(`User ID: ${user.id}\n`);

    // Get user's wallets
    const wallets = await prisma.userWallet.findMany({
      where: {
        userId: user.id
      },
      select: {
        id: true,
        address: true,
        currencyCode: true,
        _count: {
          select: {
            orders: true
          }
        }
      }
    });

    console.log(`User's Wallets (${wallets.length}):`);
    wallets.forEach(w => {
      console.log(`  - ${w.id}: ${w.currencyCode} ${w.address} (_count.orders: ${w._count.orders})`);
    });
    console.log('');

    // Get user's orders
    const orders = await prisma.order.findMany({
      where: {
        userId: user.id
      },
      select: {
        id: true,
        paymentReference: true,
        status: true,
        currencyCode: true,
        cryptoAmount: true,
        walletAddress: true,
        userWalletId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`User's Orders (${orders.length}):`);
    orders.forEach(o => {
      console.log(`  ${o.paymentReference}:`);
      console.log(`    - Status: ${o.status}`);
      console.log(`    - Currency: ${o.currencyCode}`);
      console.log(`    - Amount: ${o.cryptoAmount}`);
      console.log(`    - Wallet Address: ${o.walletAddress}`);
      console.log(`    - UserWalletId: ${o.userWalletId || 'NULL ⚠️'}`);
      console.log('');
    });

    // Count orders by userWalletId
    const ordersWithWallet = orders.filter(o => o.userWalletId !== null).length;
    const ordersWithoutWallet = orders.filter(o => o.userWalletId === null).length;

    console.log(`\n📊 Summary:`);
    console.log(`  Total orders: ${orders.length}`);
    console.log(`  Orders with userWalletId: ${ordersWithWallet}`);
    console.log(`  Orders WITHOUT userWalletId: ${ordersWithoutWallet}`);

    if (ordersWithoutWallet > 0) {
      console.log(`\n⚠️  PROBLEM FOUND: ${ordersWithoutWallet} orders don't have userWalletId!`);
      console.log(`   This is why _count.orders shows 0 for wallets.\n`);

      // Try to match orders to wallets
      console.log(`🔧 Attempting to match orders to wallets by address...\n`);
      
      const unmatchedOrders = orders.filter(o => o.userWalletId === null);
      
      for (const order of unmatchedOrders) {
        const matchingWallet = wallets.find(w => 
          w.address.toLowerCase() === order.walletAddress.toLowerCase() &&
          w.currencyCode === order.currencyCode
        );

        if (matchingWallet) {
          console.log(`  ✅ Order ${order.paymentReference} matches wallet ${matchingWallet.id}`);
        } else {
          console.log(`  ❌ Order ${order.paymentReference} (${order.walletAddress}) has no matching wallet`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserOrders();

