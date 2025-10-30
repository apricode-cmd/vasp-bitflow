# KYCAID Webhook Configuration Guide

## 📋 Overview

This guide explains how to configure KYCAID webhooks to receive real-time verification updates.

## 🔗 Webhook URL

Your webhook URL is **automatically displayed** in the Admin Panel when configuring KYCAID integration.

### Format
```
https://your-domain.com/api/kyc/webhook?provider=kycaid
```

### Example (Development)
```
http://localhost:3000/api/kyc/webhook?provider=kycaid
```

### Example (Production)
```
https://exchange.apricode.agency/api/kyc/webhook?provider=kycaid
```

## ⚙️ Configuration Steps

### 1. Copy Webhook URL from Admin Panel

1. Login to Admin Panel
2. Navigate to **Settings → Integrations**
3. Click **Configure** on KYCAID card
4. Find **"Webhook URL"** field
5. Click **Copy** button

### 2. Configure in KYCAID Dashboard

1. Login to [KYCAID Dashboard](https://dashboard.kycaid.com)
2. Go to **Settings → Webhooks**
3. Click **Add Webhook**
4. Paste your webhook URL
5. Select events to send:
   - ✅ `verification.completed` (required)
   - ✅ `verification.pending`
   - ✅ `verification.failed`
   - ✅ `applicant.updated`
6. **Optional:** Add Webhook Secret for signature verification
7. Click **Save**

### 3. (Optional) Configure Webhook Secret

For enhanced security, KYCAID can sign webhook requests:

1. In KYCAID Dashboard, copy the **Webhook Secret**
2. In Admin Panel → Integrations → KYCAID → Configure
3. Paste the secret into **"Webhook Secret"** field
4. Click **Save Settings**

Our system will automatically verify webhook signatures if a secret is configured.

## 🧪 Testing the Webhook

### Method 1: Admin Panel Test
1. In Admin Panel → Integrations → KYCAID
2. Click **Test Connection**
3. Check server logs for webhook connectivity

### Method 2: Browser Test
Open in browser:
```
https://your-domain.com/api/kyc/webhook?provider=kycaid
```

Expected response:
```json
{
  "message": "KYC Webhook Endpoint",
  "provider": "kycaid",
  "endpoint": "/api/kyc/webhook?provider=kycaid",
  "method": "POST",
  "status": "online",
  "timestamp": "2025-01-30T12:00:00.000Z"
}
```

### Method 3: KYCAID Dashboard Test
1. In KYCAID Dashboard → Webhooks
2. Find your webhook
3. Click **Test** button
4. Check server logs for received webhook

## 📊 Webhook Events

Our system processes the following KYCAID events:

| Event | Status Update | Description |
|-------|---------------|-------------|
| `verification.pending` | `PENDING` | User started verification |
| `verification.completed` + `verified: true` | `APPROVED` | Verification passed |
| `verification.completed` + `verified: false` | `REJECTED` | Verification failed |
| `applicant.updated` | (no change) | Applicant data updated |

## 🔍 Monitoring Webhooks

### Server Logs
Webhook activity is logged with detailed information:

```bash
# Successful webhook
📥 Received webhook from kycaid
✅ Webhook processed successfully

# Failed webhook
⚠️ Webhook processing failed: Session not found
```

### Check Logs
```bash
# Development
npm run dev

# Production
pm2 logs
# or
docker logs your-container
```

## 🐛 Troubleshooting

### Webhook not received

1. **Check firewall settings**
   - Ensure port 443 (HTTPS) or 3000 (dev) is open
   - Whitelist KYCAID IP addresses if using firewall

2. **Verify URL is correct**
   - Must include `?provider=kycaid`
   - Must be publicly accessible (not localhost in production)

3. **Check KYCAID Dashboard**
   - View webhook delivery history
   - Check for error responses

### Invalid signature error

1. **Verify webhook secret matches**
   - Secret in Admin Panel = Secret in KYCAID Dashboard

2. **Check webhook is sent by KYCAID**
   - Our system expects signature in `x-signature` header

### Session not found

This warning means:
- Webhook received for unknown verification
- Possible reasons:
  - User started verification outside our system
  - Verification ID mismatch
  - Database was reset

**Solution:** This is usually safe to ignore. New verification sessions will work correctly.

## 🔐 Security

### Signature Verification
If webhook secret is configured, our system:
1. Extracts signature from `x-signature` header
2. Computes expected signature using HMAC-SHA256
3. Compares signatures (constant-time comparison)
4. Rejects webhook if signatures don't match

### No Secret Configured
- Webhooks are still processed
- Less secure (anyone knowing URL can send fake webhooks)
- **Recommended:** Always configure webhook secret in production

## 📝 Webhook Payload Example

KYCAID sends JSON payload:

```json
{
  "type": "verification",
  "verification_id": "fe35fa0c16ccd04c222ba069a958bd5eb5a1",
  "applicant_id": "3a9cd7481b90c04c0b2b5bc9c8ef19007ed9",
  "status": "completed",
  "verified": true,
  "comment": null,
  "decline_reasons": []
}
```

Our system extracts:
- `verification_id` → finds KYC session
- `status` + `verified` → updates session status
- `decline_reasons` → stores as rejection reason

## 🚀 Next Steps

After webhook is configured:

1. **Test complete flow:**
   - Register new user
   - Start KYC verification
   - Complete verification in KYCAID
   - Wait for webhook (usually instant)
   - Check user status updated to APPROVED

2. **Monitor in Admin Panel:**
   - Navigate to **Users → KYC Reviews**
   - Check webhook data in session details

3. **Set up notifications:**
   - Email notifications are sent automatically
   - Check `src/lib/services/email.ts` for customization

---

**Questions?** Check server logs or contact support.

