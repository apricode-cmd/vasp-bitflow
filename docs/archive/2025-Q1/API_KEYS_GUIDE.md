# API Keys Management Guide

## 🔐 Overview

Apricode Exchange provides REST API access через API keys для внешних интеграций. All API keys are securely stored using **AES-256-GCM encryption**.

---

## 🔑 Key Features

### Security
- **AES-256-GCM Encryption**: API keys зашифрованы перед сохранением
- **SHA-256 Hash Index**: Быстрый lookup по хешу (timing-safe)
- **One-Time Display**: Ключ показывается только один раз при генерации
- **Secure Validation**: Constant-time comparison для защиты от timing attacks

### Management
- **Rate Limiting**: Configurable requests/hour
- **Permissions**: Granular resource-action permissions
- **Expiration**: Optional expiry dates
- **Usage Tracking**: Full audit trail of API calls
- **IP Tracking**: Monitor where keys are used from

---

## 🛠️ API Key Format

```
apx_live_[64 hex characters]
```

Example:
```
apx_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

## 📝 Generating API Keys

### Via Admin Panel

1. Navigate to `/admin/api-keys`
2. Click "Generate New Key"
3. Fill in:
   - **Name**: Description (e.g., "Production Bot", "Test Integration")
   - **Rate Limit**: Requests per hour (default: 100)
4. Click "Generate Key"
5. **⚠️ COPY THE KEY IMMEDIATELY** - it will not be shown again!

### Storage

| Field | Storage Method | Purpose |
|-------|---------------|---------|
| `key` | AES-256-GCM Encrypted | Secure storage |
| `keyHash` | SHA-256 Hash | Fast lookup (indexed) |
| `prefix` | Plain text | Display first 12 chars |

---

## 🔒 Encryption Details

### Encryption Algorithm
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **IV**: 16 bytes random
- **Auth Tag**: 16 bytes for integrity verification

### Encryption Process
```typescript
plainKey → AES-256-GCM → iv:authTag:encrypted
```

### Storage Format
```
[16 bytes IV]:[16 bytes Auth Tag]:[encrypted data]
(hex encoded, separated by colons)
```

### Validation Process
1. User provides API key
2. Hash key with SHA-256
3. Lookup by hash (indexed, fast)
4. Decrypt stored key
5. Constant-time comparison
6. Check expiration & user status
7. Update last used timestamp

---

## 🎯 Permissions System

### Available Resources
- `rates` - Exchange rates
- `currencies` - Supported currencies
- `orders` - Order management

### Available Actions
- `read` - GET requests
- `create` - POST requests
- `update` - PUT/PATCH requests
- `delete` - DELETE requests
- `*` - All actions (wildcard)

### Example Permissions
```json
{
  "rates": ["read"],
  "currencies": ["read"],
  "orders": ["read", "create"]
}
```

This allows:
- ✅ GET /api/v1/rates
- ✅ GET /api/v1/currencies
- ✅ GET /api/v1/orders
- ✅ POST /api/v1/orders
- ❌ DELETE /api/v1/orders (not permitted)

---

## 📊 Rate Limiting

### Default Limits
- **Default**: 100 requests/hour
- **Configurable**: Can be adjusted per key
- **Window**: Rolling 1-hour window
- **Response**: HTTP 429 (Too Many Requests) when exceeded

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1635780000
```

---

## 🔍 Usage Tracking

### Logged Information
- **Endpoint**: Request path
- **Method**: HTTP method
- **Status Code**: Response status
- **Response Time**: Duration in ms
- **IP Address**: Client IP
- **User Agent**: Client software
- **Timestamp**: Request time
- **Error Message**: If failed

### Analytics Available
- Total requests
- Success/failure rates
- Average response time
- Requests by endpoint
- Requests by day (30-day history)

---

## 🚀 Using API Keys

### Authentication Header
```http
GET /api/v1/rates HTTP/1.1
Host: api.apricode.io
X-API-Key: apx_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...
```

### cURL Example
```bash
curl -H "X-API-Key: apx_live_YOUR_KEY_HERE" \
  https://api.apricode.io/api/v1/rates
```

### JavaScript Example
```javascript
const response = await fetch('https://api.apricode.io/api/v1/orders', {
  method: 'GET',
  headers: {
    'X-API-Key': 'apx_live_YOUR_KEY_HERE',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

### Python Example
```python
import requests

headers = {
    'X-API-Key': 'apx_live_YOUR_KEY_HERE',
    'Content-Type': 'application/json'
}

response = requests.get(
    'https://api.apricode.io/api/v1/rates',
    headers=headers
)

data = response.json()
```

---

## ⚠️ Security Best Practices

### DO ✅
- Store keys in environment variables
- Use HTTPS only
- Rotate keys regularly
- Set expiration dates
- Monitor usage patterns
- Use separate keys for dev/prod
- Revoke unused keys immediately
- Set appropriate rate limits
- Implement error handling

### DON'T ❌
- Commit keys to git
- Share keys publicly
- Log full keys in plain text
- Use the same key everywhere
- Exceed rate limits
- Ignore expiration warnings
- Store keys in frontend code
- Use keys without HTTPS
- Share keys between environments

---

## 🔄 Key Lifecycle

### 1. Generation
```
Admin creates key → AES encryption → Store with hash
```

### 2. Active Use
```
Client request → Hash lookup → Decrypt → Validate → Process
```

### 3. Monitoring
```
Every request → Log usage → Check rate limit → Update stats
```

### 4. Revocation
```
Admin revokes → Mark inactive → Reject future requests
```

---

## 🛑 Revoking Keys

### When to Revoke
- Key exposed/compromised
- Integration deprecated
- User access revoked
- Security incident
- Regular rotation schedule

### How to Revoke
1. Go to `/admin/api-keys`
2. Find the key
3. Click "Revoke" button
4. Confirm action

### Effect
- ✅ Immediately blocks all requests
- ✅ Returns 401 Unauthorized
- ✅ Audit log entry created
- ✅ Usage stats preserved

---

## 📈 Monitoring & Analytics

### Key Metrics Dashboard
- **Total Requests**: All-time usage count
- **Success Rate**: % of successful requests
- **Avg Response Time**: Performance metric
- **Last Used**: Most recent activity
- **Last Used IP**: Geographic tracking

### Usage Analytics
```typescript
{
  totalRequests: 1523,
  successfulRequests: 1487,
  failedRequests: 36,
  avgResponseTime: 234, // ms
  requestsByEndpoint: {
    '/api/v1/rates': 502,
    '/api/v1/orders': 1021
  },
  requestsByDay: [
    { date: '2025-10-01', count: 245 },
    { date: '2025-10-02', count: 312 }
  ]
}
```

---

## 🔧 Troubleshooting

### Error: 401 Unauthorized
**Причина**: Invalid or revoked API key
**Решение**: Check key is correct and active

### Error: 403 Forbidden
**Причина**: Missing permissions
**Решение**: Check permission configuration

### Error: 429 Too Many Requests
**Причина**: Rate limit exceeded
**Решение**: Wait or request limit increase

### Error: 500 Internal Server Error
**Причина**: Server-side issue
**Решение**: Contact support with request ID

---

## 📚 API Endpoints

### Available Endpoints
- `GET /api/v1/rates` - Current exchange rates
- `GET /api/v1/currencies` - Supported currencies
- `GET /api/v1/orders` - List orders
- `GET /api/v1/orders/:id` - Get order details
- `POST /api/v1/orders` - Create new order

### Rate Endpoint Example
```http
GET /api/v1/rates?crypto=BTC&fiat=EUR
X-API-Key: apx_live_...

Response:
{
  "success": true,
  "data": {
    "pair": "BTC/EUR",
    "rate": 42500.50,
    "timestamp": "2025-10-25T12:00:00Z"
  }
}
```

---

## 🎓 Best Practices for Integration

### 1. Environment-Specific Keys
```bash
# .env.development
API_KEY=apx_test_...

# .env.production
API_KEY=apx_live_...
```

### 2. Error Handling
```typescript
try {
  const response = await fetch(url, { headers });
  
  if (response.status === 429) {
    // Handle rate limit
    await sleep(60000);
    return retry();
  }
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return await response.json();
} catch (error) {
  logger.error('API request failed', error);
  throw error;
}
```

### 3. Rate Limit Handling
```typescript
const rateLimiter = {
  remaining: 100,
  reset: Date.now(),
  
  async wait() {
    if (this.remaining <= 0) {
      const delay = this.reset - Date.now();
      await sleep(Math.max(0, delay));
    }
  },
  
  update(headers) {
    this.remaining = parseInt(headers['x-ratelimit-remaining']);
    this.reset = parseInt(headers['x-ratelimit-reset']) * 1000;
  }
};
```

---

## 🔐 Environment Variables

### Required
```bash
# NextAuth secret (used for key derivation if API_KEY_ENCRYPTION_SECRET not set)
NEXTAUTH_SECRET="your-strong-secret-here"

# Or dedicated encryption secret
API_KEY_ENCRYPTION_SECRET="your-encryption-secret-here"
```

### Recommendations
- **Secret Length**: Minimum 32 characters
- **Randomness**: Use cryptographically secure random generator
- **Storage**: Never commit to version control
- **Rotation**: Change periodically in production

### Generate Secure Secret
```bash
# Generate 32-byte random secret
openssl rand -hex 32
```

---

## 📝 Audit Trail

Every API key action is logged:
- ✅ Key generation
- ✅ Key revocation
- ✅ Key usage (every request)
- ✅ Permission checks
- ✅ Rate limit violations
- ✅ Authentication failures

---

## ❓ FAQ

### Q: Can I recover a lost API key?
**A:** No. For security reasons, keys cannot be recovered. Generate a new key if lost.

### Q: How many API keys can I create?
**A:** No limit, but manage them responsibly.

### Q: Can I modify permissions after creation?
**A:** Not currently. Revoke and create new key with updated permissions.

### Q: What happens if my key is exposed?
**A:** Revoke immediately. Generate new key. Review audit logs.

### Q: Can I use the same key for multiple applications?
**A:** Not recommended. Use separate keys for better tracking and security.

### Q: How long are keys valid?
**A:** Keys don't expire unless you set an expiration date.

---

## 🆘 Support

- **Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Admin Guide**: [ADMIN_GUIDE.md](./ADMIN_GUIDE.md)
- **Security**: [SECURITY.md](./SECURITY.md)

---

**🔒 Remember: Treat API keys like passwords. Never share or expose them publicly.**

