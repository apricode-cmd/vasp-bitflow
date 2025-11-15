/**
 * Fix existing orders - link them to UserWallets
 * Updates all orders that have NULL userWalletId
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixExistingOrders() {
  try {
    console.log('🔧 Fixing existing orders - linking to UserWallets...\n');

    // Get all orders without userWalletId
    const ordersWithoutWallet = await prisma.order.findMany({
      where: {
        userWalletId: null
      },
      select: {
        id: true,
        userId: true,
        walletAddress: true,
        currencyCode: true,
        paymentReference: true,
        status: true
      }
    });

    console.log(`Found ${ordersWithoutWallet.length} orders without userWalletId\n`);

    if (ordersWithoutWallet.length === 0) {
      console.log('✅ All orders are already linked to wallets!');
      return;
    }

    let matched = 0;
    let notMatched = 0;
    const notMatchedDetails: Array<{ orderId: string; userId: string; currency: string; address: string }> = [];

    for (const order of ordersWithoutWallet) {
      // Find matching wallet (case-insensitive)
      const matchingWallet = await prisma.userWallet.findFirst({
        where: {
          userId: order.userId,
          address: {
            equals: order.walletAddress,
            mode: 'insensitive'
          },
          currencyCode: order.currencyCode
        }
      });

      if (matchingWallet) {
        // Update order with userWalletId
        await prisma.order.update({
          where: { id: order.id },
          data: { userWalletId: matchingWallet.id }
        });

        console.log(`✅ ${order.paymentReference}: Linked to wallet ${matchingWallet.id}`);
        matched++;
      } else {
        console.log(`⚠️  ${order.paymentReference}: No matching wallet found`);
        notMatched++;
        notMatchedDetails.push({
          orderId: order.id,
          userId: order.userId,
          currency: order.currencyCode,
          address: order.walletAddress
        });
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Total orders: ${ordersWithoutWallet.length}`);
    console.log(`  ✅ Successfully linked: ${matched}`);
    console.log(`  ⚠️  Not matched: ${notMatched}`);

    if (notMatched > 0) {
      console.log(`\n⚠️  Orders without matching wallets:`);
      notMatchedDetails.forEach(detail => {
        console.log(`  - Order: ${detail.orderId}`);
        console.log(`    User: ${detail.userId}`);
        console.log(`    Currency: ${detail.currency}`);
        console.log(`    Address: ${detail.address}`);
        console.log('');
      });
    }

    console.log(`\n✅ Migration complete!`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixExistingOrders();

