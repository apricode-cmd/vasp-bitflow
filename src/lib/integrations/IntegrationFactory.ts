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
   * Get active provider for a category
   * 
   * @private
   */
  private async getActiveProvider(category: IntegrationCategory): Promise<IIntegrationProvider | null> {
    // Find active integration in database for this category
    const integration = await prisma.integration.findFirst({
      where: {
        isEnabled: true,
        status: 'active'
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    if (!integration) {
      // Fallback to first available provider in category (for backward compatibility)
      const providers = integrationRegistry.getProvidersByCategory(category);
      if (providers.length === 0) {
        return null;
      }

      const provider = providers[0].instance;
      
      // Try to initialize with environment config
      await this.initializeProvider(provider, {});
      
      return provider;
    }

    // Get provider from registry
    const provider = integrationRegistry.getProvider(integration.service);
    
    if (!provider) {
      console.warn(`Provider ${integration.service} not found in registry`);
      return null;
    }

    // Check if already initialized
    const cacheKey = `${category}-${integration.service}`;
    if (this.initializedProviders.has(cacheKey)) {
      return this.initializedProviders.get(cacheKey)!;
    }

    // Initialize provider with database config
    const config: BaseIntegrationConfig = {
      apiKey: integration.apiKey || undefined,
      apiEndpoint: integration.apiEndpoint || undefined,
      webhookSecret: integration.config?.webhookSecret || undefined,
      metadata: integration.config || {}
    };

    await this.initializeProvider(provider, config);
    
    // Cache initialized provider
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
    const config: BaseIntegrationConfig = {
      apiKey: integration.apiKey || undefined,
      apiEndpoint: integration.apiEndpoint || undefined,
      webhookSecret: integration.config?.webhookSecret || undefined,
      metadata: integration.config || {}
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

