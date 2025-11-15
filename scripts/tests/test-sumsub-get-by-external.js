const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const externalUserId = process.argv[2] || 'cmh91d0lu000g12itgjrnkd61';

function buildSignature(ts, method, path, secretKey, body = '') {
  const payload = ts + method.toUpperCase() + path + body;
  return crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
}

async function getApplicantByExternalId(externalId, appToken, secretKey, baseUrl) {
  try {
    // Correct Sumsub API endpoint to get applicant by externalUserId
    // GET /resources/applicants/-;externalUserId={externalUserId}/one
    const path = `/resources/applicants/-;externalUserId=${encodeURIComponent(externalId)}/one`;
    const method = 'GET';
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = buildSignature(ts, method, path, secretKey);

    const headers = {
      'X-App-Token': appToken,
      'X-App-Access-Ts': ts,
      'X-App-Access-Sig': signature,
      'Accept': 'application/json'
    };

    console.log('🔍 Getting applicant by externalUserId...');
    console.log('📋 External User ID:', externalId);
    console.log('📋 URL:', baseUrl + path);
    console.log('📋 App Token:', appToken.substring(0, 15) + '...');

    const response = await fetch(baseUrl + path, {
      method: method,
      headers
    });

    console.log('📊 Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error Response:', error);
      
      try {
        const errorJson = JSON.parse(error);
        console.log('\n❌ Parsed Error:');
        console.log(JSON.stringify(errorJson, null, 2));
      } catch (e) {}
      
      return null;
    }

    const data = await response.json();
    
    console.log('\n✅ Success! Applicant Found:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 Applicant ID (Sumsub):', data.id);
    console.log('📌 External User ID (Ours):', data.externalUserId);
    console.log('📌 Email:', data.email);
    console.log('📌 Level Name:', data.levelName);
    console.log('📌 Created At:', data.createdAt);
    console.log('📌 Review Status:', data.review?.reviewStatus || 'N/A');
    console.log('📌 Review Answer:', data.review?.reviewAnswer || 'N/A');
    
    // Now get detailed status
    console.log('\n🔍 Getting detailed status...');
    const statusPath = `/resources/applicants/${encodeURIComponent(data.id)}/status`;
    const statusTs = Math.floor(Date.now() / 1000).toString();
    const statusSignature = buildSignature(statusTs, 'GET', statusPath, secretKey);

    const statusHeaders = {
      'X-App-Token': appToken,
      'X-App-Access-Ts': statusTs,
      'X-App-Access-Sig': statusSignature,
      'Accept': 'application/json'
    };

    const statusResponse = await fetch(baseUrl + statusPath, {
      method: 'GET',
      headers: statusHeaders
    });

    console.log('📊 Status Response:', statusResponse.status, statusResponse.statusText);

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('\n📊 Applicant Status:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📌 Review Status:', statusData.reviewStatus);
      console.log('📌 Review Answer:', statusData.reviewResult?.reviewAnswer || 'N/A');
      console.log('📌 Review Reject Type:', statusData.reviewResult?.reviewRejectType || 'N/A');
      console.log('📌 Reject Labels:', statusData.reviewResult?.rejectLabels || []);
      console.log('📌 Moderation Comment:', statusData.moderationComment || 'N/A');
      console.log('\n📦 Full Status Response:');
      console.log(JSON.stringify(statusData, null, 2));
    } else {
      const statusError = await statusResponse.text();
      console.error('❌ Status Error:', statusError);
    }

    return data;

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.error('Stack:', error.stack);
    return null;
  }
}

(async () => {
  console.log('\n🚀 Sumsub Get Applicant by External ID');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const integration = await prisma.integration.findFirst({
    where: { service: 'sumsub', isEnabled: true }
  });

  if (!integration?.config) {
    console.error('❌ Sumsub integration not found!');
    await prisma.$disconnect();
    process.exit(1);
  }

  const config = integration.config;
  const appToken = config.appToken || integration.apiKey;
  const secretKey = config.secretKey;
  const baseUrl = config.baseUrl || 'https://api.sumsub.com';

  console.log('📌 Using credentials:');
  console.log('   - App Token:', appToken.substring(0, 15) + '...');
  console.log('   - Secret Key:', '***' + secretKey.substring(secretKey.length - 4));
  console.log('   - Base URL:', baseUrl);
  console.log('   - Level Name:', config.levelName);
  console.log('');

  await getApplicantByExternalId(externalUserId, appToken, secretKey, baseUrl);

  console.log('\n✅ Done!\n');
  await prisma.$disconnect();
})();

