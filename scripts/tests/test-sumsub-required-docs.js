const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const applicantId = '690e7f5976808036b2e8fa38';

function buildSignature(ts, method, path, secretKey, body = '') {
  const payload = ts + method.toUpperCase() + path + body;
  return crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
}

async function testAllEndpoints(id, appToken, secretKey, baseUrl) {
  const endpoints = [
    { name: 'Status', path: `/resources/applicants/${id}/status` },
    { name: 'Required ID Docs Status', path: `/resources/applicants/${id}/requiredIdDocsStatus` },
    { name: 'One (full data)', path: `/resources/applicants/${id}/one` }
  ];

  for (const endpoint of endpoints) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Testing: ${endpoint.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    try {
      const ts = Math.floor(Date.now() / 1000).toString();
      const sig = buildSignature(ts, 'GET', endpoint.path, secretKey);
      
      console.log('📋 Request:');
      console.log('  URL:', baseUrl + endpoint.path);
      console.log('  Applicant ID:', id);
      console.log('');
      
      const response = await fetch(baseUrl + endpoint.path, {
        method: 'GET',
        headers: {
          'X-App-Token': appToken,
          'X-App-Access-Ts': ts,
          'X-App-Access-Sig': sig,
          'Accept': 'application/json'
        }
      });
      
      console.log('📊 Response:', response.status, response.statusText);
      const text = await response.text();
      
      if (response.ok) {
        try {
          const data = JSON.parse(text);
          console.log('✅ SUCCESS!');
          console.log('\n📦 Response Data:');
          console.log(JSON.stringify(data, null, 2));
        } catch (e) {
          console.log('✅ SUCCESS! (non-JSON response)');
          console.log(text);
        }
      } else {
        console.log('❌ FAILED:');
        try {
          const error = JSON.parse(text);
          console.log(JSON.stringify(error, null, 2));
        } catch (e) {
          console.log(text);
        }
      }
    } catch (error) {
      console.error('❌ Exception:', error.message);
    }
  }
}

(async () => {
  console.log('\n🚀 Sumsub All Endpoints Test');
  console.log('Testing all available endpoints for applicant\n');

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
  console.log('  - App Token:', appToken.substring(0, 20) + '...');
  console.log('  - Base URL:', baseUrl);
  console.log('  - Applicant ID:', applicantId);

  await testAllEndpoints(applicantId, appToken, secretKey, baseUrl);

  console.log('\n✅ Done!\n');
  await prisma.$disconnect();
})();

