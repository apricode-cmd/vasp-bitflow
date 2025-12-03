/**
 * Setup Virtual IBAN Integration in Database
 * 
 * Adds BCB_GROUP integration to the database for Virtual IBAN functionality
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Setting up Virtual IBAN Integration...\n');

  try {
    // Check if integration already exists
    const existing = await prisma.integration.findFirst({
      where: {
        service: 'BCB_GROUP_VIRTUAL_IBAN',
      },
    });

    if (existing) {
      console.log('ℹ️  Virtual IBAN integration already exists. Updating...');
      
      await prisma.integration.update({
        where: { id: existing.id },
        data: {
          service: 'BCB_GROUP_VIRTUAL_IBAN',
          isEnabled: true,
          status: 'active',
          apiEndpoint: process.env.BCB_GROUP_API_URL || 'https://api.bcbgroup.com',
          config: {
            providerId: 'BCB_GROUP',
            category: 'VIRTUAL_IBAN',
            counterpartyId: process.env.BCB_GROUP_COUNTERPARTY_ID || 'CHANGE_ME',
            cid: process.env.BCB_GROUP_CID || 'CHANGE_ME',
            environment: process.env.NODE_ENV || 'development',
            name: 'BCB Group Virtual IBAN',
            description: 'Virtual IBAN accounts powered by BCB Group',
          },
          lastTested: new Date(),
        },
      });
      
      console.log('✅ Virtual IBAN integration updated successfully!\n');
    } else {
      console.log('📝 Creating new Virtual IBAN integration...');
      
      await prisma.integration.create({
        data: {
          service: 'BCB_GROUP_VIRTUAL_IBAN',
          isEnabled: true,
          status: 'active',
          apiKey: process.env.BCB_GROUP_API_KEY || 'CHANGE_ME',
          apiEndpoint: process.env.BCB_GROUP_API_URL || 'https://api.bcbgroup.com',
          config: {
            providerId: 'BCB_GROUP',
            category: 'VIRTUAL_IBAN',
            counterpartyId: process.env.BCB_GROUP_COUNTERPARTY_ID || 'CHANGE_ME',
            cid: process.env.BCB_GROUP_CID || 'CHANGE_ME',
            environment: process.env.NODE_ENV || 'development',
            name: 'BCB Group Virtual IBAN',
            description: 'Virtual IBAN accounts powered by BCB Group',
            credentials: {
              apiKey: process.env.BCB_GROUP_API_KEY || 'CHANGE_ME',
              gpgPrivateKey: process.env.BCB_GROUP_GPG_PRIVATE_KEY || '',
              gpgPassphrase: process.env.BCB_GROUP_GPG_PASSPHRASE || '',
            },
          },
          lastTested: new Date(),
        },
      });
      
      console.log('✅ Virtual IBAN integration created successfully!\n');
    }

    // Display current configuration
    const integration = await prisma.integration.findFirst({
      where: {
        service: 'BCB_GROUP_VIRTUAL_IBAN',
      },
    });

    console.log('📋 Current Configuration:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Service: ${integration?.service}`);
    console.log(`Status: ${integration?.isEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`API Endpoint: ${integration?.apiEndpoint}`);
    console.log(`\nConfig:`);
    console.log(JSON.stringify(integration?.config, null, 2));
    console.log('\n⚠️  IMPORTANT: Add these environment variables to .env:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('BCB_GROUP_API_URL=https://api.bcbgroup.com');
    console.log('BCB_GROUP_COUNTERPARTY_ID=your_counterparty_id');
    console.log('BCB_GROUP_CID=your_cid');
    console.log('BCB_GROUP_API_KEY=your_api_key');
    console.log('BCB_GROUP_GPG_PRIVATE_KEY=/path/to/private-key.asc');
    console.log('BCB_GROUP_GPG_PASSPHRASE=your_passphrase');
    console.log('\n✅ Setup complete! Restart the server to apply changes.\n');

  } catch (error) {
    console.error('❌ Failed to setup Virtual IBAN integration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

