# 🚀 Redis Caching Expansion Plan

## 📊 Current State:
✅ **Rates caching** - Implemented
- Cache key: `rate:{CRYPTO}-{FIAT}`
- TTL: 30 seconds
- Hit rate: 85-95% expected
- Impact: **90-95% latency reduction**

---

## 🎯 Additional Caching Opportunities:

### Priority 1: High Impact, Low Risk (Implement First)

#### 1. **System Settings** ⭐⭐⭐⭐⭐
```typescript
// Current: DB query on EVERY request
await prisma.systemSettings.findUnique({ where: { key } });

// With Redis:
Cache key: "settings:{key}"
TTL: 5 minutes (or invalidate on update)
Read frequency: 100-1000x per minute
Write frequency: 1x per day
Impact: ⬇️ 95% DB queries
```

**Where used:**
- `PLATFORM_FEE_PERCENTAGE` - every order calculation
- `MIN_ORDER_AMOUNT`, `MAX_ORDER_AMOUNT` - every order validation
- `KYC_REQUIRED` - every KYC check
- Security settings - every admin action

**Files to update:**
- `src/lib/services/system-settings.service.ts` ✅
- `src/app/api/settings/route.ts`
- `src/app/api/admin/settings/route.ts`

---

#### 2. **Active Integration Config** ⭐⭐⭐⭐⭐
```typescript
// Current: DB query on EVERY rate/KYC/blockchain request
await prisma.integration.findFirst({
  where: { category: 'RATES', status: 'active' }
});

// With Redis:
Cache key: "integration:active:{category}"
TTL: 10 minutes (or invalidate on update)
Read frequency: 100-500x per minute
Write frequency: 1x per week
Impact: ⬇️ 90% DB queries
```

**Where used:**
- `rate-provider.service.ts` - every rate fetch ✅ (partially)
- `integration-management.service.ts` - admin panel
- KYC provider selection
- Blockchain provider selection

**Files to update:**
- `src/lib/services/integration-management.service.ts`
- `src/lib/integrations/IntegrationFactory.ts` ✅

---

#### 3. **Trading Pairs** ⭐⭐⭐⭐
```typescript
// Current: DB query on EVERY buy page load
await prisma.tradingPair.findMany({
  where: { isActive: true },
  include: { currency, fiatCurrency }
});

// With Redis:
Cache key: "trading-pairs:active"
TTL: 10 minutes
Read frequency: 50-200x per minute
Write frequency: 1x per month
Impact: ⬇️ 85% DB queries
```

**Where used:**
- `/buy` page - every load
- Order creation validation
- Admin trading pair management

**Files to update:**
- `src/app/api/trading-pairs/route.ts`
- `src/components/features/ClientOrderWidget.tsx`

---

### Priority 2: Medium Impact (Implement Second)

#### 4. **User KYC Status** ⭐⭐⭐
```typescript
// Current: DB query on EVERY protected route
const user = await prisma.user.findUnique({
  where: { id: session.userId },
  select: { kycStatus: true }
});

// With Redis:
Cache key: "user:{userId}:kyc-status"
TTL: 2 minutes
Read frequency: 10-50x per minute per user
Write frequency: 1x per KYC verification
Impact: ⬇️ 70% DB queries
Invalidate: When KYC status changes
```

**Where used:**
- Middleware - every protected route
- `/buy` page - order creation validation
- `/kyc` page - status checks

**Files to update:**
- `src/lib/middleware/auth.ts`
- `src/app/api/kyc/status/route.ts`

---

#### 5. **User Wallets** ⭐⭐⭐
```typescript
// Current: DB query on EVERY wallet display
await prisma.userWallet.findMany({
  where: { userId }
});

// With Redis:
Cache key: "user:{userId}:wallets"
TTL: 5 minutes
Read frequency: 5-20x per minute per user
Write frequency: 1x per wallet add/update
Impact: ⬇️ 60% DB queries
Invalidate: When wallet added/updated
```

**Where used:**
- Client dashboard
- Order creation (wallet selection)
- Admin user details

**Files to update:**
- `src/app/api/user/wallets/route.ts`
- `src/components/features/WalletList.tsx`

---

#### 6. **Currency & Fiat Info** ⭐⭐⭐
```typescript
// Current: DB query for currency metadata
await prisma.currency.findMany();
await prisma.fiatCurrency.findMany();

// With Redis:
Cache key: "currencies:all", "fiat:all"
TTL: 1 hour
Read frequency: 20-100x per minute
Write frequency: 1x per quarter
Impact: ⬇️ 90% DB queries
```

**Where used:**
- Rate calculations
- Order creation
- Admin currency management

---

### Priority 3: Low Impact (Nice to Have)

#### 7. **Blockchain Networks** ⭐⭐
```typescript
Cache key: "blockchain:networks"
TTL: 30 minutes
Impact: ⬇️ 50% DB queries
```

#### 8. **Order Statistics** ⭐⭐
```typescript
// Dashboard stats (admin)
Cache key: "stats:orders:daily"
TTL: 5 minutes
Impact: ⬇️ 80% DB queries for dashboard
```

---

## 📈 Expected Combined Impact:

### Current State (Rates Only):
```
/api/rates:        200ms → 5ms    (⬇️ 97%)
/buy page:         500ms → 450ms  (⬇️ 10%) - still fetches settings, pairs, etc.
Order creation:    800ms → 750ms  (⬇️ 6%)  - still validates against DB
Admin dashboard:  1000ms → 950ms  (⬇️ 5%)  - still queries stats
```

### With Full Redis Implementation:
```
/api/rates:        200ms → 5ms     (⬇️ 97%) ✅
/buy page:         500ms → 50ms    (⬇️ 90%) - cached settings, pairs ✅
Order creation:    800ms → 150ms   (⬇️ 81%) - cached validation ✅
Admin dashboard:  1000ms → 200ms   (⬇️ 80%) - cached stats ✅
KYC checks:        300ms → 50ms    (⬇️ 83%) - cached status ✅
```

**Overall system performance: ⬇️ 70-90% latency**

---

## 🏗️ Implementation Plan:

### Phase 1: Critical Infrastructure (Done ✅)
- [x] Redis connection service
- [x] Basic caching utilities
- [x] Rates caching

### Phase 2: Configuration Caching (Next 30 min)
- [ ] System Settings caching
- [ ] Active Integration caching
- [ ] Trading Pairs caching

### Phase 3: User Data Caching (Next 20 min)
- [ ] User KYC status caching
- [ ] User Wallets caching

### Phase 4: Reference Data (Next 10 min)
- [ ] Currencies caching
- [ ] Blockchain Networks caching

### Phase 5: Analytics (Optional)
- [ ] Order statistics caching
- [ ] Dashboard metrics caching

---

## 🔑 Cache Invalidation Strategy:

### 1. **Time-based (TTL)**
- Rates: 30 seconds
- Settings: 5 minutes
- Integrations: 10 minutes
- User data: 2-5 minutes

### 2. **Event-based (Explicit Invalidation)**
```typescript
// When settings updated:
await CacheService.delete('settings:{key}');

// When KYC status changes:
await CacheService.delete(`user:${userId}:kyc-status`);

// When trading pair added/updated:
await CacheService.delete('trading-pairs:active');
```

### 3. **Bulk Clear (Emergency)**
```typescript
// Clear all cache:
await CacheService.flushAll();
```

---

## 📊 Memory Usage Estimate:

### Current (Rates Only):
```
Rate keys: ~20 pairs × 50 bytes = 1KB
Total: ~1-2KB
```

### With Full Implementation:
```
Rates:             ~1KB    (20 pairs)
Settings:          ~2KB    (20 settings)
Integrations:      ~1KB    (10 configs)
Trading Pairs:     ~5KB    (50 pairs with relations)
User KYC (100):    ~10KB   (100 active users)
User Wallets:      ~20KB   (100 users × 3 wallets)
Currencies:        ~3KB    (metadata)
-------------------------------------------
Total:             ~42KB per instance

With 1000 concurrent users: ~1MB
Upstash free tier: 256MB ✅
```

**Conclusion: Memory is NOT a concern** ✅

---

## 🚀 Recommended Approach:

### Option A: **Full Implementation** (60 min)
✅ Implement all Priority 1 + Priority 2 caches
✅ Maximum performance gain (70-90%)
✅ Minimal memory usage (~1-5MB)
✅ Production-ready

### Option B: **Minimal Expansion** (30 min)
✅ Add only Settings + Integrations caching
✅ 50-60% performance gain
✅ Safest approach

### Option C: **Rates Only** (Current)
⚠️ Only 10-20% overall system improvement
⚠️ Most DB queries still hit database
⚠️ Missed opportunity

---

## 💡 My Recommendation:

**Go with Option A (Full Implementation)** because:

1. **Low Risk:**
   - All caches have TTL fallback
   - Can disable anytime
   - Cache invalidation is explicit

2. **High Impact:**
   - 70-90% latency reduction vs. 10-20%
   - Better user experience
   - Lower Vercel costs (fewer DB connections)

3. **Low Cost:**
   - Same Upstash free tier
   - Same Redis instance
   - Minimal memory (~1-5MB)

4. **Correct Architecture:**
   - Redis is MEANT for this
   - Industry standard pattern
   - Scales naturally

---

## ❓ Ваше решение:

**Что делаем?**

1. **Option A:** Полная реализация (60 мин) - максимум эффекта
2. **Option B:** Только Settings + Integrations (30 мин) - баланс
3. **Option C:** Оставляем только rates - минимум

**Ваш выбор?** 🤔

