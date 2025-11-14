/**
 * Rate Provider Service
 * 
 * Service to get rates from the active rate provider integration
 * Only ONE rate provider can be active at a time
 */

import { prisma } from '@/lib/prisma';
import { coinGeckoService, type CoinGeckoRates } from './coingecko';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { integrationRegistry } from '@/lib/integrations';
import { IntegrationCategory } from '@/lib/integrations/types';
import { CacheService } from './cache.service';

class RateProviderService {
  /**
   * Get the active rate provider integration
   */
  async getActiveProvider(): Promise<{ service: string; apiKey: string | null } | null> {
    try {
      // Get all RATES providers from registry
      const ratesProviders = integrationRegistry.getProvidersByCategory(IntegrationCategory.RATES);
      
      if (ratesProviders.length === 0) {
        console.warn('⚠️ No RATES providers registered in IntegrationRegistry');
        return null;
      }

      // Get provider IDs from registry
      const providerIds = ratesProviders.map(p => p.providerId);

      // Find active provider in database
      const provider = await prisma.integration.findFirst({
        where: {
          service: { in: providerIds }, // Only check registered RATES providers
          isEnabled: true,
          status: 'active'
        },
        orderBy: {
          updatedAt: 'desc' // Most recently updated active provider
        }
      });

      if (!provider) {
        console.warn('⚠️ No active RATES provider found in database. Available providers:', providerIds);
        return null;
      }

      console.log('✅ Active rate provider:', provider.service);

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
   * With Redis caching layer
   */
  async getRate(crypto: string, fiat: string): Promise<number> {
    // 1. Try Redis cache first
    const cached = await CacheService.getRate(crypto, fiat);
    if (cached !== null) {
      return cached;
    }

    // 2. Cache miss - check provider
    const providerInfo = await this.getActiveProvider();

    if (!providerInfo) {
      throw new Error('No active rate provider found. Please enable a rate provider integration (e.g., CoinGecko) in Settings → Integrations.');
    }

    // 3. Get initialized provider from IntegrationFactory
    const provider = await integrationFactory.getRatesProvider();
    
    // 4. Fetch from provider
    const rate = await provider.getRate(crypto, fiat);
    
    // 5. Store in Redis cache (30 seconds TTL)
    await CacheService.setRate(crypto, fiat, rate, 30);
    
    return rate;
  }

  /**
   * Get all exchange rates
   * With Redis bulk caching
   */
  async getAllRates(): Promise<CoinGeckoRates> {
    const providerInfo = await this.getActiveProvider();

    if (!providerInfo) {
      throw new Error('No active rate provider found. Please enable a rate provider integration (e.g., CoinGecko) in Settings → Integrations.');
    }

    // Get initialized provider from IntegrationFactory
    const provider = await integrationFactory.getRatesProvider();
    
    // Fetch all rates from provider
    const rates = await provider.getCurrentRates();
    
    // Cache all rates in bulk (30 seconds TTL)
    await CacheService.setAllRates(rates, 30);
    
    return rates;
  }

  /**
   * Force refresh rates (clears cache and fetches fresh)
   */
  async forceRefresh(): Promise<CoinGeckoRates> {
    // Clear Redis cache
    await CacheService.clearRatesCache();
    
    // Fetch fresh rates (will be cached automatically)
    return await this.getAllRates();
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

