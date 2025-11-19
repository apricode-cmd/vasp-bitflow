/**
 * HTTP Request Executor Service
 * 
 * Executes HTTP requests with full n8n-style features:
 * - Authentication (Bearer, Basic, API Key, OAuth2)
 * - Query parameters and headers
 * - Body types (JSON, Form, Raw)
 * - Response handling (format, extraction, full response)
 * - Error handling (retry, exponential backoff)
 * - SSL validation, redirects, timeouts
 */

import { type HttpRequestConfig, type HttpResponse } from '@/lib/validations/http-request';

interface ExecutionContext {
  variables: Record<string, any>;
  env: Record<string, string>;
}

export class HttpExecutorService {
  /**
   * Execute HTTP request with full configuration
   */
  async execute(
    config: HttpRequestConfig,
    context: ExecutionContext
  ): Promise<HttpResponse> {
    const startTime = Date.now();
    
    try {
      // Build final URL with query parameters
      const url = this.buildUrl(config, context);
      
      // Build headers
      const headers = this.buildHeaders(config, context);
      
      // Build request options
      const options: RequestInit = {
        method: config.method,
        headers,
        redirect: config.followRedirects ? 'follow' : 'manual',
        signal: AbortSignal.timeout(config.timeout || 30000),
      };
      
      // Add body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(config.method) && config.bodyType !== 'NONE') {
        options.body = this.buildBody(config, context);
      }
      
      // Execute with retry logic
      const response = await this.executeWithRetry(url, options, config);
      
      const duration = Date.now() - startTime;
      
      // Parse response
      const body = await this.parseResponse(response, config);
      
      // Extract data if JSONPath specified
      const extractedData = config.extractPath 
        ? this.extractData(body, config.extractPath)
        : body;
      
      // Check if success
      const successStatusCodes = config.successStatusCodes || [200, 201, 204];
      const isSuccess = successStatusCodes.includes(response.status);
      
      // Build response object
      const httpResponse: HttpResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: config.fullResponse 
          ? { status: response.status, headers: Object.fromEntries(response.headers.entries()), data: extractedData }
          : extractedData,
        duration,
        success: isSuccess,
      };
      
      if (!isSuccess) {
        httpResponse.error = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      return httpResponse;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        status: 0,
        statusText: 'Request Failed',
        headers: {},
        body: null,
        duration,
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }
  
  /**
   * Build final URL with query parameters
   */
  private buildUrl(config: HttpRequestConfig, context: ExecutionContext): string {
    let url = this.interpolate(config.url, context);
    
    if (config.queryParams && config.queryParams.length > 0) {
      const urlObj = new URL(url);
      
      config.queryParams.forEach(param => {
        if (param.enabled !== false && param.key) {
          const value = this.interpolate(param.value, context);
          urlObj.searchParams.append(param.key, value);
        }
      });
      
      url = urlObj.toString();
    }
    
    return url;
  }
  
  /**
   * Build request headers with authentication
   */
  private buildHeaders(config: HttpRequestConfig, context: ExecutionContext): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Add custom headers
    if (config.headers && config.headers.length > 0) {
      config.headers.forEach(header => {
        if (header.enabled !== false && header.key) {
          headers[header.key] = this.interpolate(header.value, context);
        }
      });
    }
    
    // Add authentication headers
    if (config.auth && config.auth.type !== 'NONE') {
      const authHeaders = this.buildAuthHeaders(config.auth, context);
      Object.assign(headers, authHeaders);
    }
    
    // Add Content-Type for JSON body if not specified
    if (config.bodyType === 'JSON' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (config.bodyType === 'FORM' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    
    return headers;
  }
  
  /**
   * Build authentication headers
   */
  private buildAuthHeaders(auth: any, context: ExecutionContext): Record<string, string> {
    const headers: Record<string, string> = {};
    
    switch (auth.type) {
      case 'BEARER_TOKEN':
        if (auth.token) {
          headers['Authorization'] = `Bearer ${this.interpolate(auth.token, context)}`;
        }
        break;
        
      case 'BASIC_AUTH':
        if (auth.username && auth.password) {
          const username = this.interpolate(auth.username, context);
          const password = this.interpolate(auth.password, context);
          const credentials = Buffer.from(`${username}:${password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
        
      case 'API_KEY':
        if (auth.apiKeyLocation === 'HEADER' && auth.apiKeyName && auth.apiKeyValue) {
          headers[auth.apiKeyName] = this.interpolate(auth.apiKeyValue, context);
        }
        break;
        
      case 'OAUTH2':
        if (auth.accessToken) {
          headers['Authorization'] = `Bearer ${this.interpolate(auth.accessToken, context)}`;
        }
        break;
        
      case 'CUSTOM_HEADER':
        if (auth.customHeaderName && auth.customHeaderValue) {
          headers[auth.customHeaderName] = this.interpolate(auth.customHeaderValue, context);
        }
        break;
    }
    
    return headers;
  }
  
  /**
   * Build request body
   */
  private buildBody(config: HttpRequestConfig, context: ExecutionContext): string {
    if (!config.body) return '';
    
    const interpolatedBody = this.interpolate(config.body, context);
    
    switch (config.bodyType) {
      case 'JSON':
        // Validate and format JSON
        try {
          const parsed = JSON.parse(interpolatedBody);
          return JSON.stringify(parsed);
        } catch {
          return interpolatedBody; // Return as-is if invalid
        }
        
      case 'FORM':
      case 'RAW':
      default:
        return interpolatedBody;
    }
  }
  
  /**
   * Execute request with retry logic
   */
  private async executeWithRetry(
    url: string,
    options: RequestInit,
    config: HttpRequestConfig
  ): Promise<Response> {
    const maxAttempts = config.retryOnFailure ? (config.retryAttempts || 3) : 1;
    const baseDelay = config.retryDelay || 1000;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // Check if we should retry based on status code
        const successStatusCodes = config.successStatusCodes || [200, 201, 204];
        if (successStatusCodes.includes(response.status) || attempt === maxAttempts - 1) {
          return response;
        }
        
        // If status indicates server error (5xx), retry
        if (response.status >= 500 && attempt < maxAttempts - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          await this.sleep(delay);
          continue;
        }
        
        return response;
        
      } catch (error: any) {
        lastError = error;
        
        if (attempt < maxAttempts - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          await this.sleep(delay);
          continue;
        }
      }
    }
    
    throw lastError || new Error('Request failed after retries');
  }
  
  /**
   * Parse response based on format
   */
  private async parseResponse(response: Response, config: HttpRequestConfig): Promise<any> {
    const responseFormat = config.responseFormat || 'JSON';
    
    switch (responseFormat) {
      case 'JSON':
        try {
          return await response.json();
        } catch {
          return await response.text(); // Fallback to text
        }
        
      case 'TEXT':
        return await response.text();
        
      case 'BINARY':
        return await response.arrayBuffer();
        
      default:
        return await response.text();
    }
  }
  
  /**
   * Extract data using JSONPath-like syntax
   * Simple implementation - supports dot notation and array access
   */
  private extractData(data: any, path: string): any {
    if (!path || path === '$' || path === '.') return data;
    
    // Remove leading $ or .
    const cleanPath = path.replace(/^\$\.?/, '').replace(/^\./, '');
    
    // Split by dots, handling array access
    const parts = cleanPath.split(/\.|\[/).map(p => p.replace(/\]$/, ''));
    
    let current = data;
    
    for (const part of parts) {
      if (part === '*' && Array.isArray(current)) {
        // Wildcard - return array of all items
        return current;
      }
      
      if (current === null || current === undefined) {
        return null;
      }
      
      current = current[part];
    }
    
    return current;
  }
  
  /**
   * Interpolate {{ }} expressions
   */
  private interpolate(text: string, context: ExecutionContext): string {
    if (!text) return '';
    
    return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
      const trimmed = expression.trim();
      
      // Handle $env.VARIABLE
      if (trimmed.startsWith('$env.')) {
        const envVar = trimmed.substring(5);
        return context.env[envVar] || match;
      }
      
      // Handle $node.field
      if (trimmed.startsWith('$node.')) {
        const field = trimmed.substring(6);
        return this.getNestedValue(context.variables, field) || match;
      }
      
      // Handle direct variable access
      return this.getNestedValue(context.variables, trimmed) || match;
    });
  }
  
  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, part) => current?.[part], obj);
  }
  
  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const httpExecutor = new HttpExecutorService();

