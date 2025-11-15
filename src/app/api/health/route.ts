// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * System Health Check API
 * 
 * GET /api/health - Basic health check (public)
 * GET /api/health?detailed=true - Detailed check (requires auth)
 * 
 * Used by:
 * - Docker health checks
 * - Load balancers
 * - Monitoring systems
 * - Setup wizard
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ServiceHealth {
  status: 'ok' | 'error' | 'degraded';
  latency?: number;
  message?: string;
  lastChecked: string;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: ServiceHealth;
    redis?: ServiceHealth;
    kycProvider?: ServiceHealth;
    emailService?: ServiceHealth;
    rateProviders?: {
      coingecko?: ServiceHealth;
      kraken?: ServiceHealth;
    };
  };
  environment: string;
}

// Store startup time
const startTime = Date.now();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';

  const timestamp = new Date().toISOString();
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  // Always check database
  const databaseCheck = await checkDatabase();

  // Basic health check (always accessible)
  if (!detailed) {
    const status = databaseCheck.status === 'ok' ? 'healthy' : 'unhealthy';
    
    return NextResponse.json({
      status,
      version: process.env.npm_package_version || '1.1.0',
      uptime,
      timestamp,
      checks: {
        database: databaseCheck
      },
      environment: process.env.NODE_ENV || 'development'
    } as HealthCheckResponse, {
      status: status === 'healthy' ? 200 : 503
    });
  }

  // Detailed health check
  try {
    const [
      redisCheck,
      kycCheck,
      emailCheck,
      ratesCheck
    ] = await Promise.all([
      checkRedis(),
      checkKYCProvider(),
      checkEmailService(),
      checkRateProviders()
    ]);

    // Determine overall status
    const allChecks = [
      databaseCheck,
      redisCheck,
      kycCheck,
      emailCheck,
      ratesCheck.coingecko,
      ratesCheck.kraken
    ].filter(Boolean) as ServiceHealth[];

    const hasError = allChecks.some(check => check.status === 'error');
    const hasDegraded = allChecks.some(check => check.status === 'degraded');
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (hasError) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const response: HealthCheckResponse = {
      status: overallStatus,
      version: process.env.npm_package_version || '1.1.0',
      uptime,
      timestamp,
      checks: {
        database: databaseCheck,
        redis: redisCheck,
        kycProvider: kycCheck,
        emailService: emailCheck,
        rateProviders: ratesCheck
      },
      environment: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json(response, {
      status: overallStatus === 'unhealthy' ? 503 : 200
    });

  } catch (error) {
    console.error('[Health Check] Error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      version: process.env.npm_package_version || '1.1.0',
      uptime,
      timestamp,
      checks: {
        database: databaseCheck
      },
      environment: process.env.NODE_ENV || 'development',
      error: 'Failed to perform health checks'
    } as HealthCheckResponse & { error: string }, {
      status: 503
    });
  }
}

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return {
      status: latency < 100 ? 'ok' : 'degraded',
      latency,
      message: latency < 100 ? 'Database responsive' : 'Database slow',
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<ServiceHealth | undefined> {
  if (!process.env.REDIS_URL) {
    return undefined; // Redis is optional
  }

  const start = Date.now();
  
  try {
    // Try to import and use Redis
    const { redis } = await import('@/lib/redis');
    await redis.ping();
    const latency = Date.now() - start;
    
    return {
      status: latency < 50 ? 'ok' : 'degraded',
      latency,
      message: 'Redis responsive',
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check KYC provider connectivity
 */
async function checkKYCProvider(): Promise<ServiceHealth | undefined> {
  const kycProvider = process.env.KYC_PROVIDER || 'KYCAID';
  
  if (kycProvider === 'KYCAID' && !process.env.KYCAID_API_KEY) {
    return {
      status: 'error',
      message: 'KYCAID API key not configured',
      lastChecked: new Date().toISOString()
    };
  }

  if (kycProvider === 'SUMSUB' && !process.env.SUMSUB_APP_TOKEN) {
    return {
      status: 'error',
      message: 'Sumsub API token not configured',
      lastChecked: new Date().toISOString()
    };
  }

  const start = Date.now();
  
  try {
    // Simple connectivity check (not actual API call to save quota)
    const latency = Date.now() - start;
    
    return {
      status: 'ok',
      latency,
      message: `${kycProvider} configured`,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      message: `${kycProvider} check failed`,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check email service
 */
async function checkEmailService(): Promise<ServiceHealth | undefined> {
  if (!process.env.RESEND_API_KEY) {
    return {
      status: 'error',
      message: 'Email service not configured',
      lastChecked: new Date().toISOString()
    };
  }

  return {
    status: 'ok',
    message: 'Email service configured',
    lastChecked: new Date().toISOString()
  };
}

/**
 * Check exchange rate providers
 */
async function checkRateProviders(): Promise<{
  coingecko?: ServiceHealth;
  kraken?: ServiceHealth;
}> {
  const result: {
    coingecko?: ServiceHealth;
    kraken?: ServiceHealth;
  } = {};

  // CoinGecko (always available, free tier)
  try {
    const coingeckoUrl = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
    const start = Date.now();
    
    const response = await fetch(`${coingeckoUrl}/ping`, {
      signal: AbortSignal.timeout(5000)
    });
    
    const latency = Date.now() - start;
    
    if (response.ok) {
      result.coingecko = {
        status: latency < 1000 ? 'ok' : 'degraded',
        latency,
        message: 'CoinGecko responsive',
        lastChecked: new Date().toISOString()
      };
    } else {
      result.coingecko = {
        status: 'error',
        message: `CoinGecko returned ${response.status}`,
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error) {
    result.coingecko = {
      status: 'error',
      message: 'CoinGecko unreachable',
      lastChecked: new Date().toISOString()
    };
  }

  // Kraken (optional, requires auth)
  if (process.env.KRAKEN_API_KEY) {
    try {
      const krakenUrl = process.env.KRAKEN_BASE_URL || 'https://api.kraken.com';
      const start = Date.now();
      
      const response = await fetch(`${krakenUrl}/0/public/SystemStatus`, {
        signal: AbortSignal.timeout(5000)
      });
      
      const latency = Date.now() - start;
      
      if (response.ok) {
        result.kraken = {
          status: latency < 1000 ? 'ok' : 'degraded',
          latency,
          message: 'Kraken responsive',
          lastChecked: new Date().toISOString()
        };
      } else {
        result.kraken = {
          status: 'error',
          message: `Kraken returned ${response.status}`,
          lastChecked: new Date().toISOString()
        };
      }
    } catch (error) {
      result.kraken = {
        status: 'error',
        message: 'Kraken unreachable',
        lastChecked: new Date().toISOString()
      };
    }
  }

  return result;
}

