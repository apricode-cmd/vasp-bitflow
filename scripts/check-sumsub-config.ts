/**
 * Check Sumsub configuration in database
 * Run: npx tsx scripts/check-sumsub-config.ts
 */

import { prisma } from '../src/lib/prisma';

async function checkSumsubConfig() {
  try {
    console.log('🔍 Checking Sumsub integration config...\n');

    const integration = await prisma.integration.findFirst({
      where: {
        service: 'sumsub',
        isEnabled: true
      },
      select: {
        id: true,
        service: true,
        isEnabled: true,
        status: true,
        config: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!integration) {
      console.log('❌ Sumsub integration not found or not active!');
      return;
    }

    console.log('✅ Sumsub integration found:', {
      id: integration.id,
      service: integration.service,
      isEnabled: integration.isEnabled,
      status: integration.status,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt
    });

    console.log('\n📋 Config structure:');
    const creds = integration.config as any;
    
    console.log({
      hasAppToken: !!creds?.appToken,
      appTokenPreview: creds?.appToken ? creds.appToken.substring(0, 15) + '...' : 'N/A',
      
      hasSecretKey: !!creds?.secretKey,
      secretKeyPreview: creds?.secretKey ? creds.secretKey.substring(0, 8) + '...' : 'N/A',
      secretKeyLength: creds?.secretKey?.length || 0,
      
      hasWebhookSecret: !!creds?.webhookSecret,
      webhookSecretPreview: creds?.webhookSecret ? creds.webhookSecret.substring(0, 8) + '...' : 'N/A',
      webhookSecretLength: creds?.webhookSecret?.length || 0,
      
      hasLevelName: !!creds?.levelName,
      levelName: creds?.levelName || 'N/A',
      
      allKeys: Object.keys(creds || {})
    });

    if (!creds?.webhookSecret) {
      console.log('\n⚠️  WARNING: webhookSecret is NOT set!');
      console.log('   The webhook signature verification will fallback to secretKey.');
      console.log('   This may cause signature mismatch errors.');
      console.log('\n💡 To fix: Add webhookSecret field in Admin Panel → Integrations → Sumsub');
    } else {
      console.log('\n✅ webhookSecret is configured!');
      console.log('   Full value:', creds.webhookSecret);
    }

    if (!creds?.secretKey) {
      console.log('\n❌ ERROR: secretKey is NOT set!');
      console.log('   API requests will fail!');
    }

    if (!creds?.appToken) {
      console.log('\n❌ ERROR: appToken is NOT set!');
      console.log('   API requests will fail!');
    }

  } catch (error) {
    console.error('❌ Error checking config:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSumsubConfig();

