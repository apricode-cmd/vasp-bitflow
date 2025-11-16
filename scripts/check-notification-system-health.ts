/**
 * Notification & Email System Health Check
 * 
 * Проверяет критические компоненты системы уведомлений
 * 
 * Usage: npx tsx scripts/check-notification-system-health.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface HealthCheck {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: any;
}

async function checkEmailProvider(): Promise<HealthCheck> {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        category: 'EMAIL',
        isEnabled: true,
        status: 'active'
      }
    });

    if (!integration) {
      return {
        name: 'Email Provider',
        status: 'error',
        message: '❌ No active email provider in database',
        details: {
          fix: 'Add Resend integration via Admin UI: /admin/integrations'
        }
      };
    }

    if (!integration.apiKey) {
      return {
        name: 'Email Provider',
        status: 'error',
        message: '❌ Email provider has no API key',
        details: { integration: integration.name }
      };
    }

    // Check config
    const config = integration.config as any;
    if (!config?.fromEmail) {
      return {
        name: 'Email Provider',
        status: 'warning',
        message: '⚠️ Email provider missing fromEmail in config',
        details: { integration: integration.name }
      };
    }

    return {
      name: 'Email Provider',
      status: 'ok',
      message: `✅ ${integration.name} configured`,
      details: {
        service: integration.service,
        fromEmail: config.fromEmail,
        hasApiKey: !!integration.apiKey
      }
    };
  } catch (error: any) {
    return {
      name: 'Email Provider',
      status: 'error',
      message: `❌ Check failed: ${error.message}`
    };
  }
}

async function checkNotificationEvents(): Promise<HealthCheck> {
  try {
    const totalEvents = await prisma.notificationEvent.count();
    const activeEvents = await prisma.notificationEvent.count({
      where: { isActive: true }
    });
    const eventsWithTemplates = await prisma.notificationEvent.count({
      where: { templateId: { not: null } }
    });

    if (totalEvents === 0) {
      return {
        name: 'Notification Events',
        status: 'error',
        message: '❌ No notification events in database',
        details: {
          fix: 'Run: npx prisma db seed'
        }
      };
    }

    if (activeEvents < 10) {
      return {
        name: 'Notification Events',
        status: 'warning',
        message: `⚠️ Only ${activeEvents} active events (expected ~17)`,
        details: { totalEvents, activeEvents }
      };
    }

    return {
      name: 'Notification Events',
      status: 'ok',
      message: `✅ ${activeEvents} active events configured`,
      details: {
        total: totalEvents,
        active: activeEvents,
        withTemplates: eventsWithTemplates
      }
    };
  } catch (error: any) {
    return {
      name: 'Notification Events',
      status: 'error',
      message: `❌ Check failed: ${error.message}`
    };
  }
}

async function checkEmailTemplates(): Promise<HealthCheck> {
  try {
    const totalTemplates = await prisma.emailTemplate.count();
    const publishedTemplates = await prisma.emailTemplate.count({
      where: { status: 'PUBLISHED', isActive: true }
    });

    if (totalTemplates === 0) {
      return {
        name: 'Email Templates',
        status: 'warning',
        message: '⚠️ No email templates (will use fallbacks)',
        details: {
          note: 'System will use hardcoded fallback templates'
        }
      };
    }

    return {
      name: 'Email Templates',
      status: 'ok',
      message: `✅ ${publishedTemplates} published templates`,
      details: {
        total: totalTemplates,
        published: publishedTemplates
      }
    };
  } catch (error: any) {
    return {
      name: 'Email Templates',
      status: 'error',
      message: `❌ Check failed: ${error.message}`
    };
  }
}

async function checkNotificationQueue(): Promise<HealthCheck> {
  try {
    const pending = await prisma.notificationQueue.count({
      where: { status: 'PENDING' }
    });
    const failed = await prisma.notificationQueue.count({
      where: { status: 'FAILED' }
    });
    const sent = await prisma.notificationQueue.count({
      where: { status: 'SENT' }
    });

    const failedRecent = await prisma.notificationQueue.count({
      where: {
        status: 'FAILED',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
        }
      }
    });

    if (failedRecent > 10) {
      return {
        name: 'Notification Queue',
        status: 'warning',
        message: `⚠️ ${failedRecent} failed notifications in last 24h`,
        details: { pending, failed, sent, failedRecent }
      };
    }

    if (pending > 100) {
      return {
        name: 'Notification Queue',
        status: 'warning',
        message: `⚠️ ${pending} pending notifications (cron job not running?)`,
        details: { pending, failed, sent }
      };
    }

    return {
      name: 'Notification Queue',
      status: 'ok',
      message: `✅ Queue healthy (${pending} pending, ${failed} failed)`,
      details: { pending, failed, sent }
    };
  } catch (error: any) {
    return {
      name: 'Notification Queue',
      status: 'error',
      message: `❌ Check failed: ${error.message}`
    };
  }
}

async function checkEmailLogs(): Promise<HealthCheck> {
  try {
    const totalEmails = await prisma.emailLog.count();
    const sentEmails = await prisma.emailLog.count({
      where: { status: 'SENT' }
    });
    const failedEmails = await prisma.emailLog.count({
      where: { status: 'FAILED' }
    });

    const failedRecent = await prisma.emailLog.count({
      where: {
        status: 'FAILED',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    const sentRecent = await prisma.emailLog.count({
      where: {
        status: 'SENT',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    if (failedRecent > sentRecent && failedRecent > 5) {
      return {
        name: 'Email Logs',
        status: 'error',
        message: `❌ More failed (${failedRecent}) than sent (${sentRecent}) in last 24h`,
        details: { totalEmails, sentEmails, failedEmails, failedRecent, sentRecent }
      };
    }

    if (failedRecent > 10) {
      return {
        name: 'Email Logs',
        status: 'warning',
        message: `⚠️ ${failedRecent} failed emails in last 24h`,
        details: { totalEmails, sentEmails, failedEmails, failedRecent }
      };
    }

    return {
      name: 'Email Logs',
      status: 'ok',
      message: `✅ ${sentEmails} sent, ${failedEmails} failed (total)`,
      details: {
        total: totalEmails,
        sent: sentEmails,
        failed: failedEmails,
        sentLast24h: sentRecent,
        failedLast24h: failedRecent
      }
    };
  } catch (error: any) {
    return {
      name: 'Email Logs',
      status: 'error',
      message: `❌ Check failed: ${error.message}`
    };
  }
}

async function checkEnvironmentVariables(): Promise<HealthCheck> {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];

  const recommended = [
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'ENCRYPTION_KEY'
  ];

  const missing: string[] = [];
  const missingRecommended: string[] = [];

  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  recommended.forEach(key => {
    if (!process.env[key]) {
      missingRecommended.push(key);
    }
  });

  if (missing.length > 0) {
    return {
      name: 'Environment Variables',
      status: 'error',
      message: `❌ Missing required: ${missing.join(', ')}`,
      details: { missing, missingRecommended }
    };
  }

  if (missingRecommended.length > 0) {
    return {
      name: 'Environment Variables',
      status: 'warning',
      message: `⚠️ Missing recommended: ${missingRecommended.join(', ')}`,
      details: { missingRecommended }
    };
  }

  return {
    name: 'Environment Variables',
    status: 'ok',
    message: '✅ All required variables set',
    details: {
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasEmailFrom: !!process.env.EMAIL_FROM
    }
  };
}

async function getFailedEmailsDetails() {
  const failedEmails = await prisma.emailLog.findMany({
    where: {
      status: 'FAILED',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    select: {
      recipient: true,
      subject: true,
      template: true,
      error: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return failedEmails;
}

async function main() {
  console.log('🔍 Notification & Email System Health Check\n');
  console.log('='.repeat(60) + '\n');

  const checks: HealthCheck[] = [];

  // Run all checks
  console.log('Running checks...\n');

  checks.push(await checkEnvironmentVariables());
  checks.push(await checkEmailProvider());
  checks.push(await checkNotificationEvents());
  checks.push(await checkEmailTemplates());
  checks.push(await checkNotificationQueue());
  checks.push(await checkEmailLogs());

  // Print results
  checks.forEach(check => {
    console.log(`${check.message}`);
    if (check.details) {
      console.log(`  Details:`, check.details);
    }
    console.log();
  });

  // Summary
  console.log('='.repeat(60));
  console.log('\n📊 Summary:\n');

  const errors = checks.filter(c => c.status === 'error');
  const warnings = checks.filter(c => c.status === 'warning');
  const ok = checks.filter(c => c.status === 'ok');

  console.log(`✅ Passed: ${ok.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`❌ Errors: ${errors.length}`);

  // Failed emails details
  if (errors.some(e => e.name === 'Email Logs') || warnings.some(w => w.name === 'Email Logs')) {
    console.log('\n📧 Recent Failed Emails:\n');
    const failedDetails = await getFailedEmailsDetails();
    
    if (failedDetails.length === 0) {
      console.log('  (none in last 24h)');
    } else {
      failedDetails.forEach(email => {
        console.log(`  • ${email.template} to ${email.recipient}`);
        console.log(`    Error: ${email.error}`);
        console.log(`    Time: ${email.createdAt.toLocaleString()}`);
        console.log();
      });
    }
  }

  // Recommendations
  if (errors.length > 0 || warnings.length > 0) {
    console.log('\n🔧 Recommended Actions:\n');

    if (errors.some(e => e.name === 'Email Provider')) {
      console.log('  1. Add Resend integration:');
      console.log('     - Visit: /admin/integrations');
      console.log('     - Or run SQL: INSERT INTO "Integration" ...');
      console.log();
    }

    if (warnings.some(w => w.name === 'Notification Queue' && w.message.includes('pending'))) {
      console.log('  2. Setup cron job for notification queue:');
      console.log('     - Create: /api/cron/process-notifications');
      console.log('     - Configure Vercel Cron or node-cron');
      console.log();
    }

    if (warnings.some(w => w.name === 'Environment Variables')) {
      console.log('  3. Add missing environment variables:');
      console.log('     - RESEND_API_KEY=re_...');
      console.log('     - EMAIL_FROM=noreply@yourdomain.com');
      console.log();
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Check complete!\n');

  // Exit code
  if (errors.length > 0) {
    console.log('❌ System has critical errors. Fix before deployment.\n');
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log('⚠️  System has warnings. Recommended to fix.\n');
    process.exit(0);
  } else {
    console.log('✅ System is healthy and ready for production!\n');
    process.exit(0);
  }
}

main()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

