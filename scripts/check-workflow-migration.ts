/**
 * Check if Workflow Engine migration is applied in production
 * Run: npx tsx scripts/check-workflow-migration.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Workflow Engine migration status...\n');

  try {
    // 1. Check if Workflow table exists
    console.log('1️⃣ Checking if Workflow table exists...');
    const workflowTableExists = await prisma.$queryRaw<any[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'Workflow'
    `;
    
    if (workflowTableExists.length > 0) {
      console.log('   ✅ Workflow table exists');
    } else {
      console.log('   ❌ Workflow table NOT found');
    }

    // 2. Check if WorkflowExecution table exists
    console.log('\n2️⃣ Checking if WorkflowExecution table exists...');
    const workflowExecutionExists = await prisma.$queryRaw<any[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'WorkflowExecution'
    `;
    
    if (workflowExecutionExists.length > 0) {
      console.log('   ✅ WorkflowExecution table exists');
    } else {
      console.log('   ❌ WorkflowExecution table NOT found');
    }

    // 3. Check enums
    console.log('\n3️⃣ Checking enums...');
    
    const workflowTrigger = await prisma.$queryRaw<any[]>`
      SELECT enumlabel FROM pg_enum WHERE enumtypid = 'WorkflowTrigger'::regtype
    `;
    console.log(`   WorkflowTrigger: ${workflowTrigger.length > 0 ? '✅' : '❌'} (${workflowTrigger.length} values)`);
    
    const workflowStatus = await prisma.$queryRaw<any[]>`
      SELECT enumlabel FROM pg_enum WHERE enumtypid = 'WorkflowStatus'::regtype
    `;
    console.log(`   WorkflowStatus: ${workflowStatus.length > 0 ? '✅' : '❌'} (${workflowStatus.length} values)`);
    
    const workflowActionType = await prisma.$queryRaw<any[]>`
      SELECT enumlabel FROM pg_enum WHERE enumtypid = 'WorkflowActionType'::regtype
    `;
    console.log(`   WorkflowActionType: ${workflowActionType.length > 0 ? '✅' : '❌'} (${workflowActionType.length} values)`);

    // 4. Check indexes
    console.log('\n4️⃣ Checking indexes...');
    const indexes = await prisma.$queryRaw<any[]>`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename IN ('Workflow', 'WorkflowExecution')
      ORDER BY indexname
    `;
    console.log(`   Found ${indexes.length} indexes:`);
    indexes.forEach((idx: any) => {
      console.log(`   - ${idx.indexname}`);
    });

    // 5. Check foreign keys
    console.log('\n5️⃣ Checking foreign keys...');
    const foreignKeys = await prisma.$queryRaw<any[]>`
      SELECT constraint_name, table_name 
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
        AND table_name IN ('Workflow', 'WorkflowExecution')
        AND constraint_type = 'FOREIGN KEY'
      ORDER BY table_name, constraint_name
    `;
    console.log(`   Found ${foreignKeys.length} foreign keys:`);
    foreignKeys.forEach((fk: any) => {
      console.log(`   - ${fk.table_name}.${fk.constraint_name}`);
    });

    // 6. Count existing workflows
    console.log('\n6️⃣ Checking existing data...');
    try {
      const workflowCount = await prisma.workflow.count();
      const executionCount = await prisma.workflowExecution.count();
      console.log(`   Workflows: ${workflowCount}`);
      console.log(`   Executions: ${executionCount}`);
    } catch (e) {
      console.log('   ⚠️  Cannot query data (tables might not exist)');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    const allGood = workflowTableExists.length > 0 && 
                    workflowExecutionExists.length > 0 &&
                    workflowTrigger.length > 0 &&
                    workflowStatus.length > 0 &&
                    workflowActionType.length > 0;

    if (allGood) {
      console.log('✅ Migration is APPLIED - Workflow Engine ready to use!');
    } else {
      console.log('❌ Migration NOT APPLIED - Need to run migration!');
      console.log('\n📝 To apply migration, run:');
      console.log('   psql $DATABASE_URL -f migrations/workflow_engine.sql');
    }
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Error checking migration:', error.message);
    
    if (error.message.includes('type "WorkflowTrigger" does not exist')) {
      console.log('\n❌ Enums NOT found - Migration NOT applied');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();

