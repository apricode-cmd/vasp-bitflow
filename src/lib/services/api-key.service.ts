/**
 * API Key Service
 * 
 * Manages API keys for external access with AES-256-GCM encryption
 */

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Encryption settings
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

// Get encryption key from environment
const getEncryptionKey = (): Buffer => {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('API_KEY_ENCRYPTION_SECRET or NEXTAUTH_SECRET must be set');
  }
  // Derive a 32-byte key from the secret
  return crypto.pbkdf2Sync(secret, 'apricode-api-keys', 100000, 32, 'sha256');
};

/**
 * Encrypt API key using AES-256-GCM
 */
function encryptApiKey(plainKey: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt API key using AES-256-GCM
 */
function decryptApiKey(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash API key for prefix-based lookup (timing-safe)
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

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
   * Generate new API key with AES-256-GCM encryption
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
    try {
      console.log('[API Key] Generating new API key:', { name, rateLimit, createdBy });
      
      // Generate cryptographically secure random API key
      const randomBytes = crypto.randomBytes(32);
      const key = `apx_live_${randomBytes.toString('hex')}`;
      const prefix = key.substring(0, 12); // apx_live_abc
      
      console.log('[API Key] Generated key with prefix:', prefix);
      
      // Hash for fast lookup
      const keyHash = hashApiKey(key);
      console.log('[API Key] Key hashed successfully');

      // Encrypt the key for secure storage
      const encryptedKey = encryptApiKey(key);
      console.log('[API Key] Key encrypted successfully');

      // Create API key record
      console.log('[API Key] Creating database record...');
      const apiKey = await prisma.apiKey.create({
        data: {
          userId,
          key: encryptedKey, // Store encrypted version
          keyHash, // Store hash for fast lookup
          name,
          prefix,
          permissions,
          isActive: true,
          expiresAt,
          rateLimit,
          createdBy
        }
      });

      console.log('[API Key] API key created successfully:', apiKey.id);

      return {
        key, // Return plain text key (only time it's shown)
        apiKey
      };
    } catch (error) {
      console.error('[API Key] Error generating API key:', error);
      console.error('[API Key] Error details:', error instanceof Error ? error.message : 'Unknown');
      console.error('[API Key] Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  /**
   * Validate API key using hash + encryption
   */
  async validateApiKey(key: string): Promise<any | null> {
    try {
      // Hash the provided key
      const keyHash = hashApiKey(key);

      // Find API key by hash (fast lookup)
      const apiKey = await prisma.apiKey.findFirst({
        where: {
          keyHash,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true
            }
          }
        }
      });

      if (!apiKey) {
        return null;
      }

      // Decrypt and verify the key matches (timing-safe)
      const decryptedKey = decryptApiKey(apiKey.key);
      
      // Constant-time comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(key),
        Buffer.from(decryptedKey)
      );

      if (!isValid) {
        return null;
      }

      // Check expiration
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return null; // Expired
      }

      // Check if user is active (if associated with a user)
      if (apiKey.user && !apiKey.user.isActive) {
        return null; // User deactivated
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
    } catch (error) {
      console.error('API key validation error:', error);
      return null;
    }
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

