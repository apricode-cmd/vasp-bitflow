/**
 * Check if Workflow tables exist in production
 * Run: npx tsx scripts/check-production-workflow.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking production database for Workflow tables...\n');

  try {
    // Check if Workflow table exists
    const workflowTableCheck = await prisma.$queryRaw<any[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('Workflow', 'WorkflowExecution')
      ORDER BY table_name
    `;

    console.log('📋 Tables found:', workflowTableCheck.length);
    workflowTableCheck.forEach((t: any) => {
      console.log(`   ✅ ${t.table_name}`);
    });

    if (workflowTableCheck.length === 0) {
      console.log('\n❌ Workflow tables NOT FOUND in production!');
      console.log('\n📝 Action required:');
      console.log('   Run FULL migration: migrations/workflow_engine.sql');
      console.log('   This will create:');
      console.log('   - 2 tables (Workflow, WorkflowExecution)');
      console.log('   - 3 enums');
      console.log('   - 6 indexes');
      console.log('   - 4 foreign keys');
    } else if (workflowTableCheck.length === 2) {
      console.log('\n✅ Both Workflow tables exist!');
      console.log('\n📝 You can use: migrations/workflow_engine_enums_only.sql');
    } else {
      console.log('\n⚠️  Partial tables found - database may be inconsistent');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

