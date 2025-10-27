/**
 * Payment Provider Interface (Future)
 * 
 * Standard interface for payment gateways
 * Implementations: Stripe, PayPal, Adyen, etc.
 */

import { IIntegrationProvider, IntegrationCategory } from '../types';

// ==========================================
// PAYMENT-SPECIFIC TYPES
// ==========================================

/**
 * Payment method types
 */
export type PaymentMethodType = 'card' | 'bank_transfer' | 'wallet' | 'crypto';

/**
 * Payment status
 */
export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

/**
 * Payment intent
 */
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  clientSecret?: string;
  metadata?: Record<string, any>;
}

/**
 * Payment result
 */
export interface PaymentResult {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  error?: string;
  metadata?: Record<string, any>;
}

// ==========================================
// PAYMENT PROVIDER INTERFACE
// ==========================================

/**
 * Interface for payment providers (Future implementation)
 * All payment integrations must implement this
 */
export interface IPaymentProvider extends IIntegrationProvider {
  readonly category: IntegrationCategory.PAYMENT;

  /**
   * Create payment intent
   */
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent>;

  /**
   * Get payment status
   */
  getPaymentStatus(transactionId: string): Promise<PaymentResult>;

  /**
   * Process refund
   */
  refund(transactionId: string, amount?: number): Promise<PaymentResult>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean;

  /**
   * Get supported payment methods
   */
  getSupportedMethods(): PaymentMethodType[];
}

