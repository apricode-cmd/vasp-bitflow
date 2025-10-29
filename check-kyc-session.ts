/**
 * Script to check KYC session in database
 * Usage: npx tsx check-kyc-session.ts
 */

import { prisma } from './src/lib/prisma';

async function checkKycSession() {
  console.log('🔍 Checking KYC sessions in database...\n');

  // Get all KYC sessions
  const sessions = await prisma.kycSession.findMany({
    include: {
      user: {
        select: {
          email: true,
          profile: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log(`Found ${sessions.length} recent session(s):\n`);

  sessions.forEach((session, idx) => {
    console.log(`\n📋 Session ${idx + 1}:`);
    console.log(`  ID: ${session.id}`);
    console.log(`  User: ${session.user.email} (${session.user.profile?.firstName} ${session.user.profile?.lastName})`);
    console.log(`  Status: ${session.status}`);
    console.log(`  Applicant ID: ${session.kycaidApplicantId || 'N/A'}`);
    console.log(`  Verification ID: ${session.kycaidVerificationId || 'N/A'}`);
    console.log(`  Form ID: ${session.kycaidFormId || 'N/A'}`);
    console.log(`  Created: ${session.createdAt.toISOString()}`);
    console.log(`  Updated: ${session.updatedAt.toISOString()}`);
    console.log(`  Completed: ${session.completedAt?.toISOString() || 'Not completed'}`);
    console.log(`  Attempts: ${session.attempts}`);
    console.log(`  Last Attempt: ${session.lastAttemptAt?.toISOString() || 'N/A'}`);
    console.log(`  Rejection Reason: ${session.rejectionReason || 'N/A'}`);
    console.log(`  Metadata:`, JSON.stringify(session.metadata, null, 2));
  });

  console.log('\n✅ Done!');
}

checkKycSession()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

