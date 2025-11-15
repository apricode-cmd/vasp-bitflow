/**
 * Check KYCAID integration in database
 */

import { prisma } from './src/lib/prisma';
import { decrypt } from './src/lib/services/encryption.service';

async function checkIntegration() {
  try {
    console.log('🔍 Checking KYCAID integration in database...\n');
    
    const integration = await prisma.integration.findUnique({
      where: { service: 'kycaid' }
    });
    
    if (!integration) {
      console.error('❌ KYCAID integration not found in database');
      console.log('💡 Please configure it in /admin/integrations');
      return;
    }
    
    console.log('✅ Integration found:');
    console.log('  - Service:', integration.service);
    console.log('  - Enabled:', integration.isEnabled);
    console.log('  - Status:', integration.status);
    console.log('  - API Endpoint:', integration.apiEndpoint);
    console.log('  - API Key (encrypted):', integration.apiKey?.substring(0, 20) + '...');
    console.log('  - Config:', JSON.stringify(integration.config, null, 2));
    
    // Try to decrypt
    console.log('\n🔐 Attempting to decrypt API key...');
    try {
      const decrypted = decrypt(integration.apiKey || '');
      console.log('  - Decrypted API Key:', decrypted.substring(0, 10) + '...');
      
      // Check if it's a placeholder
      if (decrypted.includes('your-kycaid-api-key') || decrypted.includes('placeholder')) {
        console.warn('\n⚠️ WARNING: API key is a placeholder!');
        console.log('💡 Please set a real KYCAID API key in /admin/integrations');
      } else {
        console.log('✅ API key looks valid');
      }
    } catch (error: any) {
      console.error('❌ Decryption failed:', error.message);
    }
    
    // Check ENCRYPTION_SECRET
    console.log('\n🔑 Environment check:');
    console.log('  - ENCRYPTION_SECRET:', process.env.ENCRYPTION_SECRET ? '✅ Set' : '❌ NOT SET');
    console.log('  - KYCAID_API_KEY:', process.env.KYCAID_API_KEY ? '✅ Set' : '❌ NOT SET');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkIntegration();

