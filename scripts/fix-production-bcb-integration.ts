import { PrismaClient } from '@prisma/client';
import { encrypt } from '../src/lib/services/encryption.service';

const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_PROD!,
    },
  },
});

async function main() {
  console.log('🔧 Fixing BCB Production Integration in PRODUCTION database...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Production credentials (decrypted from New_Production_credentials.gpg)
  const clientId = 'E1hSBS5y3nLNKE4yL7kI69A8On0OZISl';
  const clientSecret = 'oAK4wEcs6qFcm9S4Dygc6gizGYRRnW-3b08yM2uXVZSdbkWnJ89XSBmaMpe6qVgr';
  const counterpartyId = '2637';

  // Encrypt secrets for apiKey field
  const secrets = {
    clientId,
    clientSecret,
    counterpartyId,
  };
  const encryptedApiKey = encrypt(JSON.stringify(secrets));

  // Production BCB URLs
  const apiEndpoint = 'https://api.bcb.group';
  const authUrl = 'https://auth.bcb.group/oauth/token';
  const audience = 'https://api.bcb.group';

  // Full config for the 'config' JSON field
  const fullConfig = {
    sandbox: false, // This is PRODUCTION
    clientId,
    clientSecret, // Also stored in config for reference
    counterpartyId,
    baseUrl: apiEndpoint,
    authUrl,
    audience,
  };

  console.log('\n📋 Configuration:');
  console.log('   Sandbox: false (PRODUCTION)');
  console.log('   Client ID:', clientId);
  console.log('   Counterparty ID:', counterpartyId);
  console.log('   API Endpoint:', apiEndpoint);
  console.log('   Auth URL:', authUrl);
  console.log('   Audience:', audience);

  console.log('\n⚠️  Ready to UPDATE production database!');
  console.log('   This will set:');
  console.log('   • apiKey (encrypted credentials)');
  console.log('   • apiEndpoint');
  console.log('   • config (full BCB configuration)');
  console.log('   • updatedAt (current timestamp)');

  // Update the integration
  const updated = await prodPrisma.integration.update({
    where: { service: 'BCB_GROUP_VIRTUAL_IBAN' },
    data: {
      apiKey: encryptedApiKey,
      apiEndpoint: apiEndpoint,
      config: fullConfig,
      updatedAt: new Date(),
    },
  });

  console.log('\n✅ BCB Group Production Integration UPDATED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Service:', updated.service);
  console.log('   Category:', updated.category);
  console.log('   Status:', updated.status);
  console.log('   Is Enabled:', updated.isEnabled);
  console.log('   API Endpoint:', updated.apiEndpoint);
  console.log('   API Key: ✅ Encrypted and stored');
  console.log('\n🎉 Production is ready for BCB Virtual IBAN operations!');
}

main()
  .catch((e) => {
    console.error('❌ Error fixing BCB Production Integration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prodPrisma.$disconnect();
  });

