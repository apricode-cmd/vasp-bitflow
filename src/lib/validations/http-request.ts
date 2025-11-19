/**
 * HTTP Request Node Configuration Schema
 * 
 * Defines validation for HTTP requests in workflows
 */

import { z } from 'zod';

// HTTP Methods
export const HttpMethod = z.enum([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

export type HttpMethod = z.infer<typeof HttpMethod>;

// Authentication Types
export const AuthType = z.enum([
  'NONE',
  'BEARER_TOKEN',
  'BASIC_AUTH',
  'API_KEY',
  'OAUTH2',
  'CUSTOM_HEADER',
]);

export type AuthType = z.infer<typeof AuthType>;

// Header
export const HttpHeader = z.object({
  key: z.string().min(1, 'Header key is required'),
  value: z.string(),
  enabled: z.boolean().default(true),
});

export type HttpHeader = z.infer<typeof HttpHeader>;

// Query Parameter
export const QueryParam = z.object({
  key: z.string().min(1, 'Query key is required'),
  value: z.string(),
  enabled: z.boolean().default(true),
});

export type QueryParam = z.infer<typeof QueryParam>;

// Authentication Config
export const AuthConfig = z.object({
  type: AuthType,
  
  // Bearer Token
  token: z.string().optional(),
  
  // Basic Auth
  username: z.string().optional(),
  password: z.string().optional(),
  
  // API Key
  apiKeyLocation: z.enum(['HEADER', 'QUERY']).optional(),
  apiKeyName: z.string().optional(),
  apiKeyValue: z.string().optional(),
  
  // OAuth2
  accessToken: z.string().optional(),
  
  // Custom Header
  customHeaderName: z.string().optional(),
  customHeaderValue: z.string().optional(),
});

export type AuthConfig = z.infer<typeof AuthConfig>;

// HTTP Request Config
export const HttpRequestConfig = z.object({
  // Request
  method: HttpMethod,
  url: z.string().url('Invalid URL').min(1, 'URL is required'),
  
  // Headers
  headers: z.array(HttpHeader).default([]),
  
  // Query Parameters
  queryParams: z.array(QueryParam).default([]),
  
  // Body (for POST, PUT, PATCH)
  bodyType: z.enum(['NONE', 'JSON', 'FORM', 'RAW', 'BINARY']).default('NONE'),
  body: z.string().optional(),
  
  // Authentication
  auth: AuthConfig.optional(),
  
  // Options
  timeout: z.number().min(0).max(300000).default(30000), // 30s default, max 5min
  followRedirects: z.boolean().default(true),
  validateSSL: z.boolean().default(true),
  
  // Response
  responseFormat: z.enum(['JSON', 'TEXT', 'BINARY']).default('JSON'),
  extractPath: z.string().optional(), // JSONPath to extract specific data
  
  // Error Handling
  retryOnFailure: z.boolean().default(false),
  retryAttempts: z.number().min(0).max(5).default(0),
  retryDelay: z.number().min(0).max(60000).default(1000), // 1s default
  
  // Conditions for success
  successStatusCodes: z.array(z.number()).default([200, 201, 204]),
});

export type HttpRequestConfig = z.infer<typeof HttpRequestConfig>;

// Response
export const HttpResponse = z.object({
  status: z.number(),
  statusText: z.string(),
  headers: z.record(z.string()),
  body: z.any(),
  duration: z.number(), // ms
  success: z.boolean(),
  error: z.string().optional(),
});

export type HttpResponse = z.infer<typeof HttpResponse>;

// Predefined templates
export const HTTP_REQUEST_TEMPLATES = {
  CHAINALYSIS_ADDRESS_CHECK: {
    name: 'Chainalysis - Address Risk Check',
    method: 'POST' as HttpMethod,
    url: 'https://api.chainalysis.com/api/risk/v2/entities',
    auth: {
      type: 'API_KEY' as AuthType,
      apiKeyLocation: 'HEADER' as const,
      apiKeyName: 'X-API-Key',
      apiKeyValue: '{{ $env.CHAINALYSIS_API_KEY }}',
    },
    bodyType: 'JSON' as const,
    body: JSON.stringify({
      address: '{{ $node.walletAddress }}',
      asset: '{{ $node.currency }}',
    }, null, 2),
  },
  
  SUMSUB_KYC_STATUS: {
    name: 'Sumsub - Get KYC Status',
    method: 'GET' as HttpMethod,
    url: 'https://api.sumsub.com/resources/applicants/{{ $node.applicantId }}/status',
    auth: {
      type: 'BEARER_TOKEN' as AuthType,
      token: '{{ $env.SUMSUB_API_TOKEN }}',
    },
  },
  
  SLACK_NOTIFICATION: {
    name: 'Slack - Send Notification',
    method: 'POST' as HttpMethod,
    url: '{{ $env.SLACK_WEBHOOK_URL }}',
    bodyType: 'JSON' as const,
    body: JSON.stringify({
      text: 'Workflow Alert',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*High-Risk Transaction Detected*\n\nAmount: {{ $node.amount }}\nCountry: {{ $node.country }}',
          },
        },
      ],
    }, null, 2),
  },
  
  TELEGRAM_BOT: {
    name: 'Telegram - Send Message',
    method: 'POST' as HttpMethod,
    url: 'https://api.telegram.org/bot{{ $env.TELEGRAM_BOT_TOKEN }}/sendMessage',
    bodyType: 'JSON' as const,
    body: JSON.stringify({
      chat_id: '{{ $env.TELEGRAM_CHAT_ID }}',
      text: '🚨 Alert: {{ $node.message }}',
      parse_mode: 'HTML',
    }, null, 2),
  },
  
  WEBHOOK_CUSTOM: {
    name: 'Custom Webhook',
    method: 'POST' as HttpMethod,
    url: 'https://example.com/webhook',
    headers: [
      { key: 'Content-Type', value: 'application/json', enabled: true },
    ],
    bodyType: 'JSON' as const,
    body: JSON.stringify({
      event: '{{ $node.trigger }}',
      data: '{{ $node }}',
    }, null, 2),
  },
} as const;

export type HttpRequestTemplate = keyof typeof HTTP_REQUEST_TEMPLATES;

