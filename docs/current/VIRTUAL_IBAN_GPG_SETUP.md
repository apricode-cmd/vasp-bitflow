# BCB Group - GPG Setup Guide

> **Important:** BCB Group uses GPG keys for API authentication

---

## 📋 Требуемые конфигурации

### Environment Variables (.env)

```bash
# BCB Group Configuration
BCB_SANDBOX=true
BCB_COUNTERPARTY_ID=12345
BCB_CID=CID-XYZ789

# GPG Authentication
BCB_GPG_PRIVATE_KEY="-----BEGIN PGP PRIVATE KEY BLOCK-----
...
-----END PGP PRIVATE KEY BLOCK-----"

BCB_GPG_SECRET_KEY="your_gpg_passphrase"
BCB_GPG_KEY_ID="2BDFE8C2E826F2821F441CAC6BF35EB4F94F2ABB"

# Optional: OAuth (if BCB supports both methods)
BCB_CLIENT_ID=your_client_id
BCB_CLIENT_SECRET=your_client_secret
```

---

## 🔐 GPG Key Format

### Private Key (.gpg file)
```
-----BEGIN PGP PRIVATE KEY BLOCK-----

mQINBGkkPYABEAC2T4ZOO+ngocFPcu4G/WDqHjBO+JLU4ksX3VZIf/gWbFfi6k3p
...
-----END PGP PRIVATE KEY BLOCK-----
```

### How to Store in .env

**Option 1: Inline (with newlines as \n)**
```bash
BCB_GPG_PRIVATE_KEY="-----BEGIN PGP PRIVATE KEY BLOCK-----\n\nmQINBGkkPYABEAC2T4Z...\n-----END PGP PRIVATE KEY BLOCK-----"
```

**Option 2: File Path**
```bash
BCB_GPG_PRIVATE_KEY_FILE=./gpg-private-key-bcb.asc
```

**Option 3: Encrypted in Database**
Store in `Integration` model `config` field (encrypted):
```json
{
  "gpgPrivateKey": "encrypted_key_here",
  "gpgSecretKey": "encrypted_passphrase",
  "gpgKeyId": "2BDFE8C2..."
}
```

---

## 🛠️ Setup in Admin Panel

### 1. Navigate to Integrations
```
Admin Panel → Settings → Integrations → Virtual IBAN
```

### 2. Add BCB Group Provider

```json
{
  "service": "bcb_group",
  "category": "VIRTUAL_IBAN",
  "isEnabled": true,
  "config": {
    "sandbox": true,
    "counterpartyId": "12345",
    "cid": "CID-XYZ789",
    "gpgPrivateKey": "-----BEGIN PGP PRIVATE KEY BLOCK-----\n...",
    "gpgSecretKey": "your_passphrase",
    "gpgKeyId": "2BDFE8C2E826F2821F441CAC6BF35EB4F94F2ABB"
  }
}
```

---

## 🔍 How GPG Signing Works

### Request Flow

1. **Prepare Request**
   ```typescript
   const method = 'POST';
   const endpoint = '/v4/accounts';
   const body = { ...accountData };
   ```

2. **Create Signature**
   ```typescript
   const dataToSign = `${method}${endpoint}${JSON.stringify(body)}`;
   const signature = await signWithGPG(
     dataToSign,
     gpgPrivateKey,
     gpgSecretKey
   );
   ```

3. **Add to Headers**
   ```typescript
   headers['X-GPG-Signature'] = signature;
   headers['X-GPG-Key-ID'] = gpgKeyId;
   ```

4. **Send Request**
   ```typescript
   fetch(url, {
     method,
     headers,
     body: JSON.stringify(body)
   });
   ```

---

## 🧪 Testing GPG Setup

### Test in Node.js Console

```javascript
// Load your GPG keys
const fs = require('fs');
const crypto = require('crypto');

const privateKey = fs.readFileSync('./gpg-private-key-bcb.asc', 'utf8');
const secretKey = 'your_passphrase';

// Test signing
const data = 'POST/v4/accounts{"test":"data"}';
const hmac = crypto.createHmac('sha256', secretKey);
hmac.update(data);
const signature = hmac.digest('hex');

console.log('Signature:', signature);
```

### Test API Call

```bash
curl -X POST https://api.sandbox.bcb.group/v4/accounts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -H "X-GPG-Signature: <signature>" \
  -H "X-GPG-Key-ID: 2BDFE8C2..." \
  -d '{"counterparty_id": 12345, ...}'
```

---

## ⚠️ Security Best Practices

### 1. Never Commit GPG Keys to Git

```gitignore
# .gitignore
*.asc
*.gpg
*.pgp
gpg-private-key-*
```

### 2. Encrypt Keys in Database

```typescript
import { encrypt } from '@/lib/services/encryption.service';

const encryptedKey = encrypt(gpgPrivateKey);

await prisma.integration.update({
  where: { service: 'bcb_group' },
  data: {
    config: {
      gpgPrivateKey: encryptedKey,
      gpgSecretKey: encrypt(secretKey),
      // ...
    }
  }
});
```

### 3. Use Environment Variables for Development

```bash
# .env.local (not committed)
BCB_GPG_PRIVATE_KEY="$(cat gpg-private-key-bcb.asc)"
BCB_GPG_SECRET_KEY="your_passphrase"
```

### 4. Rotate Keys Regularly

- Generate new GPG key pair every 12 months
- Update in BCB console
- Update in your config

---

## 🔧 Troubleshooting

### Issue 1: "GPG signing failed"

**Причина:** Invalid private key format or passphrase

**Решение:**
```bash
# Verify key format
gpg --list-secret-keys

# Export key properly
gpg --export-secret-keys --armor KEY_ID > private-key.asc
```

### Issue 2: "X-GPG-Signature invalid"

**Причина:** Incorrect signing algorithm or data format

**Решение:**
- Check BCB documentation for required signature format
- Verify you're signing the correct data (method + endpoint + body)
- Ensure no extra whitespace in signed data

### Issue 3: "GPG Key ID not recognized"

**Причина:** Wrong Key ID or not registered with BCB

**Решение:**
```bash
# Get your Key ID
gpg --list-keys --keyid-format LONG

# Register public key with BCB
# Send your public key to BCB support
gpg --export --armor KEY_ID > public-key.asc
```

---

## 📚 Resources

- **BCB Group Docs:** https://bcbdigital.docs.apiary.io
- **GPG Handbook:** https://www.gnupg.org/gph/en/manual.html
- **OpenPGP.js:** https://openpgpjs.org/ (if you need full PGP in Node.js)

---

## 🔄 Migration from OAuth to GPG

If you were using OAuth and need to switch to GPG:

```typescript
// Old config (OAuth)
{
  clientId: "...",
  clientSecret: "..."
}

// New config (GPG)
{
  gpgPrivateKey: "-----BEGIN PGP...",
  gpgSecretKey: "passphrase",
  gpgKeyId: "2BDFE8C2..."
}

// Adapter supports both!
// Just provide GPG keys and remove OAuth keys
```

---

**Ready to use BCB Group with GPG! 🔐**





