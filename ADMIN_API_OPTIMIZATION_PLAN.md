# 🚀 Admin API Optimization Plan

## 📊 Current Performance Issues:

### **Problem 1: `/api/admin/orders` - Slow Loading**

**Current implementation:**
```typescript
// Lines 40-74 in src/app/api/admin/orders/route.ts
prisma.order.findMany({
  include: {
    user: { include: { profile: true }},  // ❌ Deep nesting
    currency: true,
    fiatCurrency: true,
    paymentMethod: true,
    blockchain: true,
    payIn: {                                // ❌ HUGE nested data
      include: {
        fiatCurrency, cryptocurrency, paymentMethod, network
      }
    },
    payOut: {                               // ❌ HUGE nested data
      include: {
        fiatCurrency, cryptocurrency, paymentMethod, network
      }
    }
  }
})
```

**Issues:**
- ❌ Loads 8+ relations per order
- ❌ Deep nesting (user.profile, payIn.*, payOut.*)
- ❌ No caching
- ❌ **20 orders × 8 relations = 160+ DB rows fetched!**

**Expected time:** 500-2000ms

---

### **Problem 2: `/api/admin/stats` - Dashboard Very Slow**

**Current implementation:**
```typescript
// Lines 44-255 in src/app/admin/stats/route.ts

// GOOD (already optimized):
✅ groupBy for counts (lines 46-72) - reduced 14 queries to 5

// BAD (still slow):
❌ volumeResult aggregate (line 104) - Full table scan
❌ volumeByCurrency groupBy (line 110) - Heavy query
❌ recentOrders with includes (line 117) - 10 orders with relations
❌ recentKyc with includes (line 130) - 5 KYC with user data
❌ recentActivity (line 142) - audit log query
❌ dailyVolume raw SQL (line 171) - Date aggregation
❌ currencyStats groupBy (line 196) - Another groupBy
❌ Trend calculations (lines 218-254) - 6 more count() queries

TOTAL: ~20 database queries!
```

**Issues:**
- ❌ **20+ separate DB queries**
- ❌ No caching (recalculates on every load)
- ❌ Heavy aggregations (SUM, GROUP BY, raw SQL)
- ❌ **Stats change rarely but query every time!**

**Expected time:** 2-5 seconds (TOO SLOW!)

---

## 🎯 Optimization Strategy:

### **Phase 1: Add Redis Cache (Highest Impact)**

#### **A. Cache `/api/admin/stats` Response**

Stats change rarely - perfect for caching!

```typescript
// src/app/api/admin/stats/route.ts

import { CacheService } from '@/lib/services/cache.service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('range') || 'week';
  
  // 1. Try Redis cache first
  const cacheKey = `admin-stats-${timeRange}`;
  const cached = await CacheService.getAdminStats(cacheKey);
  if (cached) {
    return NextResponse.json({
      success: true,
      data: cached,
      cached: true
    });
  }
  
  // 2. Cache MISS - calculate stats (existing code)
  const stats = await calculateStats(timeRange);
  
  // 3. Cache for 2 minutes
  await CacheService.setAdminStats(cacheKey, stats, 120);
  
  return NextResponse.json({
    success: true,
    data: stats,
    cached: false
  });
}
```

**Impact:**
- First call: 2-5s (calculate)
- Subsequent calls (2min): 0.01-0.05s (cache hit)
- **⬇️ 99% latency reduction!**

---

#### **B. Cache `/api/admin/orders` List**

Orders list doesn't change often - cache it!

```typescript
// src/app/api/admin/orders/route.ts

import { CacheService } from '@/lib/services/cache.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const status = searchParams.get('status') || 'all';
  
  // 1. Build cache key
  const cacheKey = `admin-orders-${status}-${page}`;
  
  // 2. Try cache
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }
  
  // 3. Fetch from DB (existing code)
  const result = await fetchOrders(...);
  
  // 4. Cache for 1 minute
  await CacheService.set(cacheKey, result, 60);
  
  return NextResponse.json(result);
}
```

**Impact:**
- First call: 500-2000ms (DB query)
- Subsequent calls (1min): 10-50ms (cache hit)
- **⬇️ 90-95% latency reduction!**

---

### **Phase 2: Optimize DB Queries**

#### **A. Simplify `/api/admin/orders` includes**

Remove unnecessary deep nesting:

```typescript
// BEFORE (slow):
include: {
  user: { include: { profile: true }},  // ❌
  payIn: { include: {...} },            // ❌ Deep
  payOut: { include: {...} }            // ❌ Deep
}

// AFTER (fast):
include: {
  user: {
    select: {                            // ✅ Only what's needed
      id: true,
      email: true,
      profile: {
        select: { firstName: true, lastName: true }
      }
    }
  },
  currency: { select: { code: true, name: true }},
  fiatCurrency: { select: { code: true, name: true }},
  paymentMethod: { select: { name: true, type: true }}
  // ❌ Remove payIn/payOut from list (load on-demand)
}
```

**Impact:** ⬇️ 60-70% query time

---

#### **B. Add pagination to nested queries**

```typescript
// BEFORE:
recentOrders = await prisma.order.findMany({
  take: 10,
  include: {...}  // ❌ All relations
})

// AFTER:
recentOrders = await prisma.order.findMany({
  take: 10,
  select: {       // ✅ Only essentials
    id: true,
    status: true,
    totalFiat: true,
    createdAt: true,
    user: { select: { email: true }}
  }
})
```

**Impact:** ⬇️ 50% query time

---

### **Phase 3: Add Background Refresh**

For stats that change rarely, calculate in background:

```typescript
// Cron job or API route to refresh cache
export async function refreshAdminStatsCache() {
  const ranges = ['today', 'week', 'month', 'all'];
  
  for (const range of ranges) {
    const stats = await calculateStats(range);
    await CacheService.setAdminStats(`admin-stats-${range}`, stats, 300);
  }
  
  console.log('✅ Admin stats cache refreshed');
}
```

**Result:** Stats always cached, never wait!

---

## 📊 Expected Performance Improvements:

### **Before Optimization:**

| Endpoint | Current Time | DB Queries |
|----------|--------------|------------|
| `/admin/orders` | 500-2000ms | 1 complex |
| `/admin/stats` | 2000-5000ms | 20+ queries |
| **Total dashboard load** | **2.5-7 seconds** | **21+ queries** |

---

### **After Phase 1 (Redis Cache):**

| Endpoint | First Call | Cached (subsequent) | Improvement |
|----------|-----------|---------------------|-------------|
| `/admin/orders` | 500-2000ms | **10-50ms** | **⬇️ 95%** |
| `/admin/stats` | 2000-5000ms | **10-50ms** | **⬇️ 99%** |
| **Total dashboard load** | 2.5-7s | **0.02-0.1s** | **⬇️ 95-99%** |

**Cache hit rate:** 80-90% (admins reload often)

---

### **After Phase 2 (Optimized Queries):**

| Endpoint | First Call | Cached | Improvement |
|----------|-----------|--------|-------------|
| `/admin/orders` | **200-500ms** ✅ | 10-50ms | ⬇️ 60-75% first, ⬇️ 95% cached |
| `/admin/stats` | **800-1500ms** ✅ | 10-50ms | ⬇️ 60-70% first, ⬇️ 99% cached |
| **Total dashboard load** | **1-2s** ✅ | **0.02-0.1s** | **⬇️ 80-95%** |

---

### **After Phase 3 (Background Refresh):**

| Endpoint | Time | Improvement |
|----------|------|-------------|
| `/admin/orders` | **10-50ms** | Always cached ✅ |
| `/admin/stats` | **10-50ms** | Always cached ✅ |
| **Total dashboard load** | **0.02-0.1s** | **⬇️ 98-99%** |

---

## 🚀 Implementation Plan:

### **Step 1: Add Redis cache to stats (30 min)**

```bash
# Files to modify:
1. src/lib/services/cache.service.ts
   - Add getAdminStats()
   - Add setAdminStats()
   - Add clearAdminStats()

2. src/app/api/admin/stats/route.ts
   - Add Redis caching
   - Keep existing logic

3. Test locally
```

---

### **Step 2: Add Redis cache to orders (20 min)**

```bash
# Files to modify:
1. src/app/api/admin/orders/route.ts
   - Add Redis caching
   - Simplify includes

2. Add cache invalidation when order status changes
   - src/app/api/admin/orders/[id]/route.ts

3. Test locally
```

---

### **Step 3: Optimize queries (20 min)**

```bash
# Files to modify:
1. src/app/api/admin/orders/route.ts
   - Replace include with select
   - Remove payIn/payOut from list

2. src/app/api/admin/stats/route.ts
   - Optimize recentOrders query
   - Optimize recentKyc query

3. Test locally
```

---

### **Step 4: Deploy and monitor (10 min)**

```bash
1. Commit changes
2. Push to Vercel
3. Monitor logs
4. Check performance
```

**Total time:** ~80 minutes  
**Expected improvement:** ⬇️ 80-99% latency

---

## 💰 Cost Analysis:

### **Redis Memory Usage:**

```
Admin stats cache:
- Stats data: ~50KB per range
- 4 ranges (today, week, month, all): 200KB
- Orders cache: ~20KB per page
- 10 pages cached: 200KB

Total: ~400KB

Upstash free tier: 256MB
Usage: 0.15% ✅
```

**Cost:** $0 (well within free tier)

---

## 🔧 Cache Invalidation Strategy:

### **When to clear cache:**

#### **Admin Stats:**
```typescript
// Clear on:
- New order created → clearAdminStats()
- Order status changed → clearAdminStats()
- New user registered → clearAdminStats()
- KYC status changed → clearAdminStats()

// Or: Use TTL only (2 minutes is acceptable)
```

#### **Orders List:**
```typescript
// Clear on:
- Order status changed → clearAdminOrders(status, page)
- New order created → clearAdminOrders('all')

// Or: Use short TTL (1 minute)
```

---

## ✅ Ready to Implement?

**Should I proceed with:**

1. ✅ **Phase 1** - Add Redis cache (30 min) - **Highest impact**
2. ✅ **Phase 2** - Optimize queries (20 min) - Good improvement  
3. ⏸️ **Phase 3** - Background refresh (later) - Nice to have

**Start with Phase 1?** (Yes/No)

