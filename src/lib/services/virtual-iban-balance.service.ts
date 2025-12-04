/**
 * Virtual IBAN Balance Management Service
 * 
 * Handles atomic balance operations:
 * - Check balance
 * - Deduct balance
 * - Add balance (top-ups)
 * - Create transaction records
 * - Link to Orders + PayIn
 */

import { prisma } from '@/lib/prisma';
import type { VirtualIbanAccount, VirtualIbanTransaction } from '@prisma/client';
import { virtualIbanAuditService } from './virtual-iban-audit.service';

export class VirtualIbanBalanceService {
  /**
   * Deduct balance from Virtual IBAN account (atomic transaction)
   * Used when client pays from balance for crypto purchase
   * 
   * @param accountId Virtual IBAN account ID
   * @param amount Amount to deduct
   * @param orderId Order ID (for linking)
   * @param description Transaction description
   * @returns Updated account and created transaction
   */
  async deductBalance(
    accountId: string,
    amount: number,
    orderId: string,
    description: string = 'ORDER_PAYMENT'
  ): Promise<{ account: VirtualIbanAccount; transaction: VirtualIbanTransaction }> {
    return await prisma.$transaction(async (tx) => {
      // 1. Lock account and check balance (SELECT FOR UPDATE)
      const account = await tx.virtualIbanAccount.findUnique({
        where: { id: accountId }
      });

      if (!account) {
        throw new Error('Virtual IBAN account not found');
      }

      if (account.status !== 'ACTIVE') {
        throw new Error(`Virtual IBAN account is ${account.status}`);
      }

      const currentBalance = account.balance; // balance is Float, not Decimal
      const tolerance = 0.01; // 1 cent tolerance for floating point precision errors
      
      if (currentBalance < (amount - tolerance)) {
        throw new Error(
          `Insufficient balance. Available: €${currentBalance.toFixed(2)}, Required: €${amount.toFixed(2)}`
        );
      }

      // 2. Deduct balance
      const updatedAccount = await tx.virtualIbanAccount.update({
        where: { id: accountId },
        data: {
          balance: { decrement: amount },
          lastBalanceUpdate: new Date(),
        }
      });

      // 3. Create transaction record (DEBIT)
      const transaction = await tx.virtualIbanTransaction.create({
        data: {
          virtualIbanId: accountId,
          providerTransactionId: `internal-debit-${orderId}`, // Generate internal transaction ID
          type: 'DEBIT',
          status: 'COMPLETED',
          amount: amount, // amount is Float
          currency: account.currency,
          reference: description,
          orderId: orderId,
          processedAt: new Date(),
          metadata: {
            type: 'order_payment',
            orderId: orderId,
            description: description,
          },
        }
      });

      console.log(`[VirtualIBAN] Balance deducted: €${amount} from account ${accountId} for order ${orderId}`);

      return { account: updatedAccount, transaction };
    });
    
    // Log audit (after transaction committed)
    await virtualIbanAuditService.logBalanceChange(
      result.account.id,
      result.account.balance + amount, // old balance
      result.account.balance, // new balance
      `ORDER_PAYMENT: ${orderId}`,
      result.account.userId
    ).catch(err => console.error('[Audit] Failed to log balance deduction:', err));
    
    return result;
  }

  /**
   * Add balance to Virtual IBAN account (for top-ups via bank transfer)
   * Called from webhook when payment is received
   * 
   * @param accountId Virtual IBAN account ID
   * @param amount Amount to add
   * @param providerTransactionId Provider transaction ID
   * @param reference Payment reference
   * @param senderInfo Sender information
   * @returns Updated account and created transaction
   */
  async addBalance(
    accountId: string,
    amount: number,
    providerTransactionId: string,
    reference: string,
    senderInfo?: {
      senderName?: string;
      senderIban?: string;
    }
  ): Promise<{ account: VirtualIbanAccount; transaction: VirtualIbanTransaction }> {
    return await prisma.$transaction(async (tx) => {
      // Check if transaction already processed (idempotency)
      const existingTransaction = await tx.virtualIbanTransaction.findUnique({
        where: { providerTransactionId }
      });

      if (existingTransaction) {
        console.log(`[VirtualIBAN] Transaction ${providerTransactionId} already processed, skipping`);
        const account = await tx.virtualIbanAccount.findUnique({
          where: { id: accountId }
        });
        return { account: account!, transaction: existingTransaction };
      }

      // Get account to know currency
      const account = await tx.virtualIbanAccount.findUnique({
        where: { id: accountId }
      });

      if (!account) {
        throw new Error('Virtual IBAN account not found');
      }

      // 1. Add balance
      const updatedAccount = await tx.virtualIbanAccount.update({
        where: { id: accountId },
        data: {
          balance: { increment: amount },
          lastBalanceUpdate: new Date(),
        }
      });

      // 2. Create transaction record (CREDIT)
      const transaction = await tx.virtualIbanTransaction.create({
        data: {
          virtualIbanId: accountId,
          providerTransactionId: providerTransactionId,
          type: 'CREDIT',
          status: 'COMPLETED',
          amount: amount,
          currency: account.currency,
          reference: reference,
          senderName: senderInfo?.senderName,
          senderIban: senderInfo?.senderIban,
          processedAt: new Date(),
        }
      });

      console.log(`[VirtualIBAN] Balance added: €${amount} to account ${accountId} from ${senderInfo?.senderName || 'Unknown'}`);

      return { account: updatedAccount, transaction };
    });
    
    // Log audit (after transaction committed)
    await virtualIbanAuditService.logBalanceChange(
      result.account.id,
      result.account.balance - amount, // old balance
      result.account.balance, // new balance
      `TOP_UP: ${providerTransactionId}`,
      result.account.userId
    ).catch(err => console.error('[Audit] Failed to log balance addition:', err));
    
    return result;
  }

  /**
   * Check if balance is sufficient for order
   * 
   * @param accountId Virtual IBAN account ID
   * @param requiredAmount Required amount
   * @returns true if balance is sufficient
   */
  async checkSufficientBalance(accountId: string, requiredAmount: number): Promise<boolean> {
    const account = await prisma.virtualIbanAccount.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      throw new Error('Virtual IBAN account not found');
    }

    if (account.status !== 'ACTIVE') {
      throw new Error(`Virtual IBAN account is ${account.status}`);
    }

    return account.balance.toNumber() >= requiredAmount;
  }

  /**
   * Get balance for account
   * 
   * @param accountId Virtual IBAN account ID
   * @returns Current balance
   */
  async getBalance(accountId: string): Promise<number> {
    const account = await prisma.virtualIbanAccount.findUnique({
      where: { id: accountId },
      select: { balance: true }
    });

    if (!account) {
      throw new Error('Virtual IBAN account not found');
    }

    return account.balance; // balance is Float
  }

  /**
   * Get transaction history for account
   * 
   * @param accountId Virtual IBAN account ID
   * @param limit Number of transactions to return
   * @returns Transaction history
   */
  async getTransactionHistory(
    accountId: string,
    limit: number = 50
  ): Promise<VirtualIbanTransaction[]> {
    return prisma.virtualIbanTransaction.findMany({
      where: { virtualIbanId: accountId },
      orderBy: { processedAt: 'desc' },
      take: limit,
      include: {
        order: {
          select: {
            id: true,
            status: true,
            paymentReference: true,
          },
        },
        topUpRequest: {
          select: {
            id: true,
            reference: true,
            invoiceNumber: true,
            amount: true,
            status: true,
          },
        },
      },
    });
  }
}

export const virtualIbanBalanceService = new VirtualIbanBalanceService();

