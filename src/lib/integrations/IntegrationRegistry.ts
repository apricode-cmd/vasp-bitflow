/**
 * Integration Registry
 * 
 * Central registry for all available integrations
 * Similar to WordPress plugin registry
 */

import {
  IIntegrationProvider,
  IntegrationCategory,
  IntegrationMetadata
} from './types';
import { IKycProvider } from './categories/IKycProvider';
import { IRatesProvider } from './categories/IRatesProvider';
import { IEmailProvider } from './categories/IEmailProvider';
import { IBlockchainProvider } from './categories/IBlockchainProvider';

// Import adapters
import { kycaidAdapter } from './providers/kyc/KycaidAdapter';
import { sumsubAdapter } from './providers/kyc/SumsubAdapter';
import { coinGeckoAdapter } from './providers/rates/CoinGeckoAdapter';
import { krakenAdapter } from './providers/rates/KrakenAdapter';
import { resendAdapter } from './providers/email/ResendAdapter';
import { tatumAdapter } from './providers/blockchain/TatumAdapter';

/**
 * Provider registration info
 */
interface ProviderRegistration {
  providerId: string;
  category: IntegrationCategory;
  displayName: string;
  description: string;
  icon?: string;
  documentationUrl?: string;
  instance: IIntegrationProvider;
}

/**
 * Integration Registry Class
 * 
 * Manages all available integration providers
 */
class IntegrationRegistry {
  private providers: Map<string, ProviderRegistration> = new Map();
  private categorizedProviders: Map<IntegrationCategory, ProviderRegistration[]> = new Map();

  constructor() {
    this.registerDefaultProviders();
  }

  /**
   * Register default providers (existing integrations)
   */
  private registerDefaultProviders(): void {
    // KYC Providers
    this.register({
      providerId: 'kycaid',
      category: IntegrationCategory.KYC,
      displayName: 'KYCAID',
      description: 'Identity verification and KYC compliance provider',
      icon: '🛡️',
      documentationUrl: 'https://kycaid.com/docs',
      instance: kycaidAdapter
    });

    this.register({
      providerId: 'sumsub',
      category: IntegrationCategory.KYC,
      displayName: 'Sumsub',
      description: 'AI-powered identity verification with liveness detection',
      icon: '🤖',
      documentationUrl: 'https://docs.sumsub.com',
      instance: sumsubAdapter
    });

    // Rate Providers
    this.register({
      providerId: 'coingecko',
      category: IntegrationCategory.RATES,
      displayName: 'CoinGecko',
      description: 'Real-time cryptocurrency price data provider',
      icon: '📈',
      documentationUrl: 'https://www.coingecko.com/en/api',
      instance: coinGeckoAdapter
    });

    this.register({
      providerId: 'kraken',
      category: IntegrationCategory.RATES,
      displayName: 'Kraken Exchange',
      description: 'Professional cryptocurrency exchange rates from Kraken. No API key required.',
      icon: '🐙',
      documentationUrl: 'https://docs.kraken.com/api/docs/rest-api/get-ticker-information',
      instance: krakenAdapter
    });

    // Email Providers
    this.register({
      providerId: 'resend',
      category: IntegrationCategory.EMAIL,
      displayName: 'Resend',
      description: 'Transactional email delivery service',
      icon: '📧',
      documentationUrl: 'https://resend.com/docs',
      instance: resendAdapter
    });

    // Blockchain Providers
    this.register({
      providerId: 'tatum',
      category: IntegrationCategory.BLOCKCHAIN,
      displayName: 'Tatum',
      description: 'Blockchain data and transaction infrastructure provider',
      icon: '⛓️',
      documentationUrl: 'https://docs.tatum.io/',
      instance: tatumAdapter
    });
  }

  /**
   * Register a new provider
   */
  register(registration: ProviderRegistration): void {
    this.providers.set(registration.providerId, registration);

    // Add to category map
    if (!this.categorizedProviders.has(registration.category)) {
      this.categorizedProviders.set(registration.category, []);
    }
    this.categorizedProviders.get(registration.category)!.push(registration);
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): IIntegrationProvider | null {
    const registration = this.providers.get(providerId);
    return registration ? registration.instance : null;
  }

  /**
   * Get all providers in a category
   */
  getProvidersByCategory(category: IntegrationCategory): ProviderRegistration[] {
    return this.categorizedProviders.get(category) || [];
  }

  /**
   * Get provider metadata
   */
  getProviderMetadata(providerId: string): Omit<ProviderRegistration, 'instance'> | null {
    const registration = this.providers.get(providerId);
    if (!registration) return null;

    const { instance, ...metadata } = registration;
    return metadata;
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): ProviderRegistration[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all categories
   */
  getAllCategories(): IntegrationCategory[] {
    return Array.from(this.categorizedProviders.keys());
  }

  /**
   * Check if provider exists
   */
  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Get KYC provider (typed helper)
   */
  getKycProvider(providerId: string): IKycProvider | null {
    const provider = this.getProvider(providerId);
    if (provider && provider.category === IntegrationCategory.KYC) {
      return provider as IKycProvider;
    }
    return null;
  }

  /**
   * Get Rates provider (typed helper)
   */
  getRatesProvider(providerId: string): IRatesProvider | null {
    const provider = this.getProvider(providerId);
    if (provider && provider.category === IntegrationCategory.RATES) {
      return provider as IRatesProvider;
    }
    return null;
  }

  /**
   * Get Email provider (typed helper)
   */
  getEmailProvider(providerId: string): IEmailProvider | null {
    const provider = this.getProvider(providerId);
    if (provider && provider.category === IntegrationCategory.EMAIL) {
      return provider as IEmailProvider;
    }
    return null;
  }

  /**
   * Get Blockchain provider (typed helper)
   */
  getBlockchainProvider(providerId: string): IBlockchainProvider | null {
    const provider = this.getProvider(providerId);
    if (provider && provider.category === IntegrationCategory.BLOCKCHAIN) {
      return provider as IBlockchainProvider;
    }
    return null;
  }
}

// Export singleton instance
export const integrationRegistry = new IntegrationRegistry();

// Export type for external use
export type { ProviderRegistration };

