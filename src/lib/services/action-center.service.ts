/**
 * Action Center Service
 * 
 * Identifies actionable items that require admin attention
 * with Redis caching for performance
 */

import { prisma } from '@/lib/prisma';
import { CacheService } from './cache.service';

export interface ActionItem {
  id: string;
  type: 'urgent' | 'warning' | 'info';
  title: string;
  description: string;
  count?: number;
  action: {
    label: string;
    href: string;
  };
  priority: number; // 1 = highest
  icon?: string;
}

class ActionCenterService {
  private CACHE_KEY = 'admin:action-center';
  private CACHE_TTL = 60; // 1 minute cache

  /**
   * Get all action items (cached)
   */
  async getActionItems(): Promise<ActionItem[]> {
    try {
      // Try cache first
      const cached = await CacheService.get<ActionItem[]>(this.CACHE_KEY);
      if (cached) {
        console.log('📦 [ActionCenter] Cache HIT');
        return cached;
      }

      console.log('❌ [ActionCenter] Cache MISS - calculating...');

      // Calculate action items
      const items = await this.calculateActionItems();

      // Cache result
      await CacheService.set(this.CACHE_KEY, items, this.CACHE_TTL);

      return items;
    } catch (error) {
      console.error('❌ [ActionCenter] Error:', error);
      return [];
    }
  }

  /**
   * Calculate action items from database
   * Optimized with single aggregation query
   */
  private async calculateActionItems(): Promise<ActionItem[]> {
    const items: ActionItem[] = [];
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Single aggregation query for all order stats
    const [orderStats, kycStats, payInStats] = await Promise.all([
      // Orders aggregation
      prisma.order.groupBy({
        by: ['status'],
        where: {
          OR: [
            { status: 'PAYMENT_PENDING', createdAt: { lt: yesterday } },
            { status: 'PROCESSING', createdAt: { lt: twoDaysAgo } },
          ]
        },
        _count: true,
      }),

      // KYC stats
      prisma.kycSession.aggregate({
        where: { status: 'PENDING' },
        _count: true,
      }),

      // PayIn stats (unverified received payments)
      prisma.payIn.aggregate({
        where: { 
          status: 'RECEIVED',
          verifiedAt: null  // Use verifiedAt instead of processedAt
        },
        _count: true,
      }),
    ]);

    // Calculate stuck orders
    const stuckPaymentPending = orderStats.find(s => s.status === 'PAYMENT_PENDING')?._count || 0;
    const stuckProcessing = orderStats.find(s => s.status === 'PROCESSING')?._count || 0;
    const totalStuckOrders = stuckPaymentPending + stuckProcessing;

    if (totalStuckOrders > 0) {
      items.push({
        id: 'stuck-orders',
        type: 'urgent',
        title: `${totalStuckOrders} Orders stuck`,
        description: `${stuckPaymentPending} waiting payment, ${stuckProcessing} in processing`,
        count: totalStuckOrders,
        action: {
          label: 'View Orders',
          href: '/admin/orders?filter=stuck'
        },
        priority: 1,
        icon: 'AlertCircle'
      });
    }

    // Pending KYC
    const pendingKyc = kycStats._count;
    if (pendingKyc > 0) {
      items.push({
        id: 'pending-kyc',
        type: pendingKyc > 10 ? 'warning' : 'info',
        title: `${pendingKyc} KYC pending review`,
        description: 'Identity verification requests waiting',
        count: pendingKyc,
        action: {
          label: 'Review KYC',
          href: '/admin/kyc'
        },
        priority: pendingKyc > 10 ? 2 : 3,
        icon: 'Shield'
      });
    }

    // Unprocessed PayIns
    const unprocessedPayIns = payInStats._count;
    if (unprocessedPayIns > 0) {
      items.push({
        id: 'unprocessed-payin',
        type: 'warning',
        title: `${unprocessedPayIns} PayIn require confirmation`,
        description: 'Received payments need processing',
        count: unprocessedPayIns,
        action: {
          label: 'View PayIns',
          href: '/admin/pay-in'
        },
        priority: 2,
        icon: 'CreditCard'
      });
    }

    // Sort by priority (lower number = higher priority)
    return items.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Clear action center cache
   */
  async clearCache(): Promise<void> {
    try {
      await CacheService.delete(this.CACHE_KEY);
      console.log('🗑️  [ActionCenter] Cache cleared');
    } catch (error) {
      console.error('❌ [ActionCenter] Clear cache error:', error);
    }
  }
}

export const actionCenterService = new ActionCenterService();

