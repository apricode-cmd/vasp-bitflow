/**
 * Payment Method Service
 * 
 * Business logic for payment methods management
 */

import prisma from '@/lib/prisma';

export interface FeeCalculation {
  baseAmount: number;
  feeFixed: number;
  feePercent: number;
  feeAmount: number;
  totalAmount: number;
}

class PaymentMethodService {
  /**
   * Get active payment methods for a currency
   */
  async getActiveMethods(currency: string): Promise<any[]> {
    return prisma.paymentMethod.findMany({
      where: {
        currency,
        isActive: true
      },
      orderBy: { priority: 'asc' }
    });
  }

  /**
   * Get all payment methods (admin)
   */
  async getAllMethods(): Promise<any[]> {
    return prisma.paymentMethod.findMany({
      include: {
        fiatCurrency: true,
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: { priority: 'asc' }
    });
  }

  /**
   * Get payment method by ID
   */
  async getMethodById(id: string): Promise<any | null> {
    return prisma.paymentMethod.findUnique({
      where: { id },
      include: {
        fiatCurrency: true
      }
    });
  }

  /**
   * Create new payment method
   */
  async createMethod(data: any): Promise<any> {
    return prisma.paymentMethod.create({
      data,
      include: {
        fiatCurrency: true
      }
    });
  }

  /**
   * Update payment method
   */
  async updateMethod(id: string, data: any): Promise<any> {
    return prisma.paymentMethod.update({
      where: { id },
      data,
      include: {
        fiatCurrency: true
      }
    });
  }

  /**
   * Delete (deactivate) payment method
   */
  async deleteMethod(id: string): Promise<any> {
    return prisma.paymentMethod.update({
      where: { id },
      data: { isActive: false }
    });
  }

  /**
   * Calculate fees for a payment method
   */
  async calculateFees(
    amount: number,
    methodId: string
  ): Promise<FeeCalculation> {
    const method = await this.getMethodById(methodId);

    if (!method) {
      throw new Error('Payment method not found');
    }

    const feeFixed = method.feeFixed || 0;
    const feePercent = method.feePercent || 0;
    const feeAmount = feeFixed + (amount * feePercent / 100);
    const totalAmount = amount + feeAmount;

    return {
      baseAmount: amount,
      feeFixed,
      feePercent,
      feeAmount,
      totalAmount
    };
  }

  /**
   * Validate amount against payment method limits
   */
  async validateAmount(
    amount: number,
    methodId: string
  ): Promise<{ valid: boolean; error?: string }> {
    const method = await this.getMethodById(methodId);

    if (!method) {
      return { valid: false, error: 'Payment method not found' };
    }

    if (!method.isActive) {
      return { valid: false, error: 'Payment method is not available' };
    }

    if (method.minAmount && amount < method.minAmount) {
      return {
        valid: false,
        error: `Minimum amount is ${method.minAmount} ${method.currency}`
      };
    }

    if (method.maxAmount && amount > method.maxAmount) {
      return {
        valid: false,
        error: `Maximum amount is ${method.maxAmount} ${method.currency}`
      };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const paymentMethodService = new PaymentMethodService();

