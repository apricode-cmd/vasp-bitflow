/**
 * API Authentication Middleware
 * 
 * Validates API keys for public API access
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiKeyService } from '@/lib/services/api-key.service';

export interface ApiAuthResult {
  authorized: boolean;
  apiKey?: any;
  error?: NextResponse;
}

/**
 * Require valid API key
 */
export async function requireApiKey(
  request: NextRequest,
  resource: string,
  action: string
): Promise<ApiAuthResult> {
  // Get API key from header
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');
  
  const apiKeyValue = authHeader?.replace('Bearer ', '') || apiKeyHeader;

  if (!apiKeyValue) {
    return {
      authorized: false,
      error: NextResponse.json(
        {
          success: false,
          error: 'API key required',
          message: 'Provide API key via Authorization header (Bearer token) or X-API-Key header'
        },
        { status: 401 }
      )
    };
  }

  // Validate API key
  const apiKey = await apiKeyService.validateApiKey(apiKeyValue);

  if (!apiKey || !apiKey.isActive) {
    return {
      authorized: false,
      error: NextResponse.json(
        {
          success: false,
          error: 'Invalid or inactive API key'
        },
        { status: 401 }
      )
    };
  }

  // Check permission
  const hasPermission = apiKeyService.checkPermission(apiKey, resource, action);

  if (!hasPermission) {
    return {
      authorized: false,
      error: NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions',
          message: `API key does not have permission for ${resource}:${action}`
        },
        { status: 403 }
      )
    };
  }

  // Check rate limit
  const rateLimitOk = await apiKeyService.checkRateLimit(apiKey.id, apiKey.rateLimit);

  if (!rateLimitOk) {
    return {
      authorized: false,
      error: NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: `Rate limit: ${apiKey.rateLimit} requests per hour`
        },
        { status: 429 }
      )
    };
  }

  return {
    authorized: true,
    apiKey
  };
}

/**
 * Log API request
 */
export async function logApiRequest(
  apiKeyId: string,
  request: NextRequest,
  statusCode: number,
  responseTime: number,
  errorMessage?: string
): Promise<void> {
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = request.headers.get('user-agent') || undefined;
  const endpoint = request.nextUrl.pathname;
  const method = request.method;

  await apiKeyService.logUsage(
    apiKeyId,
    endpoint,
    method,
    statusCode,
    responseTime,
    ipAddress,
    userAgent,
    errorMessage
  );
}



