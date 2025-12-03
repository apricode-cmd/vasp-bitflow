/**
 * Setup BCB Group Integration with correct encryption
 */
import { PrismaClient } from '@prisma/client';
import { encrypt } from '../src/lib/services/encryption.service';

const prisma = new PrismaClient();

async function main() {
  // BCB Sandbox credentials
  const clientId = 'Nzc482UW1smHy7HEZSmlQrXUrbS3oBnw';
  const clientSecret = 'lSN7mBUF3eV88lnWSTwccrXxJQAOdmOFMCsYgWE9EJKVAwWlRqZyMcsEADl0M2FW';
  const counterpartyId = '13608';

  const encryptedSecret = encrypt(clientSecret);
  console.log('Encrypted secret (first 50 chars):', encryptedSecret.substring(0, 50) + '...');

  const config = {
    sandbox: true,
    clientId,
    clientSecret: encryptedSecret,
    counterpartyId,
    baseUrl: 'https://api.uat.bcb.group',
    authUrl: 'https://auth.uat.bcb.group/oauth/token',
  };

  // Delete old and create new
  await prisma.integration.deleteMany({
    where: { service: 'BCB_GROUP_VIRTUAL_IBAN' }
  });

  const integration = await prisma.integration.create({
    data: {
      service: 'BCB_GROUP_VIRTUAL_IBAN',
      category: 'VIRTUAL_IBAN',
      isEnabled: true,
      status: 'active',
      apiEndpoint: 'https://api.uat.bcb.group',
      config,
      apiKey: encryptedSecret
    }
  });

  console.log('✅ BCB Group интеграция создана!');
  console.log('   Service:', integration.service);
  console.log('   Status:', integration.status);
}

main().catch(console.error).finally(() => prisma.$disconnect());
