/**
 * Integration System
 * 
 * Modular integration system for external services
 * Similar to WordPress plugin architecture
 * 
 * @example
 * ```typescript
 * import { integrationFactory, integrationRegistry } from '@/lib/integrations';
 * 
 * // Get active provider
 * const kycProvider = await integrationFactory.getKycProvider();
 * await kycProvider.createVerification(userId, userData);
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

// Export registry and factory
export { integrationRegistry } from './IntegrationRegistry';
export { integrationFactory } from './IntegrationFactory';

// Export adapters (for backward compatibility)
export { kycaidAdapter } from './providers/kyc/KycaidAdapter';
export { coinGeckoAdapter } from './providers/rates/CoinGeckoAdapter';
export { resendAdapter } from './providers/email/ResendAdapter';

