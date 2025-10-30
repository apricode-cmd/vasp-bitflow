/**
 * Blockchain Provider Service
 * 
 * High-level service for accessing blockchain functionality
 * Automatically selects active provider from database
 */

import { prisma } from '@/lib/prisma';
import { integrationRegistry } from '@/lib/integrations/IntegrationRegistry';
import { IBlockchainProvider } from '@/lib/integrations/categories/IBlockchainProvider';
import { encryptionService } from './encryption.service';

/**
 * Get active blockchain provider
 */
export async function getActiveBlockchainProvider(): Promise<IBlockchainProvider> {
  // Find active blockchain integration in database
  const integration = await prisma.integration.findFirst({
    where: {
      isEnabled: true,
      status: 'active'
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  if (!integration) {
    throw new Error('No active blockchain provider configured. Please enable Tatum or another provider in admin settings.');
  }

  // Get provider from registry
  const provider = integrationRegistry.getBlockchainProvider(integration.service);

  if (!provider) {
    throw new Error(`Blockchain provider "${integration.service}" not found in registry`);
  }

  // Decrypt config
  let config: any = {};
  
  if (integration.apiKey) {
    config.apiKey = encryptionService.decrypt(integration.apiKey);
  }
  
  if (integration.apiEndpoint) {
    config.apiEndpoint = integration.apiEndpoint;
  }
  
  if (integration.config) {
    config = {
      ...config,
      ...(typeof integration.config === 'string' 
        ? JSON.parse(integration.config) 
        : integration.config)
    };
  }

  // Initialize provider
  await provider.initialize(config);

  return provider;
}

/**
 * Sync single wallet balance
 */
export async function syncWalletBalance(walletId: string): Promise<{
  success: boolean;
  balance?: number;
  error?: string;
}> {
  try {
    const wallet = await prisma.paymentAccount.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        code: true,
        cryptocurrencyCode: true,
        blockchainCode: true,
        address: true,
        isActive: true,
        cryptocurrency: {
          select: {
            code: true,
            symbol: true,
            blockchainNetworks: {
              where: {
                blockchainCode: { not: null }
              },
              select: {
                blockchainCode: true,
                contractAddress: true,
                isNative: true,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    if (!wallet.isActive) {
      return { success: false, error: 'Wallet is not active' };
    }

    if (!wallet.blockchainCode || !wallet.address) {
      return { success: false, error: 'Wallet missing blockchain or address' };
    }

    if (!wallet.cryptocurrencyCode) {
      return { success: false, error: 'Wallet missing cryptocurrency code' };
    }

    // Find the currency-blockchain relationship
    const currencyBlockchain = wallet.cryptocurrency?.blockchainNetworks?.find(
      bn => bn.blockchainCode === wallet.blockchainCode && bn.isActive
    );

    if (!currencyBlockchain) {
      return { 
        success: false, 
        error: `No active relationship found for ${wallet.cryptocurrencyCode} on ${wallet.blockchainCode}` 
      };
    }

    // Get provider
    const provider = await getActiveBlockchainProvider();

    // Fetch balance
    const balanceData = await provider.getBalance(
      wallet.blockchainCode,
      wallet.address,
      {
        contractAddress: currencyBlockchain.contractAddress || undefined,
        isNative: currencyBlockchain.isNative
      }
    );

    // Update wallet in database
    await prisma.paymentAccount.update({
      where: { id: walletId },
      data: {
        balance: balanceData.balanceFormatted,
        lastChecked: new Date(),
        updatedAt: new Date()
      }
    });

    // Log sync event
    await prisma.systemLog.create({
      data: {
        action: 'WALLET_BALANCE_SYNC',
        path: `/api/admin/wallets/${walletId}/sync`,
        method: 'POST',
        statusCode: 200,
        ipAddress: 'system',
        userAgent: 'blockchain-provider-service',
        metadata: {
          walletId,
          walletCode: wallet.code,
          blockchain: wallet.blockchainCode,
          currency: wallet.cryptocurrencyCode,
          address: wallet.address,
          contractAddress: currencyBlockchain.contractAddress,
          isNative: currencyBlockchain.isNative,
          balance: balanceData.balanceFormatted,
          rawBalance: balanceData.balance
        }
      }
    });

    return {
      success: true,
      balance: balanceData.balanceFormatted
    };
  } catch (error: any) {
    console.error(`❌ Failed to sync wallet ${walletId}:`, error);
    
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Sync all active wallet balances
 */
export async function syncAllWalletBalances(): Promise<{
  total: number;
  success: number;
  failed: number;
  results: Array<{
    walletId: string;
    walletCode: string;
    success: boolean;
    balance?: number;
    error?: string;
  }>;
}> {
  const wallets = await prisma.paymentAccount.findMany({
    where: {
      type: 'CRYPTO_WALLET',
      isActive: true,
      blockchainCode: { not: null },
      address: { not: null }
    },
    select: {
      id: true,
      code: true,
      blockchainCode: true,
      address: true
    }
  });

  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (const wallet of wallets) {
    const result = await syncWalletBalance(wallet.id);
    
    results.push({
      walletId: wallet.id,
      walletCode: wallet.code,
      success: result.success,
      balance: result.balance,
      error: result.error
    });

    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  return {
    total: wallets.length,
    success: successCount,
    failed: failedCount,
    results
  };
}

/**
 * Validate address using blockchain provider
 */
export async function validateBlockchainAddress(
  blockchain: string,
  address: string
): Promise<{
  isValid: boolean;
  format?: string;
  network?: string;
  error?: string;
}> {
  try {
    const provider = await getActiveBlockchainProvider();
    
    const validation = await provider.validateAddress(blockchain, address);
    
    return {
      isValid: validation.isValid,
      format: validation.format,
      network: validation.network
    };
  } catch (error: any) {
    console.error('❌ Address validation error:', error);
    
    return {
      isValid: false,
      error: error.message
    };
  }
}

