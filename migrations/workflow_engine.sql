-- =====================================================
-- Workflow Engine Migration for Supabase
-- =====================================================
-- Description: No-Code Workflow Automation System
-- Version: 1.0.0
-- Date: 2025-01-21
-- Dependencies: Admin table must exist
-- =====================================================

-- =====================================================
-- 1. CREATE ENUMS
-- =====================================================

-- Workflow Trigger Types
CREATE TYPE "WorkflowTrigger" AS ENUM (
  'ORDER_CREATED',
  'PAYIN_RECEIVED',
  'PAYOUT_REQUESTED',
  'KYC_SUBMITTED',
  'USER_REGISTERED',
  'WALLET_ADDED',
  'AMOUNT_THRESHOLD'
);

-- Workflow Status
CREATE TYPE "WorkflowStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'ARCHIVED'
);

-- Workflow Action Types
CREATE TYPE "WorkflowActionType" AS ENUM (
  'FREEZE_ORDER',
  'REJECT_TRANSACTION',
  'REQUEST_DOCUMENT',
  'REQUIRE_APPROVAL',
  'SEND_NOTIFICATION',
  'FLAG_FOR_REVIEW',
  'AUTO_APPROVE',
  'ESCALATE_TO_COMPLIANCE',
  'HTTP_REQUEST'
);

-- =====================================================
-- 2. CREATE WORKFLOW TABLE
-- =====================================================

CREATE TABLE "Workflow" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  
  -- Trigger configuration
  "trigger" "WorkflowTrigger" NOT NULL,
  "triggerConfig" JSONB,
  
  -- Dual storage strategy
  -- visualState: { nodes: [], edges: [] } for React Flow UI
  -- logicState: compiled json-logic for backend execution
  "visualState" JSONB NOT NULL,
  "logicState" JSONB NOT NULL,
  
  -- Metadata
  "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  
  -- Version control
  "version" INTEGER NOT NULL DEFAULT 1,
  "parentId" TEXT,
  
  -- Audit fields
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT,
  
  -- Stats
  "executionCount" INTEGER NOT NULL DEFAULT 0,
  "lastExecutedAt" TIMESTAMP(3),
  
  CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- 3. CREATE WORKFLOW EXECUTION TABLE
-- =====================================================

CREATE TABLE "WorkflowExecution" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  
  -- Context
  "trigger" "WorkflowTrigger" NOT NULL,
  "contextData" JSONB NOT NULL,
  
  -- Result
  "success" BOOLEAN NOT NULL,
  "result" JSONB NOT NULL,
  "error" TEXT,
  
  -- Performance
  "executionTimeMs" INTEGER NOT NULL,
  
  -- Audit
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "entityType" TEXT,
  "entityId" TEXT,
  
  CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Workflow indexes
CREATE INDEX "Workflow_trigger_isActive_idx" ON "Workflow"("trigger", "isActive");
CREATE INDEX "Workflow_status_isActive_idx" ON "Workflow"("status", "isActive");
CREATE INDEX "Workflow_createdBy_idx" ON "Workflow"("createdBy");

-- WorkflowExecution indexes
CREATE INDEX "WorkflowExecution_workflowId_executedAt_idx" ON "WorkflowExecution"("workflowId", "executedAt");
CREATE INDEX "WorkflowExecution_trigger_executedAt_idx" ON "WorkflowExecution"("trigger", "executedAt");
CREATE INDEX "WorkflowExecution_entityType_entityId_idx" ON "WorkflowExecution"("entityType", "entityId");

-- =====================================================
-- 5. ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Workflow -> Admin (creator)
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_createdBy_fkey" 
  FOREIGN KEY ("createdBy") REFERENCES "Admin"("id") 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Workflow -> Admin (updater)
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_updatedBy_fkey" 
  FOREIGN KEY ("updatedBy") REFERENCES "Admin"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Workflow -> Workflow (versioning)
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_parentId_fkey" 
  FOREIGN KEY ("parentId") REFERENCES "Workflow"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- WorkflowExecution -> Workflow
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowId_fkey" 
  FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================
-- 6. ADD TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Workflow table
CREATE TRIGGER workflow_updated_at_trigger
  BEFORE UPDATE ON "Workflow"
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_updated_at();

-- =====================================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE "Workflow" IS 'Visual no-code workflow automation rules';
COMMENT ON TABLE "WorkflowExecution" IS 'Log of workflow executions with performance metrics';

COMMENT ON COLUMN "Workflow"."visualState" IS 'React Flow graph state: { nodes: [], edges: [] }';
COMMENT ON COLUMN "Workflow"."logicState" IS 'Compiled json-logic for backend execution';
COMMENT ON COLUMN "Workflow"."priority" IS 'Higher values execute first (default: 0)';
COMMENT ON COLUMN "Workflow"."executionCount" IS 'Total number of times this workflow has been executed';

COMMENT ON COLUMN "WorkflowExecution"."contextData" IS 'The data that triggered the workflow (order, payIn, etc.)';
COMMENT ON COLUMN "WorkflowExecution"."result" IS 'Actions returned by workflow execution';
COMMENT ON COLUMN "WorkflowExecution"."executionTimeMs" IS 'Execution time in milliseconds';

-- =====================================================
-- 8. GRANT PERMISSIONS (adjust as needed)
-- =====================================================

-- Grant all permissions to authenticated users (adjust role as needed)
GRANT ALL ON TABLE "Workflow" TO authenticated;
GRANT ALL ON TABLE "WorkflowExecution" TO authenticated;

-- Grant usage on sequences (if using serial IDs)
-- Not needed for CUID/TEXT IDs

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================

-- Verify enums created
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'WorkflowTrigger'::regtype;
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'WorkflowStatus'::regtype;
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'WorkflowActionType'::regtype;

-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('Workflow', 'WorkflowExecution');

-- Verify indexes created
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' AND tablename IN ('Workflow', 'WorkflowExecution');

-- Verify foreign keys created
SELECT constraint_name, table_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_schema = 'public' AND table_name IN ('Workflow', 'WorkflowExecution');

-- =====================================================
-- 10. ROLLBACK SCRIPT (if needed)
-- =====================================================

/*
-- To rollback this migration, run:

DROP TABLE IF EXISTS "WorkflowExecution" CASCADE;
DROP TABLE IF EXISTS "Workflow" CASCADE;
DROP TYPE IF EXISTS "WorkflowActionType";
DROP TYPE IF EXISTS "WorkflowStatus";
DROP TYPE IF EXISTS "WorkflowTrigger";
DROP FUNCTION IF EXISTS update_workflow_updated_at() CASCADE;
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Workflow Engine migration completed successfully!';
  RAISE NOTICE '📊 Created 2 tables: Workflow, WorkflowExecution';
  RAISE NOTICE '🏷️  Created 3 enums: WorkflowTrigger, WorkflowStatus, WorkflowActionType';
  RAISE NOTICE '🔗 Created 4 foreign keys';
  RAISE NOTICE '📈 Created 6 indexes for performance';
  RAISE NOTICE '⚡ Created 1 trigger for updatedAt';
END $$;

