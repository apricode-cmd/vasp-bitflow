# Integration Security Setup

## 🔐 Secure API Key Storage

All integration API keys are encrypted using **AES-256-GCM** before storage in the database.

### Setup Instructions

#### 1. Generate Encryption Secret

Add this to your `.env.local`:

```bash
# Generate encryption secret (run this command):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env.local:
ENCRYPTION_SECRET="your-generated-64-char-hex-string"
```

**⚠️ IMPORTANT:**
- The secret must be at least 32 characters
- Keep it secure and never commit to git
- If you lose it, encrypted data cannot be recovered
- Use the same secret across all environments for the same database

#### 2. Verify Environment Variables

Ensure these are set in `.env.local`:

```bash
# Required for encryption
ENCRYPTION_SECRET="..." # 64-char hex string

# Required for NextAuth
NEXTAUTH_SECRET="..." # min 32 chars
NEXTAUTH_URL="http://localhost:3000"

# Database
DATABASE_URL="postgresql://..."
```

## 🔄 How It Works

### 1. Activation Flow

```typescript
// Admin activates integration with API key
POST /api/admin/integrations
{
  "service": "kycaid",
  "updates": {
    "apiKey": "sk_live_abc123...",  // Plain text sent
    "apiEndpoint": "https://api.kycaid.com",
    "isEnabled": true
  }
}

// Server encrypts API key before storing
encrypted = encrypt(apiKey) // "iv:authTag:encrypted"
// Stored in database: "a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."
```

### 2. Usage Flow

```typescript
// Integration needs API key for operation
const integration = await getIntegrationWithSecrets('kycaid');
// Returns: { apiKey: "sk_live_abc123..." } // Decrypted

// For display to admin
const integration = await getIntegrationForDisplay('kycaid');
// Returns: { apiKey: "sk_l••••••••••23" } // Masked
```

### 3. Testing Flow

```typescript
// Admin tests integration
POST /api/admin/integrations/kycaid/test

// Server:
// 1. Decrypts API key
// 2. Initializes provider with real key
// 3. Calls provider.testConnection()
// 4. Updates status (active/error)
// 5. Logs action to audit log
```

## 📝 Audit Logging

All integration changes are logged:

```typescript
// Logged actions:
- INTEGRATION_ACTIVATED   // When integration is enabled
- INTEGRATION_DEACTIVATED // When integration is disabled
- INTEGRATION_UPDATED     // When config changes
- INTEGRATION_TESTED      // When connection test runs

// Each log includes:
- userId (who made the change)
- timestamp
- old/new values
- success/failure
```

## 🔧 API Endpoints

### Get All Integrations
```
GET /api/admin/integrations
```

Returns integrations with **masked** API keys:
```json
{
  "success": true,
  "integrations": [
    {
      "service": "kycaid",
      "displayName": "KYCAID",
      "isEnabled": true,
      "status": "active",
      "apiKey": "sk_l••••••••••23",  // Masked
      "lastTested": "2025-01-27T12:00:00Z"
    }
  ]
}
```

### Update Integration
```
PUT /api/admin/integrations
```

Request:
```json
{
  "service": "kycaid",
  "updates": {
    "apiKey": "sk_live_new_key",  // Will be encrypted
    "apiEndpoint": "https://api.kycaid.com",
    "isEnabled": true
  }
}
```

### Test Integration
```
POST /api/admin/integrations/{service}/test
```

Tests connection and updates status automatically.

## 🛡️ Security Features

### 1. **AES-256-GCM Encryption**
- Industry-standard encryption
- Authenticated encryption (prevents tampering)
- Unique IV (initialization vector) for each encryption
- Auth tag verification on decryption

### 2. **API Key Masking**
- Only first 4 and last 4 characters visible
- Example: `sk_live_abc123def456ghi789jkl` → `sk_l••••••••••jkl`
- Prevents accidental exposure in logs/UI

### 3. **Audit Logging**
- Every change is logged with user ID
- Timestamps for compliance
- Can track who activated/deactivated integrations

### 4. **Role-Based Access**
- Only ADMIN role can manage integrations
- Checked on every API call
- User ID required for logging

## 🚨 Security Warnings

### ❌ NEVER:
- Commit `.env` files to git
- Share `ENCRYPTION_SECRET` in plain text
- Log decrypted API keys
- Return decrypted keys in API responses (except for internal use)
- Reuse encryption secrets across different projects

### ✅ ALWAYS:
- Use environment variables for secrets
- Generate strong random encryption secrets (32+ bytes)
- Backup `ENCRYPTION_SECRET` securely (password manager)
- Rotate API keys periodically
- Monitor audit logs for suspicious activity

## 📊 Database Schema

```prisma
model Integration {
  id          String   @id @default(cuid())
  service     String   @unique
  isEnabled   Boolean  @default(false)
  status      String   @default("inactive") // active|inactive|error
  apiKey      String?  // ENCRYPTED with AES-256-GCM
  apiEndpoint String?
  lastTested  DateTime?
  config      Json?
  rates       Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  action     String   // INTEGRATION_ACTIVATED, etc.
  entity     String   // "Integration"
  entityId   String
  oldValue   Json?
  newValue   Json?
  metadata   Json?
  createdAt  DateTime @default(now())
  
  user       User     @relation(...)
}
```

## 🔄 Migration from Old System

If you have existing integrations without encryption:

```typescript
// Run this script to encrypt existing keys
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/services/encryption.service';

async function migrateExistingKeys() {
  const integrations = await prisma.integration.findMany({
    where: {
      apiKey: { not: null }
    }
  });

  for (const integration of integrations) {
    if (integration.apiKey && !integration.apiKey.includes(':')) {
      // Not encrypted yet (encrypted format: "iv:authTag:data")
      const encrypted = encrypt(integration.apiKey);
      
      await prisma.integration.update({
        where: { id: integration.id },
        data: { apiKey: encrypted }
      });
      
      console.log(`✅ Encrypted API key for ${integration.service}`);
    }
  }
}
```

## 📞 Support

For security concerns or questions:
- Review audit logs: `prisma studio` → AuditLog table
- Check encryption setup: Ensure `ENCRYPTION_SECRET` is set
- Test decryption: Try fetching an integration via UI

---

**Remember**: Security is not optional. Follow these guidelines to protect your users' data and your platform's integrity.

