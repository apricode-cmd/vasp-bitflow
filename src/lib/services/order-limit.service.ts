/**
 * Order Limit Service
 * 
 * Checks if user can create orders based on KYC status and 24h limits
 */

import { prisma } from '@/lib/prisma';

interface LimitCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
  message?: string;
}

export class OrderLimitService {
  /**
   * Check if user can create an order for the given amount
   * 
   * Rules:
   * - If kycRequired = true: Must have APPROVED KYC
   * - If kycRequired = false: Can trade up to unverifiedUserLimit EUR per 24h
   */
  async checkOrderLimit(
    userId: string,
    requestedAmount: number
  ): Promise<LimitCheckResult> {
    try {
      // Get system settings
      const [kycRequiredSetting, unverifiedLimitSetting] = await Promise.all([
        prisma.systemSettings.findUnique({ where: { key: 'kycRequired' } }),
        prisma.systemSettings.findUnique({ where: { key: 'unverifiedUserLimit' } })
      ]);

      const kycRequired = kycRequiredSetting?.value === 'true';
      const unverifiedLimit = parseFloat(unverifiedLimitSetting?.value || '1000');

      // Get user with KYC status
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          kycSession: {
            select: {
              status: true
            }
          }
        }
      });

      if (!user) {
        return {
          allowed: false,
          remaining: 0,
          limit: 0,
          used: 0,
          message: 'User not found'
        };
      }

      const isKycApproved = user.kycSession?.status === 'APPROVED';

      // If KYC is mandatory and user is not approved
      if (kycRequired && !isKycApproved) {
        return {
          allowed: false,
          remaining: 0,
          limit: 0,
          used: 0,
          message: 'KYC verification is required before trading'
        };
      }

      // If KYC is NOT mandatory but user is not verified
      if (!kycRequired && !isKycApproved) {
        // Calculate 24h usage
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const recentOrders = await prisma.order.findMany({
          where: {
            userId,
            createdAt: {
              gte: twentyFourHoursAgo
            },
            status: {
              notIn: ['CANCELLED', 'REJECTED']
            }
          },
          select: {
            totalFiat: true
          }
        });

        const used24h = recentOrders.reduce((sum, order) => sum + order.totalFiat, 0);
        const remaining = unverifiedLimit - used24h;

        if (requestedAmount > remaining) {
          return {
            allowed: false,
            remaining: Math.max(0, remaining),
            limit: unverifiedLimit,
            used: used24h,
            message: `You have reached your 24-hour trading limit. Remaining: €${remaining.toFixed(2)}. Complete KYC verification to increase your limit.`
          };
        }

        return {
          allowed: true,
          remaining: remaining - requestedAmount,
          limit: unverifiedLimit,
          used: used24h,
          message: `You can trade up to €${unverifiedLimit} per 24 hours without KYC verification.`
        };
      }

      // User is KYC approved - no limits
      return {
        allowed: true,
        remaining: Infinity,
        limit: Infinity,
        used: 0
      };
    } catch (error) {
      console.error('Error checking order limit:', error);
      throw error;
    }
  }

  /**
   * Get user's 24h trading summary
   */
  async get24hSummary(userId: string): Promise<{
    used: number;
    limit: number;
    remaining: number;
    isKycApproved: boolean;
    kycRequired: boolean;
  }> {
    const [kycRequiredSetting, unverifiedLimitSetting] = await Promise.all([
      prisma.systemSettings.findUnique({ where: { key: 'kycRequired' } }),
      prisma.systemSettings.findUnique({ where: { key: 'unverifiedUserLimit' } })
    ]);

    const kycRequired = kycRequiredSetting?.value === 'true';
    const unverifiedLimit = parseFloat(unverifiedLimitSetting?.value || '1000');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        kycSession: {
          select: {
            status: true
          }
        }
      }
    });

    const isKycApproved = user?.kycSession?.status === 'APPROVED';

    if (isKycApproved || kycRequired) {
      return {
        used: 0,
        limit: Infinity,
        remaining: Infinity,
        isKycApproved,
        kycRequired
      };
    }

    // Calculate 24h usage for unverified users
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const recentOrders = await prisma.order.findMany({
      where: {
        userId,
        createdAt: {
          gte: twentyFourHoursAgo
        },
        status: {
          notIn: ['CANCELLED', 'REJECTED']
        }
      },
      select: {
        totalFiat: true
      }
    });

    const used = recentOrders.reduce((sum, order) => sum + order.totalFiat, 0);
    const remaining = unverifiedLimit - used;

    return {
      used,
      limit: unverifiedLimit,
      remaining: Math.max(0, remaining),
      isKycApproved,
      kycRequired
    };
  }
}

export const orderLimitService = new OrderLimitService();

