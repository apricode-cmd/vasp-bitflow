/**
 * Rate Management Service
 * 
 * Manages exchange rates with manual override support
 */

import prisma from '@/lib/prisma';
import { coinGeckoService } from './coingecko';

class RateManagementService {
  /**
   * Get current exchange rate (checks manual overrides first, then CoinGecko)
   */
  async getCurrentRate(cryptoCode: string, fiatCode: string): Promise<number> {
    // First, check for active manual rate
    const manualRate = await this.getActiveManualRate(cryptoCode, fiatCode);
    
    if (manualRate) {
      return manualRate.rate;
    }

    // Fall back to CoinGecko
    return await coinGeckoService.getRate(cryptoCode, fiatCode);
  }

  /**
   * Get active manual rate override if exists
   */
  async getActiveManualRate(
    cryptoCode: string,
    fiatCode: string
  ): Promise<{ rate: number; id: string; validUntil: Date | null } | null> {
    const now = new Date();

    const manualRate = await prisma.manualRate.findFirst({
      where: {
        cryptoCode,
        fiatCode,
        isActive: true,
        validFrom: { lte: now },
        OR: [
          { validTo: null },
          { validTo: { gte: now } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!manualRate) {
      return null;
    }

    return {
      rate: manualRate.rate,
      id: manualRate.id,
      validUntil: manualRate.validTo
    };
  }

  /**
   * Set manual rate override
   */
  async setManualRate(
    cryptoCode: string,
    fiatCode: string,
    rate: number,
    createdBy: string,
    validTo?: Date,
    reason?: string
  ): Promise<any> {
    // Deactivate any existing manual rates for this pair
    await prisma.manualRate.updateMany({
      where: {
        cryptoCode,
        fiatCode,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    // Create new manual rate
    return await prisma.manualRate.create({
      data: {
        cryptoCode,
        fiatCode,
        rate,
        validTo,
        createdBy,
        reason,
        isActive: true
      }
    });
  }

  /**
   * Remove manual rate override
   */
  async removeManualRate(id: string): Promise<void> {
    await prisma.manualRate.update({
      where: { id },
      data: { isActive: false }
    });
  }

  /**
   * Get all active manual rates
   */
  async getActiveManualRates(): Promise<any[]> {
    const now = new Date();

    return await prisma.manualRate.findMany({
      where: {
        isActive: true,
        OR: [
          { validTo: null },
          { validTo: { gte: now } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get manual rate history for a pair
   */
  async getRateHistory(
    cryptoCode: string,
    fiatCode: string,
    limit = 50
  ): Promise<any[]> {
    return await prisma.manualRate.findMany({
      where: {
        cryptoCode,
        fiatCode
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Compare manual rate with market rate
   */
  async compareRates(cryptoCode: string, fiatCode: string): Promise<{
    manualRate: number | null;
    marketRate: number;
    difference: number | null;
    differencePercent: number | null;
  }> {
    const [manualRateData, marketRate] = await Promise.all([
      this.getActiveManualRate(cryptoCode, fiatCode),
      coinGeckoService.getRate(cryptoCode, fiatCode)
    ]);

    if (!manualRateData) {
      return {
        manualRate: null,
        marketRate,
        difference: null,
        differencePercent: null
      };
    }

    const difference = manualRateData.rate - marketRate;
    const differencePercent = ((difference / marketRate) * 100);

    return {
      manualRate: manualRateData.rate,
      marketRate,
      difference,
      differencePercent
    };
  }

  /**
   * Save rate to history (for tracking)
   */
  async saveRateHistory(
    cryptoCode: string,
    fiatCode: string,
    rate: number,
    source = 'coingecko'
  ): Promise<void> {
    await prisma.rateHistory.create({
      data: {
        cryptoCode,
        fiatCode,
        rate,
        source
      }
    });
  }

  /**
   * Get rate statistics for a period
   */
  async getRateStatistics(
    cryptoCode: string,
    fiatCode: string,
    fromDate: Date,
    toDate: Date
  ): Promise<{
    min: number;
    max: number;
    avg: number;
    count: number;
  }> {
    const rates = await prisma.rateHistory.findMany({
      where: {
        cryptoCode,
        fiatCode,
        createdAt: {
          gte: fromDate,
          lte: toDate
        }
      },
      select: {
        rate: true
      }
    });

    if (rates.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        count: 0
      };
    }

    const rateValues = rates.map(r => r.rate);

    return {
      min: Math.min(...rateValues),
      max: Math.max(...rateValues),
      avg: rateValues.reduce((a, b) => a + b, 0) / rateValues.length,
      count: rates.length
    };
  }
}

// Export singleton instance
export const rateManagementService = new RateManagementService();

