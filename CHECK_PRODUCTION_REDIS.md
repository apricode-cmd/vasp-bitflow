# 🔍 How to Check Redis is Working on Vercel Production

## ✅ Quick Checks:

### Method 1: Vercel Logs (Best Way) 🎯

1. **Open Vercel Dashboard:**
   ```
   https://vercel.com/your-team/your-project
   ```

2. **Go to Deployments → Latest → Logs**

3. **Make API call and watch logs in real-time:**
   ```bash
   curl https://your-domain.vercel.app/api/rates
   ```

4. **Look for Redis messages:**
   ```
   ✅ Good signs (Redis working):
   📦 [Redis] Connected successfully
   📦 [Redis] Cache HIT: rates:BTC-EUR
   ✅ [Redis] Cached: rates:BTC-EUR = 85000 (TTL: 30s)
   
   ⚠️ Bad signs (Redis not working):
   ❌ [Redis] Connection error: ...
   ⚠️ REDIS_URL is not set
   ```

---

### Method 2: Response Headers 📊

Check if response includes cache metadata:

```bash
# Call API twice
curl -i https://your-domain.vercel.app/api/rates

# First call (cache MISS):
# Should take 200-500ms

# Second call (cache HIT):
# Should take 5-20ms (much faster!)
```

**Compare response times:**
- Cache MISS: 200-500ms ❌
- Cache HIT: 5-20ms ✅

---

### Method 3: Check Response Data 🔍

Some endpoints return `cached: true/false`:

```bash
# Call /api/trading-pairs
curl https://your-domain.vercel.app/api/trading-pairs

# Response should include:
{
  "success": true,
  "pairs": [...],
  "cached": true  ← Redis cache hit!
}

# OR
{
  "success": true,
  "pairs": [...],
  "cached": false  ← Cache miss, fetched from DB
}
```

---

### Method 4: Upstash Dashboard 📈

1. **Go to Upstash Console:**
   ```
   https://console.upstash.com/
   ```

2. **Select your Redis database**

3. **Check metrics:**
   - **Commands/sec:** Should show activity when you call API
   - **Memory usage:** Should increase when caching
   - **Keys:** Should show cached keys

4. **Use Data Browser:**
   ```
   Search for: rates:*
   
   Should show keys like:
   - rates:BTC-EUR
   - rates:ETH-EUR
   - rates:USDT-EUR
   ```

---

### Method 5: Performance Test 🚀

Run multiple requests and measure improvement:

```bash
# Without cache (first call)
time curl -s https://your-domain.vercel.app/api/rates > /dev/null
# Expected: 0.2-0.5s

# With cache (second call)
time curl -s https://your-domain.vercel.app/api/rates > /dev/null
# Expected: 0.01-0.05s (10-50x faster!)
```

---

## 🧪 Detailed Testing Script:

### Test all cached endpoints:

```bash
#!/bin/bash
DOMAIN="https://your-domain.vercel.app"

echo "Testing Redis Cache on Production"
echo "=================================="

# Test 1: Rates
echo "1. Testing /api/rates..."
echo "   First call (MISS):"
time curl -s "$DOMAIN/api/rates" | jq -r '.BTC.EUR' 2>/dev/null || echo "N/A"

echo "   Second call (HIT - should be faster):"
time curl -s "$DOMAIN/api/rates" | jq -r '.BTC.EUR' 2>/dev/null || echo "N/A"

# Test 2: Trading Pairs
echo ""
echo "2. Testing /api/trading-pairs..."
echo "   First call (MISS):"
time curl -s "$DOMAIN/api/trading-pairs" | jq -r '.pairs | length' 2>/dev/null || echo "N/A"

echo "   Second call (HIT - should be faster):"
time curl -s "$DOMAIN/api/trading-pairs" | jq -r '.pairs | length' 2>/dev/null || echo "N/A"

# Test 3: Buy Config
echo ""
echo "3. Testing /api/buy/config (requires auth)..."
# This requires authentication, skip or provide token

echo ""
echo "=================================="
echo "✅ Check Vercel logs for cache messages"
```

---

## 📊 What to Look For:

### ✅ Redis is Working:

1. **Vercel Logs show:**
   ```
   📦 [Redis] Connected successfully
   📦 [Redis] Cache HIT: rates:BTC-EUR
   ✅ [Redis] Cached: rates:BTC-EUR = 85000 (TTL: 30s)
   ```

2. **Response times:**
   - First call: 200-500ms
   - Second call: 5-20ms (10-50x faster!)

3. **Upstash Dashboard:**
   - Commands/sec > 0
   - Keys exist (rates:*, trading-pairs:*, etc.)
   - Memory usage > 0

---

### ❌ Redis is NOT Working:

1. **Vercel Logs show:**
   ```
   ❌ [Redis] Connection error: ...
   ⚠️ REDIS_URL is not set
   ❌ Failed to connect to Redis
   ```

2. **Response times:**
   - First call: 200-500ms
   - Second call: 200-500ms (NO improvement)

3. **Upstash Dashboard:**
   - Commands/sec = 0
   - No keys
   - Memory usage = 0

---

## 🔧 Troubleshooting:

### If Redis is NOT working:

#### 1. Check Environment Variables:

```bash
# Vercel Dashboard → Settings → Environment Variables
# Should have:
REDIS_URL=redis://default:...@...upstash.io:6379

# OR (for Upstash REST):
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

#### 2. Check Logs for Errors:

```
Common errors:
- "REDIS_URL is not set" → Add env var
- "Connection timeout" → Wrong URL
- "Authentication failed" → Wrong password
- "ECONNREFUSED" → Redis server down
```

#### 3. Redeploy:

After adding env vars, redeploy:
```bash
git commit --allow-empty -m "redeploy"
git push
```

---

## 📈 Expected Metrics:

### After Redis is working:

| Metric | Before Redis | After Redis | Improvement |
|--------|--------------|-------------|-------------|
| /api/rates (1st) | 200-500ms | 200-500ms | - |
| /api/rates (2nd+) | 200-500ms | 5-20ms | ⬇️ 90-97% |
| /api/trading-pairs | 100-200ms | 5-20ms | ⬇️ 85-95% |
| /api/buy/config | 500-800ms | 50-100ms | ⬇️ 87-90% |
| DB queries | 2000/min | 300/min | ⬇️ 85% |
| Cache hit rate | 10-30% | 85-95% | ⬆️ 3x |

---

## 🎯 Quick Verification Checklist:

- [ ] Vercel logs show "Redis Connected"
- [ ] Second API call is 10-50x faster
- [ ] Upstash dashboard shows activity
- [ ] Keys exist in Upstash Data Browser
- [ ] No Redis errors in logs
- [ ] Response includes `cached: true`

**If all ✅ → Redis is working!**

---

## 💡 Pro Tip:

Use Vercel's real-time logs while testing:

1. Open: Vercel Dashboard → Deployments → Latest → Logs
2. Filter: "Redis" 
3. Run: `curl https://your-domain.vercel.app/api/rates`
4. Watch: Real-time Redis messages appear

**You'll immediately see if cache is working!**

---

## 🚀 Next Steps:

Once Redis is confirmed working:

1. ✅ Monitor for 24 hours
2. ✅ Check Upstash costs (should be $0 on free tier)
3. ✅ Verify performance improvements
4. ✅ Celebrate 70-90% latency reduction! 🎉

