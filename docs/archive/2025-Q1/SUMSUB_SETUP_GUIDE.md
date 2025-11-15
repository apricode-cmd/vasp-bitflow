# 🤖 SUMSUB SETUP GUIDE

**Platform:** Apricode Exchange  
**Integration Type:** KYC Provider  
**Date:** 30 октября 2025

---

## 📋 PREREQUISITES

Before starting, ensure you have:
- ✅ Sumsub account (sign up at https://sumsub.com)
- ✅ Admin access to Apricode Exchange
- ✅ Access to Sumsub Dashboard

---

## 🚀 STEP 1: CREATE SUMSUB ACCOUNT

### 1.1. Sign Up
1. Go to https://sumsub.com
2. Click "Get Started" or "Sign Up"
3. Fill in company details
4. Verify your email

### 1.2. Complete Onboarding
1. Log in to Sumsub Dashboard
2. Complete company verification (may take 1-2 business days)
3. Set up billing (free tier available for testing)

---

## 🔑 STEP 2: GET API CREDENTIALS

### 2.1. Create App Token
1. Go to **Sumsub Dashboard** → **Settings** → **Developers**
2. Click **"Create App Token"**
3. Enter token name (e.g. "Apricode Exchange Production")
4. Select permissions:
   - ✅ `applicants:read`
   - ✅ `applicants:write`
   - ✅ `resources:read`
   - ✅ `resources:write`
5. Click **"Create"**
6. **IMPORTANT:** Copy the **App Token** (starts with `sbx:` for sandbox or `prd:` for production)
7. Save it securely (you won't be able to see it again!)

### 2.2. Get Secret Key
1. In the same **Developers** section
2. Find **"Secret Key"**
3. Click **"Show"** or **"Generate"** if not created
4. **IMPORTANT:** Copy the **Secret Key**
5. Save it securely

### 2.3. Credentials Format
```
App Token:   sbx:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Secret Key:  YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
```

---

## ⚙️ STEP 3: CONFIGURE KYC LEVEL

### 3.1. Create Verification Level
1. Go to **Sumsub Dashboard** → **Levels**
2. Click **"Create Level"**
3. Enter level name: `basic-kyc-level` (or your preferred name)
4. Configure required documents:
   - ✅ **Identity Document** (Passport, ID Card, Driver's License)
   - ✅ **Selfie** (Liveness check)
   - ⚠️ **Proof of Address** (optional, recommended for compliance)

### 3.2. Configure Verification Rules
1. Select **"Verification Rules"** tab
2. Enable:
   - ✅ **Liveness Detection** (recommended)
   - ✅ **Document Authenticity Check**
   - ✅ **Face Match** (selfie vs ID photo)
   - ✅ **AML Screening** (optional, for compliance)
3. Set review mode:
   - **Automatic** (AI-powered, faster)
   - **Manual** (human review, more accurate)
   - **Hybrid** (AI + manual for edge cases) ← **Recommended**

### 3.3. Configure Applicant Data
1. Select **"Applicant Data"** tab
2. Enable required fields:
   - ✅ First Name
   - ✅ Last Name
   - ✅ Date of Birth
   - ✅ Country (nationality)
   - ✅ Email
   - ✅ Phone
3. Click **"Save"**

---

## 🔗 STEP 4: CONFIGURE WEBHOOKS

### 4.1. Add Webhook URL
1. Go to **Sumsub Dashboard** → **Settings** → **Webhooks**
2. Click **"Add Webhook"**
3. Enter webhook URL:
   ```
   https://your-domain.com/api/kyc/webhook/sumsub
   ```
   Replace `your-domain.com` with your actual domain (e.g. `app.apricode.io`)

### 4.2. Select Events
Enable the following events:
- ✅ **applicantReviewed** (most important!)
- ✅ **applicantPending**
- ✅ **applicantOnHold**
- ⚠️ **applicantCreated** (optional, for logging)

### 4.3. Configure Signature
1. Signature method: **HMAC-SHA256**
2. Header name: `X-Payload-Digest` (default)
3. Secret: Use the same **Secret Key** from Step 2.2
4. Click **"Save"**

### 4.4. Test Webhook
1. Click **"Test"** button
2. Check if webhook receives test event
3. Verify in Apricode logs:
   ```bash
   # Check server logs
   tail -f /var/log/apricode/app.log | grep "Sumsub webhook"
   ```

---

## 🔧 STEP 5: CONFIGURE IN APRICODE EXCHANGE

### 5.1. Log in to Admin Panel
1. Go to `https://your-domain.com/admin`
2. Log in with admin credentials

### 5.2. Navigate to Integrations
1. Click **"Integrations"** in sidebar
2. Find **"Sumsub"** card (🤖 icon)
3. Click **"Configure"**

### 5.3. Enter Credentials
Fill in the form:

| Field | Value | Example |
|-------|-------|---------|
| **App Token** | From Step 2.1 | `sbx:ABC123...` |
| **Secret Key** | From Step 2.2 | `XYZ789...` |
| **Level Name** | From Step 3.1 | `basic-kyc-level` |
| **Base URL** | Sumsub API URL | `https://api.sumsub.com` (production)<br>`https://test-api.sumsub.com` (sandbox) |

### 5.4. Test Connection
1. Click **"Test Connection"** button
2. Wait for response
3. ✅ **Success:** "Sumsub connection successful"
4. ❌ **Error:** Check credentials and try again

### 5.5. Enable Sumsub
1. Toggle **"Enable"** switch to ON
2. **IMPORTANT:** This will **disable** other KYC providers (e.g. KYCAID)
3. Click **"Save Configuration"**

---

## ✅ STEP 6: VERIFY INTEGRATION

### 6.1. Test Client Flow
1. Log out from admin panel
2. Create a new test user account (or use existing)
3. Go to **"KYC Verification"** page
4. You should see **Sumsub WebSDK** embedded in the page
5. Complete verification:
   - Upload ID document
   - Take selfie (liveness check)
   - Submit

### 6.2. Check Status in Admin
1. Log back in to admin panel
2. Go to **"KYC Reviews"** page
3. Find the test user
4. Status should be **"PENDING"**
5. Wait for Sumsub review (2-5 minutes for automatic, longer for manual)

### 6.3. Verify Webhook
1. Check server logs for webhook events:
   ```bash
   tail -f /var/log/apricode/app.log | grep "Sumsub webhook"
   ```
2. Expected log:
   ```
   📥 Sumsub webhook received
   ✅ Webhook signature verified
   📊 Webhook event: { applicantId: 'xxx', status: 'approved' }
   ✅ Updated 1 KYC session(s)
   ```

### 6.4. Check Final Status
1. Refresh **"KYC Reviews"** page in admin
2. Status should be **"APPROVED"** or **"REJECTED"**
3. Client should see updated status on their dashboard

---

## 🔄 STEP 7: SWITCH BETWEEN PROVIDERS

### 7.1. Disable Sumsub
1. Go to **Admin** → **Integrations**
2. Find **"Sumsub"** card
3. Toggle **"Enable"** switch to OFF
4. Click **"Save"**

### 7.2. Enable KYCAID (or other provider)
1. Find **"KYCAID"** card
2. Toggle **"Enable"** switch to ON
3. Click **"Save"**

**Note:** Only ONE KYC provider can be active at a time.

---

## 🐛 TROUBLESHOOTING

### Issue 1: "Invalid credentials" error

**Symptoms:** Test connection fails with 401/403 error

**Solution:**
1. Verify App Token and Secret Key are correct
2. Check if token has required permissions
3. Ensure no extra spaces in credentials
4. Try regenerating credentials in Sumsub Dashboard

---

### Issue 2: WebSDK not loading

**Symptoms:** Client sees "Loading..." forever

**Solution:**
1. Check browser console for errors
2. Verify `/api/kyc/sdk-token` endpoint is accessible
3. Check if Sumsub is enabled in Admin → Integrations
4. Verify firewall allows `https://static.sumsub.com`

---

### Issue 3: Webhook not receiving events

**Symptoms:** KYC status not updating automatically

**Solution:**
1. Verify webhook URL is correct in Sumsub Dashboard
2. Check if webhook URL is publicly accessible (not localhost)
3. Verify signature secret matches Secret Key
4. Check server logs for webhook errors
5. Test webhook manually in Sumsub Dashboard

---

### Issue 4: "Sumsub is not the active KYC provider"

**Symptoms:** Client gets error when trying to start KYC

**Solution:**
1. Go to Admin → Integrations
2. Ensure Sumsub is **enabled** (toggle ON)
3. Ensure other KYC providers are **disabled**
4. Clear browser cache and try again

---

## 📊 CONFIGURATION REFERENCE

### Environment Variables (Optional)

If you prefer to store credentials in environment variables instead of database:

```bash
# .env.local

# Sumsub Configuration
SUMSUB_APP_TOKEN="sbx:XXXXXXXX"
SUMSUB_SECRET_KEY="YYYYYYYY"
SUMSUB_LEVEL_NAME="basic-kyc-level"
SUMSUB_BASE_URL="https://api.sumsub.com"
```

**Note:** Database configuration takes precedence over environment variables.

---

### Webhook Payload Example

```json
{
  "applicantId": "5f7c...",
  "inspectionId": "5f7c...",
  "correlationId": "req-...",
  "externalUserId": "user123",
  "type": "applicantReviewed",
  "reviewStatus": "completed",
  "reviewResult": {
    "reviewAnswer": "GREEN",
    "rejectLabels": [],
    "reviewRejectType": null
  },
  "createdAt": "2025-10-30T12:34:56.789Z"
}
```

**Status Mapping:**
- `reviewAnswer: "GREEN"` → **APPROVED**
- `reviewAnswer: "RED"` → **REJECTED**
- `reviewStatus: "pending"` → **PENDING**

---

## 🔐 SECURITY BEST PRACTICES

### 1. Protect Credentials
- ✅ Store App Token and Secret Key in database (encrypted)
- ✅ Never commit credentials to Git
- ✅ Use environment variables for local development
- ✅ Rotate credentials periodically (every 6 months)

### 2. Webhook Security
- ✅ Always verify webhook signatures
- ✅ Use HTTPS for webhook URL
- ✅ Implement rate limiting on webhook endpoint
- ✅ Log all webhook events for audit

### 3. Access Control
- ✅ Only admins can configure integrations
- ✅ Use strong passwords for admin accounts
- ✅ Enable 2FA for admin accounts
- ✅ Review audit logs regularly

---

## 📚 ADDITIONAL RESOURCES

### Official Documentation
- **Sumsub Docs:** https://docs.sumsub.com
- **API Reference:** https://docs.sumsub.com/reference
- **WebSDK Guide:** https://docs.sumsub.com/docs/web-sdk

### Support
- **Sumsub Support:** support@sumsub.com
- **Apricode Support:** support@apricode.io

### Useful Links
- **Sumsub Dashboard:** https://cockpit.sumsub.com
- **API Status:** https://status.sumsub.com
- **Changelog:** https://docs.sumsub.com/changelog

---

## ✅ SETUP CHECKLIST

Use this checklist to ensure everything is configured correctly:

- [ ] Sumsub account created and verified
- [ ] App Token generated and saved
- [ ] Secret Key generated and saved
- [ ] KYC Level created and configured
- [ ] Webhook URL added in Sumsub Dashboard
- [ ] Webhook events selected (applicantReviewed)
- [ ] Credentials entered in Apricode Admin
- [ ] Connection test passed
- [ ] Sumsub enabled in Apricode
- [ ] Client flow tested (upload ID, selfie)
- [ ] Webhook received and processed
- [ ] KYC status updated correctly
- [ ] Admin can review KYC submissions
- [ ] Documentation reviewed

---

**Setup Complete! 🎉**

Your Sumsub integration is now ready to use. Users can complete KYC verification using Sumsub WebSDK.

**Questions?** Contact support@apricode.io

---

**Last Updated:** 30 октября 2025  
**Version:** 1.0.0  
**Author:** Apricode Development Team

