/**
 * Integration Factory
 * 
 * Factory for creating and initializing integration providers
 * Fetches active providers from database and initializes them
 */

import { prisma } from '@/lib/prisma';
import { integrationRegistry } from './IntegrationRegistry';
import {
  IIntegrationProvider,
  IntegrationCategory,
  BaseIntegrationConfig
} from './types';
import { IKycProvider } from './categories/IKycProvider';
import { IRatesProvider } from './categories/IRatesProvider';
import { IEmailProvider } from './categories/IEmailProvider';
import { IVirtualIbanProvider } from './categories/IVirtualIbanProvider';
import { decrypt } from '@/lib/services/encryption.service';

/**
 * Integration Factory Class
 * 
 * Creates and initializes providers based on database configuration
 */
class IntegrationFactory {
  private initializedProviders: Map<string, IIntegrationProvider> = new Map();

  /**
   * Get active KYC provider from database
   */
  async getKycProvider(): Promise<IKycProvider> {
    const provider = await this.getActiveProvider(IntegrationCategory.KYC);
    
    if (!provider) {
      throw new Error('No active KYC provider configured');
    }

    return provider as IKycProvider;
  }

  /**
   * Get active Rates provider from database
   */
  async getRatesProvider(): Promise<IRatesProvider> {
    const provider = await this.getActiveProvider(IntegrationCategory.RATES);
    
    if (!provider) {
      throw new Error('No active Rates provider configured');
    }

    return provider as IRatesProvider;
  }

  /**
   * Get active Email provider from database
   */
  async getEmailProvider(): Promise<IEmailProvider> {
    const provider = await this.getActiveProvider(IntegrationCategory.EMAIL);
    
    if (!provider) {
      throw new Error('No active Email provider configured');
    }

    return provider as IEmailProvider;
  }

  /**
   * Get active Virtual IBAN provider from database
   */
  async getVirtualIbanProvider(): Promise<IVirtualIbanProvider> {
    const provider = await this.getActiveProvider(IntegrationCategory.VIRTUAL_IBAN);
    
    if (!provider) {
      throw new Error('No active Virtual IBAN provider configured');
    }

    return provider as IVirtualIbanProvider;
  }

  /**
   * Get active provider for a category
   * 
   * @private
   */
  private async getActiveProvider(category: IntegrationCategory): Promise<IIntegrationProvider | null> {
    // 1. Get all providers for this category from registry
    const categoryProviders = integrationRegistry.getProvidersByCategory(category);
    
    if (categoryProviders.length === 0) {
      console.warn(`No providers registered for category ${category}`);
      return null;
    }

    // Get list of provider IDs (service names) for this category
    const categoryProviderIds = categoryProviders.map(p => p.providerId);

    // 2. Find active integration in database that matches this category
    const integration = await prisma.integration.findFirst({
      where: {
        service: { in: categoryProviderIds }, // Filter by category providers
        isEnabled: true,
        status: 'active'
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    if (!integration) {
      console.warn(`No active integration found in DB for category ${category}`);
      // Fallback to first available provider in category (for backward compatibility)
      const provider = categoryProviders[0].instance;
      
      // Try to initialize with empty config
      await this.initializeProvider(provider, {});
      
      return provider;
    }

    // 3. Get provider from registry
    const provider = integrationRegistry.getProvider(integration.service);
    
    if (!provider) {
      console.warn(`Provider ${integration.service} not found in registry`);
      return null;
    }

    // 4. Check if already initialized
    const cacheKey = `${category}-${integration.service}`;
    if (this.initializedProviders.has(cacheKey)) {
      return this.initializedProviders.get(cacheKey)!;
    }

    // 5. Initialize provider with database config
    const integrationConfig = integration.config as Record<string, any> || {};
    
    // Decrypt API key if it exists
    let decryptedApiKey: string | undefined;
    if (integration.apiKey) {
      try {
        decryptedApiKey = decrypt(integration.apiKey);
        console.log(`✅ Decrypted API key for ${integration.service}`);
      } catch (e) {
        console.warn(`⚠️ Could not decrypt API key for ${integration.service}`);
      }
    }

    // Decrypt clientSecret from config (for OAuth-based providers like BCB Group)
    let decryptedClientSecret: string | undefined;
    if (integrationConfig.clientSecret) {
      try {
        decryptedClientSecret = decrypt(integrationConfig.clientSecret);
        console.log(`✅ Decrypted clientSecret for ${integration.service}`);
      } catch (e) {
        console.warn(`⚠️ Could not decrypt clientSecret for ${integration.service}`);
        decryptedClientSecret = integrationConfig.clientSecret; // Use as-is if not encrypted
      }
    }
    
    // Use decrypted clientSecret as apiKey for OAuth providers
    if (!decryptedApiKey && decryptedClientSecret) {
      decryptedApiKey = decryptedClientSecret;
    }
    
    // Build config object - spread all config fields except sensitive ones
    const safeConfigFields = Object.fromEntries(
      Object.entries(integrationConfig).filter(([key]) => 
        !['apiKey', 'api_key', 'secret', 'credentials', 'webhookSecret', 'clientSecret'].includes(key)
      )
    );
    
    const config: BaseIntegrationConfig = {
      apiKey: decryptedApiKey || undefined,
      apiEndpoint: integration.apiEndpoint || undefined,
      // Include decrypted clientSecret for providers that need it
      ...(decryptedClientSecret ? { clientSecret: decryptedClientSecret } : {}),
      // Spread safe config fields (sandbox, counterpartyId, baseUrl, authUrl, etc.)
      ...safeConfigFields,
      metadata: safeConfigFields
    };
    
    console.log(`🔧 Initializing ${integration.service} with config:`, {
      hasApiKey: !!config.apiKey,
      hasClientSecret: !!decryptedClientSecret,
      apiEndpoint: config.apiEndpoint,
      ...safeConfigFields
    });

    await this.initializeProvider(provider, config);
    
    // 6. Cache initialized provider
    this.initializedProviders.set(cacheKey, provider);

    return provider;
  }

  /**
   * Get specific provider by service name
   */
  async getProviderByService(service: string): Promise<IIntegrationProvider | null> {
    // Check cache first
    if (this.initializedProviders.has(service)) {
      return this.initializedProviders.get(service)!;
    }

    // Get provider from registry
    const provider = integrationRegistry.getProvider(service);
    if (!provider) {
      return null;
    }

    // Get config from database
    const integration = await prisma.integration.findUnique({
      where: { service }
    });

    if (!integration) {
      // Initialize with empty config for backward compatibility
      await this.initializeProvider(provider, {});
      this.initializedProviders.set(service, provider);
      return provider;
    }

    // Initialize with database config
    const integrationConfig = integration.config as Record<string, any> || {};
    
    // Decrypt API key if it exists
    let decryptedApiKey: string | undefined;
    if (integration.apiKey) {
      try {
        decryptedApiKey = decrypt(integration.apiKey);
      } catch (error) {
        console.error(`Failed to decrypt API key for ${integration.service}:`, error);
      }
    }
    
    // ✅ Build config with explicit webhookSecret mapping
    const config: BaseIntegrationConfig = {
      ...Object.fromEntries(
        Object.entries(integrationConfig).filter(([key]) => key !== 'apiKey')
      ),
      apiKey: decryptedApiKey || undefined,
      apiEndpoint: integration.apiEndpoint || undefined,
      webhookSecret: integrationConfig.webhookSecret || undefined, // ✅ Explicit
      metadata: {
        ...integrationConfig,
        // Don't include masked apiKey in metadata
        apiKey: undefined
      }
    };

    await this.initializeProvider(provider, config);
    this.initializedProviders.set(service, provider);

    return provider;
  }

  /**
   * Initialize provider with configuration
   * 
   * @private
   */
  private async initializeProvider(
    provider: IIntegrationProvider,
    config: BaseIntegrationConfig
  ): Promise<void> {
    try {
      await provider.initialize(config);
    } catch (error) {
      console.error(`Failed to initialize provider ${provider.providerId}:`, error);
      throw error;
    }
  }

  /**
   * Clear provider cache (useful for testing)
   */
  clearCache(): void {
    this.initializedProviders.clear();
  }

  /**
   * Test a provider without caching it
   */
  async testProvider(service: string, config: BaseIntegrationConfig) {
    const provider = integrationRegistry.getProvider(service);
    if (!provider) {
      throw new Error(`Provider ${service} not found`);
    }

    // Initialize temporarily
    await provider.initialize(config);
    
    // Test connection
    return await provider.test();
  }
}

// Export singleton instance
export const integrationFactory = new IntegrationFactory();


