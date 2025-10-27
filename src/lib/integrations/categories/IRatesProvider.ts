/**
 * Rates Provider Interface
 * 
 * Standard interface for cryptocurrency exchange rate providers
 * Implementations: CoinGecko, CoinMarketCap, Binance API, etc.
 */

import { IIntegrationProvider, IntegrationCategory } from '../types';

// ==========================================
// RATES-SPECIFIC TYPES
// ==========================================

/**
 * Exchange rate for a specific pair
 */
export interface ExchangeRate {
  cryptoCode: string;  // BTC, ETH, etc.
  fiatCode: string;    // EUR, PLN, etc.
  rate: number;        // Current exchange rate
  timestamp: Date;     // When the rate was fetched
  source: string;      // Provider name
}

/**
 * Multiple rates response
 */
export interface ExchangeRates {
  [cryptoCode: string]: {
    [fiatCode: string]: number;
  };
}

/**
 * Rate with metadata
 */
export interface RateWithMetadata extends ExchangeRate {
  change24h?: number;      // 24h price change percentage
  volume24h?: number;      // 24h trading volume
  marketCap?: number;      // Market capitalization
  lastUpdatedAt?: Date;    // Last update timestamp
}

// ==========================================
// RATES PROVIDER INTERFACE
// ==========================================

/**
 * Interface for exchange rate providers
 * All rate integrations must implement this
 */
export interface IRatesProvider extends IIntegrationProvider {
  readonly category: IntegrationCategory.RATES;

  /**
   * Get exchange rate for a specific crypto/fiat pair
   */
  getRate(cryptoCode: string, fiatCode: string): Promise<number>;

  /**
   * Get all supported rates at once
   */
  getCurrentRates(forceRefresh?: boolean): Promise<ExchangeRates>;

  /**
   * Get rate with additional metadata
   */
  getRateWithMetadata?(cryptoCode: string, fiatCode: string): Promise<RateWithMetadata>;

  /**
   * Get supported cryptocurrencies
   */
  getSupportedCryptos(): string[];

  /**
   * Get supported fiat currencies
   */
  getSupportedFiats(): string[];
}

