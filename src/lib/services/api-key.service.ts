/**
 * API Key Service
 * 
 * Manages API keys for external access
 */

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  requestsByDay: Array<{
    date: string;
    count: number;
  }>;
}

class ApiKeyService {
  /**
   * Generate new API key
   */
  async generateApiKey(
    name: string,
    permissions: Record<string, string[]>,
    createdBy: string,
    userId?: string,
    expiresAt?: Date,
    rateLimit = 100
  ): Promise<{
    key: string; // Plain text key (show only once)
    apiKey: any; // Saved record
  }> {
    // Generate random API key
    const randomBytes = crypto.randomBytes(32);
    const key = `apx_live_${randomBytes.toString('hex')}`;
    const prefix = key.substring(0, 12); // apx_live_abc

    // Hash the key for storage
    const hashedKey = await bcrypt.hash(key, 10);

    // Create API key record
    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        key: hashedKey,
        name,
        prefix,
        permissions,
        isActive: true,
        expiresAt,
        rateLimit,
        createdBy
      }
    });

    return {
      key, // Return plain text key (only time it's shown)
      apiKey
    };
  }

  /**
   * Validate API key
   */
  async validateApiKey(key: string): Promise<any | null> {
    // Get prefix
    const prefix = key.substring(0, 12);

    // Find API keys with matching prefix
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        prefix,
        isActive: true
      }
    });

    // Check each one (timing-safe comparison)
    for (const apiKey of apiKeys) {
      const isValid = await bcrypt.compare(key, apiKey.key);
      
      if (isValid) {
        // Check expiration
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          return null; // Expired
        }

        // Update last used
        await prisma.apiKey.update({
          where: { id: apiKey.id },
          data: {
            lastUsedAt: new Date(),
            usageCount: { increment: 1 }
          }
        });

        return apiKey;
      }
    }

    return null;
  }

  /**
   * Check if API key has permission for resource/action
   */
  checkPermission(
    apiKey: any,
    resource: string,
    action: string
  ): boolean {
    const permissions = apiKey.permissions as Record<string, string[]>;

    if (!permissions[resource]) {
      return false;
    }

    return permissions[resource].includes(action) || permissions[resource].includes('*');
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(id: string): Promise<void> {
    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false }
    });
  }

  /**
   * Get API keys list
   */
  async getApiKeys(userId?: string): Promise<any[]> {
    const where: Record<string, unknown> = { isActive: true };
    
    if (userId) {
      where.userId = userId;
    }

    return await prisma.apiKey.findMany({
      where,
      select: {
        id: true,
        name: true,
        prefix: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        lastUsedIp: true,
        usageCount: true,
        rateLimit: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Log API key usage
   */
  async logUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    ipAddress: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    await prisma.apiKeyUsage.create({
      data: {
        apiKeyId,
        endpoint,
        method,
        statusCode,
        responseTime,
        ipAddress,
        userAgent,
        errorMessage
      }
    });

    // Update last used IP
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { lastUsedIp: ipAddress }
    });
  }

  /**
   * Get usage statistics for API key
   */
  async getUsageStats(apiKeyId: string): Promise<UsageStats> {
    const [usage, totalRequests] = await Promise.all([
      prisma.apiKeyUsage.findMany({
        where: { apiKeyId },
        orderBy: { createdAt: 'desc' },
        take: 1000
      }),
      prisma.apiKeyUsage.count({
        where: { apiKeyId }
      })
    ]);

    const successfulRequests = usage.filter(u => u.statusCode >= 200 && u.statusCode < 300).length;
    const failedRequests = usage.filter(u => u.statusCode >= 400).length;
    
    const avgResponseTime = usage.length > 0
      ? usage.reduce((sum, u) => sum + u.responseTime, 0) / usage.length
      : 0;

    // Group by endpoint
    const requestsByEndpoint: Record<string, number> = {};
    usage.forEach(u => {
      requestsByEndpoint[u.endpoint] = (requestsByEndpoint[u.endpoint] || 0) + 1;
    });

    // Group by day (last 30 days)
    const requestsByDay: Array<{ date: string; count: number }> = [];
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentUsage = usage.filter(u => new Date(u.createdAt) >= last30Days);
    const dayGroups: Record<string, number> = {};

    recentUsage.forEach(u => {
      const date = new Date(u.createdAt).toISOString().split('T')[0];
      dayGroups[date] = (dayGroups[date] || 0) + 1;
    });

    Object.entries(dayGroups).forEach(([date, count]) => {
      requestsByDay.push({ date, count });
    });

    requestsByDay.sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      avgResponseTime,
      requestsByEndpoint,
      requestsByDay
    };
  }

  /**
   * Check rate limit for API key
   */
  async checkRateLimit(apiKeyId: string, limit: number): Promise<boolean> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recentRequests = await prisma.apiKeyUsage.count({
      where: {
        apiKeyId,
        createdAt: { gte: oneHourAgo }
      }
    });

    return recentRequests < limit;
  }
}

// Export singleton instance
export const apiKeyService = new ApiKeyService();

