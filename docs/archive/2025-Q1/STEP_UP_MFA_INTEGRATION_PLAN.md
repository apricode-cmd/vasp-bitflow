# 🔐 Step-up MFA Integration Plan

**Дата:** 01.11.2025  
**Статус:** Phase 1 Complete (2/15)

---

## ✅ Реализовано (2/15)

### API Keys
- [x] `POST /api/admin/api-keys` - GENERATE_API_KEY
- [x] `DELETE /api/admin/api-keys/[id]` - REVOKE_API_KEY

---

## 📋 TODO: Critical Endpoints (13 осталось)

### 💰 Financial Operations (Highest Priority)
- [ ] `PATCH /api/admin/pay-out/[id]` - APPROVE_PAYOUT
  - Action: `APPROVE_PAYOUT`
  - When: Approving cryptocurrency payout
  - Risk: HIGH - Money movement
  
- [ ] `POST /api/admin/pay-out` - CREATE_LARGE_PAYOUT
  - Action: `CREATE_LARGE_PAYOUT`
  - When: Creating payout > 10,000 EUR
  - Risk: HIGH - Large money movement

### 👥 Access Management (High Priority)
- [ ] `PATCH /api/admin/users/[id]/role` - CHANGE_ADMIN_ROLE
  - Action: `CHANGE_ADMIN_ROLE`
  - When: Changing admin role/permissions
  - Risk: HIGH - Privilege escalation

- [ ] `POST /api/admin/admins` - CREATE_SUPER_ADMIN
  - Action: `CREATE_SUPER_ADMIN`
  - When: Creating SUPER_ADMIN role
  - Risk: CRITICAL - Highest privilege

- [ ] `PATCH /api/admin/admins/[id]/suspend` - SUSPEND_ADMIN
  - Action: `SUSPEND_ADMIN`
  - When: Suspending admin account
  - Risk: MEDIUM - Access removal

- [ ] `DELETE /api/admin/admins/[id]` - DELETE_ADMIN
  - Action: `DELETE_ADMIN`
  - When: Deleting admin account
  - Risk: HIGH - Permanent removal

### 🔧 Integrations & Settings (High Priority)
- [ ] `PATCH /api/admin/integrations/kycaid` - UPDATE_KYCAID_KEYS
  - Action: `UPDATE_INTEGRATION_KEYS`
  - When: Updating KYCAID API keys
  - Risk: HIGH - Security credentials

- [ ] `PATCH /api/admin/integrations/payment` - UPDATE_PAYMENT_KEYS
  - Action: `UPDATE_INTEGRATION_KEYS`
  - When: Updating payment provider keys
  - Risk: HIGH - Financial credentials

- [ ] `PATCH /api/admin/settings/limits` - CHANGE_LIMITS
  - Action: `CHANGE_LIMITS`
  - When: Changing trading/withdrawal limits
  - Risk: MEDIUM - Business rules

- [ ] `PATCH /api/admin/settings/aml` - UPDATE_AML_POLICY
  - Action: `UPDATE_AML_POLICY`
  - When: Changing AML/KYC policies
  - Risk: HIGH - Compliance

### 👤 User Data (Medium Priority)
- [ ] `DELETE /api/admin/users/[id]` - DELETE_USER
  - Action: `DELETE_USER`
  - When: Deleting user account
  - Risk: HIGH - Data loss

- [ ] `POST /api/admin/users/[id]/export` - EXPORT_PII
  - Action: `EXPORT_PII`
  - When: Exporting personal data (GDPR)
  - Risk: HIGH - Privacy

- [ ] `POST /api/admin/users/[id]/impersonate` - IMPERSONATE_USER
  - Action: `IMPERSONATE_USER`
  - When: Logging in as user
  - Risk: CRITICAL - Full access to user account

---

## 🛠 Implementation Pattern

### Template для добавления Step-up MFA:

```typescript
import { handleStepUpMfa } from '@/lib/middleware/step-up-mfa';

export async function POST/PATCH/DELETE(request: NextRequest) {
  try {
    // 1. Check auth
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // 2. Get admin ID
    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. 🔐 STEP-UP MFA CHECK
    const mfaResult = await handleStepUpMfa(
      request,
      adminId,
      'YOUR_ACTION_HERE', // e.g., 'APPROVE_PAYOUT'
      'ResourceType',     // e.g., 'PayOut'
      resourceId          // e.g., payoutId
    );

    // 4. Return MFA challenge if required
    if (mfaResult.requiresMfa) {
      return NextResponse.json({
        success: false,
        requiresMfa: true,
        challengeId: mfaResult.challengeId,
        options: mfaResult.options
      });
    }

    // 5. Check MFA verification
    if (!mfaResult.verified) {
      return NextResponse.json(
        { error: mfaResult.error || 'MFA verification required' },
        { status: 403 }
      );
    }

    // 6. Proceed with action
    // ... your logic here ...

    // 7. Log with MFA verification flag
    await auditService.logAdminAction(
      adminId,
      ACTION,
      ENTITY,
      entityId,
      oldValue,
      newValue,
      { mfaVerified: true } // ← Important!
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    // Error handling
  }
}
```

---

## 🎯 Implementation Priority

### Sprint 1 (Today) - Financial:
1. ✅ API Keys (DONE)
2. ⏳ APPROVE_PAYOUT
3. ⏳ CREATE_LARGE_PAYOUT

### Sprint 2 (Next) - Access Management:
4. CHANGE_ADMIN_ROLE
5. CREATE_SUPER_ADMIN
6. SUSPEND_ADMIN
7. DELETE_ADMIN

### Sprint 3 - Integrations:
8. UPDATE_KYCAID_KEYS
9. UPDATE_PAYMENT_KEYS
10. CHANGE_LIMITS
11. UPDATE_AML_POLICY

### Sprint 4 - User Data:
12. DELETE_USER
13. EXPORT_PII
14. IMPERSONATE_USER

---

## 🧪 Testing Checklist

### For Each Implementation:

- [ ] Without MFA → returns challenge
- [ ] With invalid MFA → returns 403
- [ ] With valid MFA → action proceeds
- [ ] MFA logged in AdminAuditLog
- [ ] Frontend shows StepUpMfaDialog
- [ ] WebAuthn flow works
- [ ] Can use backup codes (if implemented)
- [ ] MFA challenge expires after 5 min
- [ ] MFA challenge is one-time use

---

## 📊 Benefits

### Security:
✅ **PSD2/SCA Compliance** - Strong Customer Authentication  
✅ **SOC 2 Type II** - Additional controls  
✅ **AML Best Practices** - High-risk action verification  
✅ **Zero Trust** - Verify every critical action

### Audit:
✅ **Full Trail** - Every critical action has MFA proof  
✅ **Non-repudiation** - Cannot deny action (WebAuthn)  
✅ **Compliance** - Regulators can verify MFA was used

### Operations:
✅ **Fraud Prevention** - Harder to abuse stolen sessions  
✅ **Insider Threats** - Additional barrier for malicious admins  
✅ **Accountability** - Clear record of who did what with MFA

---

## 🚀 Current Status

**Progress:** 2/15 (13%)  
**Working:** API key generation/revocation  
**Next:** APPROVE_PAYOUT, CREATE_LARGE_PAYOUT

**ETA:** 
- Phase 1 (Financial): 2 hours
- Phase 2 (Access): 3 hours  
- Phase 3 (Integrations): 2 hours
- Phase 4 (User Data): 2 hours
**Total:** ~9 hours to full Step-up MFA coverage

---

**Let's continue!** 🚀

