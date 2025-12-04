/**
 * TopUp Request Service
 * 
 * Enterprise-grade service for managing Virtual IBAN top-up requests.
 * Features:
 * - Unique reference generation for payment matching
 * - Auto-expiration (24 hours)
 * - Webhook-based auto-completion
 * - Invoice PDF generation support
 * 
 * Flow:
 * 1. User creates TopUpRequest → PENDING
 * 2. User downloads invoice with unique reference
 * 3. User makes bank transfer with reference
 * 4. BCB webhook receives payment → matches by reference
 * 5. TopUpRequest → COMPLETED, balance credited
 */

import { prisma } from '@/lib/prisma';
import type {
  TopUpRequest,
  TopUpRequestStatus,
  VirtualIbanAccount,
  VirtualIbanTransaction,
} from '@prisma/client';
import { randomBytes } from 'crypto';

// ==========================================
// TYPES
// ==========================================

export interface CreateTopUpRequestInput {
  userId: string;
  virtualIbanId: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface TopUpRequestWithRelations extends TopUpRequest {
  virtualIban?: VirtualIbanAccount;
  transaction?: VirtualIbanTransaction | null;
}

export interface CompleteTopUpResult {
  topUpRequest: TopUpRequest;
  transaction: VirtualIbanTransaction;
  newBalance: number;
}

// ==========================================
// CONSTANTS
// ==========================================

const TOP_UP_EXPIRY_HOURS = 24;
const REFERENCE_PREFIX = 'TU';

// ==========================================
// SERVICE CLASS
// ==========================================

class TopUpRequestService {
  /**
   * Generate unique reference for payment matching
   * Format: TU-{IBAN_LAST4}-{RANDOM}
   * Example: TU-7890-A3X9K2
   */
  private generateReference(iban: string): string {
    const ibanLast4 = iban.slice(-4);
    const randomPart = randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
    return `${REFERENCE_PREFIX}-${ibanLast4}-${randomPart}`;
  }

  /**
   * Generate invoice number
   * Format: INV-TU-{TIMESTAMP}-{RANDOM}
   */
  private generateInvoiceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(2).toString('hex').toUpperCase();
    return `INV-TU-${timestamp}-${random}`;
  }

  /**
   * Calculate expiry date (24 hours from now)
   */
  private getExpiryDate(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + TOP_UP_EXPIRY_HOURS);
    return expiry;
  }

  // ==========================================
  // CREATE TOP-UP REQUEST
  // ==========================================

  /**
   * Create a new top-up request
   * 
   * @throws Error if Virtual IBAN account not found or not active
   * @throws Error if user already has pending request
   */
  async createRequest(input: CreateTopUpRequestInput): Promise<TopUpRequestWithRelations> {
    const { userId, virtualIbanId, amount, currency = 'EUR', metadata } = input;

    // 1. Validate Virtual IBAN account
    const virtualIban = await prisma.virtualIbanAccount.findFirst({
      where: {
        id: virtualIbanId,
        userId: userId,
        status: 'ACTIVE',
      },
    });

    if (!virtualIban) {
      throw new Error('Virtual IBAN account not found or not active');
    }

    // 2. Check for existing pending request
    // For better UX: inform user about existing request before creating new one
    const existingPending = await prisma.topUpRequest.findFirst({
      where: {
        userId,
        virtualIbanId,
        status: 'PENDING',
        expiresAt: { gt: new Date() }, // Not expired
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPending) {
      // Throw error with existing request details so UI can handle it
      console.log('[TopUpRequest] User already has pending request:', existingPending.reference);
      const error = new Error('EXISTING_PENDING_REQUEST') as any;
      error.code = 'EXISTING_PENDING_REQUEST';
      error.existingRequest = existingPending;
      throw error;
    }

    // 3. Generate unique reference
    let reference: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      reference = this.generateReference(virtualIban.iban);
      const existing = await prisma.topUpRequest.findUnique({
        where: { reference },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique reference after multiple attempts');
    }

    // 4. Create top-up request
    const topUpRequest = await prisma.topUpRequest.create({
      data: {
        userId,
        virtualIbanId,
        reference: reference!,
        invoiceNumber: this.generateInvoiceNumber(),
        amount,
        currency,
        status: 'PENDING',
        expiresAt: this.getExpiryDate(),
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
      include: {
        virtualIban: true,
      },
    });

    console.log('[TopUpRequest] Created:', {
      id: topUpRequest.id,
      reference: topUpRequest.reference,
      amount: topUpRequest.amount,
      currency: topUpRequest.currency,
      expiresAt: topUpRequest.expiresAt,
    });

    return topUpRequest;
  }

  // ==========================================
  // FIND TOP-UP REQUEST
  // ==========================================

  /**
   * Get top-up request by ID
   */
  async getById(id: string): Promise<TopUpRequestWithRelations | null> {
    return prisma.topUpRequest.findUnique({
      where: { id },
      include: {
        virtualIban: true,
        transaction: true,
      },
    });
  }

  /**
   * Get top-up request by reference (for payment matching)
   * Only returns PENDING and not expired requests
   */
  async getByReference(reference: string): Promise<TopUpRequestWithRelations | null> {
    return prisma.topUpRequest.findFirst({
      where: {
        reference,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        virtualIban: true,
        transaction: true,
      },
    });
  }

  /**
   * Get all requests for a user
   */
  async getUserRequests(
    userId: string,
    options?: {
      status?: TopUpRequestStatus;
      virtualIbanId?: string;
      limit?: number;
    }
  ): Promise<TopUpRequestWithRelations[]> {
    return prisma.topUpRequest.findMany({
      where: {
        userId,
        status: options?.status,
        virtualIbanId: options?.virtualIbanId,
      },
      include: {
        virtualIban: true,
        transaction: true,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
    });
  }

  /**
   * Get pending requests for a Virtual IBAN (for matching incoming payments)
   */
  async getPendingRequestsForIban(virtualIbanId: string): Promise<TopUpRequest[]> {
    return prisma.topUpRequest.findMany({
      where: {
        virtualIbanId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ==========================================
  // COMPLETE TOP-UP REQUEST (via webhook)
  // ==========================================

  /**
   * Complete a top-up request when payment is received
   * Called from webhook handler when payment matches reference
   * 
   * @param referenceOrId - Either the unique reference or request ID
   * @param transactionId - The VirtualIbanTransaction ID that completed this request
   */
  async completeRequest(
    referenceOrId: string,
    transactionId: string
  ): Promise<CompleteTopUpResult> {
    // 1. Find the request
    let topUpRequest = await prisma.topUpRequest.findUnique({
      where: { id: referenceOrId },
    });

    if (!topUpRequest) {
      topUpRequest = await prisma.topUpRequest.findUnique({
        where: { reference: referenceOrId },
      });
    }

    if (!topUpRequest) {
      throw new Error(`TopUpRequest not found: ${referenceOrId}`);
    }

    if (topUpRequest.status !== 'PENDING') {
      throw new Error(`TopUpRequest is not pending: ${topUpRequest.status}`);
    }

    // 2. Update request as completed
    const updatedRequest = await prisma.topUpRequest.update({
      where: { id: topUpRequest.id },
      data: {
        status: 'COMPLETED',
        transactionId,
        completedAt: new Date(),
      },
    });

    // 3. Get transaction to return new balance
    const transaction = await prisma.virtualIbanTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    // 4. Get updated Virtual IBAN balance
    const virtualIban = await prisma.virtualIbanAccount.findUnique({
      where: { id: topUpRequest.virtualIbanId },
    });

    console.log('[TopUpRequest] Completed:', {
      id: updatedRequest.id,
      reference: updatedRequest.reference,
      amount: updatedRequest.amount,
      transactionId,
      newBalance: virtualIban?.balance,
    });

    return {
      topUpRequest: updatedRequest,
      transaction,
      newBalance: virtualIban?.balance || 0,
    };
  }

  // ==========================================
  // CANCEL TOP-UP REQUEST
  // ==========================================

  /**
   * Cancel a pending top-up request (user initiated)
   */
  async cancelRequest(
    requestId: string,
    userId: string
  ): Promise<TopUpRequest> {
    const request = await prisma.topUpRequest.findFirst({
      where: {
        id: requestId,
        userId,
        status: 'PENDING',
      },
    });

    if (!request) {
      throw new Error('TopUpRequest not found or already processed');
    }

    const cancelled = await prisma.topUpRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    console.log('[TopUpRequest] Cancelled:', {
      id: cancelled.id,
      reference: cancelled.reference,
    });

    return cancelled;
  }

  // ==========================================
  // EXPIRE OLD REQUESTS (cron job)
  // ==========================================

  /**
   * Expire all requests that have passed their expiresAt date
   * Should be called periodically (e.g., every hour via cron)
   */
  async expireOldRequests(): Promise<number> {
    const result = await prisma.topUpRequest.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (result.count > 0) {
      console.log('[TopUpRequest] Expired requests:', result.count);
    }

    return result.count;
  }

  // ==========================================
  // MATCH INCOMING PAYMENT TO REQUEST
  // ==========================================

  /**
   * Try to match an incoming payment to a pending top-up request
   * 
   * Matching strategies (in order):
   * 1. Exact reference match (TU-XXXX-XXXXXX in payment reference)
   * 2. Amount match (if only one pending request with same amount)
   * 
   * @returns TopUpRequest if matched, null otherwise
   */
  async matchPaymentToRequest(
    virtualIbanId: string,
    paymentReference: string | null | undefined,
    amount: number
  ): Promise<TopUpRequest | null> {
    // Strategy 1: Exact reference match
    if (paymentReference) {
      // Extract TU-XXXX-XXXXXX pattern from reference
      const tuPattern = /TU-[A-Z0-9]{4}-[A-Z0-9]{6}/i;
      const match = paymentReference.match(tuPattern);

      if (match) {
        const reference = match[0].toUpperCase();
        const request = await this.getByReference(reference);
        
        if (request && request.virtualIbanId === virtualIbanId) {
          console.log('[TopUpRequest] Matched by reference:', reference);
          return request;
        }
      }
    }

    // Strategy 2: Amount match (if only one pending request)
    const pendingRequests = await this.getPendingRequestsForIban(virtualIbanId);
    
    // Filter by amount (allow 0.01 tolerance for rounding)
    const amountMatches = pendingRequests.filter(
      req => Math.abs(req.amount - amount) < 0.01
    );

    if (amountMatches.length === 1) {
      console.log('[TopUpRequest] Matched by amount:', {
        amount,
        reference: amountMatches[0].reference,
      });
      return amountMatches[0];
    }

    // No match found
    return null;
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  /**
   * Get statistics for top-up requests
   */
  async getStats(
    userId?: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    total: number;
    pending: number;
    completed: number;
    expired: number;
    cancelled: number;
    totalAmount: number;
    completedAmount: number;
  }> {
    const where: Record<string, unknown> = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (dateRange) {
      where.createdAt = {
        gte: dateRange.from,
        lte: dateRange.to,
      };
    }

    const [total, pending, completed, expired, cancelled, completedSum] = await Promise.all([
      prisma.topUpRequest.count({ where }),
      prisma.topUpRequest.count({ where: { ...where, status: 'PENDING' } }),
      prisma.topUpRequest.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.topUpRequest.count({ where: { ...where, status: 'EXPIRED' } }),
      prisma.topUpRequest.count({ where: { ...where, status: 'CANCELLED' } }),
      prisma.topUpRequest.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    // Calculate total requested amount
    const totalSum = await prisma.topUpRequest.aggregate({
      where,
      _sum: { amount: true },
    });

    return {
      total,
      pending,
      completed,
      expired,
      cancelled,
      totalAmount: totalSum._sum.amount || 0,
      completedAmount: completedSum._sum.amount || 0,
    };
  }
}

// ==========================================
// EXPORT SINGLETON
// ==========================================

export const topUpRequestService = new TopUpRequestService();

