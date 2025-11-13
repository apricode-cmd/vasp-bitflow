/**
 * Kraken Exchange Rate Provider Adapter
 * 
 * Professional cryptocurrency exchange rates from Kraken.
 * Uses public ticker API (no authentication required).
 * 
 * API Documentation: https://docs.kraken.com/api/docs/rest-api/get-ticker-information
 */

import {
  IRatesProvider,
  ExchangeRates,
  RateWithMetadata
} from '../../categories/IRatesProvider';
import {
  BaseIntegrationConfig,
  IntegrationCategory,
  IntegrationTestResult
} from '../../types';
import axios, { AxiosInstance } from 'axios';

/**
 * Kraken-specific configuration
 */
interface KrakenConfig extends BaseIntegrationConfig {
  apiUrl?: string;
  publicOnly?: boolean;
  timeout?: number;
}

/**
 * Kraken Ticker Response Structure
 * 
 * Example: GET /0/public/Ticker?pair=XXBTZEUR
 */
interface KrakenTickerResponse {
  error: string[];
  result: {
    [pair: string]: {
      a: string[];  // Ask [price, whole lot volume, lot volume]
      b: string[];  // Bid [price, whole lot volume, lot volume]
      c: string[];  // Last trade closed [price, lot volume]
      v: string[];  // Volume [today, last 24h]
      p: string[];  // Volume weighted average price [today, last 24h]
      t: number[];  // Number of trades [today, last 24h]
      l: string[];  // Low [today, last 24h]
      h: string[];  // High [today, last 24h]
      o: string;    // Today's opening price
    };
  };
}

/**
 * Kraken Exchange Rate Provider
 * 
 * Features:
 * - Real-time exchange rates from Kraken order book
 * - No API key required for public ticker data
 * - 30-second caching to optimize performance
 * - Support for major crypto/fiat pairs
 * - Bulk rate fetching (all pairs in one request)
 */
export class KrakenAdapter implements IRatesProvider {
  public readonly providerId = 'kraken';
  public readonly category = IntegrationCategory.RATES as const;

  private config: KrakenConfig = {};
  private initialized = false;
  private client: AxiosInstance | null = null;

  /**
   * Kraken uses special notation for pairs:
   * - X prefix for major cryptos (Bitcoin = XBTZ, Ethereum = XETHZ)
   * - Z prefix for fiat currencies (EUR = ZEUR, USD = ZUSD)
   * 
   * Our format: BTC-EUR → Kraken format: XXBTZEUR
   */
  private readonly pairMapping: Record<string, string> = {
    // Bitcoin pairs
    'BTC-EUR': 'XXBTZEUR',
    'BTC-USD': 'XXBTZUSD',
    'BTC-PLN': 'XBTPLN',
    
    // Ethereum pairs
    'ETH-EUR': 'XETHZEUR',
    'ETH-USD': 'XETHZUSD',
    'ETH-PLN': 'ETHPLN',
    
    // Solana pairs
    'SOL-EUR': 'SOLEUR',
    'SOL-USD': 'SOLUSD',
    'SOL-PLN': 'SOLPLN',
    
    // Tether pairs
    'USDT-EUR': 'USDTZEUR',
    'USDT-USD': 'USDTZUSD',
    'USDT-PLN': 'USDTPLN'
  };

  // Supported currencies
  private readonly supportedCryptos = ['BTC', 'ETH', 'USDT', 'SOL'];
  private readonly supportedFiats = ['EUR', 'USD', 'PLN'];

  // Cache for rates
  private ratesCache: {
    data: ExchangeRates;
    timestamp: number;
  } | null = null;
  
  private readonly CACHE_DURATION_MS = 30000; // 30 seconds

  /**
   * Initialize the Kraken provider
   */
  async initialize(config: BaseIntegrationConfig): Promise<void> {
    this.config = config as KrakenConfig;
    
    const baseURL = this.config.apiUrl || this.config.apiEndpoint || 'https://api.kraken.com';
    const timeout = this.config.timeout || 10000;
    
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Apricode-Exchange/1.0'
      }
    });

    this.initialized = true;
    console.log('✅ [Kraken] Rate Provider initialized', {
      baseURL,
      supportedPairs: Object.keys(this.pairMapping).length
    });
  }

  /**
   * Test Kraken API connection
   */
  async test(): Promise<IntegrationTestResult> {
    try {
      if (!this.client) {
        await this.initialize(this.config);
      }

      // Test with BTC/EUR ticker (most liquid pair)
      const response = await this.client!.get<KrakenTickerResponse>('/0/public/Ticker', {
        params: { pair: 'XXBTZEUR' }
      });

      // Check for API errors
      if (response.data.error && response.data.error.length > 0) {
        return {
          success: false,
          message: `Kraken API error: ${response.data.error.join(', ')}`,
          timestamp: new Date()
        };
      }

      // Verify response structure
      if (response.data.result && Object.keys(response.data.result).length > 0) {
        const ticker = Object.values(response.data.result)[0] as any;
        const sampleRate = parseFloat(ticker.c[0]); // Last trade price

        return {
          success: true,
          message: 'Kraken connection successful',
          details: { 
            samplePair: 'BTC/EUR',
            sampleRate: `€${sampleRate.toFixed(2)}`,
            source: 'Kraken Exchange',
            rateLimit: '1 request per second (public endpoint)',
            apiKey: 'Not required for public data'
          },
          timestamp: new Date()
        };
      }

      return {
        success: false,
        message: 'Kraken API returned empty result',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Kraken connection error: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return this.initialized;
  }

  /**
   * Get configuration (without sensitive data)
   */
  getConfig(): Partial<BaseIntegrationConfig> {
    return {
      apiEndpoint: this.config.apiUrl || 'https://api.kraken.com',
      metadata: {
        publicOnly: this.config.publicOnly !== false,
        requiresApiKey: false,
        supportedPairs: Object.keys(this.pairMapping),
        cacheDuration: `${this.CACHE_DURATION_MS / 1000} seconds`,
        rateLimit: '1 request per second (public endpoint)',
        documentation: 'https://docs.kraken.com/api/docs/rest-api/get-ticker-information'
      }
    };
  }

  /**
   * Map our currency codes to Kraken pair notation
   * 
   * @param cryptoCode Our crypto code (BTC, ETH, etc.)
   * @param fiatCode Our fiat code (EUR, USD, PLN)
   * @returns Kraken pair notation (XXBTZEUR, XETHZUSD, etc.) or null if unsupported
   */
  private getPairNotation(cryptoCode: string, fiatCode: string): string | null {
    const key = `${cryptoCode}-${fiatCode}`;
    return this.pairMapping[key] || null;
  }

  /**
   * Get exchange rate for a specific crypto/fiat pair
   * 
   * @param cryptoCode Cryptocurrency code (BTC, ETH, USDT, SOL)
   * @param fiatCode Fiat currency code (EUR, USD, PLN)
   * @returns Current exchange rate
   */
  async getRate(cryptoCode: string, fiatCode: string): Promise<number> {
    if (!this.isConfigured()) {
      throw new Error('Kraken provider not configured. Call initialize() first.');
    }

    const pairNotation = this.getPairNotation(cryptoCode, fiatCode);
    
    if (!pairNotation) {
      throw new Error(`Unsupported pair: ${cryptoCode}/${fiatCode}. Supported pairs: ${Object.keys(this.pairMapping).join(', ')}`);
    }

    try {
      const response = await this.client!.get<KrakenTickerResponse>('/0/public/Ticker', {
        params: { pair: pairNotation }
      });

      // Check for Kraken API errors
      if (response.data.error && response.data.error.length > 0) {
        throw new Error(`Kraken API error: ${response.data.error.join(', ')}`);
      }

      const ticker = response.data.result[pairNotation];
      
      if (!ticker) {
        throw new Error(`No ticker data for ${pairNotation}`);
      }

      // Use last trade price (c[0]) as the current rate
      const rate = parseFloat(ticker.c[0]);
      
      console.log(`📊 [Kraken] ${cryptoCode}/${fiatCode}: ${rate.toFixed(2)}`);
      
      return rate;
    } catch (error: any) {
      console.error(`❌ [Kraken] Failed to get rate for ${cryptoCode}/${fiatCode}:`, error.message);
      throw new Error(`Failed to fetch rate from Kraken: ${error.message}`);
    }
  }

  /**
   * Get all supported rates at once
   * 
   * Fetches ticker data for all supported pairs in a single API call.
   * Results are cached for 30 seconds to optimize performance.
   * 
   * @param forceRefresh Skip cache and fetch fresh data
   * @returns Object with all exchange rates
   */
  async getCurrentRates(forceRefresh = false): Promise<ExchangeRates> {
    if (!this.isConfigured()) {
      throw new Error('Kraken provider not configured. Call initialize() first.');
    }

    // Check cache (skip if force refresh requested)
    if (!forceRefresh && this.ratesCache && Date.now() - this.ratesCache.timestamp < this.CACHE_DURATION_MS) {
      const cacheAge = Math.round((Date.now() - this.ratesCache.timestamp) / 1000);
      console.log(`📦 [Kraken] Returning cached rates (age: ${cacheAge}s)`);
      return this.ratesCache.data;
    }

    try {
      const startTime = Date.now();
      console.log('🔄 [Kraken] Fetching fresh rates' + (forceRefresh ? ' (forced refresh)' : '') + '...');

      // Fetch all pairs at once (Kraken supports multiple pairs in one request)
      const allPairs = Object.values(this.pairMapping).join(',');
      
      const response = await this.client!.get<KrakenTickerResponse>('/0/public/Ticker', {
        params: { pair: allPairs }
      });

      // Check for Kraken API errors
      if (response.data.error && response.data.error.length > 0) {
        throw new Error(`Kraken API error: ${response.data.error.join(', ')}`);
      }

      // Transform Kraken response to our ExchangeRates format
      const rates: ExchangeRates = {};
      let pairsProcessed = 0;
      
      for (const [ourPair, krakenPair] of Object.entries(this.pairMapping)) {
        const ticker = response.data.result[krakenPair];
        
        if (ticker) {
          const [crypto, fiat] = ourPair.split('-');
          
          if (!rates[crypto]) {
            rates[crypto] = {};
          }
          
          // Use last trade price (c[0])
          rates[crypto][fiat] = parseFloat(ticker.c[0]);
          pairsProcessed++;
        }
      }

      // Cache the result
      this.ratesCache = {
        data: rates,
        timestamp: Date.now()
      };

      const fetchTime = Date.now() - startTime;
      console.log(`✅ [Kraken] Fetched ${pairsProcessed} rates for ${Object.keys(rates).length} currencies in ${fetchTime}ms`);

      return rates;
    } catch (error: any) {
      console.error('❌ [Kraken] Failed to fetch rates:', error.message);
      
      // If we have stale cache, return it with a warning
      if (this.ratesCache) {
        const cacheAge = Math.round((Date.now() - this.ratesCache.timestamp) / 1000);
        console.warn(`⚠️ [Kraken] Returning stale cache (age: ${cacheAge}s) due to API error`);
        return this.ratesCache.data;
      }
      
      throw new Error(`Failed to fetch rates from Kraken: ${error.message}`);
    }
  }

  /**
   * Get rate with additional metadata (24h change, volume, etc.)
   * 
   * @param cryptoCode Cryptocurrency code
   * @param fiatCode Fiat currency code
   * @returns Rate with metadata (change24h, volume24h, etc.)
   */
  async getRateWithMetadata(cryptoCode: string, fiatCode: string): Promise<RateWithMetadata> {
    const pairNotation = this.getPairNotation(cryptoCode, fiatCode);
    
    if (!pairNotation) {
      throw new Error(`Unsupported pair: ${cryptoCode}/${fiatCode}`);
    }

    const response = await this.client!.get<KrakenTickerResponse>('/0/public/Ticker', {
      params: { pair: pairNotation }
    });

    // Check for errors
    if (response.data.error && response.data.error.length > 0) {
      throw new Error(`Kraken API error: ${response.data.error.join(', ')}`);
    }

    const ticker = response.data.result[pairNotation];
    
    if (!ticker) {
      throw new Error(`No ticker data for ${pairNotation}`);
    }

    // Extract data
    const currentPrice = parseFloat(ticker.c[0]);  // Last trade price
    const openPrice = parseFloat(ticker.o);        // Opening price today
    const change24h = ((currentPrice - openPrice) / openPrice) * 100;
    const volume24h = parseFloat(ticker.v[1]);     // Last 24h volume

    return {
      cryptoCode,
      fiatCode,
      rate: currentPrice,
      timestamp: new Date(),
      source: this.providerId,
      change24h,
      volume24h,
      lastUpdatedAt: new Date()
    };
  }

  /**
   * Get supported cryptocurrencies
   */
  getSupportedCryptos(): string[] {
    return [...this.supportedCryptos];
  }

  /**
   * Get supported fiat currencies
   */
  getSupportedFiats(): string[] {
    return [...this.supportedFiats];
  }

  /**
   * Clear cache (useful for testing or forcing fresh data)
   */
  clearCache(): void {
    this.ratesCache = null;
    console.log('🗑️ [Kraken] Cache cleared');
  }
}

// Export singleton instance for backward compatibility
export const krakenAdapter = new KrakenAdapter();

