#!/bin/bash
# Test script for KYC notifications
# Run after deploying fixes

set -e

BASE_URL=${BASE_URL:-"http://localhost:3000"}
ADMIN_TOKEN=${ADMIN_TOKEN:-""}

echo "🧪 Testing KYC Notifications"
echo "============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Check email provider
echo "Test 1: Check Email Provider Status"
echo "------------------------------------"
curl -s "$BASE_URL/api/health" | jq '.email' || echo "❌ Health check failed"
echo ""

# Test 2: Check notification events
echo "Test 2: Check Notification Events"
echo "-----------------------------------"
echo "Expected events: KYC_APPROVED, KYC_REJECTED"
echo "Run this SQL to verify:"
echo ""
echo "SELECT \"eventKey\", \"isActive\", channels"
echo "FROM \"NotificationEvent\""
echo "WHERE \"eventKey\" IN ('KYC_APPROVED', 'KYC_REJECTED');"
echo ""

# Test 3: Check email templates
echo "Test 3: Check Email Templates"
echo "-------------------------------"
echo "Run this SQL to verify:"
echo ""
echo "SELECT key, name, status, \"isActive\""
echo "FROM \"EmailTemplate\""
echo "WHERE key IN ('KYC_APPROVED', 'KYC_REJECTED');"
echo ""

# Test 4: Manual test instructions
echo "Test 4: Manual Testing Steps"
echo "----------------------------"
echo "1. Register a test user:"
echo "   POST $BASE_URL/api/auth/register"
echo ""
echo "2. Submit KYC (as user)"
echo "   POST $BASE_URL/api/kyc/submit-form"
echo ""
echo "3. Approve KYC (as admin):"
echo "   PUT $BASE_URL/api/admin/kyc/{sessionId}"
echo "   Body: { \"status\": \"APPROVED\" }"
echo ""
echo "4. Check logs for:"
echo "   ✅ [NOTIFICATION] Sent KYC_APPROVED for user {userId}"
echo ""
echo "5. Check database:"
echo "   SELECT * FROM \"EmailLog\" WHERE template = 'KYC_APPROVED' ORDER BY \"createdAt\" DESC LIMIT 1;"
echo ""
echo "6. Check user's email inbox"
echo ""

# Test 5: Check recent emails
echo "Test 5: Check Recent Email Logs"
echo "--------------------------------"
echo "Run this SQL to see recent KYC emails:"
echo ""
echo "SELECT template, recipient, status, error, \"createdAt\""
echo "FROM \"EmailLog\""
echo "WHERE template IN ('KYC_APPROVED', 'KYC_REJECTED')"
echo "  AND \"createdAt\" > NOW() - INTERVAL '24 hours'"
echo "ORDER BY \"createdAt\" DESC;"
echo ""

# Test 6: Check notification queue
echo "Test 6: Check Notification Queue"
echo "----------------------------------"
echo "Run this SQL to see pending/failed notifications:"
echo ""
echo "SELECT \"eventKey\", channel, status, attempts, error, \"createdAt\""
echo "FROM \"NotificationQueue\""
echo "WHERE \"eventKey\" IN ('KYC_APPROVED', 'KYC_REJECTED')"
echo "ORDER BY \"createdAt\" DESC"
echo "LIMIT 10;"
echo ""

echo "✅ Test script complete!"
echo ""
echo "Next steps:"
echo "1. Run manual tests (steps above)"
echo "2. Monitor logs: tail -f /var/log/app/*.log"
echo "3. Check EmailLog table after each action"
echo ""

