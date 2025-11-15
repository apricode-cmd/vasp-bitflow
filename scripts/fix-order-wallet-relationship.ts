/**
 * Fix Order-Wallet Relationship
 * Links existing orders to wallets based on address and currency
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOrderWalletRelationship() {
  try {
    console.log('🔧 Fixing Order-Wallet Relationship...\n');

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
        paymentReference: true
      }
    });

    console.log(`Found ${ordersWithoutWallet.length} orders without userWalletId\n`);

    let matched = 0;
    let notMatched = 0;
    let updated = 0;

    for (const order of ordersWithoutWallet) {
      // Try to find matching wallet
      const matchingWallet = await prisma.userWallet.findFirst({
        where: {
          userId: order.userId,
          address: {
            equals: order.walletAddress,
            mode: 'insensitive' // Case-insensitive match
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
        updated++;
      } else {
        console.log(`⚠️  ${order.paymentReference}: No matching wallet found`);
        console.log(`   User: ${order.userId}, Currency: ${order.currencyCode}, Address: ${order.walletAddress}`);
        notMatched++;
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`  Total orders processed: ${ordersWithoutWallet.length}`);
    console.log(`  Successfully matched: ${matched}`);
    console.log(`  Updated in DB: ${updated}`);
    console.log(`  Not matched: ${notMatched}`);

    if (updated > 0) {
      console.log(`\n✅ Successfully linked ${updated} orders to their wallets!`);
    }

    if (notMatched > 0) {
      console.log(`\n⚠️  ${notMatched} orders could not be matched automatically.`);
      console.log(`   These orders may have been created before wallets were created,`);
      console.log(`   or the wallet addresses don't match.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixOrderWalletRelationship();

