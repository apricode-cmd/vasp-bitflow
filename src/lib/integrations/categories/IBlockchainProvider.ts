/**
 * Blockchain Provider Interface
 * 
 * Interface for blockchain data and transaction providers
 * (Tatum, BlockCypher, Alchemy, Infura, etc.)
 */

import { IIntegrationProvider, IntegrationCategory } from '../types';

/**
 * Wallet balance response
 */
export interface WalletBalance {
  address: string;
  blockchain: string;
  currency: string;
  balance: string; // Raw balance in smallest unit (satoshi/wei)
  balanceFormatted: number; // Human-readable balance
  decimals: number;
  timestamp: Date;
}

/**
 * Historical balance response
 */
export interface HistoricalBalance {
  address: string;
  blockchain: string;
  currency: string;
  balance: string;
  balanceFormatted: number;
  decimals: number;
  timestamp: Date;
  blockNumber?: number;
}

/**
 * Wallet portfolio (native + tokens + NFTs)
 */
export interface WalletPortfolio {
  address: string;
  blockchain: string;
  native: {
    currency: string;
    balance: string;
    balanceFormatted: number;
    valueUsd?: number;
  };
  tokens?: Array<{
    contractAddress: string;
    symbol: string;
    balance: string;
    balanceFormatted: number;
    decimals: number;
    valueUsd?: number;
  }>;
  nfts?: Array<{
    contractAddress: string;
    tokenId: string;
    metadata?: any;
  }>;
  totalValueUsd?: number;
  timestamp: Date;
}

/**
 * Transaction send parameters
 */
export interface SendTransactionParams {
  blockchain: string;
  from: string;
  to: string;
  amount: string; // In main units (BTC, ETH, not satoshi/wei)
  privateKey?: string; // Optional, may use KMS
  gasLimit?: number;
  gasPrice?: string;
  memo?: string; // For TRON, Stellar, etc.
}

/**
 * Transaction response
 */
export interface TransactionResponse {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  blockNumber?: number;
  fee: string;
  timestamp: Date;
}

/**
 * Transaction details
 */
export interface TransactionDetails {
  txHash: string;
  blockchain: string;
  from: string;
  to: string;
  amount: string;
  amountFormatted: number;
  fee: string;
  feeFormatted: number;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
  blockNumber?: number;
  blockHash?: string;
}

/**
 * Transaction history item
 */
export interface Transaction {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  amountFormatted: number;
  timestamp: Date;
  type: 'incoming' | 'outgoing';
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Fee estimate
 */
export interface FeeEstimate {
  blockchain: string;
  slow: string;
  standard: string;
  fast: string;
  estimatedConfirmationTime: {
    slow: number; // minutes
    standard: number;
    fast: number;
  };
  timestamp: Date;
}

/**
 * Address validation result
 */
export interface AddressValidation {
  isValid: boolean;
  format?: string; // e.g., 'P2PKH', 'Bech32', 'EIP-55'
  network?: string; // mainnet, testnet
}

/**
 * Blockchain Provider Interface
 */
export interface IBlockchainProvider extends IIntegrationProvider {
  readonly category: IntegrationCategory.BLOCKCHAIN;
  
  /**
   * Get wallet balance for a specific address
   * @param blockchain - Blockchain code (ETHEREUM, BITCOIN, etc.)
   * @param address - Wallet address
   * @param options - Additional options
   * @param options.contractAddress - For tokens (ERC-20, TRC-20, etc.)
   * @param options.isNative - True if native coin (BTC, ETH), false if token (USDT, USDC)
   */
  getBalance(
    blockchain: string, 
    address: string,
    options?: {
      contractAddress?: string;
      isNative?: boolean;
    }
  ): Promise<WalletBalance>;
  
  /**
   * Get wallet portfolio (native + tokens + NFTs) - Tatum v4
   */
  getPortfolio?(blockchain: string, address: string): Promise<WalletPortfolio>;
  
  /**
   * Get historical balance at specific time or block - Tatum v4
   */
  getHistoricalBalance?(
    blockchain: string,
    address: string,
    options: {
      time?: Date;
      block?: number;
    }
  ): Promise<HistoricalBalance>;
  
  /**
   * Send cryptocurrency transaction
   */
  sendTransaction(params: SendTransactionParams): Promise<TransactionResponse>;
  
  /**
   * Get transaction details by hash
   */
  getTransaction(blockchain: string, txHash: string): Promise<TransactionDetails>;
  
  /**
   * Get transaction history for an address
   */
  getTransactionHistory(
    blockchain: string, 
    address: string, 
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Transaction[]>;
  
  /**
   * Validate blockchain address format
   */
  validateAddress(blockchain: string, address: string): Promise<AddressValidation>;
  
  /**
   * Estimate transaction fee
   */
  estimateFee(blockchain: string): Promise<FeeEstimate>;
  
  /**
   * Get supported blockchains
   */
  getSupportedBlockchains(): string[];
  
  /**
   * Check if blockchain is supported
   */
  supportsBlockchain(blockchain: string): boolean;
  
  /**
   * Get blockchain decimals (8 for BTC, 18 for ETH, etc.)
   */
  getDecimals(blockchain: string): number;
  
  /**
   * Get native currency for blockchain (BTC for Bitcoin, ETH for Ethereum, etc.)
   */
  getNativeCurrency(blockchain: string): string;
}

