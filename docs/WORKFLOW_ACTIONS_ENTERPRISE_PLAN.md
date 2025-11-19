# Workflow Actions - Enterprise Level Enhancement Plan

## 📊 Current State Analysis

### Existing Actions (9 types):
1. ✅ **HTTP_REQUEST** - Fully implemented, enterprise-grade
2. ⚠️ **FREEZE_ORDER** - Basic (only reason field)
3. ⚠️ **REJECT_TRANSACTION** - Basic (only reason field)
4. ⚠️ **REQUEST_DOCUMENT** - Basic (2 fields)
5. ⚠️ **REQUIRE_APPROVAL** - Basic (2 fields)
6. ⚠️ **SEND_NOTIFICATION** - Basic (3 fields)
7. ⚠️ **FLAG_FOR_REVIEW** - Basic (1 field)
8. ⚠️ **AUTO_APPROVE** - No fields
9. ⚠️ **ESCALATE_TO_COMPLIANCE** - Basic (1 field)

---

## 🎯 Enterprise Enhancement Goals

### What "Enterprise Level" Means:
- **Rich Configuration**: Multiple relevant fields with validation
- **Expression Support**: Dynamic values using `{{ $node.field }}`
- **Accordion Sections**: Organized, collapsible groups
- **Templates**: Pre-built configs for common scenarios
- **Visual Feedback**: Clear icons, descriptions, examples
- **Error Prevention**: Validation, hints, constraints
- **Audit Trail**: Track who/when/why for compliance

---

## 🔧 Action-by-Action Enhancement Plan

### 1. FREEZE_ORDER 🧊
**Current:** Just reason field
**Enterprise Upgrade:**

```typescript
Sections:
┌─ Freeze Configuration ─────────────┐
│ ☑ Immediate Freeze                 │
│ Duration: [24 hours ▼]             │
│ Reason: [Select or custom...]      │
│   - Suspicious Activity            │
│   - AML Alert                      │
│   - Manual Review Required         │
│   - {{ custom }}                   │
│ Custom Reason: [textarea]          │
│ Notify Customer: ☑                 │
│ Notification Template: [...]       │
└─────────────────────────────────────┘
┌─ Unfreeze Conditions ──────────────┐
│ Auto-unfreeze when:                │
│ ☐ Approved by [COMPLIANCE ▼]      │
│ ☐ Documents verified               │
│ ☐ Risk score below [50]            │
│ ☐ Time elapsed: [24h]              │
└─────────────────────────────────────┘
```

**Fields:**
- `freezeDuration` - Select: Indefinite/24h/48h/7d/Custom
- `reason` - Select + custom textarea
- `reasonCategory` - AML/Fraud/Compliance/Manual
- `notifyCustomer` - Boolean
- `notificationTemplate` - Select template
- `autoUnfreezeConditions` - Array of conditions
- `requireApprovalToUnfreeze` - Boolean
- `approverRole` - ADMIN/COMPLIANCE/SUPER_ADMIN

---

### 2. REJECT_TRANSACTION ❌
**Current:** Just reason field
**Enterprise Upgrade:**

```typescript
Sections:
┌─ Rejection Details ────────────────┐
│ Rejection Type: [Hard/Soft ▼]     │
│ Reason Category: [AML Alert ▼]    │
│   - AML/Sanctions Match            │
│   - High Risk Country              │
│   - Velocity Limit Exceeded        │
│   - Insufficient KYC               │
│   - Manual Review Failed           │
│ Custom Reason: [textarea]          │
│ Risk Score: [{{ $node.risk }}]     │
└─────────────────────────────────────┘
┌─ Customer Communication ───────────┐
│ Notify Customer: ☑                 │
│ Message Template: [...]            │
│ Include Next Steps: ☑              │
│ Support Contact: [email/phone]     │
└─────────────────────────────────────┘
┌─ Refund & Accounting ──────────────┐
│ Process Refund: ☑                  │
│ Refund Method: [Same as payment ▼] │
│ Refund Timing: [24 hours]          │
│ Add to Blacklist: ☐                │
└─────────────────────────────────────┘
```

**Fields:**
- `rejectionType` - HARD (permanent) / SOFT (retry allowed)
- `reasonCategory` - Enum of rejection reasons
- `customReason` - Textarea
- `riskScore` - Number (expression supported)
- `notifyCustomer` - Boolean
- `messageTemplate` - Select/Custom
- `includeNextSteps` - Boolean
- `supportContact` - Text
- `processRefund` - Boolean
- `refundMethod` - Same/Alternative/Manual
- `refundTiming` - Select: Immediate/24h/48h
- `addToBlacklist` - Boolean
- `blacklistDuration` - Permanent/Temporary

---

### 3. REQUEST_DOCUMENT 📄
**Current:** documentType + message
**Enterprise Upgrade:**

```typescript
Sections:
┌─ Document Request ─────────────────┐
│ Document Types: [Multi-select]     │
│   ☑ Proof of Address               │
│   ☑ Bank Statement                 │
│   ☐ Source of Funds                │
│   ☐ Tax Return                     │
│   ☐ Utility Bill                   │
│ Due Date: [7 days ▼]               │
│ Priority: [Normal ▼]               │
│ Allow Partial Upload: ☑            │
└─────────────────────────────────────┘
┌─ Customer Message ─────────────────┐
│ Template: [Standard Request ▼]     │
│ Custom Message: [textarea]         │
│ Language: [Auto-detect ▼]          │
│ Include Upload Link: ☑             │
└─────────────────────────────────────┘
┌─ Acceptance Criteria ──────────────┐
│ Required Quality: [High ▼]         │
│ Min File Size: [100 KB]            │
│ Max File Size: [10 MB]             │
│ Accepted Formats: [PDF, JPG, PNG]  │
│ Auto-verify: ☑                     │
└─────────────────────────────────────┘
┌─ Follow-up Actions ────────────────┐
│ Reminder: After [3 days]           │
│ Auto-reject if not submitted: ☐    │
│ Escalate after: [7 days]           │
└─────────────────────────────────────┘
```

**Fields:**
- `documentTypes` - Multi-select array
- `dueDate` - Select: 3d/7d/14d/30d/Custom
- `priority` - LOW/NORMAL/HIGH/URGENT
- `allowPartialUpload` - Boolean
- `template` - Select template
- `customMessage` - Textarea (expression support)
- `language` - Auto/EN/PL/etc
- `includeUploadLink` - Boolean
- `requiredQuality` - LOW/MEDIUM/HIGH
- `minFileSize` - Number (KB)
- `maxFileSize` - Number (MB)
- `acceptedFormats` - Array
- `autoVerify` - Boolean
- `reminderAfter` - Number (days)
- `autoRejectIfNotSubmitted` - Boolean
- `escalateAfter` - Number (days)

---

### 4. REQUIRE_APPROVAL 👤
**Current:** approverRole + minApprovals
**Enterprise Upgrade:**

```typescript
Sections:
┌─ Approval Configuration ───────────┐
│ Approval Type: [Sequential ▼]     │
│   - Sequential (one by one)        │
│   - Parallel (all at once)         │
│   - Quorum (N of M)                │
│ Required Approvers:                │
│   [+ Add Approver]                 │
│   Role: [COMPLIANCE ▼]             │
│   Min Approvals: [1]               │
│   Specific User: [optional]        │
│ Timeout: [24 hours ▼]              │
│ Auto-approve if timeout: ☐         │
└─────────────────────────────────────┘
┌─ Approval Context ─────────────────┐
│ Title: [Approval Required]         │
│ Description: [textarea]            │
│ Include Data:                      │
│   ☑ Order Details                  │
│   ☑ User Profile                   │
│   ☑ Risk Assessment                │
│   ☑ Transaction History            │
│ Attachment: [optional]             │
└─────────────────────────────────────┘
┌─ Actions on Response ──────────────┐
│ On Approve: [Continue workflow ▼]  │
│ On Reject: [Cancel order ▼]        │
│ On Timeout: [Escalate ▼]           │
│ Notify Requester: ☑                │
└─────────────────────────────────────┘
```

**Fields:**
- `approvalType` - SEQUENTIAL/PARALLEL/QUORUM
- `requiredApprovers` - Array of {role, minApprovals, specificUserId?}
- `timeout` - Number (hours)
- `autoApproveOnTimeout` - Boolean
- `title` - Text (expression support)
- `description` - Textarea (expression support)
- `includeOrderDetails` - Boolean
- `includeUserProfile` - Boolean
- `includeRiskAssessment` - Boolean
- `includeTransactionHistory` - Boolean
- `attachment` - File/URL
- `onApprove` - Action to take
- `onReject` - Action to take
- `onTimeout` - Action to take
- `notifyRequester` - Boolean

---

### 5. SEND_NOTIFICATION 📧
**Current:** recipientRole + template + message
**Enterprise Upgrade:**

```typescript
Sections:
┌─ Recipients ───────────────────────┐
│ Primary Recipients:                │
│   ☑ Role: [COMPLIANCE ▼]          │
│   ☐ Specific User: [select]        │
│   ☐ Email: [custom@email.com]      │
│ CC Recipients: [+ Add]             │
│ Dynamic Recipients:                │
│   {{ $node.assignedTo }}           │
└─────────────────────────────────────┘
┌─ Notification Channels ────────────┐
│ ☑ Email                            │
│ ☑ In-App Notification              │
│ ☐ SMS (if configured)              │
│ ☐ Slack (via webhook)              │
│ ☐ Telegram (via bot)               │
└─────────────────────────────────────┘
┌─ Message Content ──────────────────┐
│ Template: [High Risk Alert ▼]     │
│ Subject: [text]                    │
│ Message: [rich textarea]           │
│ Include Variables:                 │
│   - {{ $node.orderId }}            │
│   - {{ $node.amount }}             │
│   - {{ $node.riskScore }}          │
│ Priority: [Normal ▼]               │
│ Action Button: [Review Order]      │
│ Button Link: [/orders/{{id}}]      │
└─────────────────────────────────────┘
┌─ Delivery Options ─────────────────┐
│ Send Immediately: ☑                │
│ Delay: [0 minutes]                 │
│ Retry on Failure: [3 times]        │
│ Track Read Status: ☑               │
└─────────────────────────────────────┘
```

**Fields:**
- `recipients` - Array of {type: ROLE/USER/EMAIL, value, cc}
- `dynamicRecipients` - Expression array
- `channels` - Array: EMAIL/IN_APP/SMS/SLACK/TELEGRAM
- `template` - Select template
- `subject` - Text (expression support)
- `message` - Rich textarea (expression support)
- `priority` - LOW/NORMAL/HIGH/URGENT
- `actionButton` - Text
- `actionButtonLink` - URL (expression support)
- `sendImmediately` - Boolean
- `delay` - Number (minutes)
- `retryOnFailure` - Number
- `trackReadStatus` - Boolean

---

### 6. FLAG_FOR_REVIEW 🚩
**Current:** Just reason
**Enterprise Upgrade:**

```typescript
Sections:
┌─ Flag Configuration ───────────────┐
│ Flag Type: [Manual Review ▼]      │
│   - Manual Review                  │
│   - AML Investigation              │
│   - Fraud Check                    │
│   - Document Verification          │
│   - Risk Assessment                │
│ Severity: [Medium ▼]               │
│ Priority: [Normal ▼]               │
│ Reason: [textarea]                 │
│ Evidence: [links/attachments]      │
└─────────────────────────────────────┘
┌─ Assignment ───────────────────────┐
│ Assign To: [Auto ▼]                │
│   - Auto (based on type)           │
│   - Specific Role                  │
│   - Specific User                  │
│   - Round Robin                    │
│ Role: [COMPLIANCE ▼]               │
│ User: [select if specific]         │
│ SLA: [24 hours ▼]                  │
│ Escalate After: [48 hours]         │
└─────────────────────────────────────┘
┌─ Review Context ───────────────────┐
│ Include in Review Queue: ☑         │
│ Block Transaction: ☐               │
│ Notify Customer: ☐                 │
│ Related Flags: [show similar]      │
└─────────────────────────────────────┘
```

**Fields:**
- `flagType` - Enum of flag types
- `severity` - LOW/MEDIUM/HIGH/CRITICAL
- `priority` - LOW/NORMAL/HIGH/URGENT
- `reason` - Textarea (expression support)
- `evidence` - Array of links/files
- `assignmentType` - AUTO/ROLE/USER/ROUND_ROBIN
- `assignRole` - Select role
- `assignUser` - Select user
- `sla` - Number (hours)
- `escalateAfter` - Number (hours)
- `includeInReviewQueue` - Boolean
- `blockTransaction` - Boolean
- `notifyCustomer` - Boolean
- `showRelatedFlags` - Boolean

---

### 7. AUTO_APPROVE ✅
**Current:** No fields
**Enterprise Upgrade:**

```typescript
Sections:
┌─ Approval Configuration ───────────┐
│ Approval Reason: [Auto-approved]   │
│ Conditions Met: [Show summary]     │
│ Risk Score: [{{ $node.risk }}]     │
│ Bypass Manual Review: ☑            │
└─────────────────────────────────────┘
┌─ Logging & Audit ──────────────────┐
│ Log Auto-Approval: ☑               │
│ Reason Category: [Low Risk ▼]     │
│   - Low Risk Score                 │
│   - Trusted Customer               │
│   - Small Amount                   │
│   - Whitelisted                    │
│ Add Note: [textarea]               │
└─────────────────────────────────────┘
┌─ Post-Approval Actions ────────────┐
│ Notify Customer: ☑                 │
│ Send Receipt: ☑                    │
│ Update User Tier: ☐                │
│ Add to Fast Track: ☐               │
└─────────────────────────────────────┘
```

**Fields:**
- `approvalReason` - Text (expression support)
- `conditionsSummary` - Display only
- `riskScore` - Expression
- `bypassManualReview` - Boolean
- `logApproval` - Boolean (always true)
- `reasonCategory` - Enum
- `note` - Textarea
- `notifyCustomer` - Boolean
- `sendReceipt` - Boolean
- `updateUserTier` - Boolean
- `addToFastTrack` - Boolean

---

### 8. ESCALATE_TO_COMPLIANCE 🚨
**Current:** Just reason
**Enterprise Upgrade:**

```typescript
Sections:
┌─ Escalation Details ───────────────┐
│ Escalation Type: [AML Alert ▼]    │
│   - AML Alert                      │
│   - Sanctions Hit                  │
│   - High Risk Transaction          │
│   - Fraud Suspected                │
│   - KYC Issue                      │
│   - Other                          │
│ Severity: [High ▼]                 │
│ Urgency: [Immediate ▼]             │
│ Reason: [rich textarea]            │
│ Evidence: [attachments]            │
└─────────────────────────────────────┘
┌─ Compliance Assignment ────────────┐
│ Primary Contact: [Auto ▼]          │
│ Backup Contact: [select]           │
│ SLA: [4 hours ▼]                   │
│ Auto-escalate to MLRO: ☐           │
│ Escalate After: [8 hours]          │
└─────────────────────────────────────┘
┌─ Customer Impact ──────────────────┐
│ Block All Transactions: ☑          │
│ Freeze Account: ☐                  │
│ Notify Customer: ☐                 │
│ External Reporting Required: ☐     │
│   - FinCEN (US)                    │
│   - FIU (jurisdiction)             │
└─────────────────────────────────────┘
┌─ Case Management ──────────────────┐
│ Create Case: ☑                     │
│ Case Type: [Investigation ▼]       │
│ Related Cases: [search & link]     │
│ Track Time: ☑                      │
└─────────────────────────────────────┘
```

**Fields:**
- `escalationType` - Enum
- `severity` - LOW/MEDIUM/HIGH/CRITICAL
- `urgency` - LOW/NORMAL/HIGH/IMMEDIATE
- `reason` - Rich textarea
- `evidence` - Array of files/links
- `primaryContact` - AUTO/SELECT
- `backupContact` - Select user
- `sla` - Number (hours)
- `autoEscalateToMLRO` - Boolean
- `escalateAfter` - Number (hours)
- `blockAllTransactions` - Boolean
- `freezeAccount` - Boolean
- `notifyCustomer` - Boolean
- `externalReportingRequired` - Boolean
- `externalReportingType` - Array
- `createCase` - Boolean
- `caseType` - Enum
- `relatedCases` - Array of case IDs
- `trackTime` - Boolean

---

## 🛠️ Implementation Strategy

### Phase 1: Core Infrastructure
1. Create shared UI components:
   - `ActionFieldBuilder` - Universal field renderer
   - `ActionAccordion` - Collapsible sections
   - `ExpressionField` - Dynamic values with {{ }}
   - `TemplateSelector` - Pre-built configs

### Phase 2: Action-by-Action Enhancement
- Start with most used actions (based on analytics)
- Implement accordion structure for each
- Add expression support to all text fields
- Create templates for common scenarios

### Phase 3: Testing & Documentation
- Create test workflows for each action
- Document all fields and their purposes
- Add inline help text and examples
- Create video tutorials

### Phase 4: Advanced Features
- Action templates library
- Bulk action updates
- Action analytics dashboard
- Export/import action configs

---

## 📋 Success Criteria

✅ Each action has 5+ relevant configuration fields
✅ All actions use accordion sections for organization
✅ Expression support (`{{ }}`) for dynamic values
✅ Templates available for common scenarios
✅ Inline validation and helpful error messages
✅ Rich descriptions and examples
✅ Consistent UI/UX across all actions
✅ Full audit trail for compliance

---

## 🎯 Priority Order

1. **HIGH**: REJECT_TRANSACTION, FREEZE_ORDER (most critical for compliance)
2. **MEDIUM**: ESCALATE_TO_COMPLIANCE, REQUIRE_APPROVAL (frequent use)
3. **LOW**: Others (nice to have, less frequent)

---

**Next Steps:** Approve plan and start with Phase 1 + Priority actions

