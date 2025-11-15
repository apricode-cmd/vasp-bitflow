const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function buildSignature(ts, method, path, secretKey, body = '') {
  const payload = ts + method.toUpperCase() + path + body;
  return crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
}

async function createTestApplicant(appToken, secretKey, baseUrl, levelName) {
  try {
    const testUserId = 'test-' + Date.now();
    const path = `/resources/applicants?levelName=${encodeURIComponent(levelName)}`;
    const method = 'POST';
    
    const bodyObj = {
      externalUserId: testUserId,
      email: `test-${Date.now()}@example.com`,
      phone: '+48123456789',
      fixedInfo: {
        firstName: 'Test',
        lastName: 'User',
        dob: '1990-01-01',
        country: 'POL'
      }
    };
    
    const body = JSON.stringify(bodyObj);
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = buildSignature(ts, method, path, secretKey, body);

    const headers = {
      'X-App-Token': appToken,
      'X-App-Access-Ts': ts,
      'X-App-Access-Sig': signature,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    console.log('🔨 Creating test applicant...');
    console.log('📋 External User ID:', testUserId);
    console.log('📋 URL:', baseUrl + path);
    console.log('📋 Body:', JSON.stringify(bodyObj, null, 2));

    const response = await fetch(baseUrl + path, {
      method: method,
      headers,
      body
    });

    console.log('📊 Response Status:', response.status, response.statusText);

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('❌ Error Response:', responseText);
      try {
        const errorJson = JSON.parse(responseText);
        console.log('\n❌ Parsed Error:');
        console.log(JSON.stringify(errorJson, null, 2));
      } catch (e) {}
      return null;
    }

    const data = JSON.parse(responseText);
    
    console.log('\n✅ Success! Applicant Created:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 Applicant ID (Sumsub):', data.id);
    console.log('📌 External User ID (Ours):', data.externalUserId);
    console.log('📌 Email:', data.email);
    console.log('📌 Level Name:', data.levelName);
    console.log('📌 Created At:', data.createdAt);
    console.log('📌 Review Status:', data.review?.reviewStatus || 'N/A');
    
    // Now try to get status of this newly created applicant
    console.log('\n🔍 Testing: Can we get status of newly created applicant?');
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
      console.log('✅ Status retrieved successfully:');
      console.log(JSON.stringify(statusData, null, 2));
    } else {
      const statusError = await statusResponse.text();
      console.error('❌ Failed to get status:', statusError);
    }

    return data;

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.error('Stack:', error.stack);
    return null;
  }
}

(async () => {
  console.log('\n🚀 Sumsub Create Test Applicant');
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
  const levelName = config.levelName || 'basic-kyc-level';

  console.log('📌 Using credentials:');
  console.log('   - App Token:', appToken.substring(0, 20) + '...');
  console.log('   - Base URL:', baseUrl);
  console.log('   - Level Name:', levelName);
  console.log('');

  await createTestApplicant(appToken, secretKey, baseUrl, levelName);

  console.log('\n✅ Done!\n');
  await prisma.$disconnect();
})();

