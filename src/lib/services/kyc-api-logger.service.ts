/**
 * KYC API Logger Service
 * 
 * Logs all API calls to KYC providers (Sumsub, KYCAID) with full request/response tracking.
 * - Tracks endpoint, method, payload, response time, status code
 * - Logs errors and failures
 * - Non-blocking (doesn't break main flow)
 */

import { auditService, AUDIT_ENTITIES } from './audit.service';

/**
 * KYC API Call Log Parameters
 */
interface KycApiCallLog {
  kycSessionId: string;
  provider: 'sumsub' | 'kycaid';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  requestPayload?: any;
  responsePayload?: any;
  responseTime?: string;
  statusCode?: number;
  error?: string;
  note?: string;
}

/**
 * KYC API Logger Service
 */
class KycApiLoggerService {
  /**
   * Log API call to KYC provider
   * 
   * @example
   * await kycApiLogger.logApiRequest({
   *   kycSessionId: 'ks_abc123',
   *   provider: 'sumsub',
   *   endpoint: '/resources/applicants',
   *   method: 'POST',
   *   requestPayload: { externalUserId: '123' },
   *   responsePayload: { id: '692476053ae2f64a4a445392' },
   *   responseTime: '245ms',
   *   statusCode: 200
   * });
   */
  async logApiRequest(params: KycApiCallLog): Promise<void> {
    try {
      const action = params.error ? 'KYC_API_ERROR' : 'KYC_API_REQUEST';
      
      // Sanitize sensitive data before logging
      const sanitizedRequest = this.sanitizePayload(params.requestPayload);
      const sanitizedResponse = this.sanitizePayload(params.responsePayload);

      await auditService.logAdminAction(
        'system', // System actor for API calls
        action,
        AUDIT_ENTITIES.KYC_SESSION,
        params.kycSessionId,
        {}, // No diffBefore for API calls
        {}, // No diffAfter for API calls
        {
          provider: params.provider,
          endpoint: `${params.method} ${params.endpoint}`,
          requestPayload: sanitizedRequest,
          responsePayload: sanitizedResponse,
          responseTime: params.responseTime,
          statusCode: params.statusCode,
          error: params.error,
          note: params.note,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('❌ Failed to log KYC API call:', error);
      // Don't throw - logging should never break main flow
    }
  }

  /**
   * Measure and log API call with automatic timing
   * 
   * @example
   * const result = await kycApiLogger.measureApiCall(
   *   'ks_abc123',
   *   'sumsub',
   *   '/resources/applicants',
   *   'POST',
   *   { externalUserId: '123' },
   *   async () => {
   *     const response = await fetch(...);
   *     return await response.json();
   *   }
   * );
   */
  async measureApiCall<T>(
    kycSessionId: string,
    provider: 'sumsub' | 'kycaid',
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    requestPayload: any,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      const responseTime = `${Date.now() - startTime}ms`;
      
      // Log successful call
      await this.logApiRequest({
        kycSessionId,
        provider,
        endpoint,
        method,
        requestPayload,
        responsePayload: result,
        responseTime,
        statusCode: 200,
      });
      
      return result;
      
    } catch (error: any) {
      const responseTime = `${Date.now() - startTime}ms`;
      
      // Log failed call
      await this.logApiRequest({
        kycSessionId,
        provider,
        endpoint,
        method,
        requestPayload,
        error: error.message || String(error),
        responseTime,
        statusCode: error.statusCode || error.status || 500,
      });
      
      // Re-throw to preserve original error handling
      throw error;
    }
  }

  /**
   * Sanitize sensitive data from payloads before logging
   * - Removes secrets, tokens, passwords
   * - Truncates large binary data
   * - Keeps structure intact for debugging
   */
  private sanitizePayload(payload: any): any {
    if (!payload) {
      return payload;
    }

    if (typeof payload !== 'object') {
      return payload;
    }

    // Create a shallow copy to avoid mutating original
    const sanitized = Array.isArray(payload) ? [...payload] : { ...payload };

    // List of sensitive keys to redact
    const sensitiveKeys = [
      'password',
      'secret',
      'token',
      'apiKey',
      'api_key',
      'authorization',
      'x-app-token',
      'x-app-access-sig',
      'x-app-access-ts',
    ];

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
        const lowerKey = key.toLowerCase();
        
        // Redact sensitive keys
        if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
          sanitized[key] = '[REDACTED]';
        }
        // Recursively sanitize nested objects
        else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = this.sanitizePayload(sanitized[key]);
        }
        // Truncate very long strings (likely base64 images, etc.)
        else if (typeof sanitized[key] === 'string' && sanitized[key].length > 500) {
          sanitized[key] = `${sanitized[key].substring(0, 500)}... [truncated ${sanitized[key].length - 500} chars]`;
        }
      }
    }

    return sanitized;
  }

  /**
   * Log API call with explicit status code (for cases where response is not available)
   */
  async logApiCallWithStatus(
    kycSessionId: string,
    provider: 'sumsub' | 'kycaid',
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    requestPayload: any,
    statusCode: number,
    responsePayload?: any,
    note?: string
  ): Promise<void> {
    await this.logApiRequest({
      kycSessionId,
      provider,
      endpoint,
      method,
      requestPayload,
      responsePayload,
      statusCode,
      note,
    });
  }
}

// Export singleton instance
export const kycApiLogger = new KycApiLoggerService();

/**
 * KYC Action Constants (extended)
 */
export const KYC_AUDIT_ACTIONS = {
  // User actions
  KYC_CREATED: 'KYC_CREATED',
  KYC_SUBMITTED: 'KYC_SUBMITTED',
  KYC_DOCUMENT_UPLOADED: 'KYC_DOCUMENT_UPLOADED',
  KYC_RESUBMITTED: 'KYC_RESUBMITTED',
  
  // Admin actions
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED',
  KYC_DELETED: 'KYC_DELETED',
  KYC_VIEWED: 'KYC_VIEWED',
  
  // System actions
  KYC_WEBHOOK_RECEIVED: 'KYC_WEBHOOK_RECEIVED',
  KYC_STATUS_CHANGED: 'KYC_STATUS_CHANGED',
  
  // API Call actions
  KYC_API_REQUEST: 'KYC_API_REQUEST',
  KYC_API_ERROR: 'KYC_API_ERROR',
} as const;


