# 🚀 Production Database Optimization - Step by Step

## ✅ Checklist:

- [ ] 1. Backup production database
- [ ] 2. Verify backup
- [ ] 3. Check existing indexes
- [ ] 4. Apply new indexes
- [ ] 5. Verify indexes applied
- [ ] 6. Test performance
- [ ] 7. Monitor for issues

---

## 📋 Prerequisites:

```bash
# You need:
✅ Supabase connection string (from .env)
✅ pg_dump installed (via PostgreSQL)
✅ psql installed
✅ ~30 minutes of time
```

---

## Step 1: Backup Production Database (5 min)

### Option A: Using Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT
2. Navigate to: **Database → Backups**
3. Click: **"Create Backup"**
4. Wait for backup to complete
5. Note the backup ID

**Pros:**
- ✅ Easy, one click
- ✅ Managed by Supabase
- ✅ Can restore from dashboard

**Cons:**
- ⚠️ Takes longer (full database)
- ⚠️ Requires manual restore

---

### Option B: Using pg_dump (Faster, Recommended)

```bash
# 1. Set environment variable
export DATABASE_URL="postgresql://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"

# 2. Create backup directory
mkdir -p backups/production
cd backups/production

# 3. Backup full database
pg_dump "$DATABASE_URL" \
  --format=custom \
  --file="backup_$(date +%Y%m%d_%H%M%S).dump" \
  --verbose

# Expected output:
# pg_dump: saving database definition
# pg_dump: saving encoding = UTF8
# pg_dump: saving standard_conforming_strings = on
# ...
# pg_dump: finished item 0 dump
```

**Backup size:** ~10-50MB (зависит от данных)
**Time:** ~2-5 минут

---

### Option C: Using our script (Automated)

```bash
# 1. Make script executable
chmod +x scripts/backup-production-db.sh

# 2. Run backup
./scripts/backup-production-db.sh

# Output:
# 🔐 Starting Production Database Backup...
# ✅ Backup completed: backups/production/backup_20241114_150000.dump
# 💾 Size: 25MB
```

---

## Step 2: Verify Backup (2 min)

### Check backup file exists and is not corrupted:

```bash
# Check file size
ls -lh backups/production/backup_*.dump

# Should show: ~10-50MB (not 0 bytes!)

# Verify backup integrity
pg_restore --list backups/production/backup_YYYYMMDD_HHMMSS.dump | head -20

# Expected output:
# Archive created at 2024-11-14 15:00:00 CET
# ...
# ; 3 TABLE public User
# ; 4 TABLE public Order
# ; 5 TABLE public Integration
```

**If backup is corrupted or 0 bytes → STOP and re-run backup!**

---

## Step 3: Check Existing Indexes (3 min)

Before adding new indexes, let's see what exists:

```bash
# Option A: Via psql
psql "$DATABASE_URL" -c "
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
"

# Option B: Using our SQL script
psql "$DATABASE_URL" -f prisma/migrations-manual/check-existing-indexes.sql
```

**Save output to file:**
```bash
psql "$DATABASE_URL" -f prisma/migrations-manual/check-existing-indexes.sql > before_indexes.txt
```

---

## Step 4: Apply Performance Indexes (10 min)

### ⚠️ IMPORTANT: Do this during low traffic hours!

**Best time:**
- Late night (2-5 AM local time)
- Weekend
- Maintenance window

### Apply indexes:

```bash
# 1. Review the SQL first
cat prisma/migrations-manual/add-performance-indexes.sql

# 2. Dry run (optional) - just show what will be done
psql "$DATABASE_URL" -f prisma/migrations-manual/add-performance-indexes.sql --echo-all --dry-run

# 3. Apply indexes FOR REAL
psql "$DATABASE_URL" -f prisma/migrations-manual/add-performance-indexes.sql

# Expected output:
# CREATE INDEX
# CREATE INDEX
# CREATE INDEX
# ... (46 times)
# ✅ All 46 indexes created successfully
```

**Expected time:** 5-10 minutes
**Database impact:** Minimal (indexes created online)

---

### ⚠️ If you see errors:

#### Error: "relation does not exist"
```
Cause: Table or column doesn't exist in production
Fix: Comment out that specific CREATE INDEX line
```

#### Error: "index already exists"
```
Cause: Index was already created
Fix: This is OK! Skip or use IF NOT EXISTS
```

#### Error: "permission denied"
```
Cause: Wrong database user
Fix: Use superuser or database owner credentials
```

---

## Step 5: Verify Indexes Applied (3 min)

```bash
# Check indexes after migration
psql "$DATABASE_URL" -f prisma/migrations-manual/check-existing-indexes.sql > after_indexes.txt

# Count indexes before and after
echo "Before: $(grep -c "INDEX" before_indexes.txt)"
echo "After:  $(grep -c "INDEX" after_indexes.txt)"

# Should show +46 indexes
```

### Verify specific critical indexes:

```sql
-- Check Order indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'Order' 
ORDER BY indexname;

-- Expected:
-- idx_order_status
-- idx_order_user_id
-- idx_order_created_at
-- idx_order_user_status
-- idx_order_status_created
```

---

## Step 6: Test Performance (5 min)

### Test 1: Check query performance

```sql
-- Before indexes (from local tests): ~100ms
-- After indexes (expected): ~30ms

EXPLAIN ANALYZE
SELECT * FROM "Order" 
WHERE "userId" = 'some-user-id' 
  AND status = 'PENDING'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Look for:
-- "Index Scan using idx_order_user_status" ✅
-- NOT "Seq Scan" ❌
```

### Test 2: Live API performance

```bash
# Test /api/rates
time curl -s https://your-domain.vercel.app/api/rates > /dev/null

# Before indexes: 200-500ms
# After indexes:  50-150ms (first call, no Redis yet)
```

### Test 3: Monitor Vercel logs

```
Vercel Dashboard → Logs → Real-time

Look for:
✅ No new errors
✅ Response times improved
✅ No "timeout" errors
```

---

## Step 7: Monitor for Issues (24 hours)

### What to watch:

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| Avg response time | 500-1500ms | 200-500ms | [ ] |
| Error rate | 2-5% | <1% | [ ] |
| DB connections | 40-80 | 20-40 | [ ] |
| Query time | 100-300ms | 30-100ms | [ ] |

### Monitoring checklist:

- [ ] Vercel logs - no new errors
- [ ] Supabase metrics - CPU/memory stable
- [ ] User reports - no complaints
- [ ] Response times - improved
- [ ] Error rates - not increased

---

## 🚨 Rollback Plan (If Issues Occur)

### If something goes wrong:

#### Option 1: Drop new indexes (Fast - 2 min)

```sql
-- Drop all new indexes
DROP INDEX IF EXISTS idx_order_user_id;
DROP INDEX IF EXISTS idx_order_status;
-- ... (repeat for all 46 indexes)

-- Or use our rollback script:
psql "$DATABASE_URL" -f prisma/migrations-manual/rollback-indexes.sql
```

#### Option 2: Restore from backup (Slow - 10-30 min)

```bash
# ⚠️ THIS WILL ERASE ALL DATA since backup!
# Only use if database is corrupted

# 1. Drop existing database (careful!)
dropdb "$DATABASE_URL"

# 2. Restore from backup
pg_restore \
  --dbname="$DATABASE_URL" \
  --verbose \
  --clean \
  backups/production/backup_YYYYMMDD_HHMMSS.dump
```

---

## 📊 Expected Results:

### Immediate (after indexes):
- ✅ Query times: ⬇️ 27% (based on local tests)
- ✅ Order queries: ⬇️ 30-40%
- ✅ Audit logs: ⬇️ 67%
- ✅ No breaking changes

### After Redis (next step):
- ✅ Response times: ⬇️ 70-90%
- ✅ DB queries: ⬇️ 85%
- ✅ API calls: ⬇️ 90%

---

## ✅ Quick Start (Copy-Paste Ready)

```bash
# 1. Set database URL
export DATABASE_URL="postgresql://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"

# 2. Create backup
mkdir -p backups/production
pg_dump "$DATABASE_URL" \
  --format=custom \
  --file="backups/production/backup_$(date +%Y%m%d_%H%M%S).dump" \
  --verbose

# 3. Verify backup
ls -lh backups/production/

# 4. Check existing indexes
psql "$DATABASE_URL" -f prisma/migrations-manual/check-existing-indexes.sql > before_indexes.txt

# 5. Apply indexes (DURING LOW TRAFFIC!)
psql "$DATABASE_URL" -f prisma/migrations-manual/add-performance-indexes.sql

# 6. Verify
psql "$DATABASE_URL" -f prisma/migrations-manual/check-existing-indexes.sql > after_indexes.txt
diff before_indexes.txt after_indexes.txt

# 7. Monitor Vercel logs for 30 minutes
```

---

## 📝 Notes:

### Safe to run:
- ✅ During business hours (indexes created online)
- ✅ Multiple times (IF NOT EXISTS)
- ✅ No downtime required

### Recommended:
- ⚠️ Run during low traffic
- ⚠️ Have backup ready
- ⚠️ Monitor for 24 hours
- ⚠️ Test rollback plan first

### Do NOT:
- ❌ Skip backup
- ❌ Run without testing locally first
- ❌ Ignore errors
- ❌ Apply to wrong database

---

## ✅ Ready to proceed?

**Checklist before starting:**
- [ ] Backup strategy decided (Option A, B, or C)
- [ ] Low traffic time scheduled
- [ ] Team notified (if applicable)
- [ ] Rollback plan understood
- [ ] Monitoring setup ready

**Estimated total time: 30-40 minutes**

---

**Questions? Issues? Check logs first, then rollback if needed!**

