/**
 * Script to create verification for existing KYCAID applicant
 * Usage: npx tsx create-verification-for-applicant.ts
 */

import { prisma } from './src/lib/prisma';
import { kycaidAdapter } from './src/lib/integrations/providers/kyc/KycaidAdapter';
import { getIntegrationWithSecrets } from './src/lib/services/integration-management.service';

async function createVerificationForApplicant() {
  console.log('🔍 Creating verification for existing applicant...\n');

  // Get KYCAID integration
  const integration = await prisma.integration.findFirst({
    where: {
      service: 'kycaid',
      isEnabled: true
    }
  });

  if (!integration) {
    console.error('❌ KYCAID integration not found or disabled');
    return;
  }

  console.log('✅ Found KYCAID integration\n');

  // Get secrets
  const secrets = await getIntegrationWithSecrets('kycaid');
  if (!secrets?.apiKey) {
    console.error('❌ KYCAID API key not found');
    return;
  }

  if (!secrets.config?.formId) {
    console.error('❌ KYCAID Form ID not configured');
    return;
  }

  console.log(`✅ Using Form ID: ${secrets.config.formId}\n`);

  // Initialize provider
  await kycaidAdapter.initialize({
    apiKey: secrets.apiKey,
    apiEndpoint: secrets.apiEndpoint || undefined,
    ...secrets.config
  });

  console.log('✅ KYCAID provider initialized\n');

  // Get the latest session with applicant ID but no verification ID
  const session = await prisma.kycSession.findFirst({
    where: {
      kycaidApplicantId: { not: null },
      kycaidVerificationId: null,
      status: 'PENDING'
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          email: true
        }
      }
    }
  });

  if (!session) {
    console.log('❌ No session found with applicant ID but no verification ID');
    return;
  }

  console.log(`📋 Found session for: ${session.user.email}`);
  console.log(`   Applicant ID: ${session.kycaidApplicantId}`);
  console.log(`   Current Status: ${session.status}\n`);

  try {
    // Create verification
    console.log('🔧 Creating verification...');
    const verification = await kycaidAdapter.createVerification(
      session.kycaidApplicantId!,
      secrets.config.formId
    );

    console.log('✅ Verification created:');
    console.log(`   Verification ID: ${verification.verificationId}`);
    console.log(`   Status: ${verification.status}`);
    console.log(`   Metadata:`, JSON.stringify(verification.metadata, null, 2));

    // Update session in database
    console.log('\n🔧 Updating session in database...');
    await prisma.kycSession.update({
      where: { id: session.id },
      data: {
        kycaidVerificationId: verification.verificationId,
        metadata: {
          ...(session.metadata as any),
          verificationCreated: new Date().toISOString(),
          verificationData: verification.metadata
        }
      }
    });

    console.log('✅ Session updated with verification ID!');

    // Now check verification status
    console.log('\n🔍 Checking verification status...');
    const status = await kycaidAdapter.getVerificationStatus(verification.verificationId);

    console.log('📊 Verification Status:');
    console.log(`   Status: ${status.status}`);
    console.log(`   Completed At: ${status.completedAt || 'Not completed'}`);
    console.log(`   Rejection Reason: ${status.rejectionReason || 'N/A'}`);
    console.log(`   Metadata:`, JSON.stringify(status.metadata, null, 2));

    // Update session status if needed
    if (status.status !== 'pending') {
      console.log(`\n🔧 Updating session status to: ${status.status.toUpperCase()}`);
      
      await prisma.kycSession.update({
        where: { id: session.id },
        data: {
          status: status.status.toUpperCase() as any,
          completedAt: status.completedAt || new Date(),
          rejectionReason: status.rejectionReason || undefined,
          metadata: {
            ...(session.metadata as any),
            statusChecked: new Date().toISOString(),
            verificationResponse: status.metadata
          }
        }
      });

      console.log('✅ Session status updated!');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('502')) {
      console.log('\n⚠️ KYCAID API returned 502 Bad Gateway');
      console.log('   This usually means:');
      console.log('   1. API key is invalid or expired');
      console.log('   2. KYCAID service is temporarily down');
      console.log('   3. Applicant ID is invalid');
    }
  }

  console.log('\n✅ Done!');
}

createVerificationForApplicant()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

