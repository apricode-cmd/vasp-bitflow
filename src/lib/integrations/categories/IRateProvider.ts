/**
 * Rate Provider Interface
 * 
 * Interface for cryptocurrency exchange rate providers
 */

import { IIntegrationProvider, IntegrationCategory } from '../types';

export interface ExchangeRates {
  [crypto: string]: { [fiat: string]: number };
}

export interface RateProviderInfo {
  crypto: string;
  fiat: string;
  rate: number;
  timestamp: Date;
  source: string;
}

export interface IRateProvider extends IIntegrationProvider {
  readonly category: IntegrationCategory.RATES;
  
  /**
   * Get current exchange rate for a crypto/fiat pair
   */
  getRate(crypto: string, fiat: string): Promise<number>;
  
  /**
   * Get all available exchange rates
   */
  getAllRates(): Promise<ExchangeRates>;
  
  /**
   * Get supported cryptocurrencies
   */
  getSupportedCryptos(): string[];
  
  /**
   * Get supported fiat currencies
   */
  getSupportedFiats(): string[];
  
  /**
   * Check if a specific pair is supported
   */
  supportsPair(crypto: string, fiat: string): boolean;
}

