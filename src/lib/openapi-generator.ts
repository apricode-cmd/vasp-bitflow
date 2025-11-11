/**
 * OpenAPI 3.0 Specification Generator
 * 
 * Generates OpenAPI spec from route definitions
 */

export interface OpenAPIRoute {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  tags: string[];
  summary: string;
  description?: string;
  operationId: string;
  requestBody?: {
    required: boolean;
    content: {
      'application/json': {
        schema: any;
        example?: any;
      };
    };
  };
  parameters?: Array<{
    name: string;
    in: 'path' | 'query' | 'header';
    required: boolean;
    schema: any;
    description?: string;
  }>;
  responses: {
    [statusCode: string]: {
      description: string;
      content?: {
        'application/json': {
          schema: any;
          example?: any;
        };
      };
    };
  };
}

export function generateOpenAPISpec(routes: OpenAPIRoute[]) {
  const paths: any = {};

  // Group routes by path
  routes.forEach(route => {
    if (!paths[route.path]) {
      paths[route.path] = {};
    }

    paths[route.path][route.method.toLowerCase()] = {
      tags: route.tags,
      summary: route.summary,
      description: route.description,
      operationId: route.operationId,
      security: [{ ApiKeyAuth: [] }],
      ...(route.parameters && { parameters: route.parameters }),
      ...(route.requestBody && { requestBody: route.requestBody }),
      responses: route.responses,
    };
  });

  return {
    openapi: '3.0.0',
    info: {
      title: 'Apricode Exchange API',
      version: '1.0.0',
      description: 'Enterprise-grade cryptocurrency exchange API for buying crypto with fiat currency. Supports BTC, ETH, USDT, SOL with EUR and PLN.',
      contact: {
        name: 'Apricode API Support',
        email: 'api@apricode.io',
        url: 'https://apricode.io/support',
      },
      license: {
        name: 'Proprietary',
        url: 'https://apricode.io/terms',
      },
    },
    servers: [
      {
        url: 'https://apricode.io/api/v1',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
    ],
    security: [{ ApiKeyAuth: [] }],
    tags: [
      { name: 'Rates', description: 'Exchange rate operations' },
      { name: 'Currencies', description: 'Available currencies' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Customers', description: 'Customer management' },
      { name: 'KYC', description: 'KYC verification' },
      { name: 'Payment Methods', description: 'Payment methods' },
    ],
    paths,
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication. Can also be provided as Bearer token in Authorization header.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            message: { type: 'string' },
            meta: {
              type: 'object',
              properties: {
                version: { type: 'string' },
                responseTime: { type: 'string' },
              },
            },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phoneNumber: { type: 'string' },
            phoneCountry: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date' },
            nationality: { type: 'string' },
            kycStatus: { type: 'string', enum: ['NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        PaymentMethod: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            currencies: { type: 'array', items: { type: 'string' } },
            countries: { type: 'array', items: { type: 'string' } },
            processingTime: { type: 'string' },
            limits: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' },
                currency: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'API key is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Invalid or inactive API key',
                meta: { version: '1.0', responseTime: '5ms' },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Insufficient permissions',
                message: 'API key does not have permission for this action',
                meta: { version: '1.0', responseTime: '5ms' },
              },
            },
          },
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Rate limit exceeded',
                message: 'Rate limit: 100 requests per hour',
                meta: { version: '1.0', responseTime: '2ms' },
              },
            },
          },
        },
      },
    },
  };
}

