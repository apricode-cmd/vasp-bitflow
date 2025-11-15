# Apricode Exchange - API Documentation

## Overview

Apricode Exchange provides two APIs:
1. **Internal API** - For web application (requires session authentication)
2. **Public API v1** - For external integrations (requires API key)

---

## Authentication

### Internal API (Web App)

Uses NextAuth v5 session-based authentication:

```bash
POST /api/auth/callback/credentials
{
  "email": "user@example.com",
  "password": "password"
}
```

Session cookie is automatically set.

### Public API v1 (External)

Requires API key in headers:

```bash
# Method 1: Authorization header
Authorization: Bearer apx_live_your_api_key

# Method 2: X-API-Key header
X-API-Key: apx_live_your_api_key
```

---

## Public API v1 Endpoints

### Base URL

```
https://apricode.io/api/v1
```

### Response Format

**Success:**

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "version": "1.0",
    "responseTime": "45ms"
  }
}
```

**Error:**

```json
{
  "success": false,
  "error": "Error message",
  "details": [ ... ],
  "meta": {
    "version": "1.0",
    "responseTime": "12ms"
  }
}
```

### Rate Limiting

- Default: **100 requests/hour** per API key
- 429 status code when exceeded
- Rate limit resets hourly

---

## Endpoints

### 1. Get Exchange Rates

**Endpoint:** `GET /api/v1/rates`

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "rates": {
      "BTC": {
        "EUR": 45000.50,
        "PLN": 180000.00
      },
      "ETH": {
        "EUR": 3000.25,
        "PLN": 12000.50
      },
      "USDT": {
        "EUR": 0.95,
        "PLN": 3.80
      },
      "SOL": {
        "EUR": 120.00,
        "PLN": 480.00
      }
    },
    "timestamp": "2025-10-25T12:00:00Z"
  }
}
```

---

### 2. Get Available Currencies

**Endpoint:** `GET /api/v1/currencies`

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "crypto": [
      {
        "code": "BTC",
        "name": "Bitcoin",
        "symbol": "₿",
        "decimals": 8,
        "isActive": true
      }
    ],
    "fiat": [
      {
        "code": "EUR",
        "name": "Euro",
        "symbol": "€",
        "isActive": true
      }
    ]
  }
}
```

---

### 3. Create Order

**Endpoint:** `POST /api/v1/orders`

**Authentication:** Required

**Permissions:** `orders:create`

**Request:**

```json
{
  "userEmail": "client@example.com",
  "currencyCode": "BTC",
  "fiatCurrencyCode": "EUR",
  "amount": 0.01,
  "walletAddress": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "order-id",
    "paymentReference": "APR-2025-ABC123",
    "cryptoAmount": 0.01,
    "fiatAmount": 450.00,
    "rate": 45000.00,
    "feePercent": 1.5,
    "feeAmount": 6.75,
    "totalFiat": 456.75,
    "status": "PENDING",
    "expiresAt": "2025-10-26T12:00:00Z",
    "currency": { ... },
    "fiatCurrency": { ... }
  }
}
```

**Requirements:**
- User must exist
- User must have APPROVED KYC
- Amount must be within trading pair limits

---

### 4. Get Orders

**Endpoint:** `GET /api/v1/orders`

**Authentication:** Required

**Permissions:** `orders:read`

**Query Parameters:**
- `status` - Filter by status (optional)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response:**

```json
{
  "success": true,
  "data": [ ... orders ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Note:** If API key is bound to a user, only returns that user's orders.

---

### 5. Get Order Details

**Endpoint:** `GET /api/v1/orders/[id]`

**Authentication:** Required

**Permissions:** `orders:read`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "...",
    "paymentReference": "APR-2025-ABC123",
    "status": "PROCESSING",
    "cryptoAmount": 0.01,
    "totalFiat": 456.75,
    "walletAddress": "bc1q...",
    "transactionHash": null,
    "expiresAt": "2025-10-26T12:00:00Z",
    "createdAt": "2025-10-25T12:00:00Z",
    "currency": { ... },
    "fiatCurrency": { ... },
    "statusHistory": [
      {
        "oldStatus": "PENDING",
        "newStatus": "PAYMENT_PENDING",
        "createdAt": "2025-10-25T14:00:00Z"
      }
    ]
  }
}
```

---

## Error Codes

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

### Common Error Responses

#### Invalid API Key

```json
{
  "success": false,
  "error": "Invalid or inactive API key"
}
```

#### Rate Limit Exceeded

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Rate limit: 100 requests per hour"
}
```

#### Insufficient Permissions

```json
{
  "success": false,
  "error": "Insufficient permissions",
  "message": "API key does not have permission for orders:create"
}
```

#### Validation Error

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "amount",
      "message": "Amount must be positive"
    }
  ]
}
```

---

## Internal API Endpoints

### Authentication

#### Register

```
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+48123456789",
  "country": "PL"
}
```

### Orders

#### Create Order

```
POST /api/orders
{
  "currencyCode": "BTC",
  "fiatCurrencyCode": "EUR",
  "amount": 0.01,
  "walletAddress": "bc1q..."
}
```

#### Get My Orders

```
GET /api/orders?status=PENDING&page=1&limit=10
```

### KYC

#### Get Form Fields

```
GET /api/kyc/form-fields
```

#### Submit Form

```
POST /api/kyc/submit-form
{
  "first_name": "John",
  "last_name": "Doe",
  ...
}
```

#### Upload Document

```
POST /api/kyc/upload-document
Content-Type: multipart/form-data

file: [binary]
documentType: "passport"
```

#### Get KYC Status

```
GET /api/kyc/status
```

### Rates

#### Get Current Rates

```
GET /api/rates
```

#### Get Payment Methods

```
GET /api/payment-methods?currency=EUR
```

---

## Admin API Endpoints

### Users

```
GET  /api/admin/users?search=email&role=CLIENT&kycStatus=APPROVED
GET  /api/admin/users/[id]
PATCH /api/admin/users/[id]
GET  /api/admin/users/[id]/orders
GET  /api/admin/users/[id]/activity
```

### Orders

```
GET  /api/admin/orders?status=PENDING
PATCH /api/admin/orders/[id]
POST /api/admin/orders/create-for-client
```

### KYC

```
GET  /api/admin/kyc?status=PENDING
GET  /api/admin/kyc/[id]
POST /api/admin/kyc/[id]/approve
POST /api/admin/kyc/[id]/reject
GET  /api/admin/kyc/fields
PATCH /api/admin/kyc/fields/[id]
```

### Trading Pairs

```
GET    /api/admin/trading-pairs
POST   /api/admin/trading-pairs
PATCH  /api/admin/trading-pairs/[id]
DELETE /api/admin/trading-pairs/[id]
```

### Payment Methods

```
GET    /api/admin/payment-methods
POST   /api/admin/payment-methods
PATCH  /api/admin/payment-methods/[id]
DELETE /api/admin/payment-methods/[id]
```

### Wallets

```
GET    /api/admin/wallets
POST   /api/admin/wallets
PATCH  /api/admin/wallets/[id]
DELETE /api/admin/wallets/[id]
```

### Rates

```
GET    /api/admin/rates
POST   /api/admin/rates/manual
DELETE /api/admin/rates/manual/[id]
```

### Settings

```
GET   /api/admin/settings?category=trading
PATCH /api/admin/settings
PATCH /api/admin/settings/[key]
```

### Integrations

```
GET   /api/admin/integrations
GET   /api/admin/integrations/[service]
PATCH /api/admin/integrations/[service]
POST  /api/admin/integrations/[service]/test
```

### API Keys

```
GET    /api/admin/api-keys
POST   /api/admin/api-keys
DELETE /api/admin/api-keys/[id]
GET    /api/admin/api-keys/[id]/usage
```

### Audit

```
GET /api/admin/audit?action=ORDER_CREATED&fromDate=...&toDate=...
GET /api/admin/audit/stats
GET /api/admin/audit/[entity]/[entityId]
```

### Statistics

```
GET /api/admin/stats
```

---

## Webhooks

### KYCAID Webhook

**Endpoint:** `POST /api/kyc/webhook`

**Signature Verification:** Required

KYCAID sends webhook on verification complete:

```json
{
  "verification_id": "...",
  "status": "completed",
  "applicant_id": "..."
}
```

Platform automatically updates KYC status.

---

## Testing

### Test Accounts

**Admin:**
- Email: admin@apricode.io
- Password: SecureAdmin123!

**Client:**
- Email: client@test.com
- Password: TestClient123!
- KYC: APPROVED

### Test API Keys

Generate in admin panel:
- Name: "Test Integration"
- Permissions: All
- Rate Limit: 1000/hour

### Test Orders

Use test client account to create orders and test full flow.

---

## Examples

### cURL Examples

#### Get Rates

```bash
curl -X GET https://apricode.io/api/v1/rates \
  -H "Authorization: Bearer apx_live_your_key"
```

#### Create Order

```bash
curl -X POST https://apricode.io/api/v1/orders \
  -H "Authorization: Bearer apx_live_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "client@example.com",
    "currencyCode": "BTC",
    "fiatCurrencyCode": "EUR",
    "amount": 0.01,
    "walletAddress": "bc1q..."
  }'
```

### JavaScript Examples

```javascript
// Get rates
const response = await fetch('https://apricode.io/api/v1/rates', {
  headers: {
    'Authorization': 'Bearer apx_live_your_key'
  }
});

const data = await response.json();
console.log(data.data.rates.BTC.EUR);

// Create order
const order = await fetch('https://apricode.io/api/v1/orders', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer apx_live_your_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userEmail: 'client@example.com',
    currencyCode: 'BTC',
    fiatCurrencyCode: 'EUR',
    amount: 0.01,
    walletAddress: 'bc1q...'
  })
});

const orderData = await order.json();
console.log(orderData.data.paymentReference);
```

---

## Security Best Practices

### API Keys

1. ✅ **Never commit** API keys to version control
2. ✅ **Rotate keys** regularly (every 90 days)
3. ✅ **Use environment variables** for storage
4. ✅ **Set minimal permissions** needed
5. ✅ **Monitor usage** in admin panel

### Request Security

1. ✅ **Always use HTTPS** in production
2. ✅ **Validate responses** before using data
3. ✅ **Handle errors** gracefully
4. ✅ **Log failures** for debugging
5. ✅ **Implement retries** with exponential backoff

### Data Protection

1. ✅ **Never log** API keys or sensitive data
2. ✅ **Encrypt** data in transit
3. ✅ **Validate** all inputs
4. ✅ **Sanitize** outputs

---

## Changelog

### Version 1.0 (October 2025)

**Initial Release:**
- Public API v1 with rates, currencies, orders
- API key authentication
- Rate limiting
- Comprehensive audit logging
- Admin panel with full CRUD operations

---

## Support

**Technical Issues:**
- Email: dev@apricode.io

**Documentation:**
- Admin Guide: `ADMIN_GUIDE.md`
- README: `README.md`

**API Status:**
- Health Check: `GET /api/health` (coming soon)

---

**Last Updated:** October 2025
**API Version:** 1.0






