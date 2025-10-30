/**
 * Integration System Types
 * 
 * Base types and enums for modular integration system
 */

// ==========================================
// ENUMS
// ==========================================

/**
 * Integration categories (like WordPress plugin types)
 */
export enum IntegrationCategory {
  KYC = 'KYC',                   // KYC/Identity verification
  RATES = 'RATES',               // Exchange rate providers
  EMAIL = 'EMAIL',               // Email/notification services
  PAYMENT = 'PAYMENT',           // Payment gateways (future)
  BLOCKCHAIN = 'BLOCKCHAIN',     // Blockchain data & transaction providers
  ANALYTICS = 'ANALYTICS',       // Analytics services (future)
  STORAGE = 'STORAGE'            // File storage services (future)
}

/**
 * Integration status
 */
export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  TESTING = 'testing'
}

// ==========================================
// BASE INTERFACES
// ==========================================

/**
 * Base configuration for all integrations
 */
export interface BaseIntegrationConfig {
  apiKey?: string;
  apiEndpoint?: string;
  webhookSecret?: string;
  metadata?: Record<string, any>;
}

/**
 * Integration metadata (stored in DB)
 */
export interface IntegrationMetadata {
  id: string;
  service: string;                    // e.g., "kycaid", "coingecko"
  category: IntegrationCategory;
  displayName: string;                // e.g., "KYCAID", "CoinGecko"
  description: string;
  isEnabled: boolean;
  status: IntegrationStatus;
  config: BaseIntegrationConfig;
  lastTested?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Test result for integration
 */
export interface IntegrationTestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: Date;
}

/**
 * Base integration provider interface
 * All providers must implement this
 */
export interface IIntegrationProvider {
  /** Provider identifier */
  readonly providerId: string;
  
  /** Category this provider belongs to */
  readonly category: IntegrationCategory;
  
  /** Initialize provider with config */
  initialize(config: BaseIntegrationConfig): Promise<void>;
  
  /** Test connection/credentials */
  test(): Promise<IntegrationTestResult>;
  
  /** Check if provider is properly configured */
  isConfigured(): boolean;
  
  /** Get current configuration (without sensitive data) */
  getConfig(): Partial<BaseIntegrationConfig>;
}

