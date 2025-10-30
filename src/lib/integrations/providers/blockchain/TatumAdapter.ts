/**
 * Tatum Blockchain Provider Adapter (v3 + v4 Hybrid)
 * 
 * Provides blockchain data and transaction capabilities via Tatum API
 * Base URL: https://api.tatum.io (both v3 and v4 endpoints)
 * Documentation: https://docs.tatum.io/
 */

import {
  IBlockchainProvider,
  WalletBalance,
  WalletPortfolio,
  HistoricalBalance,
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
  apiEndpoint?: string; // Default: https://api.tatum.io
  testnet?: boolean;
}

/**
 * Blockchain mapping (internal code -> Tatum v4 Portfolio API chain names)
 * Note: TRON is NOT supported in Portfolio API v4, use dedicated endpoints
 */
const BLOCKCHAIN_V4_MAP: Record<string, string> = {
  'ETHEREUM': 'ethereum-mainnet',
  'SOLANA': 'solana-mainnet',
  'BASE': 'base-mainnet',
  'ARBITRUM': 'arb-one-mainnet',
  'BSC': 'bsc-mainnet',
  'POLYGON': 'polygon-mainnet',
  'OPTIMISM': 'optimism-mainnet',
  'BERACHAIN': 'berachain-mainnet',
  'UNICHAIN': 'unichain-mainnet',
  'MONAD': 'monad-testnet',
  'CELO': 'celo-mainnet',
  'CHILIZ': 'chiliz-mainnet',
  'TEZOS': 'tezos-mainnet'
  // TRON - NOT in this map, handled separately
};

/**
 * Known stablecoin contracts (for reference only, actual contracts come from CurrencyBlockchainNetwork)
 */
const STABLECOIN_CONTRACTS: Record<string, Record<string, string>> = {
  'USDT': {
    'ETHEREUM': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'TRON': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    'BSC': '0x55d398326f99059fF775485246999027B3197955'
  },
  'USDC': {
    'ETHEREUM': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'BASE': '0x833589fC1aF8d5d52835aF6adF4c7fA8f3cF8f4f',
    'BSC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    'POLYGON': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    'ARBITRUM': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  }
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
  'FANTOM': 'FTM'
};

/**
 * Tatum Blockchain Provider
 */
class TatumAdapter implements IBlockchainProvider {
  readonly providerId = 'tatum';
  readonly category = IntegrationCategory.BLOCKCHAIN;
  
  private config: TatumConfig | null = null;
  private baseUrl: string = 'https://api.tatum.io';

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

    console.log(`✅ Tatum provider initialized (${this.baseUrl})`);
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
      // Simple test - just verify API key by making a basic request
      // Using /data/supported-blockchains which is lightweight and public
      const response = await fetch('https://api.tatum.io/v4/data/supported-blockchains', {
        method: 'GET',
        headers: {
          'x-api-key': this.config!.apiKey,
          'Accept': 'application/json'
        }
      });

      console.log('📡 Tatum API test response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        console.log('✅ Tatum test successful');
        return {
          success: true,
          message: 'Tatum v4 API key is valid and working',
          details: { 
            provider: 'Tatum', 
            version: 'v4',
            endpoint: '/data/supported-blockchains'
          },
          timestamp: new Date()
        };
      }

      const errorText = await response.text();
      console.error('❌ Tatum test failed:', {
        status: response.status,
        error: errorText
      });

      // Specific error messages based on status
      let message = 'Tatum API test failed';
      if (response.status === 401 || response.status === 403) {
        message = 'Invalid or unauthorized API key';
      } else if (response.status === 429) {
        message = 'Rate limit exceeded - API key is valid but quota reached';
      } else if (response.status === 404) {
        message = 'Tatum API endpoint not found - may need to update integration';
      }
      
      return {
        success: false,
        message: `${message} (${response.status})`,
        details: { 
          error: errorText,
          statusCode: response.status,
          hint: response.status === 401 ? 'Check your API key in Tatum Dashboard' : undefined
        },
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('❌ Tatum connection error:', error);
      return {
        success: false,
        message: `Connection error: ${error.message}`,
        details: {
          hint: 'Check your internet connection or firewall settings'
        },
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
   * Supports native tokens (BTC, ETH, BNB, SOL) and ERC-20/TRC-20/BEP-20 tokens (USDT, USDC)
   */
  async getBalance(
    blockchain: string, 
    address: string,
    options?: {
      contractAddress?: string;
      isNative?: boolean;
    }
  ): Promise<WalletBalance> {
    this.ensureConfigured();

    const blockchainUpper = blockchain.toUpperCase();
    const decimals = this.getDecimals(blockchain);
    const currency = this.getNativeCurrency(blockchain);
    
    const isNative = options?.isNative ?? true;
    const contractAddress = options?.contractAddress;

    console.log(`🔍 Tatum getBalance: ${blockchain} | ${address.slice(0, 10)}... | Native: ${isNative} | Contract: ${contractAddress || 'N/A'}`);

    try {
      // ==========================================
      // 1. BITCOIN (UTXO) - v3 API
      // ==========================================
      if (blockchainUpper === 'BITCOIN' && isNative) {
        console.log('⚡ Using Bitcoin v3 API');
        
        const response = await this.makeRequest(
          `/v3/bitcoin/address/balance/${address}`,
          'GET'
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Bitcoin API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const balanceRaw = data.incoming || '0';
        const balanceFormatted = parseFloat(balanceRaw);

        return {
          address,
          blockchain,
          currency: 'BTC',
          balance: balanceRaw,
          balanceFormatted,
          decimals: 8,
          timestamp: new Date()
        };
      }

      // ==========================================
      // 2. NATIVE TOKENS (ETH, BNB, SOL, TRX) - v4 Portfolio API
      // ==========================================
      if (isNative && BLOCKCHAIN_V4_MAP[blockchainUpper]) {
        console.log(`⚡ Using v4 Portfolio API for native ${currency}`);
        
        const tatumChain = BLOCKCHAIN_V4_MAP[blockchainUpper];
        const response = await this.makeRequest(
          `/v4/data/wallet/portfolio?chain=${tatumChain}&addresses=${address}&tokenTypes=native`,
          'GET'
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Portfolio API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        let balanceRaw = '0';
        
        if (data.native && Array.isArray(data.native) && data.native.length > 0) {
          balanceRaw = data.native[0]?.balance || '0';
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
      }

      // ==========================================
      // 3. TRON TRC-20 TOKENS - v4 Portfolio API (special handling)
      // ==========================================
      if (blockchainUpper === 'TRON' && !isNative && contractAddress) {
        console.log(`⚡ Using TRON v4 Portfolio API for TRC-20 token: ${contractAddress}`);
        
        // TRON in v4 uses 'tron-mainnet' but it's NOT in the supported list for portfolio
        // Try v3 account endpoint instead
        const response = await this.makeRequest(
          `/v3/tron/account/${address}`,
          'GET'
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TRON API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('📦 TRON account data:', JSON.stringify(data, null, 2));
        
        // Find TRC-20 token balance in trc20 array
        const trc20Tokens = data.trc20 || [];
        const tokenData = trc20Tokens.find((t: any) => 
          t[contractAddress] !== undefined
        );

        let balanceRaw = '0';
        if (tokenData && tokenData[contractAddress]) {
          balanceRaw = tokenData[contractAddress];
        }

        const tokenDecimals = 6; // USDT TRC-20 has 6 decimals
        const balanceFormatted = parseFloat(balanceRaw) / Math.pow(10, tokenDecimals);

        return {
          address,
          blockchain,
          currency: 'USDT', // or extract from contract
          balance: balanceRaw,
          balanceFormatted,
          decimals: tokenDecimals,
          timestamp: new Date()
        };
      }

      // ==========================================
      // 4. TRON NATIVE (TRX) - v3 API
      // ==========================================
      if (blockchainUpper === 'TRON' && isNative) {
        console.log('⚡ Using TRON v3 API for native TRX');
        
        const response = await this.makeRequest(
          `/v3/tron/account/${address}`,
          'GET'
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TRON API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const balanceRaw = data.balance || '0';
        const balanceFormatted = parseFloat(balanceRaw) / Math.pow(10, 6); // TRX has 6 decimals

        return {
          address,
          blockchain,
          currency: 'TRX',
          balance: balanceRaw,
          balanceFormatted,
          decimals: 6,
          timestamp: new Date()
        };
      }

      // ==========================================
      // 5. ERC-20/BEP-20 TOKENS (not TRON) - v4 Portfolio API
      // ==========================================
      if (!isNative && contractAddress && BLOCKCHAIN_V4_MAP[blockchainUpper]) {
        console.log(`⚡ Using v4 Portfolio API for token: ${contractAddress}`);
        
        const tatumChain = BLOCKCHAIN_V4_MAP[blockchainUpper];
        const response = await this.makeRequest(
          `/v4/data/wallet/portfolio?chain=${tatumChain}&addresses=${address}&tokenTypes=fungible`,
          'GET'
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Portfolio API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // Find the specific token by contract address
        const token = (data.fungible || []).find((t: any) => 
          t.tokenAddress?.toLowerCase() === contractAddress.toLowerCase()
        );

        if (!token) {
          console.warn(`⚠️ Token ${contractAddress} not found in portfolio`);
          return {
            address,
            blockchain,
            currency: contractAddress.slice(0, 10) + '...',
            balance: '0',
            balanceFormatted: 0,
            decimals: decimals,
            timestamp: new Date()
          };
        }

        const tokenDecimals = token.decimals || decimals;
        const balanceRaw = token.balance || '0';
        const balanceFormatted = parseFloat(balanceRaw) / Math.pow(10, tokenDecimals);

        return {
          address,
          blockchain,
          currency: token.tokenId || contractAddress.slice(0, 10) + '...',
          balance: balanceRaw,
          balanceFormatted,
          decimals: tokenDecimals,
          timestamp: new Date()
        };
      }

      // ==========================================
      // 4. FALLBACK - Unsupported
      // ==========================================
      throw new Error(
        `Unsupported configuration: ${blockchain} | Native: ${isNative} | Contract: ${contractAddress || 'N/A'}`
      );

    } catch (error: any) {
      console.error(`❌ Tatum getBalance error for ${blockchain}:${address}:`, error);
      throw new Error(`Failed to get balance for ${blockchain}: ${error.message}`);
    }
  }

  /**
   * Get wallet portfolio (native + tokens + NFTs) - Tatum v4
   */
  async getPortfolio(blockchain: string, address: string): Promise<WalletPortfolio> {
    this.ensureConfigured();

    const tatumChain = this.mapBlockchain(blockchain);
    const decimals = this.getDecimals(blockchain);
    const currency = this.getNativeCurrency(blockchain);

    try {
      // Get all token types: native, fungible (ERC-20), nft, multitoken
      const response = await this.makeRequest(
        `/data/wallet/portfolio?chain=${tatumChain}&addresses=${address}&tokenTypes=native,fungible,nft,multitoken`,
        'GET'
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Parse native balance (array format in v4)
      let nativeBalanceRaw = '0';
      let nativeValueUsd = 0;
      
      if (data.native && Array.isArray(data.native) && data.native.length > 0) {
        nativeBalanceRaw = data.native[0]?.balance || '0';
        nativeValueUsd = data.native[0]?.valueUsd || 0;
      }
      
      const nativeBalanceFormatted = parseFloat(nativeBalanceRaw) / Math.pow(10, decimals);

      // Parse fungible tokens (ERC-20)
      const tokens = (data.fungible || []).map((token: any) => ({
        contractAddress: token.tokenAddress,
        symbol: token.tokenId, // tokenId contains symbol in v4
        balance: token.balance,
        balanceFormatted: parseFloat(token.balance) / Math.pow(10, token.decimals || 18),
        decimals: token.decimals || 18,
        valueUsd: token.valueUsd
      }));

      // Parse NFTs (ERC-721)
      const nfts = (data.nft || []).map((nft: any) => ({
        contractAddress: nft.tokenAddress,
        tokenId: nft.tokenId,
        metadata: nft.metadata
      }));

      // Parse MultiTokens (ERC-1155)
      const multiTokens = (data.multitoken || []).map((mt: any) => ({
        contractAddress: mt.tokenAddress,
        tokenId: mt.tokenId,
        balance: mt.balance,
        metadata: mt.metadata
      }));

      // Calculate total USD value
      const totalValueUsd = nativeValueUsd + 
        tokens.reduce((sum: number, t: any) => sum + (t.valueUsd || 0), 0);

      return {
        address,
        blockchain,
        native: {
          currency,
          balance: nativeBalanceRaw,
          balanceFormatted: nativeBalanceFormatted,
          valueUsd: nativeValueUsd
        },
        tokens,
        nfts: [...nfts, ...multiTokens],
        totalValueUsd,
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error(`❌ Tatum getPortfolio error for ${blockchain}:${address}:`, error);
      throw new Error(`Failed to get portfolio: ${error.message}`);
    }
  }

  /**
   * Get historical balance at specific time or block - Tatum v4
   */
  async getHistoricalBalance(
    blockchain: string,
    address: string,
    options: { time?: Date; block?: number }
  ): Promise<HistoricalBalance> {
    this.ensureConfigured();

    const tatumChain = this.mapBlockchain(blockchain);
    const decimals = this.getDecimals(blockchain);
    const currency = this.getNativeCurrency(blockchain);

    try {
      // Build query params
      const params = new URLSearchParams({
        chain: tatumChain,
        addresses: address
      });

      if (options.time) {
        // Unix timestamp in seconds
        params.append('time', Math.floor(options.time.getTime() / 1000).toString());
      } else if (options.block) {
        params.append('block', options.block.toString());
      } else {
        throw new Error('Either time or block must be provided');
      }

      const response = await this.makeRequest(
        `/data/wallet/balance/time?${params.toString()}`,
        'GET'
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch historical balance: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // v4 returns array of balances for multiple addresses
      const balanceData = data[0] || { balance: '0' };
      const balanceRaw = balanceData.balance || '0';
      const balanceFormatted = parseFloat(balanceRaw) / Math.pow(10, decimals);

      return {
        address,
        blockchain,
        currency,
        balance: balanceRaw,
        balanceFormatted,
        decimals,
        timestamp: options.time || new Date(),
        blockNumber: options.block || balanceData.blockNumber
      };
    } catch (error: any) {
      console.error(`❌ Tatum getHistoricalBalance error:`, error);
      throw new Error(`Failed to get historical balance: ${error.message}`);
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
   * Get blockchain decimals (fallback values)
   */
  getDecimals(blockchain: string): number {
    const decimalsMap: Record<string, number> = {
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
      'FANTOM': 18
    };
    
    return decimalsMap[blockchain.toUpperCase()] || 18;
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

