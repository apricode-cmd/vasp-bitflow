/**
 * Compare local and production databases for Workflow tables
 * Run: npx tsx scripts/compare-databases.ts
 */

import { PrismaClient } from '@prisma/client';

const localPrisma = new PrismaClient(); // Local DB
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x'
    }
  }
});

async function checkDatabase(prisma: PrismaClient, dbName: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Checking ${dbName} database...`);
  console.log('='.repeat(60));

  try {
    // 1. Check tables
    console.log('\n📋 Tables:');
    const tables = await prisma.$queryRaw<any[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('Workflow', 'WorkflowExecution')
      ORDER BY table_name
    `;
    
    if (tables.length > 0) {
      tables.forEach((t: any) => console.log(`   ✅ ${t.table_name}`));
    } else {
      console.log('   ❌ No Workflow tables found');
    }

    // 2. Check enums
    console.log('\n🏷️  Enums:');
    try {
      const enums = await prisma.$queryRaw<any[]>`
        SELECT typname 
        FROM pg_type 
        WHERE typname IN ('WorkflowTrigger', 'WorkflowStatus', 'WorkflowActionType')
        ORDER BY typname
      `;
      
      if (enums.length > 0) {
        enums.forEach((e: any) => console.log(`   ✅ ${e.typname}`));
      } else {
        console.log('   ❌ No Workflow enums found');
      }
    } catch (e: any) {
      console.log('   ❌ Cannot query enums:', e.message.split('\n')[0]);
    }

    // 3. Check indexes on Workflow table
    console.log('\n📈 Indexes:');
    try {
      const indexes = await prisma.$queryRaw<any[]>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND tablename IN ('Workflow', 'WorkflowExecution')
          AND indexname NOT LIKE '%pkey%'
        ORDER BY indexname
      `;
      
      if (indexes.length > 0) {
        indexes.forEach((i: any) => console.log(`   ✅ ${i.indexname}`));
      } else {
        console.log('   ❌ No custom indexes found');
      }
    } catch (e: any) {
      console.log('   ⚠️  Cannot query indexes:', e.message.split('\n')[0]);
    }

    // 4. Check foreign keys
    console.log('\n🔗 Foreign Keys:');
    try {
      const fks = await prisma.$queryRaw<any[]>`
        SELECT constraint_name, table_name 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
          AND table_name IN ('Workflow', 'WorkflowExecution')
          AND constraint_type = 'FOREIGN KEY'
        ORDER BY table_name, constraint_name
      `;
      
      if (fks.length > 0) {
        fks.forEach((fk: any) => console.log(`   ✅ ${fk.table_name}.${fk.constraint_name}`));
      } else {
        console.log('   ❌ No foreign keys found');
      }
    } catch (e: any) {
      console.log('   ⚠️  Cannot query FKs:', e.message.split('\n')[0]);
    }

    // 5. Count records
    console.log('\n📊 Data:');
    try {
      const workflowCount = await prisma.workflow.count();
      const executionCount = await prisma.workflowExecution.count();
      console.log(`   Workflows: ${workflowCount}`);
      console.log(`   Executions: ${executionCount}`);
    } catch (e: any) {
      console.log('   ⚠️  Cannot query data - tables may not exist');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message.split('\n')[0]);
  }
}

async function main() {
  console.log('🔄 Comparing Local and Production databases for Workflow Engine...');

  try {
    // Check local database
    await checkDatabase(localPrisma, 'LOCAL');

    // Check production database
    await checkDatabase(prodPrisma, 'PRODUCTION');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📝 SUMMARY & RECOMMENDATION');
    console.log('='.repeat(60));
    console.log('\nBased on the comparison above:');
    console.log('1. If PRODUCTION has NO tables → use: migrations/workflow_engine.sql (FULL)');
    console.log('2. If PRODUCTION has tables but NO enums → use: migrations/workflow_engine_enums_only.sql');
    console.log('3. If PRODUCTION matches LOCAL → No migration needed! ✅');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
  } finally {
    await localPrisma.$disconnect();
    await prodPrisma.$disconnect();
  }
}

main();

