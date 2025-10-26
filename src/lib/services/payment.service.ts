/**
 * Payment Service
 * Handles automatic creation and management of PayIn/PayOut transactions
 */

import { prisma } from '@/lib/prisma';

interface CreatePayInParams {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethodCode: string;
  expectedAmount: number;
}

interface CreatePayOutParams {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  networkCode: string;
  destinationAddress: string;
  userWalletId?: string;
}

export class PaymentService {
  /**
   * Auto-create PayIn when order is created
   */
  static async createPayInForOrder(params: CreatePayInParams) {
    try {
      const payIn = await prisma.payIn.create({
        data: {
          orderId: params.orderId,
          userId: params.userId,
          amount: params.amount,
          currency: params.currency,
          paymentMethodCode: params.paymentMethodCode,
          expectedAmount: params.expectedAmount,
          status: 'PENDING',
          amountMismatch: false
        }
      });

      console.log(`✅ PayIn created for order ${params.orderId}: ${payIn.id}`);
      return payIn;
    } catch (error) {
      console.error('Failed to create PayIn:', error);
      throw error;
    }
  }

  /**
   * Auto-create PayOut when PayIn is verified
   */
  static async createPayOutForOrder(params: CreatePayOutParams) {
    try {
      // Get platform wallet for this currency and network
      const platformWallet = await prisma.platformWallet.findFirst({
        where: {
          currencyCode: params.currency,
          blockchainCode: params.networkCode,
          isActive: true
        }
      });

      if (!platformWallet) {
        throw new Error(`No active platform wallet found for ${params.currency} on ${params.networkCode}`);
      }

      // Get network fee (simplified - в реале нужно получать актуальные комиссии)
      const networkFee = this.estimateNetworkFee(params.currency, params.networkCode);

      const payOut = await prisma.payOut.create({
        data: {
          orderId: params.orderId,
          userId: params.userId,
          amount: params.amount,
          currency: params.currency,
          networkCode: params.networkCode,
          destinationAddress: params.destinationAddress,
          userWalletId: params.userWalletId,
          networkFee,
          networkFeeCurrency: this.getNativeToken(params.networkCode),
          status: 'PENDING',
          confirmations: 0,
          retryCount: 0,
          fromWalletId: platformWallet.id
        }
      });

      console.log(`✅ PayOut created for order ${params.orderId}: ${payOut.id}`);
      return payOut;
    } catch (error) {
      console.error('Failed to create PayOut:', error);
      throw error;
    }
  }

  /**
   * Update order status based on payment states
   */
  static async updateOrderStatusFromPayments(orderId: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          payIn: true,
          payOut: true
        }
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      let newStatus = order.status;

      // Logic for status transitions
      if (order.payIn?.status === 'VERIFIED' && order.status === 'PAYMENT_PENDING') {
        newStatus = 'PROCESSING';
      }

      if (order.payOut?.status === 'CONFIRMED' && order.status === 'PROCESSING') {
        newStatus = 'COMPLETED';
      }

      if (order.payIn?.status === 'FAILED' || order.payIn?.status === 'EXPIRED') {
        newStatus = 'CANCELLED';
      }

      if (order.payOut?.status === 'FAILED') {
        newStatus = 'FAILED';
      }

      // Update if status changed
      if (newStatus !== order.status) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: newStatus }
        });

        console.log(`✅ Order ${orderId} status updated: ${order.status} → ${newStatus}`);
      }

      return newStatus;
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
    }
  }

  /**
   * Get PayIn/PayOut summary for order
   */
  static async getPaymentSummary(orderId: string) {
    const [payIn, payOut] = await Promise.all([
      prisma.payIn.findUnique({
        where: { orderId },
        include: {
          fiatCurrency: true,
          paymentMethod: true,
          verifier: {
            select: { id: true, email: true }
          }
        }
      }),
      prisma.payOut.findUnique({
        where: { orderId },
        include: {
          cryptocurrency: true,
          network: true,
          processor: {
            select: { id: true, email: true }
          }
        }
      })
    ]);

    return { payIn, payOut };
  }

  /**
   * Estimate network fee (simplified)
   */
  private static estimateNetworkFee(currency: string, network: string): number {
    // В реальности нужно получать актуальные комиссии из блокчейна
    const feeTable: Record<string, Record<string, number>> = {
      'BTC': { 'BITCOIN': 0.0001 },
      'ETH': { 'ETHEREUM': 0.002 },
      'USDT': { 'ETHEREUM': 5, 'BSC': 0.5, 'POLYGON': 0.1, 'TRON': 1 },
      'USDC': { 'ETHEREUM': 5, 'BSC': 0.5, 'POLYGON': 0.1 },
      'BNB': { 'BSC': 0.0005 },
      'MATIC': { 'POLYGON': 0.01 },
      'TRX': { 'TRON': 1 }
    };

    return feeTable[currency]?.[network] || 0.001;
  }

  /**
   * Get native token for network
   */
  private static getNativeToken(network: string): string {
    const nativeTokens: Record<string, string> = {
      'BITCOIN': 'BTC',
      'ETHEREUM': 'ETH',
      'BSC': 'BNB',
      'POLYGON': 'MATIC',
      'TRON': 'TRX',
      'ARBITRUM': 'ETH',
      'OPTIMISM': 'ETH',
      'AVALANCHE': 'AVAX'
    };

    return nativeTokens[network] || 'ETH';
  }
}

