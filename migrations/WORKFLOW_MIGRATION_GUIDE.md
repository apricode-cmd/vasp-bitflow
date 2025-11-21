# Workflow Engine Migration Guide

## 📋 Overview

This migration adds the **No-Code Workflow Automation Engine** to the production database.

### What's Included:
- ✅ 2 Tables: `Workflow`, `WorkflowExecution`
- ✅ 3 Enums: `WorkflowTrigger`, `WorkflowStatus`, `WorkflowActionType`
- ✅ 6 Performance Indexes
- ✅ 4 Foreign Keys (referencing `Admin` table)
- ✅ Auto-update trigger for `updatedAt`

---

## 🚀 Prerequisites

### 1. Check Dependencies

**Required:** The `Admin` table must exist in your database.

```sql
-- Verify Admin table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'Admin'
);
```

Expected: `t` (true)

### 2. Backup Database

**CRITICAL:** Always backup before running migrations!

```bash
# Using Supabase CLI
supabase db dump -f backup_before_workflow_$(date +%Y%m%d_%H%M%S).sql

# Or using pg_dump
pg_dump -h <host> -U <user> -d <database> -f backup_before_workflow.sql
```

---

## 📝 Migration Steps

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Navigate to your project
   - Go to **SQL Editor**

2. **Copy Migration SQL**
   - Open `migrations/workflow_engine.sql`
   - Copy the entire contents

3. **Execute Migration**
   - Paste into SQL Editor
   - Click **Run** (or Ctrl+Enter)

4. **Verify Success**
   - Check for success message at the bottom
   - Should see: "✅ Workflow Engine migration completed successfully!"

5. **Run Verification Queries**
   ```sql
   -- Check tables created
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name LIKE 'Workflow%';
   
   -- Check enums created
   SELECT typname FROM pg_type WHERE typname LIKE 'Workflow%';
   
   -- Check first workflow (should be empty)
   SELECT COUNT(*) FROM "Workflow";
   ```

### Option 2: Supabase CLI

```bash
# Connect to your database
supabase db push

# Or manually execute
psql <DATABASE_URL> -f migrations/workflow_engine.sql
```

### Option 3: PostgreSQL Client

```bash
psql -h <host> -U <user> -d <database> -f migrations/workflow_engine.sql
```

---

## ✅ Post-Migration Verification

### 1. Check Tables

```sql
-- Verify Workflow table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Workflow'
ORDER BY ordinal_position;

-- Verify WorkflowExecution table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'WorkflowExecution'
ORDER BY ordinal_position;
```

Expected: 18 columns in `Workflow`, 11 columns in `WorkflowExecution`

### 2. Check Enums

```sql
-- List all enum values
SELECT 
  t.typname as enum_type,
  e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE 'Workflow%'
ORDER BY t.typname, e.enumsortorder;
```

Expected:
- `WorkflowTrigger`: 7 values
- `WorkflowStatus`: 4 values
- `WorkflowActionType`: 9 values

### 3. Check Indexes

```sql
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE 'Workflow%'
ORDER BY tablename, indexname;
```

Expected: 6 indexes total

### 4. Check Foreign Keys

```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name LIKE 'Workflow%';
```

Expected: 4 foreign keys

### 5. Check Trigger

```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'workflow_updated_at_trigger';
```

Expected: 1 trigger on `Workflow` table

### 6. Test Insert (Optional)

```sql
-- Get first admin ID
SELECT id FROM "Admin" LIMIT 1;

-- Insert test workflow (replace <ADMIN_ID> with actual ID)
INSERT INTO "Workflow" (
  "id",
  "name",
  "description",
  "trigger",
  "visualState",
  "logicState",
  "createdBy",
  "updatedAt"
) VALUES (
  'test_workflow_' || gen_random_uuid()::text,
  'Test Workflow',
  'Migration test workflow',
  'ORDER_CREATED',
  '{"nodes":[],"edges":[]}'::jsonb,
  '{"if":[true,{"action":"test"}]}'::jsonb,
  '<ADMIN_ID>',
  CURRENT_TIMESTAMP
);

-- Verify insert
SELECT id, name, status, "isActive" FROM "Workflow";

-- Clean up test data
DELETE FROM "Workflow" WHERE name = 'Test Workflow';
```

---

## 🔄 Rollback (if needed)

If something goes wrong, you can rollback the migration:

```sql
-- Rollback script (run in order)
DROP TABLE IF EXISTS "WorkflowExecution" CASCADE;
DROP TABLE IF EXISTS "Workflow" CASCADE;
DROP TYPE IF EXISTS "WorkflowActionType";
DROP TYPE IF EXISTS "WorkflowStatus";
DROP TYPE IF EXISTS "WorkflowTrigger";
DROP FUNCTION IF EXISTS update_workflow_updated_at() CASCADE;
```

Then restore from backup:

```bash
psql <DATABASE_URL> -f backup_before_workflow.sql
```

---

## 📊 Expected Database State After Migration

### Tables Created:
```
Workflow (18 columns)
├── id (TEXT, PK)
├── name (TEXT)
├── description (TEXT, nullable)
├── trigger (WorkflowTrigger)
├── triggerConfig (JSONB, nullable)
├── visualState (JSONB)
├── logicState (JSONB)
├── status (WorkflowStatus, default: DRAFT)
├── priority (INTEGER, default: 0)
├── isActive (BOOLEAN, default: false)
├── version (INTEGER, default: 1)
├── parentId (TEXT, nullable, FK)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
├── createdBy (TEXT, FK -> Admin)
├── updatedBy (TEXT, nullable, FK -> Admin)
├── executionCount (INTEGER, default: 0)
└── lastExecutedAt (TIMESTAMP, nullable)

WorkflowExecution (11 columns)
├── id (TEXT, PK)
├── workflowId (TEXT, FK -> Workflow)
├── trigger (WorkflowTrigger)
├── contextData (JSONB)
├── success (BOOLEAN)
├── result (JSONB)
├── error (TEXT, nullable)
├── executionTimeMs (INTEGER)
├── executedAt (TIMESTAMP)
├── entityType (TEXT, nullable)
└── entityId (TEXT, nullable)
```

### Enums Created:
- `WorkflowTrigger` (7 values)
- `WorkflowStatus` (4 values)
- `WorkflowActionType` (9 values)

### Indexes Created:
1. `Workflow_trigger_isActive_idx`
2. `Workflow_status_isActive_idx`
3. `Workflow_createdBy_idx`
4. `WorkflowExecution_workflowId_executedAt_idx`
5. `WorkflowExecution_trigger_executedAt_idx`
6. `WorkflowExecution_entityType_entityId_idx`

### Foreign Keys:
1. `Workflow.createdBy` → `Admin.id`
2. `Workflow.updatedBy` → `Admin.id`
3. `Workflow.parentId` → `Workflow.id`
4. `WorkflowExecution.workflowId` → `Workflow.id`

---

## 🔐 Security Considerations

### 1. Permissions

The migration grants `ALL` permissions to `authenticated` role by default:

```sql
GRANT ALL ON TABLE "Workflow" TO authenticated;
GRANT ALL ON TABLE "WorkflowExecution" TO authenticated;
```

**Review and adjust** based on your security requirements. You may want to:

```sql
-- Revoke default permissions
REVOKE ALL ON TABLE "Workflow" FROM authenticated;
REVOKE ALL ON TABLE "WorkflowExecution" FROM authenticated;

-- Grant specific permissions
GRANT SELECT, INSERT, UPDATE ON TABLE "Workflow" TO authenticated;
GRANT SELECT, INSERT ON TABLE "WorkflowExecution" TO authenticated;

-- Or use Row Level Security (RLS)
ALTER TABLE "Workflow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowExecution" ENABLE ROW LEVEL SECURITY;

-- Create policies as needed
CREATE POLICY "workflow_admin_only" ON "Workflow"
  FOR ALL
  USING (auth.role() = 'admin');
```

### 2. Row Level Security (RLS)

Consider enabling RLS if your application uses Supabase Auth:

```sql
-- Enable RLS
ALTER TABLE "Workflow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowExecution" ENABLE ROW LEVEL SECURITY;

-- Example policy: Only admins can modify workflows
CREATE POLICY "workflow_admin_modify" ON "Workflow"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Admin" 
      WHERE "Admin"."id" = auth.uid()::text
    )
  );

-- Example policy: Anyone can read workflow executions
CREATE POLICY "execution_read_all" ON "WorkflowExecution"
  FOR SELECT
  USING (true);
```

---

## 🐛 Troubleshooting

### Issue: "relation Admin does not exist"

**Solution:** Make sure the `Admin` table exists before running the migration.

```sql
-- Check if Admin table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'Admin'
);
```

### Issue: "type WorkflowTrigger already exists"

**Solution:** The enums may already exist. Run the rollback script first, then re-run the migration.

### Issue: "permission denied"

**Solution:** Make sure you have sufficient database permissions. You need:
- CREATE TABLE
- CREATE TYPE (for enums)
- CREATE INDEX
- CREATE FUNCTION
- CREATE TRIGGER

### Issue: Foreign key constraint fails

**Solution:** Ensure there are no orphaned references. Check:

```sql
-- Find workflows with invalid createdBy
SELECT * FROM "Workflow" 
WHERE "createdBy" NOT IN (SELECT id FROM "Admin");

-- Find workflows with invalid updatedBy
SELECT * FROM "Workflow" 
WHERE "updatedBy" IS NOT NULL 
AND "updatedBy" NOT IN (SELECT id FROM "Admin");
```

---

## 📚 Additional Resources

- [Prisma Schema](../prisma/schema.prisma) - Source of truth for database schema
- [Workflow Engine Docs](../docs/WORKFLOW_ENGINE.md) - Feature documentation
- [Supabase Migrations](https://supabase.com/docs/guides/database/migrations) - Official guide

---

## ✅ Migration Checklist

- [ ] Backup database created
- [ ] Admin table verified to exist
- [ ] Migration SQL executed successfully
- [ ] Tables created (Workflow, WorkflowExecution)
- [ ] Enums created (3 types)
- [ ] Indexes created (6 indexes)
- [ ] Foreign keys created (4 constraints)
- [ ] Trigger created (workflow_updated_at_trigger)
- [ ] Permissions reviewed and configured
- [ ] Test workflow insert/delete successful
- [ ] Application tested with new tables
- [ ] Rollback script tested (optional, in staging)

---

## 📞 Support

If you encounter any issues during migration:

1. **Check verification queries** in this guide
2. **Review error messages** carefully
3. **Test in staging first** before production
4. **Keep backup handy** for rollback

---

**Migration Status:** ✅ Ready for Production

**Last Updated:** 2025-01-21

**Version:** 1.0.0

