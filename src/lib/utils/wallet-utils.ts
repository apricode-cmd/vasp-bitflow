/**
 * Wallet utility functions
 * Handles wallet lookup and creation during order placement
 */

import { prisma } from '@/lib/db';

export interface FindOrCreateWalletParams {
  userId: string;
  walletAddress: string;
  currencyCode: string;
  blockchainCode?: string;
  label?: string;
}

/**
 * Find existing wallet or create new one
 * Used during order creation to ensure orders are linked to wallets
 * 
 * @param params - Wallet parameters
 * @returns UserWallet id
 */
export async function findOrCreateUserWallet(
  params: FindOrCreateWalletParams
): Promise<string> {
  const { userId, walletAddress, currencyCode, blockchainCode, label } = params;

  // Try to find existing wallet (case-insensitive address match)
  let wallet = await prisma.userWallet.findFirst({
    where: {
      userId,
      address: {
        equals: walletAddress,
        mode: 'insensitive'
      },
      currencyCode
    }
  });

  // If wallet doesn't exist, create it
  if (!wallet) {
    // Determine blockchain code if not provided
    let finalBlockchainCode = blockchainCode;
    
    if (!finalBlockchainCode) {
      // Get blockchain from currency's blockchain networks
      const currencyBlockchain = await prisma.currencyBlockchainNetwork.findFirst({
        where: {
          currencyCode,
          isActive: true
        },
        select: {
          blockchainCode: true
        }
      });

      if (!currencyBlockchain) {
        throw new Error(`No active blockchain found for currency ${currencyCode}`);
      }

      finalBlockchainCode = currencyBlockchain.blockchainCode;
    }

    // Create new wallet
    wallet = await prisma.userWallet.create({
      data: {
        userId,
        address: walletAddress,
        currencyCode,
        blockchainCode: finalBlockchainCode,
        label: label || `${currencyCode} Wallet`,
        isVerified: false, // Wallet needs manual verification
        isDefault: false
      }
    });
  }

  return wallet.id;
}

