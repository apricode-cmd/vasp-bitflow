import { prisma } from './src/lib/prisma';

async function checkWebhookLogs() {
  try {
    console.log('🔍 Checking webhook audit logs...\n');
    
    // Get recent webhook logs
    const webhookLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['KYC_WEBHOOK_RECEIVED', 'KYC_STATUS_CHANGED', 'KYC_API_REQUEST', 'KYC_API_ERROR']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`📊 Found ${webhookLogs.length} recent KYC events\n`);
    
    if (webhookLogs.length === 0) {
      console.log('⚠️  No webhook logs found. Possible issues:');
      console.log('  1. Webhooks not arriving from Sumsub');
      console.log('  2. Logging not working in webhook handler');
      console.log('  3. HMAC signature verification failing');
      return;
    }
    
    webhookLogs.forEach((log, i) => {
      console.log(`${i + 1}. ${log.action}`);
      console.log(`   Actor: ${log.actorType}`);
      console.log(`   Entity: ${log.entityType} ${log.entityId || ''}`);
      console.log(`   Time: ${log.createdAt.toISOString()}`);
      console.log(`   Severity: ${log.severity}`);
      
      if (log.context) {
        const ctx = log.context as any;
        if (ctx.type) console.log(`   Webhook Type: ${ctx.type}`);
        if (ctx.reviewStatus) console.log(`   Review Status: ${ctx.reviewStatus}`);
        if (ctx.reviewResult) console.log(`   Review Result: ${JSON.stringify(ctx.reviewResult)}`);
        if (ctx.oldStatus) console.log(`   Status Change: ${ctx.oldStatus} → ${ctx.newStatus}`);
        if (ctx.endpoint) console.log(`   API: ${ctx.method} ${ctx.endpoint}`);
        if (ctx.statusCode) console.log(`   HTTP: ${ctx.statusCode}`);
        if (ctx.responseTime) console.log(`   Response Time: ${ctx.responseTime}ms`);
      }
      console.log('');
    });
    
    // Check specific user's logs
    const userKycLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'KYC_SESSION',
        entityId: 'cmiebh3oe0055148icer54676'
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`\n👤 Logs for user walker@apricode.agency (last 5):`);
    userKycLogs.forEach((log, i) => {
      console.log(`${i + 1}. ${log.action} - ${log.createdAt.toISOString()}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkWebhookLogs();
