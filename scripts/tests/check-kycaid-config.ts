/**
 * Check KYCAID integration configuration
 */

import { prisma } from './src/lib/prisma';
import { decrypt } from './src/lib/services/encryption.service';

async function checkKycaidConfig() {
  try {
    console.log('🔍 Checking KYCAID integration...\n');
    
    const integration = await prisma.integration.findUnique({
      where: { service: 'kycaid' }
    });
    
    if (!integration) {
      console.error('❌ KYCAID not found in Integration table');
      console.log('💡 Please add it in /admin/integrations');
      return;
    }
    
    console.log('✅ KYCAID integration found:');
    console.log('  - Enabled:', integration.isEnabled);
    console.log('  - Status:', integration.status);
    console.log('  - Endpoint:', integration.apiEndpoint || 'default');
    console.log('');
    
    // Try to decrypt API key
    console.log('🔐 Decrypting API key...');
    try {
      const decryptedKey = decrypt(integration.apiKey || '');
      console.log('  - Length:', decryptedKey.length);
      console.log('  - First 10 chars:', decryptedKey.substring(0, 10) + '...');
      console.log('  - Last 10 chars:', '...' + decryptedKey.substring(decryptedKey.length - 10));
      
      // Check if placeholder
      if (decryptedKey.includes('your-kycaid-api-key') || 
          decryptedKey.includes('placeholder') ||
          decryptedKey.length < 20) {
        console.error('\n❌ API KEY IS A PLACEHOLDER!');
        console.log('💡 Set a real KYCAID API key in /admin/integrations');
      } else {
        console.log('\n✅ API key looks valid');
      }
    } catch (error: any) {
      console.error('❌ Decryption failed:', error.message);
    }
    
    // Check config
    console.log('\n📋 Configuration:');
    if (integration.config) {
      const config = integration.config as any;
      console.log('  - Form ID:', config.formId || 'NOT SET');
      console.log('  - Webhook Secret:', config.webhookSecret ? '✅ SET' : '❌ NOT SET');
    } else {
      console.log('  ❌ No config found');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkKycaidConfig();

