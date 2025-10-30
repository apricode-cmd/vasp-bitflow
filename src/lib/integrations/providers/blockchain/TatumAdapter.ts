/**
 * Tatum Blockchain Provider Adapter
 * 
 * Provides blockchain data and transaction capabilities via Tatum API
 * Documentation: https://docs.tatum.io/
 */

import {
  IBlockchainProvider,
  WalletBalance,
  SendTransactionParams,
  TransactionResponse,
  TransactionDetails,
  Transaction,
  FeeEstimate,
  AddressValidation
} from '../../categories/IBlockchainProvider';
import {
  BaseIntegrationConfig,
  IntegrationCategory,
  IntegrationTestResult
} from '../../types';

/**
 * Tatum-specific configuration
 */
interface TatumConfig extends BaseIntegrationConfig {
  apiKey: string;
  apiEndpoint?: string; // Default: https://api.tatum.io/v3
  testnet?: boolean;
}

/**
 * Blockchain mapping (internal code -> Tatum API name)
 */
const BLOCKCHAIN_MAP: Record<string, string> = {
  'BITCOIN': 'bitcoin',
  'ETHEREUM': 'ethereum',
  'BSC': 'bsc',
  'POLYGON': 'polygon',
  'SOLANA': 'solana',
  'TRON': 'tron',
  'ARBITRUM': 'arbitrum',
  'OPTIMISM': 'optimism',
  'BASE': 'base',
  'AVALANCHE': 'avax',
  'FANTOM': 'fantom',
  'CRONOS': 'cronos',
  'CARDANO': 'ada',
  'POLKADOT': 'dot',
  'KUSAMA': 'ksm',
  'LITECOIN': 'litecoin',
  'DOGECOIN': 'doge',
  'XRP': 'xrp',
  'STELLAR': 'xlm'
};

/**
 * Blockchain decimals
 */
const DECIMALS_MAP: Record<string, number> = {
  'BITCOIN': 8,
  'ETHEREUM': 18,
  'BSC': 18,
  'POLYGON': 18,
  'TRON': 6,
  'SOLANA': 9,
  'ARBITRUM': 18,
  'OPTIMISM': 18,
  'BASE': 18,
  'AVALANCHE': 18,
  'FANTOM': 18,
  'CRONOS': 18,
  'CARDANO': 6,
  'POLKADOT': 10,
  'KUSAMA': 12,
  'LITECOIN': 8,
  'DOGECOIN': 8,
  'XRP': 6,
  'STELLAR': 7
};

/**
 * Native currency mapping
 */
const CURRENCY_MAP: Record<string, string> = {
  'BITCOIN': 'BTC',
  'ETHEREUM': 'ETH',
  'BSC': 'BNB',
  'POLYGON': 'MATIC',
  'TRON': 'TRX',
  'SOLANA': 'SOL',
  'ARBITRUM': 'ETH',
  'OPTIMISM': 'ETH',
  'BASE': 'ETH',
  'AVALANCHE': 'AVAX',
  'FANTOM': 'FTM',
  'CRONOS': 'CRO',
  'CARDANO': 'ADA',
  'POLKADOT': 'DOT',
  'KUSAMA': 'KSM',
  'LITECOIN': 'LTC',
  'DOGECOIN': 'DOGE',
  'XRP': 'XRP',
  'STELLAR': 'XLM'
};

/**
 * Tatum Blockchain Provider
 */
class TatumAdapter implements IBlockchainProvider {
  readonly providerId = 'tatum';
  readonly category = IntegrationCategory.BLOCKCHAIN;
  
  private config: TatumConfig | null = null;
  private baseUrl: string = 'https://api.tatum.io/v3';

  /**
   * Initialize provider with config
   */
  async initialize(config: BaseIntegrationConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('Tatum API key is required');
    }

    this.config = config as TatumConfig;
    
    if (config.apiEndpoint) {
      this.baseUrl = config.apiEndpoint;
    }

    console.log('✅ Tatum provider initialized');
  }

  /**
   * Test Tatum connection
   */
  async test(): Promise<IntegrationTestResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Tatum provider not configured',
        timestamp: new Date()
      };
    }

    try {
      // Test with a simple balance check on Bitcoin (genesis address)
      const testAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      
      const response = await this.makeRequest(
        `/v3/bitcoin/address/balance/${testAddress}`,
        'GET'
      );

      if (response.ok) {
        return {
          success: true,
          message: 'Tatum connection successful',
          details: { provider: 'Tatum', version: 'v3' },
          timestamp: new Date()
        };
      }

      return {
        success: false,
        message: `Tatum test failed: ${response.status} ${response.statusText}`,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Tatum connection error: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return this.config !== null && !!this.config.apiKey;
  }

  /**
   * Get current config (without sensitive data)
   */
  getConfig(): Partial<BaseIntegrationConfig> {
    if (!this.config) return {};

    return {
      apiEndpoint: this.config.apiEndpoint,
      metadata: this.config.metadata
    };
  }

  /**
   * Get wallet balance
   */
  async getBalance(blockchain: string, address: string): Promise<WalletBalance> {
    this.ensureConfigured();

    const tatumBlockchain = this.mapBlockchain(blockchain);
    const decimals = this.getDecimals(blockchain);
    const currency = this.getNativeCurrency(blockchain);

    try {
      const response = await this.makeRequest(
        `/v3/${tatumBlockchain}/address/balance/${address}`,
        'GET'
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Tatum returns different formats for different chains
      let balanceRaw = '0';
      
      if (data.incoming) {
        // Bitcoin-like chains
        balanceRaw = data.incoming;
      } else if (data.balance) {
        // Ethereum-like chains
        balanceRaw = data.balance;
      }

      const balanceFormatted = parseFloat(balanceRaw) / Math.pow(10, decimals);

      return {
        address,
        blockchain,
        currency,
        balance: balanceRaw,
        balanceFormatted,
        decimals,
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error(`❌ Tatum getBalance error for ${blockchain}:${address}:`, error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Send transaction
   */
  async sendTransaction(params: SendTransactionParams): Promise<TransactionResponse> {
    this.ensureConfigured();

    const tatumBlockchain = this.mapBlockchain(params.blockchain);

    try {
      // Prepare transaction payload (blockchain-specific)
      const payload = this.prepareTransactionPayload(params);

      const response = await this.makeRequest(
        `/v3/${tatumBlockchain}/transaction`,
        'POST',
        payload
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || response.statusText);
      }

      const data = await response.json();

      return {
        txHash: data.txId,
        status: 'pending',
        confirmations: 0,
        fee: data.fee || '0',
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error(`❌ Tatum sendTransaction error:`, error);
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(blockchain: string, txHash: string): Promise<TransactionDetails> {
    this.ensureConfigured();

    const tatumBlockchain = this.mapBlockchain(blockchain);
    const decimals = this.getDecimals(blockchain);

    try {
      const response = await this.makeRequest(
        `/v3/${tatumBlockchain}/transaction/${txHash}`,
        'GET'
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch transaction: ${response.status}`);
      }

      const data = await response.json();

      // Parse transaction data (format varies by blockchain)
      const amountRaw = this.extractAmount(data, blockchain);
      const amountFormatted = parseFloat(amountRaw) / Math.pow(10, decimals);
      
      const feeRaw = data.fee || data.gasUsed || '0';
      const feeFormatted = parseFloat(feeRaw) / Math.pow(10, decimals);

      return {
        txHash,
        blockchain,
        from: data.from || data.inputs?.[0]?.coin?.address || '',
        to: data.to || data.outputs?.[0]?.address || '',
        amount: amountRaw,
        amountFormatted,
        fee: feeRaw,
        feeFormatted,
        confirmations: data.confirmations || 0,
        status: this.mapTxStatus(data),
        timestamp: new Date(data.blockTime || data.timestamp || Date.now()),
        blockNumber: data.blockNumber,
        blockHash: data.blockHash
      };
    } catch (error: any) {
      console.error(`❌ Tatum getTransaction error:`, error);
      throw new Error(`Failed to get transaction: ${error.message}`);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    blockchain: string,
    address: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Transaction[]> {
    this.ensureConfigured();

    const tatumBlockchain = this.mapBlockchain(blockchain);
    const decimals = this.getDecimals(blockchain);

    try {
      let url = `/v3/${tatumBlockchain}/transaction/address/${address}`;
      
      const params = new URLSearchParams();
      if (options?.limit) params.append('pageSize', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await this.makeRequest(url, 'GET');

      if (!response.ok) {
        throw new Error(`Failed to fetch transaction history: ${response.status}`);
      }

      const data = await response.json();
      const transactions = Array.isArray(data) ? data : data.items || [];

      return transactions.map((tx: any) => {
        const amountRaw = this.extractAmount(tx, blockchain);
        const amountFormatted = parseFloat(amountRaw) / Math.pow(10, decimals);
        
        const isIncoming = tx.to?.toLowerCase() === address.toLowerCase();

        return {
          txHash: tx.hash || tx.txId,
          from: tx.from || tx.inputs?.[0]?.coin?.address || '',
          to: tx.to || tx.outputs?.[0]?.address || '',
          amount: amountRaw,
          amountFormatted,
          timestamp: new Date(tx.blockTime || tx.timestamp || Date.now()),
          type: isIncoming ? 'incoming' : 'outgoing',
          confirmations: tx.confirmations || 0,
          status: this.mapTxStatus(tx)
        };
      });
    } catch (error: any) {
      console.error(`❌ Tatum getTransactionHistory error:`, error);
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }

  /**
   * Validate address
   */
  async validateAddress(blockchain: string, address: string): Promise<AddressValidation> {
    // Client-side regex validation (fast)
    const patterns: Record<string, RegExp> = {
      'BITCOIN': /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
      'ETHEREUM': /^0x[a-fA-F0-9]{40}$/,
      'BSC': /^0x[a-fA-F0-9]{40}$/,
      'POLYGON': /^0x[a-fA-F0-9]{40}$/,
      'SOLANA': /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
      'TRON': /^T[a-zA-Z0-9]{33}$/,
      'ARBITRUM': /^0x[a-fA-F0-9]{40}$/,
      'OPTIMISM': /^0x[a-fA-F0-9]{40}$/,
      'BASE': /^0x[a-fA-F0-9]{40}$/
    };

    const pattern = patterns[blockchain.toUpperCase()];
    
    if (!pattern) {
      return {
        isValid: false
      };
    }

    const isValid = pattern.test(address);

    return {
      isValid,
      format: isValid ? this.getAddressFormat(blockchain) : undefined,
      network: 'mainnet' // TODO: detect testnet
    };
  }

  /**
   * Estimate transaction fee
   */
  async estimateFee(blockchain: string): Promise<FeeEstimate> {
    this.ensureConfigured();

    const tatumBlockchain = this.mapBlockchain(blockchain);

    try {
      // Note: Tatum doesn't have a unified fee estimation endpoint
      // Different chains have different methods
      
      let slow = '0';
      let standard = '0';
      let fast = '0';

      // For Ethereum-like chains, get current gas price
      if (['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base'].includes(tatumBlockchain)) {
        const response = await this.makeRequest(
          `/v3/${tatumBlockchain}/gas/current`,
          'GET'
        );

        if (response.ok) {
          const data = await response.json();
          slow = data.slow || data.result || '0';
          standard = data.standard || data.result || '0';
          fast = data.fast || data.result || '0';
        }
      }

      // For Bitcoin-like chains, estimate from recent blocks
      // (Simplified - in production, use more sophisticated logic)

      return {
        blockchain,
        slow,
        standard,
        fast,
        estimatedConfirmationTime: {
          slow: 30,
          standard: 15,
          fast: 5
        },
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error(`❌ Tatum estimateFee error:`, error);
      
      // Return fallback estimates
      return {
        blockchain,
        slow: '0',
        standard: '0',
        fast: '0',
        estimatedConfirmationTime: {
          slow: 30,
          standard: 15,
          fast: 5
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get supported blockchains
   */
  getSupportedBlockchains(): string[] {
    return Object.keys(BLOCKCHAIN_MAP);
  }

  /**
   * Check if blockchain is supported
   */
  supportsBlockchain(blockchain: string): boolean {
    return blockchain.toUpperCase() in BLOCKCHAIN_MAP;
  }

  /**
   * Get blockchain decimals
   */
  getDecimals(blockchain: string): number {
    return DECIMALS_MAP[blockchain.toUpperCase()] || 18;
  }

  /**
   * Get native currency
   */
  getNativeCurrency(blockchain: string): string {
    return CURRENCY_MAP[blockchain.toUpperCase()] || 'UNKNOWN';
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  /**
   * Make HTTP request to Tatum API
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<Response> {
    if (!this.config) {
      throw new Error('Tatum provider not configured');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'x-api-key': this.config.apiKey,
      'Content-Type': 'application/json'
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  }

  /**
   * Ensure provider is configured
   */
  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error('Tatum provider not configured. Call initialize() first.');
    }
  }

  /**
   * Map internal blockchain code to Tatum API name
   */
  private mapBlockchain(blockchain: string): string {
    const mapped = BLOCKCHAIN_MAP[blockchain.toUpperCase()];
    
    if (!mapped) {
      throw new Error(`Unsupported blockchain: ${blockchain}`);
    }

    return mapped;
  }

  /**
   * Prepare transaction payload (blockchain-specific)
   */
  private prepareTransactionPayload(params: SendTransactionParams): any {
    const blockchain = params.blockchain.toUpperCase();

    // Ethereum-like chains
    if (['ETHEREUM', 'BSC', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'BASE'].includes(blockchain)) {
      return {
        to: params.to,
        amount: params.amount,
        currency: this.getNativeCurrency(params.blockchain),
        fromPrivateKey: params.privateKey,
        ...(params.gasLimit && { gasLimit: params.gasLimit }),
        ...(params.gasPrice && { gasPrice: params.gasPrice })
      };
    }

    // Bitcoin
    if (blockchain === 'BITCOIN') {
      return {
        fromAddress: [{
          address: params.from,
          privateKey: params.privateKey
        }],
        to: [{
          address: params.to,
          value: parseFloat(params.amount)
        }]
      };
    }

    // Tron
    if (blockchain === 'TRON') {
      return {
        from: params.from,
        to: params.to,
        amount: params.amount,
        fromPrivateKey: params.privateKey
      };
    }

    // Solana
    if (blockchain === 'SOLANA') {
      return {
        from: params.from,
        to: params.to,
        amount: params.amount,
        fromPrivateKey: params.privateKey
      };
    }

    // Generic fallback
    return {
      from: params.from,
      to: params.to,
      amount: params.amount,
      privateKey: params.privateKey
    };
  }

  /**
   * Extract amount from transaction data
   */
  private extractAmount(tx: any, blockchain: string): string {
    if (tx.amount) return tx.amount;
    if (tx.value) return tx.value;
    
    // Bitcoin-like
    if (tx.outputs) {
      const total = tx.outputs.reduce((sum: number, output: any) => {
        return sum + parseFloat(output.value || '0');
      }, 0);
      return total.toString();
    }

    return '0';
  }

  /**
   * Map transaction status
   */
  private mapTxStatus(tx: any): 'pending' | 'confirmed' | 'failed' {
    if (tx.blockNumber || tx.blockHash) {
      return 'confirmed';
    }
    
    if (tx.failed || tx.status === 'failed') {
      return 'failed';
    }

    return 'pending';
  }

  /**
   * Get address format name
   */
  private getAddressFormat(blockchain: string): string {
    const formats: Record<string, string> = {
      'BITCOIN': 'P2PKH/P2SH/Bech32',
      'ETHEREUM': 'EIP-55',
      'TRON': 'Base58',
      'SOLANA': 'Base58'
    };

    return formats[blockchain.toUpperCase()] || 'Standard';
  }
}

// Export singleton instance
export const tatumAdapter = new TatumAdapter();

