# 👤 User Details Page - Redesign Plan

## 🎯 Current State Analysis

### ✅ What Exists:
- `/admin/users/[id]/page.tsx` - отдельная страница
- Sheet modal в users list page
- Базовый функционал:
  - Profile info
  - Orders list
  - Activity logs
  - KYC status
  - Wallets

### ❌ Problems:

1. **Дублирование:**
   - Sheet modal + отдельная страница (2 места с одинаковой логикой)
   - Неконсистентный UX

2. **Ограниченная функциональность:**
   - Orders - только список (нет Details, нет Pay-In/Pay-Out связи)
   - KYC - мокап данные, нет реальной информации
   - Нет Pay-In/Pay-Out
   - Нет финансовой статистики
   - Нет timeline/activity feed

3. **Плохой дизайн:**
   - Старомодные табы (кнопки вместо Tabs component)
   - Нет Quick Stats
   - Нет графиков
   - Неконсистентно с новым Users Management

4. **Отсутствующие секции:**
   - Pay-In (входящие платежи)
   - Pay-Out (исходящие платежи)
   - Financial Summary
   - Timeline (хронология событий)
   - Notes/Comments (заметки админа)
   - Actions History (детальная история действий)

---

## 🚀 Proposed Solution

### **Вариант A: Полный редизайн (Рекомендую!)**

Убираем Sheet modal → только отдельная страница `/admin/users/[id]`

#### Layout Structure:
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back]  John Doe                          [Actions ▼]     │
│           john@example.com                                   │
├─────────────────────────────────────────────────────────────┤
│ [Quick Stats: 4 cards]                                      │
├─────────────────────────────────────────────────────────────┤
│ [Profile Summary Card]     [Financial Summary Card]         │
├─────────────────────────────────────────────────────────────┤
│ [Tabs: Overview | Orders | Pay-In | Pay-Out | KYC | Activity]│
├─────────────────────────────────────────────────────────────┤
│ [Tab Content with DataTables & Cards]                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Detailed Sections

### 1. **Header Section** (Top)
```
[← Back to Users]    👤 John Doe                    [Actions Dropdown ▼]
                     john@example.com               - Edit Profile
                     🇺🇸 United States              - Send Email
                     Member since Jan 15, 2024       - View as User
                     🟢 Active | ✅ KYC Approved    - Export Data
                                                    ---
                                                    - Block User
                                                    - Delete User
```

**Components:**
- Avatar (large)
- Name + Email
- Country flag + name
- Badges: Status, KYC, Role
- Actions dropdown

---

### 2. **Quick Stats** (4 Cards)

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Total Orders     │ Total Spent      │ Pending Orders   │ KYC Status       │
│ 🛒 12            │ 💰 €5,432.50     │ ⏳ 2             │ ✅ Approved      │
│ +3 this month    │ ↑ 23% vs avg     │                  │ Jan 20, 2024     │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

**Data:**
- Orders: total, this month, status breakdown
- Spent: total, average order value, trend
- Pending: orders, payments, KYC
- KYC: status, date, verifier

---

### 3. **Profile & Financial Summary** (2 Columns)

#### Left: Profile Summary
```
┌─ Profile Information ─────────────────────┐
│ 📧 Email: john@example.com                │
│ 📱 Phone: +1 234 567 8900                 │
│ 🌍 Country: 🇺🇸 United States             │
│ 📅 Joined: Jan 15, 2024                   │
│ 🕐 Last Login: Nov 14, 2024 10:30 AM     │
│ 🔑 Auth Method: Password + TOTP           │
└───────────────────────────────────────────┘
```

#### Right: Financial Summary
```
┌─ Financial Summary ───────────────────────┐
│ 💰 Total Volume: €5,432.50                │
│ 📊 Completed Orders: 10                   │
│ ⏳ Processing: 2                          │
│ ❌ Cancelled: 0                           │
│ 📈 Average Order: €543.25                 │
│ 💳 Payment Methods: Bank Transfer (100%)  │
└───────────────────────────────────────────┘
```

---

### 4. **Tabs Section** (Main Content)

#### Tab 1: **Overview** (Dashboard-like)
```
┌─ Timeline ─────────────────────────────────┬─ Wallets ──────────────┐
│ Nov 14, 10:30 AM - Order Created          │ 🪙 BTC                 │
│ Nov 13, 15:20 PM - Payment Received       │ 0x1a2b3c...            │
│ Nov 12, 09:00 AM - KYC Approved           │ Default ✅             │
│ Nov 10, 14:00 PM - Profile Updated        │                        │
│ [Load More...]                             │ 🪙 ETH                 │
│                                            │ 0x9x8y7z...            │
└────────────────────────────────────────────┴────────────────────────┘

┌─ Recent Activity ───────────────────────────────────────────────────┐
│ • Created order #ORD-2024-001 (€1,200)                             │
│ • Verified payment for order #ORD-2024-002                          │
│ • Updated wallet address for BTC                                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- Timeline (chronological events)
- Wallets (cryptocurrency wallets)
- Recent Activity (last 10 actions)
- Quick Links (View All Orders, View KYC, etc.)

---

#### Tab 2: **Orders** (DataTable)
```
┌─ Orders ────────────────────────────────────────────────────────────┐
│ [Search] [Status ▼] [Date Range]                     [Export]      │
├─────────────────────────────────────────────────────────────────────┤
│ Ref        │ Type │ Amount    │ Status     │ Date       │ Actions  │
│ ORD-001    │ BUY  │ €1,200    │ COMPLETED  │ Nov 14     │ [View]   │
│ ORD-002    │ BUY  │ €850      │ PROCESSING │ Nov 13     │ [View]   │
│ ORD-003    │ BUY  │ €2,000    │ PENDING    │ Nov 12     │ [View]   │
└─────────────────────────────────────────────────────────────────────┘

📊 Statistics:
• Total Orders: 12
• Completed: 10 (€5,432.50)
• Processing: 2 (€1,200)
• Average Order Value: €543.25
• Preferred Currency: BTC (60%), ETH (30%), USDT (10%)
```

**Features:**
- DataTableAdvanced (sortable, filterable)
- Inline order details
- Quick actions (View, Cancel, Refund)
- Statistics summary
- Chart: Orders over time

---

#### Tab 3: **Pay-In** (Incoming Payments)
```
┌─ Incoming Payments ─────────────────────────────────────────────────┐
│ [Search] [Status ▼] [Method ▼]                       [Export]      │
├─────────────────────────────────────────────────────────────────────┤
│ Ref        │ Order    │ Amount  │ Method    │ Status   │ Date      │
│ PIN-001    │ ORD-001  │ €1,200  │ Bank      │ RECEIVED │ Nov 14    │
│ PIN-002    │ ORD-002  │ €850    │ Bank      │ PENDING  │ Nov 13    │
└─────────────────────────────────────────────────────────────────────┘

💰 Total Received: €5,432.50
⏳ Pending Verification: €850
✅ Verified: €4,582.50
```

**Data:**
- Payment reference
- Linked order
- Amount & currency
- Payment method
- Status (PENDING, RECEIVED, VERIFIED)
- Transaction ID
- Bank details (if applicable)

---

#### Tab 4: **Pay-Out** (Outgoing Crypto)
```
┌─ Outgoing Payments ─────────────────────────────────────────────────┐
│ [Search] [Status ▼] [Currency ▼]                     [Export]      │
├─────────────────────────────────────────────────────────────────────┤
│ Ref        │ Order    │ Amount     │ Wallet    │ Status   │ Date    │
│ POUT-001   │ ORD-001  │ 0.05 BTC   │ 0x1a2b... │ SENT     │ Nov 14  │
│ POUT-002   │ ORD-002  │ 1.2 ETH    │ 0x9x8y... │ PENDING  │ Nov 13  │
└─────────────────────────────────────────────────────────────────────┘

📤 Total Sent: 0.15 BTC, 5.2 ETH, 1000 USDT
⏳ Pending: 1.2 ETH
✅ Completed: 0.15 BTC, 4.0 ETH, 1000 USDT
```

**Data:**
- PayOut reference
- Linked order
- Crypto amount & currency
- Destination wallet
- Blockchain network
- Transaction hash
- Status (PENDING, PROCESSING, SENT, CONFIRMED)

---

#### Tab 5: **KYC** (Verification Details)
```
┌─ KYC Verification ──────────────────────────────────────────────────┐
│ Status: ✅ APPROVED                                                 │
│ Verified by: Admin John (admin@example.com)                         │
│ Verification Date: Jan 20, 2024                                     │
│ Risk Level: 🟢 LOW                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ Personal Information                                                │
│ • Full Name: John Michael Doe                                       │
│ • Date of Birth: Jan 15, 1990 (34 years)                           │
│ • Nationality: 🇺🇸 United States                                   │
│ • Phone: +1 234 567 8900                                            │
├─────────────────────────────────────────────────────────────────────┤
│ Address                                                             │
│ • Street: 123 Main Street, Apt 4B                                   │
│ • City: New York, NY 10001                                          │
│ • Country: 🇺🇸 United States                                       │
├─────────────────────────────────────────────────────────────────────┤
│ Identity Document                                                   │
│ • Type: Passport                                                    │
│ • Number: AB1234567                                                 │
│ • Issuing Country: 🇺🇸 United States                               │
│ • Issue Date: Jan 10, 2020                                          │
│ • Expiry Date: Jan 10, 2030                                         │
├─────────────────────────────────────────────────────────────────────┤
│ Documents (3)                                                       │
│ 📄 Passport Front - passport_front.jpg - Jan 18, 2024 [View]       │
│ 📄 Passport Back - passport_back.jpg - Jan 18, 2024 [View]         │
│ 📄 Proof of Address - utility_bill.pdf - Jan 18, 2024 [View]       │
├─────────────────────────────────────────────────────────────────────┤
│ Employment & Funds                                                  │
│ • Employment Status: Employed                                       │
│ • Occupation: Software Engineer                                     │
│ • Employer: Tech Corp Inc.                                          │
│ • Source of Funds: Salary                                           │
│ • Source of Wealth: Employment Income                               │
├─────────────────────────────────────────────────────────────────────┤
│ PEP Status                                                          │
│ • Politically Exposed Person: ❌ No                                 │
└─────────────────────────────────────────────────────────────────────┘

[Actions]
- 📝 Edit KYC Data
- ✅ Approve KYC (if pending)
- ❌ Reject KYC (if pending)
- 📄 Download All Documents
- 🔄 Request Re-verification
```

**Data Source:** Real data from `kycSession` + `profile` (все поля)

---

#### Tab 6: **Activity** (Audit Logs)
```
┌─ Activity History ──────────────────────────────────────────────────┐
│ [Search] [Action ▼] [Date Range]                     [Export]      │
├─────────────────────────────────────────────────────────────────────┤
│ Date/Time         │ Action                │ Entity      │ Details   │
│ Nov 14, 10:30 AM  │ ORDER_CREATED         │ Order       │ ORD-001   │
│ Nov 13, 15:20 PM  │ PAYMENT_RECEIVED      │ PayIn       │ PIN-001   │
│ Nov 12, 09:00 AM  │ KYC_APPROVED          │ KYC         │ By Admin  │
│ Nov 10, 14:00 PM  │ PROFILE_UPDATED       │ Profile     │ Phone     │
└─────────────────────────────────────────────────────────────────────┘

📊 Activity Summary:
• Total Actions: 156
• Last 7 days: 23
• Most Common: ORDER_CREATED (45%)
```

**Features:**
- DataTableAdvanced
- Filterable by action type
- Expandable details (show metadata)
- IP address tracking
- User agent info

---

### 5. **Admin Notes** (Bottom Section)

```
┌─ Admin Notes ───────────────────────────────────────────────────────┐
│ [Add Note]                                                          │
├─────────────────────────────────────────────────────────────────────┤
│ 📝 Nov 14, 2024 - Admin John:                                      │
│    "Customer requested expedited KYC review due to large order"    │
│                                                                     │
│ 📝 Nov 10, 2024 - Admin Sarah:                                     │
│    "Verified bank account ownership via call"                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Add/Edit/Delete notes
- Markdown support
- Mentions (@admin)
- Timestamps
- Author info

---

## 🛠️ Technical Implementation

### File Structure:
```
src/app/(admin)/admin/users/[id]/
├── page.tsx                    (Main page - redesigned)
├── loading.tsx                 (Loading state)
├── error.tsx                   (Error boundary)
└── _components/
    ├── UserHeader.tsx          (Header with actions)
    ├── UserQuickStats.tsx      (4 stat cards)
    ├── ProfileSummary.tsx      (Profile card)
    ├── FinancialSummary.tsx    (Financial card)
    ├── OrdersTab.tsx           (Orders table)
    ├── PayInTab.tsx            (Pay-In table)
    ├── PayOutTab.tsx           (Pay-Out table)
    ├── KycTab.tsx              (KYC details)
    ├── ActivityTab.tsx         (Activity logs)
    ├── OverviewTab.tsx         (Dashboard)
    └── AdminNotes.tsx          (Notes section)
```

### API Endpoints:

**New:**
```
GET /api/admin/users/[id]              (Enhanced with Pay-In, Pay-Out)
GET /api/admin/users/[id]/orders       (Paginated orders)
GET /api/admin/users/[id]/pay-in       (Paginated pay-ins)
GET /api/admin/users/[id]/pay-out      (Paginated pay-outs)
GET /api/admin/users/[id]/activity     (Already exists, enhance)
GET /api/admin/users/[id]/timeline     (New: chronological events)
GET /api/admin/users/[id]/stats        (New: financial stats)
POST /api/admin/users/[id]/notes       (New: admin notes)
```

### Data Model (Enhanced):

```typescript
interface UserDetailsEnhanced {
  // Basic info
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin: Date | null;
  
  // Profile (full KYC data)
  profile: {
    // ... all KYC fields from schema
  };
  
  // KYC
  kycSession: {
    status: KycStatus;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    reviewedBy: string | null;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    documents: Document[];
  } | null;
  
  // Financial
  orders: Order[];
  payIns: PayIn[];
  payOuts: PayOut[];
  userWallets: UserWallet[];
  
  // Stats
  stats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    totalPayIns: number;
    totalPayOuts: number;
  };
  
  // Activity
  auditLogs: AuditLog[];
  timeline: TimelineEvent[];
  
  // Admin
  adminNotes: AdminNote[];
}
```

---

## 🎨 Design Principles

1. **Consistency:** Use same components as Users Management (DataTableAdvanced, QuickStats)
2. **Information Density:** Show more data in less space
3. **Actionable:** Clear actions at every level
4. **Progressive Disclosure:** Overview → Details → Raw Data
5. **Real Data Only:** No mocks, all from database
6. **Performance:** Lazy load tabs, paginate tables

---

## 📋 Changes to Users List Page

### Remove Sheet Modal:

```typescript
// BEFORE:
<Sheet open={sheetOpen}>
  <SheetContent>
    {/* User details in modal */}
  </SheetContent>
</Sheet>

// AFTER:
// Redirect to user page
const viewUserDetails = (user: User) => {
  router.push(`/admin/users/${user.id}`);
};

// Or keep modal but make it simpler:
<Sheet open={sheetOpen}>
  <SheetContent>
    <QuickView user={selectedUser} />
    <Link href={`/admin/users/${selectedUser.id}`}>
      <Button>View Full Profile →</Button>
    </Link>
  </SheetContent>
</Sheet>
```

### Update Actions:

```typescript
<DropdownMenuItem onClick={() => router.push(`/admin/users/${user.id}`)}>
  <Eye className="h-4 w-4 mr-2" />
  View Full Profile
</DropdownMenuItem>
```

---

## 🚀 Implementation Plan

### Phase 1: Core Redesign (2-3 hours)
- ✅ Update `/admin/users/[id]/page.tsx`
- ✅ Add UserHeader component
- ✅ Add UserQuickStats
- ✅ Add ProfileSummary & FinancialSummary
- ✅ Implement new tab structure (shadcn Tabs)

### Phase 2: Orders & Pay-In/Pay-Out (1-2 hours)
- ✅ Enhance OrdersTab with DataTableAdvanced
- ✅ Create PayInTab component
- ✅ Create PayOutTab component
- ✅ Add API endpoints for Pay-In/Pay-Out

### Phase 3: KYC Details (1 hour)
- ✅ Enhance KycTab with real data
- ✅ Show all profile fields
- ✅ Documents viewer
- ✅ KYC actions (approve/reject)

### Phase 4: Activity & Timeline (1 hour)
- ✅ Enhance ActivityTab with filters
- ✅ Create OverviewTab with timeline
- ✅ Add timeline API endpoint

### Phase 5: Admin Notes (30 min)
- ✅ Create AdminNotes component
- ✅ Add notes API endpoint
- ✅ CRUD operations

### Phase 6: Users List Integration (30 min)
- ✅ Remove/simplify Sheet modal
- ✅ Update row click to navigate
- ✅ Update actions dropdown

**Total Time: ~7 hours**

---

## 🎉 Benefits

### For Admins:
- 📊 **Complete overview** - all user data in one place
- ⚡ **Faster workflows** - no more switching between pages
- 🎯 **Better insights** - financial stats, timeline, activity
- 📝 **Notes** - collaborate with team on user cases

### For Development:
- 🔄 **Reusable** - components work across admin panel
- 📦 **Maintainable** - single source of truth
- 🧪 **Testable** - isolated components
- 🚀 **Scalable** - easy to add new sections

### For UX:
- ✅ **Consistent** - matches Users Management design
- 🎨 **Modern** - professional look
- 📱 **Responsive** - works on all devices
- ⚡ **Fast** - lazy loading, caching

---

## ❓ Questions for User

1. **Sheet Modal:**
   - Option A: Remove completely (navigate to page)
   - Option B: Keep as "Quick View" with link to full page
   - **Recommendation:** Option A (simpler, consistent)

2. **Admin Notes:**
   - Include in Phase 1 or later?
   - **Recommendation:** Phase 5 (nice-to-have)

3. **Priority Sections:**
   - Which tabs are most important?
   - **Recommendation:** Orders → Pay-In/Pay-Out → KYC → Activity

4. **Additional Features:**
   - Email user directly from page?
   - Export user data (GDPR)?
   - View as user (impersonation)?
   - **Recommendation:** Add to actions dropdown

---

## 🎯 Recommendation

**Start with Phase 1-3** (Core + Orders + Pay-In/Pay-Out)

This gives you:
- ✅ Modern, consistent design
- ✅ All critical user data visible
- ✅ Financial tracking (Orders, Pay-In, Pay-Out)
- ✅ Real KYC data (no mocks)

Then evaluate and add Phase 4-6 based on feedback.

---

**Ready to implement?** Approve the plan and we start! 🚀

