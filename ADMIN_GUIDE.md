# Apricode Exchange - Administrator Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [User Management](#user-management)
4. [KYC Review Process](#kyc-review-process)
5. [Order Management](#order-management)
6. [Trading Pairs Configuration](#trading-pairs-configuration)
7. [Payment Methods](#payment-methods)
8. [Platform Wallets](#platform-wallets)
9. [Exchange Rates Management](#exchange-rates-management)
10. [System Settings](#system-settings)
11. [Integration Settings](#integration-settings)
12. [API Keys Management](#api-keys-management)
13. [Audit Logs](#audit-logs)
14. [Best Practices](#best-practices)

---

## Getting Started

### Login Credentials

Default admin account:
- **Email:** admin@apricode.io
- **Password:** SecureAdmin123! (change this immediately in production!)

### First Steps

1. **Login** to admin panel at `/admin`
2. **Review System Settings** - configure platform fee, limits
3. **Check Integration Settings** - verify KYCAID, Resend, CoinGecko
4. **Configure Bank Details** - add or update bank accounts
5. **Review Trading Pairs** - ensure all pairs are properly configured

---

## Dashboard Overview

**Path:** `/admin/dashboard-v2`

The enhanced dashboard provides:

- **Real-time Statistics**
  - Total orders (by status)
  - Total users (active/inactive)
  - Total volume (completed orders)
  - Pending KYC reviews

- **System Health**
  - Trading pairs status
  - Payment methods availability
  - Platform wallets count
  - Active API keys
  - Integration status

- **Recent Activity**
  - Latest admin actions
  - Recent orders
  - Pending KYC submissions

**Auto-refresh:** Dashboard auto-refreshes every 30 seconds

---

## User Management

**Path:** `/admin/users`

### View Users

**Filters available:**
- Search by email or name
- Filter by role (CLIENT/ADMIN)
- Filter by KYC status

### User Actions

**View Details:** Click "View" to see:
- Profile information
- KYC status and documents
- Order history
- Wallet addresses
- Activity logs

**Block/Unblock User:**
1. Click "Block" button
2. User will be logged out and cannot login
3. All API access will be denied
4. Action is logged in audit trail

**Note:** You cannot block yourself!

---

## KYC Review Process

**Path:** `/admin/kyc`

### Review Workflow

1. **View Pending KYC**
   - List shows all pending submissions
   - Click to view detailed application

2. **Review Documents**
   - ID document front/back
   - Selfie with document
   - AI liveness check results

3. **Review Form Data**
   - Personal information
   - Address details
   - Contact information

4. **Decision**
   - **Approve:** User can trade immediately, KYC valid for 12 months
   - **Reject:** User cannot trade, provide detailed reason

### Approve KYC

**API:** `POST /api/admin/kyc/[id]/approve`

```bash
{
  "reviewNotes": "Optional admin notes"
}
```

### Reject KYC

**API:** `POST /api/admin/kyc/[id]/reject`

```bash
{
  "rejectionReason": "Required - explain why (min 10 chars)",
  "reviewNotes": "Optional admin notes"
}
```

### Configure KYC Fields

**Path:** `/admin/kyc/settings`

- Enable/disable fields
- Mark fields as required/optional
- Set field priority (display order)

---

## Order Management

**Paths:**
- List view: `/admin/orders`
- Kanban view: `/admin/orders-kanban`

### Kanban Board

Drag-and-drop orders between statuses:

**Columns:**
1. PENDING - Waiting for payment
2. PAYMENT_PENDING - Payment proof uploaded
3. PAYMENT_RECEIVED - Payment confirmed
4. PROCESSING - Sending cryptocurrency
5. COMPLETED - Transaction complete
6. CANCELLED - Order cancelled

### Order Status Flow

```
PENDING → PAYMENT_PENDING → PAYMENT_RECEIVED → PROCESSING → COMPLETED
                                                              ↓
                                                          CANCELLED
```

### Update Order Status

**API:** `PATCH /api/admin/orders/[id]`

```bash
{
  "status": "PROCESSING",
  "adminNotes": "Verified payment, sending crypto",
  "transactionHash": "0x..." # Required for COMPLETED
}
```

### Create Order for Client

**Path:** `/admin/orders/create`
**API:** `POST /api/admin/orders/create-for-client`

```bash
{
  "userEmail": "client@example.com",
  "currencyCode": "BTC",
  "fiatCurrencyCode": "EUR",
  "cryptoAmount": 0.01,
  "walletAddress": "bc1q...",
  "customRate": 50000, # Optional - override market rate
  "adminNotes": "VIP client order"
}
```

**Requirements:**
- User must exist
- User must have APPROVED KYC
- Trading pair must be active

---

## Trading Pairs Configuration

**Path:** `/admin/pairs`

### Manage Trading Pairs

Each trading pair (e.g., BTC/EUR) has:

- **Min/Max Crypto Amount** - Order size limits in cryptocurrency
- **Min/Max Fiat Amount** - Order size limits in fiat currency
- **Fee Percent** - Platform commission (default 1.5%)
- **Priority** - Display order

### Edit Trading Pair

1. Click "Edit" button
2. Update limits or fees
3. Click "Save"
4. Changes apply immediately

### Deactivate Pair

- Deactivated pairs are not shown to clients
- Existing orders are not affected
- Can be reactivated anytime

---

## Payment Methods

**Path:** `/admin/payment-methods`

### Available Types

1. **Bank Transfer**
   - SEPA (EUR)
   - Domestic (PLN)
   - Processing time: 1-2 business days

2. **Card Payment** (coming soon)
   - Instant processing
   - Higher fees

### Add Payment Method

**Fields:**
- Type (bank_transfer/card_payment)
- Name (display name)
- Currency
- Processing time
- Min/max amounts
- Fixed fee + percent fee
- Instructions for users

### Configure Fees

- **Fixed Fee:** Flat amount (e.g., €0.50)
- **Percent Fee:** Percentage of order (e.g., 2.5%)
- **Total Fee** = Fixed + (Amount × Percent / 100)

---

## Platform Wallets

**Path:** `/admin/wallets`

### Wallet Types

Platform wallets receive cryptocurrency from completed orders.

**Supported Blockchains:**
- Bitcoin (BITCOIN)
- Ethereum (ETHEREUM)
- Binance Smart Chain (BSC)
- Polygon (POLYGON)
- Solana (SOLANA)

### Add Platform Wallet

**API:** `POST /api/admin/wallets`

```bash
{
  "currencyCode": "BTC",
  "blockchainCode": "BITCOIN",
  "address": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
  "label": "Main BTC Hot Wallet"
}
```

**Address Validation:**
- BTC: Starts with 1, 3, or bc1
- ETH/USDT: 0x + 40 hex characters
- SOL: Base58, 32-44 characters

**Security:**
- Use cold storage for large amounts
- Regular wallet rotation
- Monitor balances

---

## Exchange Rates Management

**Path:** `/admin/rates`

### Rate Sources

1. **Market Rates** - From CoinGecko API
2. **Manual Overrides** - Admin-set rates

### Set Manual Rate

**API:** `POST /api/admin/rates/manual`

```bash
{
  "cryptoCode": "BTC",
  "fiatCode": "EUR",
  "rate": 50000,
  "validTo": "2025-12-31T23:59:59Z", # Optional
  "reason": "Market volatility protection"
}
```

**Use Cases:**
- Protect against rapid price changes
- Set guaranteed rates for VIP clients
- Temporary rate adjustments

### Remove Manual Rate

Manual rates can be removed, reverting to market rates:

**API:** `DELETE /api/admin/rates/manual/[id]`

---

## System Settings

**Path:** `/admin/settings-v2`

### Categories

#### General
- `platform_name` - Platform display name
- `support_email` - Support contact email

#### Trading
- `platform_fee` - Default fee percentage (1.5%)
- `order_expiry_hours` - Payment deadline (24 hours)
- `min_order_eur` - Minimum order value
- `max_order_eur` - Maximum order value

#### KYC
- `kyc_expiry_months` - KYC validity period (12 months)

### Update Settings

Changes take effect immediately for new orders.

---

## Integration Settings

**Path:** `/admin/integrations`

### Configured Integrations

#### KYCAID
- **Purpose:** KYC verification and liveness checks
- **Required:** API Key, Form ID, Webhook Secret
- **Test:** Ping KYCAID API

#### Resend
- **Purpose:** Email notifications
- **Required:** API Key, From email
- **Test:** Send test email

#### CoinGecko
- **Purpose:** Exchange rates
- **Required:** Base URL
- **Test:** Ping API

### Update Integration

**API:** `PATCH /api/admin/integrations/[service]`

```bash
{
  "config": {
    "apiKey": "your-api-key",
    "formId": "form-id"
  },
  "isEnabled": true
}
```

**Security:** API keys are encrypted in database using AES-256-GCM

---

## API Keys Management

**Path:** `/admin/api-keys`

### Generate API Key

**Use Cases:**
- External integrations
- Mobile apps
- Third-party services

**API:** `POST /api/admin/api-keys`

```bash
{
  "name": "Production Integration",
  "permissions": {
    "orders": ["read", "create"],
    "rates": ["read"],
    "currencies": ["read"]
  },
  "rateLimit": 100, # Requests per hour
  "userId": "user-id" # Optional - bind to specific user
}
```

**Response:**

```bash
{
  "success": true,
  "data": {
    "apiKey": { ... },
    "key": "apx_live_abc123..." # SAVE THIS - shown only once!
  }
}
```

### API Key Format

- Prefix: `apx_live_` or `apx_test_`
- Length: 64 characters
- Hashed in database with bcrypt

### Usage

Include in requests:

```bash
# Header: Authorization
Authorization: Bearer apx_live_abc123...

# Or header: X-API-Key
X-API-Key: apx_live_abc123...
```

### Rate Limiting

- Default: 100 requests/hour
- Configurable per key
- 429 status code when exceeded

### Revoke API Key

Revoked keys are immediately invalid. All requests will return 401 Unauthorized.

---

## Audit Logs

**Path:** `/admin/audit`

### View Logs

**Filters:**
- Action type (e.g., ORDER_CREATED)
- Entity (e.g., Order)
- User ID
- Date range

### Audit Actions

Logged automatically:
- ✅ User registration/login
- ✅ Order creation/updates
- ✅ KYC approvals/rejections
- ✅ Settings changes
- ✅ Trading pair updates
- ✅ Payment method changes
- ✅ Wallet additions
- ✅ API key generation/revocation

### Audit Log Entry

```bash
{
  "id": "...",
  "userId": "admin-id",
  "action": "ORDER_STATUS_CHANGED",
  "entity": "Order",
  "entityId": "order-id",
  "oldValue": { "status": "PENDING" },
  "newValue": { "status": "PROCESSING" },
  "metadata": { "paymentReference": "APR-..." },
  "ipAddress": "192.168.1.1",
  "createdAt": "2025-01-01T12:00:00Z"
}
```

---

## Best Practices

### Security

1. ✅ **Change default admin password immediately**
2. ✅ **Use strong passwords** (min 8 chars, mixed case, numbers, symbols)
3. ✅ **Enable 2FA** for admin accounts (coming soon)
4. ✅ **Review audit logs** regularly
5. ✅ **Rotate API keys** periodically
6. ✅ **Use HTTPS** in production only

### KYC Review

1. ✅ **Verify all documents** carefully
2. ✅ **Check AI liveness** results
3. ✅ **Provide clear rejection reasons**
4. ✅ **Review within 24 hours** of submission

### Order Processing

1. ✅ **Verify payment** before changing to PAYMENT_RECEIVED
2. ✅ **Double-check wallet address** before sending crypto
3. ✅ **Add transaction hash** when completed
4. ✅ **Add admin notes** for transparency

### Rate Management

1. ✅ **Monitor market rates** regularly
2. ✅ **Use manual overrides** cautiously
3. ✅ **Set expiry** for temporary rates
4. ✅ **Document reasons** for rate changes

### Maintenance

1. ✅ **Backup database** daily
2. ✅ **Monitor integration status** (dashboard)
3. ✅ **Review system health** indicators
4. ✅ **Check error logs** for issues

---

## Support

For technical issues:
- Email: support@apricode.io
- Documentation: `/README.md`
- API Docs: `API_DOCUMENTATION.md`

---

**Last Updated:** October 2025
**Version:** 1.0

