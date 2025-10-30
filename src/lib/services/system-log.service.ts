/**
 * System Log Service
 * 
 * Comprehensive logging of all user actions with device detection and IP tracking
 */

import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { UAParser } from 'ua-parser-js';

export interface SystemLogFilters {
  userId?: string;
  action?: string;
  ipAddress?: string;
  deviceType?: string;
  isBot?: boolean;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface SystemLogEntry {
  id: string;
  userId: string | null;
  sessionId: string | null;
  action: string;
  method: string | null;
  path: string;
  query: any;
  body: any;
  statusCode: number | null;
  ipAddress: string;
  userAgent: string | null;
  deviceType: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  isMobile: boolean;
  isBot: boolean;
  country: string | null;
  city: string | null;
  responseTime: number | null;
  errorMessage: string | null;
  errorStack: string | null;
  referrer: string | null;
  metadata: any;
  createdAt: Date;
}

class SystemLogService {
  /**
   * Parse user agent string to extract device info
   */
  private parseUserAgent(userAgent: string): {
    deviceType: string | null;
    browser: string | null;
    browserVersion: string | null;
    os: string | null;
    osVersion: string | null;
    isMobile: boolean;
    isBot: boolean;
  } {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Detect bots
    const isBot = /bot|crawler|spider|scraper/i.test(userAgent);

    return {
      deviceType: result.device.type || (result.os.name === 'iOS' || result.os.name === 'Android' ? 'mobile' : 'desktop'),
      browser: result.browser.name || null,
      browserVersion: result.browser.version || null,
      os: result.os.name || null,
      osVersion: result.os.version || null,
      isMobile: result.device.type === 'mobile' || result.device.type === 'tablet',
      isBot
    };
  }

  /**
   * Get client IP address from headers
   */
  private async getClientIP(): Promise<string> {
    const headersList = await headers();
    
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIP = headersList.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    return 'unknown';
  }

  /**
   * Log a user action
   */
  async logAction(
    action: string,
    path: string,
    options?: {
      userId?: string | null;
      sessionId?: string | null;
      method?: string;
      query?: any;
      body?: any;
      statusCode?: number;
      responseTime?: number;
      errorMessage?: string;
      errorStack?: string;
      metadata?: any;
    }
  ): Promise<SystemLogEntry> {
    try {
      // Get request context
      const headersList = await headers();
      const ipAddress = await this.getClientIP();
      const userAgent = headersList.get('user-agent') || null;
      const referrer = headersList.get('referer') || null;

      // Parse user agent
      const deviceInfo = userAgent ? this.parseUserAgent(userAgent) : {
        deviceType: null,
        browser: null,
        browserVersion: null,
        os: null,
        osVersion: null,
        isMobile: false,
        isBot: false
      };

      // Sanitize body (remove sensitive data)
      const sanitizedBody = options?.body ? this.sanitizeBody(options.body) : null;

      // Create log entry
      const logEntry = await prisma.systemLog.create({
        data: {
          userId: options?.userId || null,
          sessionId: options?.sessionId || null,
          action,
          method: options?.method || null,
          path,
          query: options?.query || null,
          body: sanitizedBody,
          statusCode: options?.statusCode || null,
          ipAddress,
          userAgent,
          deviceType: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          browserVersion: deviceInfo.browserVersion,
          os: deviceInfo.os,
          osVersion: deviceInfo.osVersion,
          isMobile: deviceInfo.isMobile,
          isBot: deviceInfo.isBot,
          responseTime: options?.responseTime || null,
          errorMessage: options?.errorMessage || null,
          errorStack: options?.errorStack || null,
          referrer,
          metadata: options?.metadata || null
        }
      });

      return logEntry;
    } catch (error) {
      console.error('Failed to create system log:', error);
      throw error;
    }
  }

  /**
   * Sanitize request body (remove passwords, tokens, etc.)
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard', 'cvv'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  /**
   * Get system logs with filtering
   */
  async getSystemLogs(filters: SystemLogFilters): Promise<{
    logs: SystemLogEntry[];
    total: number;
  }> {
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = {
        contains: filters.action,
        mode: 'insensitive'
      };
    }

    if (filters.ipAddress) {
      where.ipAddress = {
        contains: filters.ipAddress,
        mode: 'insensitive'
      };
    }

    if (filters.deviceType) {
      where.deviceType = filters.deviceType;
    }

    if (filters.isBot !== undefined) {
      where.isBot = filters.isBot;
    }

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        where.createdAt.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.createdAt.lte = filters.toDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0
      }),
      prisma.systemLog.count({ where })
    ]);

    return { logs, total };
  }

  /**
   * Get logs for specific user
   */
  async getUserLogs(userId: string, limit = 100): Promise<SystemLogEntry[]> {
    return prisma.systemLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get logs for specific IP
   */
  async getIPLogs(ipAddress: string, limit = 100): Promise<SystemLogEntry[]> {
    return prisma.systemLog.findMany({
      where: { ipAddress },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get statistics
   */
  async getStatistics(fromDate?: Date, toDate?: Date): Promise<{
    totalRequests: number;
    uniqueUsers: number;
    uniqueIPs: number;
    requestsByAction: Record<string, number>;
    requestsByDevice: Record<string, number>;
    requestsByOS: Record<string, number>;
    botRequests: number;
    errorRate: number;
  }> {
    const where: any = {};

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [
      totalRequests,
      uniqueUsers,
      uniqueIPs,
      requestsByAction,
      requestsByDevice,
      requestsByOS,
      botRequests,
      errorRequests
    ] = await Promise.all([
      prisma.systemLog.count({ where }),
      prisma.systemLog.findMany({
        where: { ...where, userId: { not: null } },
        distinct: ['userId']
      }).then(r => r.length),
      prisma.systemLog.findMany({
        where,
        distinct: ['ipAddress']
      }).then(r => r.length),
      prisma.systemLog.groupBy({
        by: ['action'],
        where,
        _count: true
      }),
      prisma.systemLog.groupBy({
        by: ['deviceType'],
        where: { ...where, deviceType: { not: null } },
        _count: true
      }),
      prisma.systemLog.groupBy({
        by: ['os'],
        where: { ...where, os: { not: null } },
        _count: true
      }),
      prisma.systemLog.count({ where: { ...where, isBot: true } }),
      prisma.systemLog.count({ 
        where: { 
          ...where, 
          statusCode: { gte: 400 } 
        } 
      })
    ]);

    // Format results
    const actionMap: Record<string, number> = {};
    requestsByAction.forEach((item) => {
      actionMap[item.action] = item._count;
    });

    const deviceMap: Record<string, number> = {};
    requestsByDevice.forEach((item) => {
      if (item.deviceType) {
        deviceMap[item.deviceType] = item._count;
      }
    });

    const osMap: Record<string, number> = {};
    requestsByOS.forEach((item) => {
      if (item.os) {
        osMap[item.os] = item._count;
      }
    });

    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;

    return {
      totalRequests,
      uniqueUsers,
      uniqueIPs,
      requestsByAction: actionMap,
      requestsByDevice: deviceMap,
      requestsByOS: osMap,
      botRequests,
      errorRate
    };
  }

  /**
   * Clean old logs (retention policy)
   */
  async cleanOldLogs(daysToKeep = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.systemLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }
}

// Export singleton instance
export const systemLogService = new SystemLogService();

// System log action constants
export const SYSTEM_LOG_ACTIONS = {
  // Page views
  PAGE_VIEW: 'PAGE_VIEW',
  PAGE_LOAD: 'PAGE_LOAD',
  
  // Auth actions
  LOGIN_ATTEMPT: 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  REGISTER_ATTEMPT: 'REGISTER_ATTEMPT',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  
  // API calls
  API_CALL: 'API_CALL',
  API_ERROR: 'API_ERROR',
  
  // Order actions
  ORDER_VIEW: 'ORDER_VIEW',
  ORDER_CREATE_ATTEMPT: 'ORDER_CREATE_ATTEMPT',
  ORDER_CREATE_SUCCESS: 'ORDER_CREATE_SUCCESS',
  ORDER_CREATE_FAILED: 'ORDER_CREATE_FAILED',
  
  // KYC actions
  KYC_START: 'KYC_START',
  KYC_SUBMIT: 'KYC_SUBMIT',
  KYC_DOCUMENT_UPLOAD: 'KYC_DOCUMENT_UPLOAD',
  
  // Payment actions
  PAYMENT_PROOF_UPLOAD: 'PAYMENT_PROOF_UPLOAD',
  
  // Profile actions
  PROFILE_VIEW: 'PROFILE_VIEW',
  PROFILE_UPDATE: 'PROFILE_UPDATE',
  
  // Security events
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  BLOCKED_IP_ATTEMPT: 'BLOCKED_IP_ATTEMPT',
  
  // Error events
  ERROR_404: 'ERROR_404',
  ERROR_500: 'ERROR_500',
  ERROR_UNKNOWN: 'ERROR_UNKNOWN'
} as const;

