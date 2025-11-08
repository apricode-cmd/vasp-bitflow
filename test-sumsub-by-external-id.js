const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get externalUserId from command line
const externalUserId = process.argv[2] || 'cmh91d0lu000g12itgjrnkd61';

// Helper to build HMAC signature
function buildSignature(ts, method, path, secretKey, body = '') {
  const payload = ts + method.toUpperCase() + path + body;
  return crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
}

// Function to search applicants by externalUserId
async function searchApplicantByExternalId(externalId, appToken, secretKey, baseUrl) {
  try {
    // Sumsub API: GET /resources/applicants/-;externalUserId={externalUserId}/one
    const path = `/resources/applicants/-;externalUserId=${encodeURIComponent(externalId)}/one`;
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = buildSignature(ts, 'GET', path, secretKey);

    const headers = {
      'X-App-Token': appToken,
      'X-App-Access-Ts': ts,
      'X-App-Access-Sig': signature,
      'Accept': 'application/json'
    };

    console.log('🔍 Searching applicant by externalUserId...');
    console.log('📋 External User ID:', externalId);
    console.log('🔗 URL:', baseUrl + path);

    const response = await fetch(baseUrl + path, {
      method: 'GET',
      headers
    });

    console.log('📊 Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error Response:', error);
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
    
    // Now get status
    console.log('\n🔍 Getting applicant status...');
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

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('\n📊 Applicant Status:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📌 Review Status:', statusData.reviewStatus);
      console.log('📌 Review Answer:', statusData.reviewResult?.reviewAnswer || 'N/A');
      console.log('📌 Moderation Comment:', statusData.moderationComment || 'N/A');
      console.log('\n📦 Full Status:\n', JSON.stringify(statusData, null, 2));
    } else {
      const statusError = await statusResponse.text();
      console.error('❌ Failed to get status:', statusError);
    }

    return data;

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

// Run the script
(async () => {
  console.log('');
  console.log('🚀 Sumsub Applicant Search by External ID');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Load credentials from database
  console.log('🔑 Loading credentials from database...');
  const integration = await prisma.integration.findFirst({
    where: {
      service: 'sumsub',
      isEnabled: true
    }
  });

  if (!integration || !integration.config) {
    console.error('❌ Error: Sumsub integration not found or not configured!');
    await prisma.$disconnect();
    process.exit(1);
  }

  const config = integration.config;
  const appToken = config.appToken || integration.apiKey;
  const secretKey = config.secretKey;
  const baseUrl = config.baseUrl || 'https://api.sumsub.com';

  if (!appToken || !secretKey) {
    console.error('❌ Error: Sumsub credentials incomplete!');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('✅ Credentials loaded from database');
  console.log('📌 Base URL:', baseUrl);
  console.log('');

  await searchApplicantByExternalId(externalUserId, appToken, secretKey, baseUrl);

  console.log('');
  console.log('✅ Done!');
  console.log('');

  await prisma.$disconnect();
})();


const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get externalUserId from command line
const externalUserId = process.argv[2] || 'cmh91d0lu000g12itgjrnkd61';

// Helper to build HMAC signature
function buildSignature(ts, method, path, secretKey, body = '') {
  const payload = ts + method.toUpperCase() + path + body;
  return crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
}

// Function to search applicants by externalUserId
async function searchApplicantByExternalId(externalId, appToken, secretKey, baseUrl) {
  try {
    // Sumsub API: GET /resources/applicants/-;externalUserId={externalUserId}/one
    const path = `/resources/applicants/-;externalUserId=${encodeURIComponent(externalId)}/one`;
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = buildSignature(ts, 'GET', path, secretKey);

    const headers = {
      'X-App-Token': appToken,
      'X-App-Access-Ts': ts,
      'X-App-Access-Sig': signature,
      'Accept': 'application/json'
    };

    console.log('🔍 Searching applicant by externalUserId...');
    console.log('📋 External User ID:', externalId);
    console.log('🔗 URL:', baseUrl + path);

    const response = await fetch(baseUrl + path, {
      method: 'GET',
      headers
    });

    console.log('📊 Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error Response:', error);
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
    
    // Now get status
    console.log('\n🔍 Getting applicant status...');
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

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('\n📊 Applicant Status:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📌 Review Status:', statusData.reviewStatus);
      console.log('📌 Review Answer:', statusData.reviewResult?.reviewAnswer || 'N/A');
      console.log('📌 Moderation Comment:', statusData.moderationComment || 'N/A');
      console.log('\n📦 Full Status:\n', JSON.stringify(statusData, null, 2));
    } else {
      const statusError = await statusResponse.text();
      console.error('❌ Failed to get status:', statusError);
    }

    return data;

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

// Run the script
(async () => {
  console.log('');
  console.log('🚀 Sumsub Applicant Search by External ID');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Load credentials from database
  console.log('🔑 Loading credentials from database...');
  const integration = await prisma.integration.findFirst({
    where: {
      service: 'sumsub',
      isEnabled: true
    }
  });

  if (!integration || !integration.config) {
    console.error('❌ Error: Sumsub integration not found or not configured!');
    await prisma.$disconnect();
    process.exit(1);
  }

  const config = integration.config;
  const appToken = config.appToken || integration.apiKey;
  const secretKey = config.secretKey;
  const baseUrl = config.baseUrl || 'https://api.sumsub.com';

  if (!appToken || !secretKey) {
    console.error('❌ Error: Sumsub credentials incomplete!');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('✅ Credentials loaded from database');
  console.log('📌 Base URL:', baseUrl);
  console.log('');

  await searchApplicantByExternalId(externalUserId, appToken, secretKey, baseUrl);

  console.log('');
  console.log('✅ Done!');
  console.log('');

  await prisma.$disconnect();
})();

