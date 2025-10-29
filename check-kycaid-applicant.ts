/**
 * Script to check KYCAID applicant status directly
 * Usage: npx tsx check-kycaid-applicant.ts
 */

import { prisma } from './src/lib/prisma';
import { kycaidAdapter } from './src/lib/integrations/providers/kyc/KycaidAdapter';
import { getIntegrationWithSecrets } from './src/lib/services/integration-management.service';

async function checkKycaidApplicant() {
  console.log('🔍 Checking KYCAID applicant status...\n');

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

  // Initialize provider
  await kycaidAdapter.initialize({
    apiKey: secrets.apiKey,
    apiEndpoint: secrets.apiEndpoint || undefined,
    ...secrets.config
  });

  console.log('✅ KYCAID provider initialized\n');

  // Get the latest session with applicant ID
  const session = await prisma.kycSession.findFirst({
    where: {
      kycaidApplicantId: { not: null },
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
    console.log('❌ No PENDING session with applicant ID found');
    return;
  }

  console.log(`📋 Checking session for: ${session.user.email}`);
  console.log(`   Applicant ID: ${session.kycaidApplicantId}\n`);

  try {
    // Get applicant details
    const applicant = await kycaidAdapter.getApplicant(session.kycaidApplicantId!);
    
    console.log('✅ Applicant found:');
    console.log(`   Status: ${applicant.status}`);
    console.log(`   Metadata:`, JSON.stringify(applicant.metadata, null, 2));

    // Check verification status
    if (applicant.metadata?.verificationStatus) {
      console.log(`\n📊 Verification Status: ${applicant.metadata.verificationStatus}`);
      
      if (applicant.metadata.verificationStatus === 'approved') {
        console.log('✅ Applicant is APPROVED! Updating session...');
        
        await prisma.kycSession.update({
          where: { id: session.id },
          data: {
            status: 'APPROVED',
            completedAt: new Date(),
            metadata: {
              ...(session.metadata as any),
              applicantResponse: applicant.metadata,
              manuallyUpdated: true,
              updatedAt: new Date().toISOString()
            }
          }
        });
        
        console.log('✅ Session updated to APPROVED!');
      } else if (applicant.metadata.verificationStatus === 'declined') {
        console.log('❌ Applicant is DECLINED! Updating session...');
        
        await prisma.kycSession.update({
          where: { id: session.id },
          data: {
            status: 'REJECTED',
            completedAt: new Date(),
            rejectionReason: 'Verification declined by KYCAID',
            metadata: {
              ...(session.metadata as any),
              applicantResponse: applicant.metadata,
              manuallyUpdated: true,
              updatedAt: new Date().toISOString()
            }
          }
        });
        
        console.log('✅ Session updated to REJECTED!');
      } else {
        console.log(`ℹ️ Applicant status: ${applicant.metadata.verificationStatus} (still pending)`);
      }
    } else {
      console.log('\nℹ️ No verification status yet - user may not have completed the form');
    }
  } catch (error: any) {
    console.error('❌ Error checking applicant:', error.message);
  }

  console.log('\n✅ Done!');
}

checkKycaidApplicant()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

