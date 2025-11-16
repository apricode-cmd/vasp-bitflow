# 📧 Email Provider - Quick Start Guide

## ✅ Status: WORKING

Resend интеграция настроена и работает!

---

## 🚀 Quick Actions

### 1. Проверить конфигурацию (Админка)

```
/admin/integrations → Resend
```

Убедитесь что:
- ✅ Status: Active
- ✅ API Key: Configured
- ⚠️ From Email: Измените на `noreply@yourdomain.com`

### 2. Верифицировать домен в Resend

**Зачем?** Без верификации домена emails могут попадать в спам.

**Как:**
1. Login: https://resend.com/emails
2. Add domain: `yourdomain.com`
3. Copy DNS records
4. Add to your DNS provider:
   ```
   TXT  @  "v=spf1 include:_spf.resend.com ~all"
   TXT  resend._domainkey  [DKIM value from Resend]
   TXT  _dmarc  "v=DMARC1; p=none"
   ```
5. Wait for verification (1-24h)

### 3. Test Email Sending

**Option A: Через Admin UI**
```
/admin/test-email
```

**Option B: Через API**
```bash
curl -X POST https://yourdomain.com/api/admin/test-email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com"
  }'
```

### 4. Check Email Logs

**SQL:**
```sql
SELECT 
  recipient,
  subject,
  status,
  error,
  "createdAt"
FROM "EmailLog"
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Admin UI:**
```
/admin/system/email-logs (if exists)
```

---

## 🔧 Configuration

### Current Settings
```json
{
  "service": "resend",
  "apiKey": "*** encrypted ***",
  "fromEmail": "onboarding@resend.dev",  // ⚠️ Change this!
  "apiEndpoint": "https://api.resend.com"
}
```

### Recommended Settings
```json
{
  "service": "resend",
  "apiKey": "re_...",
  "fromEmail": "noreply@yourdomain.com",  // ✅ Your domain
  "replyTo": "support@yourdomain.com",
  "apiEndpoint": "https://api.resend.com"
}
```

---

## 📊 Available Email Templates

Your system has 16 email templates ready:

**ORDER:**
- `ORDER_CREATED` - Order confirmation
- `ORDER_COMPLETED` - Order fulfilled
- `ORDER_CANCELLED` - Order cancelled
- `ORDER_PAYMENT_RECEIVED` - Payment received

**KYC:**
- `KYC_APPROVED` - KYC approved
- `KYC_REJECTED` - KYC rejected
- `KYC_SUBMITTED` - KYC submitted

**USER:**
- `WELCOME_EMAIL` - Welcome new users
- `PASSWORD_RESET` - Password reset link
- `EMAIL_VERIFICATION` - Verify email

**ADMIN:**
- `ADMIN_INVITED` - Admin invitation
- `PAYMENT_RECEIVED` - Payment notification

---

## 🎨 Customizing Templates

### Option 1: Admin UI
```
/admin/email-templates
```

Edit templates with variables:
- `{{userName}}` - User's name
- `{{orderId}}` - Order ID
- `{{amount}}` - Amount
- `{{brandName}}` - Your brand name
- `{{primaryColor}}` - Your brand color

### Option 2: White-Label Settings
```
/admin/settings/branding
```

Update:
- Brand Logo
- Primary Color
- Company Name
- Support Email

**All emails will automatically use these settings!** 🎉

---

## 🚨 Troubleshooting

### Problem: Emails not sending

**Check 1: Integration Status**
```sql
SELECT * FROM "Integration" WHERE service = 'resend';
```
- Should be `isEnabled = true`
- Should have `apiKey`

**Check 2: Email Logs**
```sql
SELECT * FROM "EmailLog" WHERE status = 'FAILED' ORDER BY "createdAt" DESC LIMIT 10;
```
- Check `error` column for details

**Check 3: Resend Dashboard**
- https://resend.com/emails
- Check for bounces, complaints

### Problem: Emails in spam

**Solution:**
1. Verify domain in Resend ✅
2. Add SPF, DKIM, DMARC records ✅
3. Use your own domain (not onboarding@resend.dev) ✅
4. Warm up your domain (start with small volumes) ✅

### Problem: High failure rate

**Current:** 35% failure rate (14 of 40 failed)

**Likely causes:**
- Using test email `onboarding@resend.dev` ⚠️
- Domain not verified ⚠️
- Invalid recipient emails

**Fix:**
1. Update `fromEmail` to your domain
2. Verify domain in Resend
3. Re-send failed emails (they will auto-retry)

---

## 📈 Monitoring

### Key Metrics to Track

```typescript
// Add to Admin Dashboard
const emailHealth = {
  sentToday: 0,
  failedToday: 1,
  failureRate: '35%',  // ⚠️ High
  pendingQueue: 14,
  providerStatus: 'active'
};
```

### Alert Thresholds
- ❌ Failure rate > 20% → Investigate
- ⚠️ Pending queue > 100 → Check cron job
- ⚠️ No emails sent in 24h → Check provider

---

## 🔐 Security

### Best Practices
- ✅ API keys encrypted in database
- ✅ Email validation (Zod)
- ✅ Audit logging (EmailLog)
- ⚠️ Add ENCRYPTION_KEY env var
- ⚠️ Add CRON_SECRET for cron endpoints

---

## 📚 Documentation

- **Full Audit:** `NOTIFICATION_EMAIL_SYSTEM_AUDIT.md`
- **Status Report:** `EMAIL_PROVIDER_STATUS.md`
- **SQL Queries:** `scripts/check-email-provider.sql`
- **Health Check:** `scripts/check-notification-system-health.ts`

---

## 🎯 Production Checklist

Before going live:

- [ ] Update `fromEmail` to your domain
- [ ] Verify domain in Resend
- [ ] Add ENCRYPTION_KEY
- [ ] Test email sending
- [ ] Check email logs (no failures)
- [ ] Setup monitoring dashboard
- [ ] Configure cron job for retry (optional)
- [ ] Test all email templates
- [ ] Warm up domain (start slow)

---

## 💡 Tips

1. **Start with low volumes:** 10-50 emails/day for new domains
2. **Monitor deliverability:** Check Resend analytics
3. **Use double opt-in:** For marketing emails
4. **Handle bounces:** Setup Resend webhooks
5. **Personalize emails:** Use real user data

---

## 🚀 Next Steps

1. ✅ Email provider working
2. ⚠️ Update fromEmail → your domain
3. ⚠️ Verify domain in Resend
4. ✅ Test sending
5. 🎉 Go live!

**Estimated time:** 30 minutes to production-ready! 🚀

---

## 📞 Support

- Resend Support: https://resend.com/support
- Resend Docs: https://resend.com/docs
- System Health: `npx tsx scripts/check-notification-system-health.ts`

---

**Last Updated:** 2025-01-16  
**Status:** ✅ Operational

