# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

---

## Reporting a Vulnerability

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead, email: **security@apricode.io**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Response Time:** Within 48 hours

---

## Security Measures

### Authentication & Authorization

✅ **Password Hashing:** bcrypt with 10 rounds
✅ **Session Management:** NextAuth v5 with JWT
✅ **Role-Based Access:** CLIENT/ADMIN roles
✅ **Middleware Protection:** All routes protected
✅ **2FA Support:** Coming soon for admin accounts

### Data Protection

✅ **Encryption at Rest:** Sensitive data encrypted with AES-256-GCM
✅ **Encryption in Transit:** HTTPS only in production
✅ **API Key Storage:** Hashed with bcrypt
✅ **Database:** PostgreSQL with parameterized queries (Prisma)

### API Security

✅ **API Key Authentication:** For external access
✅ **Rate Limiting:** 100 requests/hour per key
✅ **Input Validation:** Zod schemas on all endpoints
✅ **CORS:** Restricted origins
✅ **CSRF Protection:** NextAuth built-in

### Audit & Monitoring

✅ **Comprehensive Audit Logs:** All admin actions logged
✅ **IP Tracking:** Request origin logged
✅ **User Agent Logging:** Client identification
✅ **Failed Login Attempts:** Tracked (coming soon: lockout)

### File Upload Security

✅ **File Type Validation:** Only images and PDFs
✅ **File Size Limits:** 10MB maximum
✅ **Secure Storage:** Vercel Blob with access control
✅ **Virus Scanning:** Coming soon

---

## Environment Variables

**CRITICAL - Never commit these:**

```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="min-32-chars-random-string"
NEXTAUTH_URL="https://yourdomain.com"

# Encryption (optional, uses NEXTAUTH_SECRET if not set)
ENCRYPTION_KEY="min-32-chars-random-string"

# External Services
KYCAID_API_KEY="..."
KYCAID_WEBHOOK_SECRET="..."
RESEND_API_KEY="..."

# Admin
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="change-in-production"
```

**Generate strong secrets:**

```bash
openssl rand -hex 32
```

---

## Best Practices

### For Administrators

1. ✅ **Change default passwords** immediately
2. ✅ **Use strong passwords** (min 8 chars, mixed)
3. ✅ **Review audit logs** weekly
4. ✅ **Rotate API keys** every 90 days
5. ✅ **Monitor failed logins** for suspicious activity
6. ✅ **Backup database** daily
7. ✅ **Keep dependencies updated**

### For Developers

1. ✅ **Never log** sensitive data (passwords, API keys, documents)
2. ✅ **Always validate** user inputs
3. ✅ **Use parameterized queries** (Prisma does this)
4. ✅ **Escape outputs** (React does this)
5. ✅ **Review code** for security issues
6. ✅ **Run security audits** (`npm audit`)
7. ✅ **Follow OWASP guidelines**

### For API Users

1. ✅ **Store API keys** securely (environment variables)
2. ✅ **Use HTTPS** only
3. ✅ **Implement retries** with exponential backoff
4. ✅ **Handle rate limits** gracefully
5. ✅ **Validate responses** before using data

---

## Security Headers

Configured in `next.config.js`:

```javascript
{
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "origin-when-cross-origin"
}
```

---

## Incident Response

### In Case of Security Breach

1. **Immediate Actions:**
   - Disable affected API keys
   - Block compromised accounts
   - Review audit logs for unauthorized access
   - Change all sensitive credentials

2. **Investigation:**
   - Check audit logs for breach timeline
   - Identify affected users/data
   - Determine attack vector

3. **Communication:**
   - Notify affected users within 72 hours
   - Email: security@apricode.io
   - Provide incident report

4. **Prevention:**
   - Patch vulnerability
   - Enhance security measures
   - Update documentation

---

## Compliance

### GDPR

✅ **Data Minimization:** Collect only necessary data
✅ **Right to Access:** Users can export data (coming soon)
✅ **Right to Deletion:** Users can delete account (coming soon)
✅ **Data Retention:** Configurable policies in database
✅ **Consent:** Explicit consent for data processing

### KYC/AML

✅ **Identity Verification:** KYCAID integration
✅ **Document Storage:** Encrypted and access-controlled
✅ **Audit Trail:** Complete verification history
✅ **Data Protection:** Compliant with regulations

---

## Security Checklist

### Before Production Deployment

- [ ] Changed all default passwords
- [ ] Generated strong NEXTAUTH_SECRET
- [ ] Configured all environment variables
- [ ] Enabled HTTPS with valid SSL certificate
- [ ] Set up database backups
- [ ] Configured monitoring/alerts
- [ ] Tested all authentication flows
- [ ] Reviewed audit logging
- [ ] Tested rate limiting
- [ ] Configured CORS properly
- [ ] Verified security headers
- [ ] Tested file upload limits
- [ ] Ran npm audit and fixed issues
- [ ] Tested API key authentication
- [ ] Verified webhook signature checking
- [ ] Tested error handling

---

**Last Updated:** October 2025
**Version:** 1.0





