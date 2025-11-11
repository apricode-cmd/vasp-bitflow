/**
 * OpenAPI Route Definitions
 * 
 * Defines all Public API v1 routes for OpenAPI generation
 */

import { OpenAPIRoute } from './openapi-generator';

export const apiRoutes: OpenAPIRoute[] = [
  // Rates
  {
    path: '/rates',
    method: 'GET',
    tags: ['Rates'],
    summary: 'Get current exchange rates',
    description: 'Returns current exchange rates for all supported cryptocurrency and fiat currency pairs',
    operationId: 'getRates',
    responses: {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    rates: { type: 'object' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
                meta: { type: 'object' },
              },
            },
          },
        },
      },
      '401': { description: 'Unauthorized' },
      '429': { description: 'Rate limit exceeded' },
    },
  },
  {
    path: '/rates/calculate',
    method: 'GET',
    tags: ['Rates'],
    summary: 'Calculate exchange amount',
    description: 'Calculate how much cryptocurrency you will receive for a given fiat amount, including fees',
    operationId: 'calculateRate',
    parameters: [
      { name: 'from', in: 'query', required: true, schema: { type: 'string', enum: ['EUR', 'PLN'] }, description: 'Fiat currency' },
      { name: 'to', in: 'query', required: true, schema: { type: 'string', enum: ['BTC', 'ETH', 'USDT', 'SOL'] }, description: 'Cryptocurrency' },
      { name: 'amount', in: 'query', required: true, schema: { type: 'number', minimum: 0 }, description: 'Amount in fiat currency' },
    ],
    responses: {
      '200': {
        description: 'Calculation result',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    from: { type: 'object' },
                    to: { type: 'object' },
                    rate: { type: 'object' },
                    fees: { type: 'object' },
                    total: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
      '400': { description: 'Invalid parameters' },
      '401': { description: 'Unauthorized' },
    },
  },

  // Currencies
  {
    path: '/currencies',
    method: 'GET',
    tags: ['Currencies'],
    summary: 'Get available currencies',
    description: 'Returns list of supported cryptocurrencies and fiat currencies',
    operationId: 'getCurrencies',
    responses: {
      '200': {
        description: 'List of currencies',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    crypto: { type: 'array', items: { type: 'object' } },
                    fiat: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
      '401': { description: 'Unauthorized' },
    },
  },

  // Customers
  {
    path: '/customers',
    method: 'POST',
    tags: ['Customers'],
    summary: 'Create new customer',
    description: 'Create a new customer account. Customer will receive email with password reset link.',
    operationId: 'createCustomer',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'firstName', 'lastName'],
            properties: {
              email: { type: 'string', format: 'email' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              phoneNumber: { type: 'string' },
              phoneCountry: { type: 'string', minLength: 2, maxLength: 2 },
              dateOfBirth: { type: 'string', format: 'date' },
              nationality: { type: 'string', minLength: 2, maxLength: 2 },
              metadata: { type: 'object' },
            },
          },
          example: {
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '+48123456789',
            phoneCountry: 'PL',
            metadata: { externalId: 'customer-123' },
          },
        },
      },
    },
    responses: {
      '201': {
        description: 'Customer created',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Customer' },
          },
        },
      },
      '400': { description: 'Validation error' },
      '409': { description: 'Customer already exists' },
    },
  },
  {
    path: '/customers',
    method: 'GET',
    tags: ['Customers'],
    summary: 'List customers',
    description: 'Get list of customers with optional filters',
    operationId: 'listCustomers',
    parameters: [
      { name: 'email', in: 'query', required: false, schema: { type: 'string' }, description: 'Search by email' },
      { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 }, description: 'Page number' },
      { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20, maximum: 100 }, description: 'Items per page' },
      { name: 'createdAfter', in: 'query', required: false, schema: { type: 'string', format: 'date-time' }, description: 'Filter by creation date' },
      { name: 'createdBefore', in: 'query', required: false, schema: { type: 'string', format: 'date-time' }, description: 'Filter by creation date' },
    ],
    responses: {
      '200': {
        description: 'List of customers',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: { type: 'array', items: { $ref: '#/components/schemas/Customer' } },
                pagination: { type: 'object' },
              },
            },
          },
        },
      },
      '401': { description: 'Unauthorized' },
    },
  },
  {
    path: '/customers/{id}',
    method: 'GET',
    tags: ['Customers'],
    summary: 'Get customer details',
    description: 'Get detailed information about a specific customer',
    operationId: 'getCustomer',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Customer ID' },
    ],
    responses: {
      '200': {
        description: 'Customer details',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Customer' },
          },
        },
      },
      '404': { description: 'Customer not found' },
    },
  },

  // KYC
  {
    path: '/customers/{id}/kyc',
    method: 'POST',
    tags: ['KYC'],
    summary: 'Initiate KYC verification',
    description: 'Start KYC verification process for a customer. Returns URL to redirect customer to.',
    operationId: 'initiateKYC',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Customer ID' },
    ],
    requestBody: {
      required: false,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              redirectUrl: { type: 'string', format: 'uri' },
              locale: { type: 'string', enum: ['en', 'pl', 'de', 'fr', 'es'], default: 'en' },
            },
          },
        },
      },
    },
    responses: {
      '201': {
        description: 'KYC initiated',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    sessionId: { type: 'string' },
                    kycUrl: { type: 'string', format: 'uri' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      '400': { description: 'KYC already completed or in progress' },
      '404': { description: 'Customer not found' },
    },
  },
  {
    path: '/customers/{id}/kyc/status',
    method: 'GET',
    tags: ['KYC'],
    summary: 'Get KYC verification status',
    description: 'Check the current status of customer KYC verification',
    operationId: 'getKYCStatus',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Customer ID' },
    ],
    responses: {
      '200': {
        description: 'KYC status',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    sessionId: { type: 'string' },
                    status: { type: 'string', enum: ['NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED'] },
                    verifiedAt: { type: 'string', format: 'date-time' },
                    rejectedAt: { type: 'string', format: 'date-time' },
                    rejectionReason: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      '404': { description: 'Customer not found' },
    },
  },

  // Payment Methods
  {
    path: '/payment-methods',
    method: 'GET',
    tags: ['Payment Methods'],
    summary: 'Get available payment methods',
    description: 'Returns list of available payment methods with bank details',
    operationId: 'getPaymentMethods',
    parameters: [
      { name: 'fiatCurrency', in: 'query', required: false, schema: { type: 'string', enum: ['EUR', 'PLN'] }, description: 'Filter by fiat currency' },
      { name: 'country', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by country code' },
    ],
    responses: {
      '200': {
        description: 'List of payment methods',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    paymentMethods: { type: 'array', items: { $ref: '#/components/schemas/PaymentMethod' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      '401': { description: 'Unauthorized' },
    },
  },

  // Orders
  {
    path: '/orders',
    method: 'POST',
    tags: ['Orders'],
    summary: 'Create new order',
    description: 'Create a new cryptocurrency purchase order',
    operationId: 'createOrder',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['userEmail', 'currencyCode', 'fiatCurrencyCode', 'fiatAmount', 'walletAddress'],
            properties: {
              userEmail: { type: 'string', format: 'email' },
              currencyCode: { type: 'string', enum: ['BTC', 'ETH', 'USDT', 'SOL'] },
              fiatCurrencyCode: { type: 'string', enum: ['EUR', 'PLN'] },
              fiatAmount: { type: 'number', minimum: 50 },
              walletAddress: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      '201': { description: 'Order created' },
      '400': { description: 'Validation error' },
      '404': { description: 'User not found' },
    },
  },
  {
    path: '/orders',
    method: 'GET',
    tags: ['Orders'],
    summary: 'List orders',
    description: 'Get list of orders',
    operationId: 'listOrders',
    parameters: [
      { name: 'status', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by status' },
      { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
      { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
    ],
    responses: {
      '200': { description: 'List of orders' },
      '401': { description: 'Unauthorized' },
    },
  },
  {
    path: '/orders/{id}',
    method: 'GET',
    tags: ['Orders'],
    summary: 'Get order details',
    description: 'Get detailed information about a specific order',
    operationId: 'getOrder',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: {
      '200': { description: 'Order details' },
      '404': { description: 'Order not found' },
    },
  },
  {
    path: '/orders/{id}/cancel',
    method: 'POST',
    tags: ['Orders'],
    summary: 'Cancel order',
    description: 'Cancel a pending or awaiting payment order',
    operationId: 'cancelOrder',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Order ID' },
    ],
    requestBody: {
      required: false,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              reason: { type: 'string', maxLength: 500 },
            },
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Order cancelled',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    status: { type: 'string' },
                    cancelledAt: { type: 'string', format: 'date-time' },
                    reason: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      '400': { description: 'Order cannot be cancelled' },
      '403': { description: 'Access denied' },
      '404': { description: 'Order not found' },
    },
  },
];

