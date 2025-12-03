/**
 * Integration System
 * 
 * Enterprise-grade modular integration system for external services.
 * Supports multiple providers per category with intelligent routing.
 * 
 * Architecture:
 * - IntegrationRegistry: Provider catalog (available providers)
 * - IntegrationFactory: Provider initialization (single provider per category)
 * - VirtualIbanRouter: Multi-provider routing with failover (enterprise)
 * 
 * @example
 * ```typescript
 * import { integrationFactory, integrationRegistry, virtualIbanRouter } from '@/lib/integrations';
 * 
 * // Get active provider (single provider)
 * const kycProvider = await integrationFactory.getKycProvider();
 * 
 * // Get best provider for requirements (multi-provider routing)
 * const { provider } = await virtualIbanRouter.getProvider({ currency: 'EUR', country: 'DE' });
 * 
 * // Browse available providers
 * const kycProviders = integrationRegistry.getProvidersByCategory(IntegrationCategory.KYC);
 * ```
 */

// Export types
export * from './types';

// Export category interfaces
export * from './categories/IKycProvider';
export * from './categories/IRatesProvider';
export * from './categories/IEmailProvider';
export * from './categories/IPaymentProvider';
export * from './categories/IVirtualIbanProvider';

// Export registry, factory, and routers
export { integrationRegistry } from './IntegrationRegistry';
export { integrationFactory } from './IntegrationFactory';
export { virtualIbanRouter } from './VirtualIbanRouter';

// Export adapters (for backward compatibility)
export { kycaidAdapter } from './providers/kyc/KycaidAdapter';
export { coinGeckoAdapter } from './providers/rates/CoinGeckoAdapter';
export { resendAdapter } from './providers/email/ResendAdapter';

