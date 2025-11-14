/**
 * Cache Service using Redis
 * 
 * Provides caching functionality for exchange rates, admin stats, and other data.
 * Supports both local Redis (development) and Upstash Redis (production).
 */

import Redis from 'ioredis';

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect on READONLY errors
      return true;
    }
    return false;
  },
  maxRetriesPerRequest: 3,
});

// Handle connection events
redis.on('connect', () => {
  console.log('📦 [Redis] Connected successfully');
});

redis.on('error', (error) => {
  console.error('❌ [Redis] Connection error:', error.message);
});

redis.on('close', () => {
  console.log('🔒 [Redis] Connection closed');
});

/**
 * Cache Service
 * 
 * Provides methods for caching exchange rates, admin stats, and other data.
 */
export class CacheService {
  /**
   * Cache key prefixes for namespacing
   */
  private static PREFIX = {
    RATES: 'rates:',
    STATS: 'admin:stats',
    USER: 'user:',
    ORDER: 'order:',
    KYC: 'kyc:',
    SETTINGS: 'settings:',
    INTEGRATION: 'integration:',
    TRADING_PAIRS: 'trading-pairs:',
    CURRENCIES: 'currencies:',
  };

  /**
   * Get exchange rate from cache
   */
  static async getRate(cryptoCode: string, fiatCode: string): Promise<number | null> {
    try {
      const key = `${this.PREFIX.RATES}${cryptoCode}-${fiatCode}`;
      const cached = await redis.get(key);
      
      if (cached !== null) {
        const rate = parseFloat(cached);
        console.log(`📦 [Redis] Cache HIT: ${key} = ${rate}`);
        return rate;
      }
      
      console.log(`❌ [Redis] Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error('❌ [Redis] Get rate error:', error);
      return null; // Fallback gracefully
    }
  }

  /**
   * Cache exchange rate
   * @param ttl Time to live in seconds (default: 30s)
   */
  static async setRate(
    cryptoCode: string, 
    fiatCode: string, 
    rate: number,
    ttl: number = 30
  ): Promise<void> {
    try {
      const key = `${this.PREFIX.RATES}${cryptoCode}-${fiatCode}`;
      await redis.setex(key, ttl, rate.toString());
      console.log(`✅ [Redis] Cached: ${key} = ${rate} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ [Redis] Set rate error:', error);
      // Don't throw - caching is optional
    }
  }

  /**
   * Cache all rates at once (bulk operation)
   */
  static async setAllRates(
    rates: Record<string, Record<string, number>>,
    ttl: number = 30
  ): Promise<void> {
    try {
      const pipeline = redis.pipeline();
      let count = 0;
      
      for (const [crypto, fiatRates] of Object.entries(rates)) {
        for (const [fiat, rate] of Object.entries(fiatRates)) {
          const key = `${this.PREFIX.RATES}${crypto}-${fiat}`;
          pipeline.setex(key, ttl, rate.toString());
          count++;
        }
      }
      
      await pipeline.exec();
      console.log(`✅ [Redis] Bulk cached ${count} rates (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ [Redis] Bulk set rates error:', error);
    }
  }

  /**
   * Clear all rate caches (for manual refresh)
   */
  static async clearRatesCache(): Promise<number> {
    try {
      const pattern = `${this.PREFIX.RATES}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        console.log('ℹ️  [Redis] No rate keys to clear');
        return 0;
      }
      
      await redis.del(...keys);
      console.log(`🗑️  [Redis] Cleared ${keys.length} rate keys`);
      return keys.length;
    } catch (error) {
      console.error('❌ [Redis] Clear rates error:', error);
      return 0;
    }
  }

  /**
   * Cache admin dashboard stats
   */
  static async getAdminStats(timeRange: string = 'week'): Promise<any | null> {
    try {
      const cacheKey = `${this.PREFIX.STATS}:${timeRange}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`📦 [Redis] Cache HIT: admin stats (${timeRange})`);
        return JSON.parse(cached);
      } else {
        console.log(`❌ [Redis] Cache MISS: admin stats (${timeRange})`);
      }
      return null;
    } catch (error) {
      console.error('❌ [Redis] Get stats error:', error);
      return null;
    }
  }

  static async setAdminStats(timeRange: string, stats: any, ttl: number = 120): Promise<void> {
    try {
      const cacheKey = `${this.PREFIX.STATS}:${timeRange}`;
      await redis.setex(cacheKey, ttl, JSON.stringify(stats));
      console.log(`✅ [Redis] Cached admin stats (${timeRange}, TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ [Redis] Set stats error:', error);
    }
  }

  /**
   * Clear admin stats cache
   */
  static async clearAdminStats(): Promise<number> {
    try {
      const pattern = `${this.PREFIX.STATS}:*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        console.log('ℹ️  [Redis] No admin stats keys to clear');
        return 0;
      }
      
      await redis.del(...keys);
      console.log(`🗑️  [Redis] Cleared ${keys.length} admin stats keys`);
      return keys.length;
    } catch (error) {
      console.error('❌ [Redis] Clear admin stats error:', error);
      return 0;
    }
  }

  // ============================================================
  // GENERIC CACHE METHODS
  // ============================================================
  
  /**
   * Generic get method
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
      return null;
    } catch (error) {
      console.error(`❌ [Redis] Get ${key} error:`, error);
      return null;
    }
  }

  /**
   * Generic set method
   */
  static async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      console.log(`✅ [Redis] Cached ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error(`❌ [Redis] Set ${key} error:`, error);
    }
  }

  /**
   * Generic delete method
   */
  static async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
      console.log(`🗑️  [Redis] Deleted ${key}`);
    } catch (error) {
      console.error(`❌ [Redis] Delete ${key} error:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    totalKeys: number;
    rateKeys: number;
    memoryUsed: string;
    connected: boolean;
  }> {
    try {
      const allKeys = await redis.keys('*');
      const rateKeys = await redis.keys(`${this.PREFIX.RATES}*`);
      const info = await redis.info('memory');
      
      // Parse memory usage from INFO command
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsed = memoryMatch ? memoryMatch[1] : 'N/A';
      
      return {
        totalKeys: allKeys.length,
        rateKeys: rateKeys.length,
        memoryUsed,
        connected: redis.status === 'ready',
      };
    } catch (error) {
      console.error('❌ [Redis] Get stats error:', error);
      return { 
        totalKeys: 0, 
        rateKeys: 0, 
        memoryUsed: 'N/A',
        connected: false 
      };
    }
  }

  /**
   * Health check
   */
  static async ping(): Promise<boolean> {
    try {
      const pong = await redis.ping();
      return pong === 'PONG';
    } catch (error) {
      console.error('❌ [Redis] Ping error:', error);
      return false;
    }
  }

  /**
   * Clear all cache (dangerous - use only in development)
   */
  static async flushAll(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('flushAll is not allowed in production');
    }
    try {
      await redis.flushall();
      console.log('🗑️  [Redis] All cache cleared');
    } catch (error) {
      console.error('❌ [Redis] Flush all error:', error);
    }
  }

  /**
   * Close Redis connection (for graceful shutdown)
   */
  static async disconnect(): Promise<void> {
    try {
      await redis.quit();
      console.log('👋 [Redis] Disconnected');
    } catch (error) {
      console.error('❌ [Redis] Disconnect error:', error);
    }
  }

  // ============================================================
  // SYSTEM SETTINGS CACHE
  // ============================================================

  /**
   * Get system setting from cache
   */
  static async getSetting(key: string): Promise<string | null> {
    try {
      const cacheKey = `${this.PREFIX.SETTINGS}${key}`;
      const cached = await redis.get(cacheKey);
      
      if (cached !== null) {
        console.log(`📦 [Redis] Cache HIT: ${cacheKey}`);
        return cached;
      }
      
      console.log(`❌ [Redis] Cache MISS: ${cacheKey}`);
      return null;
    } catch (error) {
      console.error('❌ [Redis] Get setting error:', error);
      return null;
    }
  }

  /**
   * Cache system setting
   * @param ttl Time to live in seconds (default: 5 minutes)
   */
  static async setSetting(key: string, value: string, ttl: number = 300): Promise<void> {
    try {
      const cacheKey = `${this.PREFIX.SETTINGS}${key}`;
      await redis.setex(cacheKey, ttl, value);
      console.log(`✅ [Redis] Cached setting: ${cacheKey} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ [Redis] Set setting error:', error);
    }
  }

  /**
   * Clear specific setting from cache
   */
  static async clearSetting(key: string): Promise<void> {
    try {
      const cacheKey = `${this.PREFIX.SETTINGS}${key}`;
      await redis.del(cacheKey);
      console.log(`🗑️  [Redis] Cleared setting: ${cacheKey}`);
    } catch (error) {
      console.error('❌ [Redis] Clear setting error:', error);
    }
  }

  /**
   * Clear all settings cache
   */
  static async clearAllSettings(): Promise<number> {
    try {
      const pattern = `${this.PREFIX.SETTINGS}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        console.log('ℹ️  [Redis] No setting keys to clear');
        return 0;
      }
      
      await redis.del(...keys);
      console.log(`🗑️  [Redis] Cleared ${keys.length} setting keys`);
      return keys.length;
    } catch (error) {
      console.error('❌ [Redis] Clear all settings error:', error);
      return 0;
    }
  }

  // ============================================================
  // INTEGRATION CONFIG CACHE
  // ============================================================

  /**
   * Get active integration for a category
   */
  static async getActiveIntegration(category: string): Promise<any | null> {
    try {
      const cacheKey = `${this.PREFIX.INTEGRATION}active:${category}`;
      const cached = await redis.get(cacheKey);
      
      if (cached !== null) {
        console.log(`📦 [Redis] Cache HIT: ${cacheKey}`);
        return JSON.parse(cached);
      }
      
      console.log(`❌ [Redis] Cache MISS: ${cacheKey}`);
      return null;
    } catch (error) {
      console.error('❌ [Redis] Get active integration error:', error);
      return null;
    }
  }

  /**
   * Cache active integration for a category
   * @param ttl Time to live in seconds (default: 10 minutes)
   */
  static async setActiveIntegration(
    category: string,
    integration: any,
    ttl: number = 600
  ): Promise<void> {
    try {
      const cacheKey = `${this.PREFIX.INTEGRATION}active:${category}`;
      await redis.setex(cacheKey, ttl, JSON.stringify(integration));
      console.log(`✅ [Redis] Cached active integration: ${category} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ [Redis] Set active integration error:', error);
    }
  }

  /**
   * Clear active integration cache for a category
   */
  static async clearActiveIntegration(category: string): Promise<void> {
    try {
      const cacheKey = `${this.PREFIX.INTEGRATION}active:${category}`;
      await redis.del(cacheKey);
      console.log(`🗑️  [Redis] Cleared active integration: ${category}`);
    } catch (error) {
      console.error('❌ [Redis] Clear active integration error:', error);
    }
  }

  /**
   * Clear all integration caches
   */
  static async clearAllIntegrations(): Promise<number> {
    try {
      const pattern = `${this.PREFIX.INTEGRATION}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        console.log('ℹ️  [Redis] No integration keys to clear');
        return 0;
      }
      
      await redis.del(...keys);
      console.log(`🗑️  [Redis] Cleared ${keys.length} integration keys`);
      return keys.length;
    } catch (error) {
      console.error('❌ [Redis] Clear all integrations error:', error);
      return 0;
    }
  }

  // ============================================================
  // TRADING PAIRS CACHE
  // ============================================================

  /**
   * Get trading pairs from cache
   */
  static async getTradingPairs(filters?: {
    cryptoCode?: string;
    fiatCode?: string;
  }): Promise<any[] | null> {
    try {
      // Build cache key based on filters
      let cacheKey = this.PREFIX.TRADING_PAIRS;
      if (filters?.cryptoCode && filters?.fiatCode) {
        cacheKey += `${filters.cryptoCode}-${filters.fiatCode}`;
      } else if (filters?.cryptoCode) {
        cacheKey += `crypto:${filters.cryptoCode}`;
      } else if (filters?.fiatCode) {
        cacheKey += `fiat:${filters.fiatCode}`;
      } else {
        cacheKey += 'all';
      }
      
      const cached = await redis.get(cacheKey);
      
      if (cached !== null) {
        console.log(`📦 [Redis] Cache HIT: ${cacheKey}`);
        return JSON.parse(cached);
      }
      
      console.log(`❌ [Redis] Cache MISS: ${cacheKey}`);
      return null;
    } catch (error) {
      console.error('❌ [Redis] Get trading pairs error:', error);
      return null;
    }
  }

  /**
   * Cache trading pairs
   * @param ttl Time to live in seconds (default: 10 minutes)
   */
  static async setTradingPairs(
    pairs: any[],
    filters?: {
      cryptoCode?: string;
      fiatCode?: string;
    },
    ttl: number = 600
  ): Promise<void> {
    try {
      // Build cache key based on filters
      let cacheKey = this.PREFIX.TRADING_PAIRS;
      if (filters?.cryptoCode && filters?.fiatCode) {
        cacheKey += `${filters.cryptoCode}-${filters.fiatCode}`;
      } else if (filters?.cryptoCode) {
        cacheKey += `crypto:${filters.cryptoCode}`;
      } else if (filters?.fiatCode) {
        cacheKey += `fiat:${filters.fiatCode}`;
      } else {
        cacheKey += 'all';
      }
      
      await redis.setex(cacheKey, ttl, JSON.stringify(pairs));
      console.log(`✅ [Redis] Cached trading pairs: ${cacheKey} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ [Redis] Set trading pairs error:', error);
    }
  }

  /**
   * Clear all trading pairs cache
   */
  static async clearTradingPairs(): Promise<number> {
    try {
      const pattern = `${this.PREFIX.TRADING_PAIRS}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        console.log('ℹ️  [Redis] No trading pair keys to clear');
        return 0;
      }
      
      await redis.del(...keys);
      console.log(`🗑️  [Redis] Cleared ${keys.length} trading pair keys`);
      return keys.length;
    } catch (error) {
      console.error('❌ [Redis] Clear trading pairs error:', error);
      return 0;
    }
  }

  // ============================================================
  // USER DATA CACHE
  // ============================================================

  /**
   * Get user KYC status from cache
   */
  static async getUserKycStatus(userId: string): Promise<string | null> {
    try {
      const cacheKey = `${this.PREFIX.USER}${userId}:kyc-status`;
      const cached = await redis.get(cacheKey);
      
      if (cached !== null) {
        console.log(`📦 [Redis] Cache HIT: user KYC status (${userId})`);
        return cached;
      }
      
      console.log(`❌ [Redis] Cache MISS: user KYC status (${userId})`);
      return null;
    } catch (error) {
      console.error('❌ [Redis] Get user KYC status error:', error);
      return null;
    }
  }

  /**
   * Cache user KYC status
   * @param ttl Time to live in seconds (default: 2 minutes)
   */
  static async setUserKycStatus(
    userId: string,
    kycStatus: string,
    ttl: number = 120
  ): Promise<void> {
    try {
      const cacheKey = `${this.PREFIX.USER}${userId}:kyc-status`;
      await redis.setex(cacheKey, ttl, kycStatus);
      console.log(`✅ [Redis] Cached user KYC status: ${userId} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ [Redis] Set user KYC status error:', error);
    }
  }

  /**
   * Clear user KYC status cache
   */
  static async clearUserKycStatus(userId: string): Promise<void> {
    try {
      const cacheKey = `${this.PREFIX.USER}${userId}:kyc-status`;
      await redis.del(cacheKey);
      console.log(`🗑️  [Redis] Cleared user KYC status: ${userId}`);
    } catch (error) {
      console.error('❌ [Redis] Clear user KYC status error:', error);
    }
  }

  /**
   * Get user wallets from cache
   */
  static async getUserWallets(userId: string): Promise<any[] | null> {
    try {
      const cacheKey = `${this.PREFIX.USER}${userId}:wallets`;
      const cached = await redis.get(cacheKey);
      
      if (cached !== null) {
        console.log(`📦 [Redis] Cache HIT: user wallets (${userId})`);
        return JSON.parse(cached);
      }
      
      console.log(`❌ [Redis] Cache MISS: user wallets (${userId})`);
      return null;
    } catch (error) {
      console.error('❌ [Redis] Get user wallets error:', error);
      return null;
    }
  }

  /**
   * Cache user wallets
   * @param ttl Time to live in seconds (default: 5 minutes)
   */
  static async setUserWallets(
    userId: string,
    wallets: any[],
    ttl: number = 300
  ): Promise<void> {
    try {
      const cacheKey = `${this.PREFIX.USER}${userId}:wallets`;
      await redis.setex(cacheKey, ttl, JSON.stringify(wallets));
      console.log(`✅ [Redis] Cached user wallets: ${userId} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ [Redis] Set user wallets error:', error);
    }
  }

  /**
   * Clear user wallets cache
   */
  static async clearUserWallets(userId: string): Promise<void> {
    try {
      const cacheKey = `${this.PREFIX.USER}${userId}:wallets`;
      await redis.del(cacheKey);
      console.log(`🗑️  [Redis] Cleared user wallets: ${userId}`);
    } catch (error) {
      console.error('❌ [Redis] Clear user wallets error:', error);
    }
  }

  /**
   * Clear all user cache for a specific user
   */
  static async clearUserCache(userId: string): Promise<number> {
    try {
      const pattern = `${this.PREFIX.USER}${userId}:*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        console.log(`ℹ️  [Redis] No user cache keys to clear for ${userId}`);
        return 0;
      }
      
      await redis.del(...keys);
      console.log(`🗑️  [Redis] Cleared ${keys.length} user cache keys for ${userId}`);
      return keys.length;
    } catch (error) {
      console.error('❌ [Redis] Clear user cache error:', error);
      return 0;
    }
  }

  // ============================================================
  // CURRENCIES & FIAT CACHE
  // ============================================================

  /**
   * Get currencies from cache
   */
  static async getCurrencies(): Promise<any[] | null> {
    try {
      const cacheKey = `${this.PREFIX.CURRENCIES}all`;
      const cached = await redis.get(cacheKey);
      
      if (cached !== null) {
        console.log(`📦 [Redis] Cache HIT: currencies`);
        return JSON.parse(cached);
      }
      
      console.log(`❌ [Redis] Cache MISS: currencies`);
      return null;
    } catch (error) {
      console.error('❌ [Redis] Get currencies error:', error);
      return null;
    }
  }

  /**
   * Cache currencies
   * @param ttl Time to live in seconds (default: 1 hour)
   */
  static async setCurrencies(currencies: any[], ttl: number = 3600): Promise<void> {
    try {
      const cacheKey = `${this.PREFIX.CURRENCIES}all`;
      await redis.setex(cacheKey, ttl, JSON.stringify(currencies));
      console.log(`✅ [Redis] Cached currencies (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ [Redis] Set currencies error:', error);
    }
  }

  /**
   * Get fiat currencies from cache
   */
  static async getFiatCurrencies(): Promise<any[] | null> {
    try {
      const cacheKey = `${this.PREFIX.CURRENCIES}fiat`;
      const cached = await redis.get(cacheKey);
      
      if (cached !== null) {
        console.log(`📦 [Redis] Cache HIT: fiat currencies`);
        return JSON.parse(cached);
      }
      
      console.log(`❌ [Redis] Cache MISS: fiat currencies`);
      return null;
    } catch (error) {
      console.error('❌ [Redis] Get fiat currencies error:', error);
      return null;
    }
  }

  /**
   * Cache fiat currencies
   * @param ttl Time to live in seconds (default: 1 hour)
   */
  static async setFiatCurrencies(fiatCurrencies: any[], ttl: number = 3600): Promise<void> {
    try {
      const cacheKey = `${this.PREFIX.CURRENCIES}fiat`;
      await redis.setex(cacheKey, ttl, JSON.stringify(fiatCurrencies));
      console.log(`✅ [Redis] Cached fiat currencies (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ [Redis] Set fiat currencies error:', error);
    }
  }

  /**
   * Clear all currency caches
   */
  static async clearCurrencies(): Promise<number> {
    try {
      const pattern = `${this.PREFIX.CURRENCIES}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        console.log('ℹ️  [Redis] No currency keys to clear');
        return 0;
      }
      
      await redis.del(...keys);
      console.log(`🗑️  [Redis] Cleared ${keys.length} currency keys`);
      return keys.length;
    } catch (error) {
      console.error('❌ [Redis] Clear currencies error:', error);
      return 0;
    }
  }
}

// Export redis client for advanced usage
export { redis };

