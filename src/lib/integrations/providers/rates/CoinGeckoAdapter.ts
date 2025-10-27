/**
 * CoinGecko Adapter
 * 
 * Adapter for existing CoinGecko service to implement IRatesProvider interface
 * Wraps the existing coinGeckoService for backward compatibility
 */

import {
  IRatesProvider,
  ExchangeRate,
  ExchangeRates,
  RateWithMetadata
} from '../../categories/IRatesProvider';
import {
  BaseIntegrationConfig,
  IntegrationCategory,
  IntegrationTestResult
} from '../../types';
import { coinGeckoService } from '@/lib/services/coingecko';

/**
 * CoinGecko-specific configuration
 */
interface CoinGeckoConfig extends BaseIntegrationConfig {
  apiUrl?: string;
}

/**
 * CoinGecko adapter implementing IRatesProvider
 * 
 * This adapter wraps the existing coinGeckoService to provide
 * a standard interface for exchange rate operations
 */
export class CoinGeckoAdapter implements IRatesProvider {
  public readonly providerId = 'coingecko';
  public readonly category = IntegrationCategory.RATES as const;

  private config: CoinGeckoConfig = {};
  private initialized = false;

  // Supported currencies (hardcoded for now, can be dynamic in future)
  private readonly supportedCryptos = ['BTC', 'ETH', 'USDT', 'SOL'];
  private readonly supportedFiats = ['EUR', 'PLN'];

  /**
   * Initialize the provider with configuration
   */
  async initialize(config: BaseIntegrationConfig): Promise<void> {
    this.config = config as CoinGeckoConfig;
    this.initialized = true;

    // Note: Existing coinGeckoService reads from environment variables
    // This adapter maintains compatibility while allowing future flexibility
  }

  /**
   * Test CoinGecko API connection
   */
  async test(): Promise<IntegrationTestResult> {
    try {
      const apiUrl = this.config.apiEndpoint || this.config.apiUrl || 'https://api.coingecko.com/api/v3';
      
      // Test with a simple ping
      const params: Record<string, string> = {
        ids: 'bitcoin',
        vs_currencies: 'eur'
      };

      if (this.config.apiKey) {
        params['x_cg_demo_api_key'] = this.config.apiKey;
      }

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${apiUrl}/simple/price?${queryString}`);

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'CoinGecko connection successful',
          details: { sampleRate: data?.bitcoin?.eur },
          timestamp: new Date()
        };
      }

      return {
        success: false,
        message: `CoinGecko test failed: ${response.statusText}`,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        message: `CoinGecko connection error: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    // CoinGecko can work without API key (with rate limits)
    return this.initialized;
  }

  /**
   * Get configuration (without sensitive data)
   */
  getConfig(): Partial<BaseIntegrationConfig> {
    return {
      apiEndpoint: this.config.apiEndpoint || this.config.apiUrl,
      metadata: {
        hasApiKey: !!this.config.apiKey
      }
    };
  }

  /**
   * Get rate for specific crypto/fiat pair
   */
  async getRate(cryptoCode: string, fiatCode: string): Promise<number> {
    if (!this.isConfigured()) {
      throw new Error('CoinGecko provider not configured');
    }

    // Use existing coinGeckoService
    return await coinGeckoService.getRate(cryptoCode, fiatCode);
  }

  /**
   * Get all supported rates at once
   */
  async getCurrentRates(forceRefresh = false): Promise<ExchangeRates> {
    if (!this.isConfigured()) {
      throw new Error('CoinGecko provider not configured');
    }

    // Use existing coinGeckoService
    return await coinGeckoService.getCurrentRates(forceRefresh);
  }

  /**
   * Get rate with additional metadata (24h change, volume, etc.)
   * Optional - not implemented in base service yet
   */
  async getRateWithMetadata(cryptoCode: string, fiatCode: string): Promise<RateWithMetadata> {
    const rate = await this.getRate(cryptoCode, fiatCode);

    return {
      cryptoCode,
      fiatCode,
      rate,
      timestamp: new Date(),
      source: this.providerId
      // Additional metadata can be added when base service supports it
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
}

// Export singleton instance for backward compatibility
export const coinGeckoAdapter = new CoinGeckoAdapter();

