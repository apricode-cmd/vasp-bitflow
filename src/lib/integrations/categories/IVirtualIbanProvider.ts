/**
 * Virtual IBAN Provider Interface
 * 
 * Standard interface for all Virtual IBAN providers
 * Implementations: BCB Group, Currency Cloud, Modulr, etc.
 */

import { IIntegrationProvider, IntegrationCategory } from '../types';

// ==========================================
// VIRTUAL IBAN TYPES
// ==========================================

/**
 * Account creation request
 */
export interface VirtualIbanCreateRequest {
  userId: string;
  userEmail: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  nationality: string; // ISO2
  country: string; // ISO2 - where IBAN will be issued
  currency: string; // EUR, USD, GBP, PLN
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string; // ISO2
  };
}

/**
 * Virtual IBAN account details
 */
export interface VirtualIbanAccount {
  accountId: string; // Provider's account ID
  userId: string; // Our user ID
  iban: string; // Virtual IBAN
  bic?: string; // BIC/SWIFT code
  bankName: string; // Bank name
  accountHolder: string; // Account holder name
  currency: string; // Account currency
  country: string; // Account country
  status: VirtualIbanStatus;
  balance?: number; // Current balance (if available)
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Transaction on virtual IBAN
 */
export interface VirtualIbanTransaction {
  transactionId: string;
  accountId: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  senderName?: string;
  senderIban?: string;
  senderBic?: string;
  reference?: string;
  status: 'pending' | 'completed' | 'failed';
  processedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Account status
 * Note: 'pending' removed - BCB creates accounts instantly (~5s)
 * Either account is created (active) or creation fails with error
 */
export type VirtualIbanStatus = 'active' | 'suspended' | 'closed';

/**
 * Balance information
 */
export interface VirtualIbanBalance {
  balance: number;
  currency: string;
  availableBalance?: number;
  lastUpdated?: Date;
}

/**
 * Webhook payload (normalized)
 */
export interface VirtualIbanWebhookPayload {
  accountId: string;
  transactionId: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  senderName?: string;
  senderIban?: string;
  reference?: string;
  metadata?: Record<string, any>;
}

// ==========================================
// PROVIDER INTERFACE
// ==========================================

export interface IVirtualIbanProvider extends IIntegrationProvider {
  readonly category: IntegrationCategory.VIRTUAL_IBAN;

  /**
   * Create a new virtual IBAN account for user
   */
  createAccount(request: VirtualIbanCreateRequest): Promise<VirtualIbanAccount>;

  /**
   * Get account details by account ID
   */
  getAccountDetails(accountId: string): Promise<VirtualIbanAccount>;

  /**
   * Get transactions for account
   */
  getTransactions(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<VirtualIbanTransaction[]>;

  /**
   * Get account balance
   */
  getBalance(accountId: string): Promise<VirtualIbanBalance>;

  /**
   * Suspend account (temporary block)
   */
  suspendAccount(accountId: string, reason?: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Reactivate suspended account
   */
  reactivateAccount(accountId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Close account permanently
   */
  closeAccount(accountId: string, reason?: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Verify webhook signature (for automatic payment notifications)
   */
  verifyWebhookSignature?(payload: string, signature: string): boolean;

  /**
   * Process webhook payload (normalize data)
   */
  processWebhook?(payload: any): VirtualIbanWebhookPayload;
}





