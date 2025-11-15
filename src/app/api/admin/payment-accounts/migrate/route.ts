// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Migration Script: PlatformWallet -> PaymentAccount
 * 
 * Migrates existing PlatformWallet records to the new PaymentAccount model
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';

export async function POST(request: NextRequest) {
  const authResult = await requireAdminRole('ADMIN');
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

  try {
    // Get all PlatformWallets
    const platformWallets = await prisma.platformWallet.findMany({
      include: {
        currency: true,
      },
    });

    if (platformWallets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No wallets to migrate',
        migrated: 0,
      });
    }

    let migratedCount = 0;
    const errors: string[] = [];

    for (const wallet of platformWallets) {
      try {
        // Check if already migrated
        const existing = await prisma.paymentAccount.findFirst({
          where: {
            type: 'CRYPTO_WALLET',
            address: wallet.address,
            cryptocurrencyCode: wallet.currencyCode,
          },
        });

        if (existing) {
          console.log(`Skipping ${wallet.label} - already exists`);
          continue;
        }

        // Get blockchain network (try to infer from currency)
        let blockchainCode: string | undefined;
        
        // Simple mapping (expand as needed)
        const currencyToBlockchain: Record<string, string> = {
          'BTC': 'BITCOIN',
          'ETH': 'ETHEREUM',
          'USDT': 'ETHEREUM', // Default to Ethereum for USDT
          'SOL': 'SOLANA',
        };

        blockchainCode = currencyToBlockchain[wallet.currencyCode];

        if (!blockchainCode) {
          errors.push(`No blockchain mapping for ${wallet.currencyCode}`);
          continue;
        }

        // Verify blockchain exists
        const blockchain = await prisma.blockchainNetwork.findUnique({
          where: { code: blockchainCode },
        });

        if (!blockchain) {
          errors.push(`Blockchain ${blockchainCode} not found`);
          continue;
        }

        // Create PaymentAccount
        await prisma.paymentAccount.create({
          data: {
            code: `migrated_${wallet.id.slice(0, 8)}`,
            name: wallet.label,
            type: 'CRYPTO_WALLET',
            description: `Migrated from PlatformWallet`,
            cryptocurrency: { connect: { code: wallet.currencyCode } },
            blockchain: { connect: { code: blockchainCode } },
            address: wallet.address,
            balance: wallet.balance,
            isActive: wallet.isActive,
            isDefault: wallet.isDefault,
            priority: 1,
            createdBy: session.user.id,
          },
        });

        migratedCount++;
        console.log(`✅ Migrated: ${wallet.label}`);
      } catch (error) {
        console.error(`Error migrating wallet ${wallet.id}:`, error);
        errors.push(`Failed to migrate ${wallet.label}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed: ${migratedCount} wallets migrated`,
      migrated: migratedCount,
      total: platformWallets.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: 'Migration failed' },
      { status: 500 }
    );
  }
}

