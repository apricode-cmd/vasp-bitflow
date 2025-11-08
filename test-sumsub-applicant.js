const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get applicantId from command line
const applicantId = process.argv[2] || '690e7f5976808036b2e8fa38';

// Helper to build HMAC signature
function buildSignature(ts, method, path, secretKey, body = '') {
  const payload = ts + method.toUpperCase() + path + body;
  return crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
}

// Function to fetch applicant status
async function getApplicantStatus(id, appToken, secretKey, baseUrl) {
  try {
    const path = `/resources/applicants/${encodeURIComponent(id)}/status`;
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = buildSignature(ts, 'GET', path, secretKey);

    const headers = {
      'X-App-Token': appToken,
      'X-App-Access-Ts': ts,
      'X-App-Access-Sig': signature,
      'Accept': 'application/json'
    };

    console.log('🔍 Fetching applicant status...');
    console.log('📋 Applicant ID:', id);
    console.log('🔗 URL:', baseUrl + path);
    console.log('🔑 App Token:', appToken.substring(0, 10) + '...');

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
    console.log('\n✅ Success! Applicant Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 Review Status:', data.reviewStatus);
    console.log('📌 Review Answer:', data.reviewResult?.reviewAnswer || 'N/A');
    console.log('📌 Moderation Comment:', data.moderationComment || 'N/A');
    console.log('📌 Created At:', data.createDate || 'N/A');
    console.log('\n📦 Full Response:\n', JSON.stringify(data, null, 2));
    return data;

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

// Run the script
(async () => {
  console.log('');
  console.log('🚀 Sumsub Applicant Status Checker');
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

  await getApplicantStatus(applicantId, appToken, secretKey, baseUrl);

  console.log('');
  console.log('✅ Done!');
  console.log('');

  await prisma.$disconnect();
})();


const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get applicantId from command line
const applicantId = process.argv[2] || '690e7f5976808036b2e8fa38';

// Helper to build HMAC signature
function buildSignature(ts, method, path, secretKey, body = '') {
  const payload = ts + method.toUpperCase() + path + body;
  return crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
}

// Function to fetch applicant status
async function getApplicantStatus(id, appToken, secretKey, baseUrl) {
  try {
    const path = `/resources/applicants/${encodeURIComponent(id)}/status`;
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = buildSignature(ts, 'GET', path, secretKey);

    const headers = {
      'X-App-Token': appToken,
      'X-App-Access-Ts': ts,
      'X-App-Access-Sig': signature,
      'Accept': 'application/json'
    };

    console.log('🔍 Fetching applicant status...');
    console.log('📋 Applicant ID:', id);
    console.log('🔗 URL:', baseUrl + path);
    console.log('🔑 App Token:', appToken.substring(0, 10) + '...');

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
    console.log('\n✅ Success! Applicant Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 Review Status:', data.reviewStatus);
    console.log('📌 Review Answer:', data.reviewResult?.reviewAnswer || 'N/A');
    console.log('📌 Moderation Comment:', data.moderationComment || 'N/A');
    console.log('📌 Created At:', data.createDate || 'N/A');
    console.log('\n📦 Full Response:\n', JSON.stringify(data, null, 2));
    return data;

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

// Run the script
(async () => {
  console.log('');
  console.log('🚀 Sumsub Applicant Status Checker');
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

  await getApplicantStatus(applicantId, appToken, secretKey, baseUrl);

  console.log('');
  console.log('✅ Done!');
  console.log('');

  await prisma.$disconnect();
})();

