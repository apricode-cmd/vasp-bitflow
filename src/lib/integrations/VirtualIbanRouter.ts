/**
 * Virtual IBAN Router
 * 
 * Enterprise-grade router for selecting the best Virtual IBAN provider
 * based on currency, country, user preferences, and provider availability.
 * 
 * Features:
 * - Multi-provider support
 * - Currency-based routing
 * - Country-based routing  
 * - Automatic failover
 * - Priority-based selection
 */

import { prisma } from '@/lib/prisma';
import { integrationRegistry } from './IntegrationRegistry';
import { IVirtualIbanProvider, VirtualIbanCreateRequest } from './categories/IVirtualIbanProvider';
import { IntegrationCategory, BaseIntegrationConfig } from './types';
import { decrypt } from '@/lib/services/encryption.service';

// ==========================================
// TYPES
// ==========================================

interface ProviderCapabilities {
  currencies: string[];      // EUR, GBP, USD, PLN
  countries: string[];       // ISO2 codes where provider can issue IBANs
  maxAccountsPerUser: number;
  supportsWebhooks: boolean;
  supportedAccountTypes: ('individual' | 'business')[];
}

interface ProviderConfig {
  providerId: string;
  priority: number;           // Lower = higher priority
  isEnabled: boolean;
  capabilities: ProviderCapabilities;
  config: BaseIntegrationConfig;
}

interface RoutingResult {
  provider: IVirtualIbanProvider;
  providerId: string;
  reason: string;
}

// ==========================================
// PROVIDER CAPABILITIES REGISTRY
// ==========================================

const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
  BCB_GROUP_VIRTUAL_IBAN: {
    currencies: ['EUR', 'GBP'],
    countries: ['DK', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'PL', 'UA'], // SEPA + UK
    maxAccountsPerUser: 1,
    supportsWebhooks: true,
    supportedAccountTypes: ['individual'],
  },
  // Future providers can be added here:
  // CURRENCY_CLOUD_VIRTUAL_IBAN: { ... },
  // MODULR_VIRTUAL_IBAN: { ... },
  // RAILSBANK_VIRTUAL_IBAN: { ... },
};

// ==========================================
// ROUTER CLASS
// ==========================================

class VirtualIbanRouter {
  private providerCache: Map<string, IVirtualIbanProvider> = new Map();
  private configCache: Map<string, ProviderConfig> = new Map();
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get the best provider for a Virtual IBAN request
   * Routes based on currency, country, and provider availability
   */
  async getProvider(request: {
    currency: string;
    country: string;
    accountType?: 'individual' | 'business';
  }): Promise<RoutingResult> {
    // Refresh cache if needed
    await this.refreshCache();

    const { currency, country, accountType = 'individual' } = request;

    // Get all active providers sorted by priority
    const activeProviders = await this.getActiveProviders();

    // Filter providers that support the requested currency and country
    const compatibleProviders = activeProviders.filter(p => {
      const caps = PROVIDER_CAPABILITIES[p.providerId];
      if (!caps) return false;

      return (
        caps.currencies.includes(currency.toUpperCase()) &&
        caps.countries.includes(country.toUpperCase()) &&
        caps.supportedAccountTypes.includes(accountType)
      );
    });

    if (compatibleProviders.length === 0) {
      throw new Error(
        `No Virtual IBAN provider available for currency ${currency} in country ${country}. ` +
        `Please contact support to enable this feature.`
      );
    }

    // Sort by priority (lowest first)
    compatibleProviders.sort((a, b) => a.priority - b.priority);

    // Try providers in order until one works
    for (const providerConfig of compatibleProviders) {
      try {
        const provider = await this.initializeProvider(providerConfig);
        
        // Quick health check
        const testResult = await provider.test();
        if (testResult.success) {
          return {
            provider,
            providerId: providerConfig.providerId,
            reason: `Selected ${providerConfig.providerId} (priority ${providerConfig.priority}) for ${currency}/${country}`,
          };
        }
        
        console.warn(`[VirtualIbanRouter] Provider ${providerConfig.providerId} health check failed:`, testResult.message);
      } catch (error) {
        console.warn(`[VirtualIbanRouter] Failed to initialize ${providerConfig.providerId}:`, error);
      }
    }

    throw new Error(
      `All Virtual IBAN providers are unavailable for ${currency}/${country}. ` +
      `Please try again later or contact support.`
    );
  }

  /**
   * Get provider by specific ID (for existing accounts)
   */
  async getProviderById(providerId: string): Promise<IVirtualIbanProvider> {
    await this.refreshCache();

    const config = this.configCache.get(providerId);
    if (!config) {
      throw new Error(`Provider ${providerId} not found or not enabled`);
    }

    return this.initializeProvider(config);
  }

  /**
   * Get all available providers for a currency
   * Useful for showing options to users
   */
  async getProvidersForCurrency(currency: string): Promise<{
    providerId: string;
    name: string;
    countries: string[];
  }[]> {
    await this.refreshCache();

    const result: { providerId: string; name: string; countries: string[] }[] = [];

    for (const [providerId, config] of this.configCache) {
      if (!config.isEnabled) continue;

      const caps = PROVIDER_CAPABILITIES[providerId];
      if (caps?.currencies.includes(currency.toUpperCase())) {
        result.push({
          providerId,
          name: this.getProviderDisplayName(providerId),
          countries: caps.countries,
        });
      }
    }

    return result;
  }

  /**
   * Get all active providers from database
   */
  private async getActiveProviders(): Promise<ProviderConfig[]> {
    const integrations = await prisma.integration.findMany({
      where: {
        category: IntegrationCategory.VIRTUAL_IBAN,
        isEnabled: true,
        status: 'active',
      },
    });

    return integrations.map(integration => {
      const config = integration.config as Record<string, any> || {};
      
      return {
        providerId: integration.service,
        priority: config.priority ?? 100, // Default priority
        isEnabled: integration.isEnabled,
        capabilities: PROVIDER_CAPABILITIES[integration.service] || {
          currencies: [],
          countries: [],
          maxAccountsPerUser: 1,
          supportsWebhooks: false,
          supportedAccountTypes: ['individual'],
        },
        config: {
          apiKey: integration.apiKey || undefined,
          apiEndpoint: integration.apiEndpoint || undefined,
          ...config,
        },
      };
    });
  }

  /**
   * Initialize a provider with decrypted credentials
   */
  private async initializeProvider(providerConfig: ProviderConfig): Promise<IVirtualIbanProvider> {
    // Check cache
    if (this.providerCache.has(providerConfig.providerId)) {
      return this.providerCache.get(providerConfig.providerId)!;
    }

    // Get provider instance from registry
    const provider = integrationRegistry.getProvider(providerConfig.providerId);
    if (!provider) {
      throw new Error(`Provider ${providerConfig.providerId} not registered`);
    }

    // Get fresh config from database with decrypted secrets
    const integration = await prisma.integration.findFirst({
      where: { service: providerConfig.providerId },
    });

    if (!integration) {
      throw new Error(`Provider ${providerConfig.providerId} not found in database`);
    }

    const integrationConfig = integration.config as Record<string, any> || {};

    // Decrypt secrets
    let decryptedApiKey: string | undefined;
    if (integration.apiKey) {
      try {
        decryptedApiKey = decrypt(integration.apiKey);
      } catch (e) {
        console.warn(`Could not decrypt API key for ${providerConfig.providerId}`);
      }
    }

    let decryptedClientSecret: string | undefined;
    if (integrationConfig.clientSecret) {
      try {
        decryptedClientSecret = decrypt(integrationConfig.clientSecret);
      } catch (e) {
        decryptedClientSecret = integrationConfig.clientSecret;
      }
    }

    // Build config
    const safeConfigFields = Object.fromEntries(
      Object.entries(integrationConfig).filter(([key]) => 
        !['apiKey', 'api_key', 'secret', 'credentials', 'webhookSecret', 'clientSecret'].includes(key)
      )
    );

    const config: BaseIntegrationConfig = {
      apiKey: decryptedApiKey || decryptedClientSecret,
      apiEndpoint: integration.apiEndpoint || undefined,
      ...(decryptedClientSecret ? { clientSecret: decryptedClientSecret } : {}),
      ...safeConfigFields,
    };

    // Initialize
    await provider.initialize(config);

    // Cache
    this.providerCache.set(providerConfig.providerId, provider as IVirtualIbanProvider);

    return provider as IVirtualIbanProvider;
  }

  /**
   * Refresh cache if TTL expired
   */
  private async refreshCache(): Promise<void> {
    const now = new Date();
    
    if (this.lastCacheUpdate && 
        now.getTime() - this.lastCacheUpdate.getTime() < this.CACHE_TTL_MS) {
      return;
    }

    const providers = await this.getActiveProviders();
    
    this.configCache.clear();
    for (const provider of providers) {
      this.configCache.set(provider.providerId, provider);
    }

    this.lastCacheUpdate = now;
  }

  /**
   * Get display name for provider
   */
  private getProviderDisplayName(providerId: string): string {
    const names: Record<string, string> = {
      BCB_GROUP_VIRTUAL_IBAN: 'BCB Group (EUR/GBP)',
      CURRENCY_CLOUD_VIRTUAL_IBAN: 'Currency Cloud',
      MODULR_VIRTUAL_IBAN: 'Modulr',
      RAILSBANK_VIRTUAL_IBAN: 'Railsbank',
    };
    return names[providerId] || providerId;
  }

  /**
   * Clear all caches (for testing)
   */
  clearCache(): void {
    this.providerCache.clear();
    this.configCache.clear();
    this.lastCacheUpdate = null;
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(providerId: string): ProviderCapabilities | null {
    return PROVIDER_CAPABILITIES[providerId] || null;
  }

  /**
   * Check if a provider supports given requirements
   */
  supportsRequirements(
    providerId: string,
    requirements: { currency?: string; country?: string; accountType?: string }
  ): boolean {
    const caps = PROVIDER_CAPABILITIES[providerId];
    if (!caps) return false;

    if (requirements.currency && !caps.currencies.includes(requirements.currency.toUpperCase())) {
      return false;
    }

    if (requirements.country && !caps.countries.includes(requirements.country.toUpperCase())) {
      return false;
    }

    if (requirements.accountType && 
        !caps.supportedAccountTypes.includes(requirements.accountType as 'individual' | 'business')) {
      return false;
    }

    return true;
  }
}

// Export singleton
export const virtualIbanRouter = new VirtualIbanRouter();

