import { prisma } from './src/lib/prisma';

async function monitorWebhookLogs() {
  console.log('🔍 Monitoring webhook logs (last 30 seconds)...\n');
  
  const thirtySecondsAgo = new Date(Date.now() - 30000);
  
  while (true) {
    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          action: {
            in: ['KYC_WEBHOOK_RECEIVED', 'KYC_STATUS_CHANGED']
          },
          createdAt: {
            gte: thirtySecondsAgo
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      if (logs.length > 0) {
        console.clear();
        console.log('✅ Found webhook logs!\n');
        
        logs.forEach((log, i) => {
          console.log(`${i + 1}. ${log.action}`);
          console.log(`   Actor: ${log.actorType}`);
          console.log(`   Entity: ${log.entityType} - ${log.entityId}`);
          console.log(`   Time: ${log.createdAt.toISOString()}`);
          console.log(`   Severity: ${log.severity}`);
          
          if (log.context) {
            const ctx = log.context as any;
            if (ctx.webhookType) console.log(`   Webhook Type: ${ctx.webhookType}`);
            if (ctx.oldStatus) console.log(`   Status: ${ctx.oldStatus} → ${ctx.newStatus}`);
            if (ctx.reviewResult) {
              console.log(`   Review Result:`, JSON.stringify(ctx.reviewResult, null, 2));
            }
          }
          console.log('');
        });
        
        break;
      }
      
      process.stdout.write('⏳ Waiting for webhooks...\r');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      break;
    }
  }
  
  await prisma.$disconnect();
}

monitorWebhookLogs();
