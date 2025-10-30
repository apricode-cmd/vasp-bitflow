/**
 * CoinGecko Service
 * 
 * Integration with CoinGecko API for real-time cryptocurrency prices.
 * Only works if CoinGecko integration is active in system.
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '@/lib/config';
import { prisma } from '@/lib/prisma';

// In-memory cache for rates (30 seconds TTL)
const CACHE_DURATION_MS = 30 * 1000;

interface CachedRates {
  data: CoinGeckoRates;
  timestamp: number;
}

export interface CoinGeckoRates {
  BTC: { EUR: number; PLN: number };
  ETH: { EUR: number; PLN: number };
  USDT: { EUR: number; PLN: number };
  SOL: { EUR: number; PLN: number };
  updatedAt: string;
}

interface CoinGeckoResponse {
  bitcoin?: { eur?: number; pln?: number };
  ethereum?: { eur?: number; pln?: number };
  tether?: { eur?: number; pln?: number };
  solana?: { eur?: number; pln?: number };
}

let ratesCache: CachedRates | null = null;

class CoinGeckoService {
  private client: AxiosInstance | null = null;
  private apiKey: string | null = null;
  private baseURL: string = 'https://api.coingecko.com/api/v3'; // Default fallback

  constructor() {
    // Set API key if available
    this.apiKey = process.env.COINGECKO_API_KEY || null;
  }

  /**
   * Initialize axios client with URL from database
   */
  private async initializeClient(): Promise<void> {
    if (this.client) return; // Already initialized

    try {
      // Try to get URL from database integration
      const integration = await prisma.integration.findFirst({
        where: { service: 'coingecko' }
      });

      if (integration?.apiEndpoint) {
        this.baseURL = integration.apiEndpoint;
        console.log('✅ Using CoinGecko URL from database:', this.baseURL);
      } else {
        // Fallback to env variable
        this.baseURL = config.coingecko.apiUrl || this.baseURL;
        console.log('⚠️ Using CoinGecko URL from env/fallback:', this.baseURL);
      }
    } catch (error) {
      console.error('❌ Failed to load CoinGecko config from DB, using fallback:', error);
      this.baseURL = config.coingecko.apiUrl || this.baseURL;
    }

    // Create axios client
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Apricode-Exchange/1.0'
      },
      timeout: 10000 // 10 second timeout
    });
  }

  /**
   * Check if CoinGecko integration is active
   */
  private async isIntegrationActive(): Promise<boolean> {
    try {
      const integration = await prisma.integration.findUnique({
        where: { service: 'coingecko' }
      });
      
      return integration?.isEnabled && integration?.status === 'active';
    } catch (error) {
      console.error('❌ Failed to check CoinGecko integration status:', error);
      return false;
    }
  }

  /**
   * Gets current exchange rates for all supported cryptocurrencies
   * Implements 30-second caching to avoid rate limits
   * 
   * NOTE: This method does NOT check integration status - that's handled by rateProviderService
   */
  async getCurrentRates(forceRefresh = false): Promise<CoinGeckoRates> {
    // Initialize client if needed
    await this.initializeClient();

    if (!this.client) {
      throw new Error('Failed to initialize CoinGecko client');
    }

    // Check cache (skip if force refresh requested)
    if (!forceRefresh && ratesCache && Date.now() - ratesCache.timestamp < CACHE_DURATION_MS) {
      console.log('📦 Returning cached rates (age: ' + Math.round((Date.now() - ratesCache.timestamp) / 1000) + 's)');
      return ratesCache.data;
    }

    try {
      console.log('🔄 Fetching fresh rates from CoinGecko API' + (forceRefresh ? ' (forced refresh)' : '') + '...');
      
      // Build request parameters
      const params: Record<string, string> = {
        ids: 'bitcoin,ethereum,tether,solana',
        vs_currencies: 'eur,pln',
        include_24hr_change: 'true',
        include_last_updated_at: 'true'
      };

      // Add API key if available (for higher rate limits)
      if (this.apiKey) {
        params['x_cg_demo_api_key'] = this.apiKey;
      }

      // Fetch prices from CoinGecko
      const response = await this.client.get('/simple/price', { params });

      const data: CoinGeckoResponse = response.data;
      console.log('📊 CoinGecko API response:', {
        status: response.status,
        dataKeys: Object.keys(data),
        timestamp: new Date().toISOString()
      });

      // Validate and extract rates
      const rates: CoinGeckoRates = {
        BTC: {
          EUR: this.validateRate(data.bitcoin?.eur, 'BTC/EUR'),
          PLN: this.validateRate(data.bitcoin?.pln, 'BTC/PLN')
        },
        ETH: {
          EUR: this.validateRate(data.ethereum?.eur, 'ETH/EUR'),
          PLN: this.validateRate(data.ethereum?.pln, 'ETH/PLN')
        },
        USDT: {
          EUR: this.validateRate(data.tether?.eur, 'USDT/EUR'),
          PLN: this.validateRate(data.tether?.pln, 'USDT/PLN')
        },
        SOL: {
          EUR: this.validateRate(data.solana?.eur, 'SOL/EUR'),
          PLN: this.validateRate(data.solana?.pln, 'SOL/PLN')
        },
        updatedAt: new Date().toISOString()
      };

      // Log successful rates
      console.log('✅ Successfully fetched rates:', {
        BTC_EUR: rates.BTC.EUR,
        BTC_PLN: rates.BTC.PLN,
        ETH_EUR: rates.ETH.EUR,
        ETH_PLN: rates.ETH.PLN,
        USDT_EUR: rates.USDT.EUR,
        USDT_PLN: rates.USDT.PLN,
        SOL_EUR: rates.SOL.EUR,
        SOL_PLN: rates.SOL.PLN
      });

      // Update cache
      ratesCache = {
        data: rates,
        timestamp: Date.now()
      };

      return rates;
    } catch (error: any) {
      console.error('❌ CoinGecko API error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // Return cached data if available, even if expired
      if (ratesCache) {
        const cacheAge = Math.round((Date.now() - ratesCache.timestamp) / 1000);
        console.warn(`⚠️ Returning stale cached rates (age: ${cacheAge}s) due to API error`);
        return ratesCache.data;
      }

      // No cache available - throw error instead of using fallback
      throw new Error(`Failed to fetch exchange rates from CoinGecko: ${error.message}. Please ensure the integration is properly configured with a valid API key in Settings → Integrations.`);
    }
  }

  /**
   * Validates and formats rate values
   */
  private validateRate(rate: number | undefined, pair: string): number {
    if (typeof rate !== 'number' || rate <= 0 || !isFinite(rate)) {
      console.warn(`⚠️ Invalid rate for ${pair}:`, rate);
      return 0;
    }
    return Math.round(rate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Gets the exchange rate for a specific crypto/fiat pair
   */
  async getRate(crypto: 'BTC' | 'ETH' | 'USDT' | 'SOL', fiat: 'EUR' | 'PLN'): Promise<number> {
    const rates = await this.getCurrentRates();
    return rates[crypto][fiat];
  }

  /**
   * Test CoinGecko API connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: number;
    };
    responseTime?: number;
  }> {
    try {
      // Initialize client if needed
      await this.initializeClient();

      if (!this.client) {
        return {
          success: false,
          message: 'Failed to initialize CoinGecko client'
        };
      }

      const startTime = Date.now();
      
      const response = await this.client.get('/ping');
      const responseTime = Date.now() - startTime;
      
      const rateLimit = {
        limit: parseInt(response.headers['x-ratelimit-limit'] || '0'),
        remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
        reset: parseInt(response.headers['x-ratelimit-reset'] || '0')
      };

      return {
        success: true,
        message: 'CoinGecko API connection successful',
        rateLimit,
        responseTime
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  /**
   * Get API usage statistics
   */
  async getApiUsage(): Promise<{
    hasApiKey: boolean;
    rateLimit: {
      limit: number;
      remaining: number;
      reset: number;
    } | null;
  }> {
    try {
      // Initialize client if needed
      await this.initializeClient();

      if (!this.client) {
        return {
          hasApiKey: !!this.apiKey,
          rateLimit: null
        };
      }

      const response = await this.client.get('/ping');
      
      return {
        hasApiKey: !!this.apiKey,
        rateLimit: {
          limit: parseInt(response.headers['x-ratelimit-limit'] || '0'),
          remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
          reset: parseInt(response.headers['x-ratelimit-reset'] || '0')
        }
      };
    } catch (error) {
      return {
        hasApiKey: !!this.apiKey,
        rateLimit: null
      };
    }
  }

  /**
   * Get detailed coin information
   */
  async getCoinDetails(coinId: string): Promise<{
    id: string;
    name: string;
    symbol: string;
    currentPrice: { eur: number; pln: number };
    priceChange24h: { eur: number; pln: number };
    marketCap: { eur: number; pln: number };
    lastUpdated: string;
  } | null> {
    try {
      // Initialize client if needed
      await this.initializeClient();

      if (!this.client) {
        console.error('Failed to initialize CoinGecko client');
        return null;
      }

      const response = await this.client.get(`/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        }
      });

      const data = response.data;
      const marketData = data.market_data;

      return {
        id: data.id,
        name: data.name,
        symbol: data.symbol.toUpperCase(),
        currentPrice: {
          eur: marketData.current_price.eur,
          pln: marketData.current_price.pln
        },
        priceChange24h: {
          eur: marketData.price_change_24h_in_currency.eur,
          pln: marketData.price_change_24h_in_currency.pln
        },
        marketCap: {
          eur: marketData.market_cap.eur,
          pln: marketData.market_cap.pln
        },
        lastUpdated: data.last_updated
      };
    } catch (error) {
      console.error(`Failed to get details for ${coinId}:`, error);
      return null;
    }
  }

  /**
   * Clears the rate cache (useful for testing)
   */
  clearCache(): void {
    ratesCache = null;
  }
}

export const coinGeckoService = new CoinGeckoService();

