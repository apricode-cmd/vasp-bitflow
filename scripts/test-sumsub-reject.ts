/**
 * Test script to simulate Sumsub rejection
 * Run: npx tsx scripts/test-sumsub-reject.ts
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const applicantId = '6921aa4c8e3911093bd0e12e';
  const rejectLabels = ['BAD_PROOF_OF_ADDRESS'];
  const reviewRejectType = 'RETRY';
  const moderationComment = 'Your utility bill is not clear. Please upload a better quality document showing your full address.';

  console.log('🧪 [TEST] Simulating Sumsub rejection for:', applicantId);

  // Get Sumsub config
  const integration = await prisma.integration.findUnique({
    where: { service: 'sumsub' }
  });

  if (!integration) {
    console.error('❌ Sumsub integration not configured');
    process.exit(1);
  }

  const config = integration.config as any;
  const appToken = config.appToken || integration.apiKey;
  const secretKey = config.secretKey;
  const baseUrl = config.baseUrl || 'https://api.sumsub.com';

  if (!appToken || !secretKey) {
    console.error('❌ Sumsub credentials not configured');
    process.exit(1);
  }

  console.log('✅ Sumsub config loaded:', {
    appToken: appToken.substring(0, 20) + '...',
    baseUrl
  });

  // Build request
  const ts = Math.floor(Date.now() / 1000).toString();
  const method = 'POST';
  const path = `/resources/applicants/${applicantId}/status/testCompleted`;
  const bodyStr = JSON.stringify({
    reviewAnswer: 'RED',
    rejectLabels,
    reviewRejectType,
    moderationComment,
    clientComment: 'Test rejection via script'
  });

  const payload = ts + method + path + bodyStr;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');

  console.log('📡 [TEST] Calling Sumsub testCompleted API...');
  console.log('🔐 Request details:', {
    url: `${baseUrl}${path}`,
    method,
    timestamp: ts,
    body: JSON.parse(bodyStr)
  });

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': appToken,
        'X-App-Access-Ts': ts,
        'X-App-Access-Sig': signature
      },
      body: bodyStr
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error('❌ [TEST] Sumsub API error:', {
        status: response.status,
        statusText: response.statusText,
        response: responseData
      });
      process.exit(1);
    }

    console.log('✅ [TEST] Sumsub rejection simulated successfully!');
    console.log('📋 Response:', responseData);
    console.log('\n🔔 Webhook should arrive shortly.');
    console.log('👉 Check your app at /kyc to see the rejection status.');
    console.log('👉 You should see "Upload Corrected Documents" button.');

  } catch (error: any) {
    console.error('❌ [TEST] Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

