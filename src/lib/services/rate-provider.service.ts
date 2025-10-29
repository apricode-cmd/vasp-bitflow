/**
 * Rate Provider Service
 * 
 * Service to get rates from the active rate provider integration
 * Only ONE rate provider can be active at a time
 */

import { prisma } from '@/lib/prisma';
import { coinGeckoService } from './coingecko';

export interface ExchangeRates {
  [crypto: string]: { [fiat: string]: number };
}

class RateProviderService {
  /**
   * Get the active rate provider integration
   */
  async getActiveProvider(): Promise<{ service: string; apiKey: string | null } | null> {
    try {
      const provider = await prisma.integration.findFirst({
        where: {
          category: 'RATES',
          isEnabled: true,
          status: 'active'
        },
        orderBy: {
          updatedAt: 'desc' // Most recently updated active provider
        }
      });

      if (!provider) {
        return null;
      }

      return {
        service: provider.service,
        apiKey: provider.apiKey
      };
    } catch (error) {
      console.error('❌ Failed to get active rate provider:', error);
      return null;
    }
  }

  /**
   * Get current exchange rate for a specific pair
   */
  async getRate(crypto: string, fiat: string): Promise<number> {
    const provider = await this.getActiveProvider();

    if (!provider) {
      throw new Error('No active rate provider found. Please enable a rate provider integration (e.g., CoinGecko) in Settings → Integrations.');
    }

    // Route to the correct provider service
    switch (provider.service) {
      case 'coingecko':
        return await coinGeckoService.getRate(
          crypto as 'BTC' | 'ETH' | 'USDT' | 'SOL',
          fiat as 'EUR' | 'PLN'
        );
      
      // Future: Add more providers here
      // case 'coinmarketcap':
      //   return await coinMarketCapService.getRate(crypto, fiat);
      // case 'binance':
      //   return await binanceService.getRate(crypto, fiat);
      
      default:
        throw new Error(`Unknown rate provider: ${provider.service}`);
    }
  }

  /**
   * Get all exchange rates
   */
  async getAllRates(): Promise<ExchangeRates> {
    const provider = await this.getActiveProvider();

    if (!provider) {
      throw new Error('No active rate provider found. Please enable a rate provider integration (e.g., CoinGecko) in Settings → Integrations.');
    }

    // Route to the correct provider service
    switch (provider.service) {
      case 'coingecko':
        return await coinGeckoService.getCurrentRates();
      
      // Future: Add more providers here
      
      default:
        throw new Error(`Unknown rate provider: ${provider.service}`);
    }
  }

  /**
   * Validate that a rate provider is active and working
   */
  async validateProvider(): Promise<{
    isActive: boolean;
    provider: string | null;
    error?: string;
  }> {
    const provider = await this.getActiveProvider();

    if (!provider) {
      return {
        isActive: false,
        provider: null,
        error: 'No active rate provider integration'
      };
    }

    try {
      // Try to fetch a test rate
      await this.getRate('BTC', 'EUR');
      
      return {
        isActive: true,
        provider: provider.service
      };
    } catch (error: any) {
      return {
        isActive: false,
        provider: provider.service,
        error: error.message
      };
    }
  }
}

export const rateProviderService = new RateProviderService();

