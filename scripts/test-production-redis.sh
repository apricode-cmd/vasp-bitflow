#!/bin/bash
# Test Production Redis Caching
# Checks if Redis is working on Vercel production

echo "🧪 Testing Production Redis Caching"
echo "===================================================="
echo ""

# Your production domain
DOMAIN="https://your-domain.vercel.app"

echo "📍 Testing domain: $DOMAIN"
echo ""

# Test 1: Check /api/rates (should cache rates)
echo "1️⃣  Testing /api/rates endpoint..."
echo "   First call (cache MISS expected):"
time curl -s "$DOMAIN/api/rates" -o /dev/null -w "   Status: %{http_code}, Time: %{time_total}s\n"

echo ""
echo "   Second call (cache HIT expected - should be faster):"
time curl -s "$DOMAIN/api/rates" -o /dev/null -w "   Status: %{http_code}, Time: %{time_total}s\n"

echo ""
echo "2️⃣  Testing /api/trading-pairs endpoint..."
echo "   First call (cache MISS expected):"
time curl -s "$DOMAIN/api/trading-pairs" -o /dev/null -w "   Status: %{http_code}, Time: %{time_total}s\n"

echo ""
echo "   Second call (cache HIT expected - should be faster):"
time curl -s "$DOMAIN/api/trading-pairs" -o /dev/null -w "   Status: %{http_code}, Time: %{time_total}s\n"

echo ""
echo "===================================================="
echo "✅ Test complete!"
echo ""
echo "💡 Check Vercel logs for Redis cache messages:"
echo "   📦 [Redis] Cache HIT: ..."
echo "   ❌ [Redis] Cache MISS: ..."
echo ""

