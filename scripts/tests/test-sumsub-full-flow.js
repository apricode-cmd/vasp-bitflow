const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const externalUserId = 'cmh91d0lu000g12itgjrnkd61';
const directApplicantId = '690e7f5976808036b2e8fa38';

function buildSignature(ts, method, path, secretKey, body = '') {
  const payload = ts + method.toUpperCase() + path + body;
  return crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
}

async function testFullFlow(appToken, secretKey, baseUrl) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Get applicant by externalUserId');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const path1 = `/resources/applicants/-;externalUserId=${encodeURIComponent(externalUserId)}/one`;
    const ts1 = Math.floor(Date.now() / 1000).toString();
    const sig1 = buildSignature(ts1, 'GET', path1, secretKey);
    
    console.log('📋 Request:');
    console.log('  URL:', baseUrl + path1);
    console.log('  Method: GET');
    console.log('  External User ID:', externalUserId);
    console.log('');
    
    const resp1 = await fetch(baseUrl + path1, {
      method: 'GET',
      headers: {
        'X-App-Token': appToken,
        'X-App-Access-Ts': ts1,
        'X-App-Access-Sig': sig1,
        'Accept': 'application/json'
      }
    });
    
    console.log('📊 Response:', resp1.status, resp1.statusText);
    const text1 = await resp1.text();
    
    if (resp1.ok) {
      const data = JSON.parse(text1);
      console.log('✅ SUCCESS! Found applicant:');
      console.log('  - Applicant ID:', data.id);
      console.log('  - External ID:', data.externalUserId);
      console.log('  - Email:', data.email);
      console.log('  - Level:', data.levelName);
      console.log('  - Review Status:', data.review?.reviewStatus || 'N/A');
      console.log('  - Review Answer:', data.review?.reviewAnswer || 'N/A');
      
      // Now try to get status using this applicant ID
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('TEST 2: Get status using found applicant ID');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      const path2 = `/resources/applicants/${encodeURIComponent(data.id)}/status`;
      const ts2 = Math.floor(Date.now() / 1000).toString();
      const sig2 = buildSignature(ts2, 'GET', path2, secretKey);
      
      console.log('📋 Request:');
      console.log('  URL:', baseUrl + path2);
      console.log('  Applicant ID:', data.id);
      console.log('');
      
      const resp2 = await fetch(baseUrl + path2, {
        method: 'GET',
        headers: {
          'X-App-Token': appToken,
          'X-App-Access-Ts': ts2,
          'X-App-Access-Sig': sig2,
          'Accept': 'application/json'
        }
      });
      
      console.log('📊 Response:', resp2.status, resp2.statusText);
      const text2 = await resp2.text();
      
      if (resp2.ok) {
        const statusData = JSON.parse(text2);
        console.log('✅ SUCCESS! Status retrieved:');
        console.log(JSON.stringify(statusData, null, 2));
      } else {
        console.log('❌ FAILED:', text2);
      }
      
    } else {
      console.log('❌ FAILED:', text1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Direct status check with stored ID');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const path3 = `/resources/applicants/${encodeURIComponent(directApplicantId)}/status`;
    const ts3 = Math.floor(Date.now() / 1000).toString();
    const sig3 = buildSignature(ts3, 'GET', path3, secretKey);
    
    console.log('📋 Request:');
    console.log('  URL:', baseUrl + path3);
    console.log('  Applicant ID (from DB):', directApplicantId);
    console.log('');
    
    const resp3 = await fetch(baseUrl + path3, {
      method: 'GET',
      headers: {
        'X-App-Token': appToken,
        'X-App-Access-Ts': ts3,
        'X-App-Access-Sig': sig3,
        'Accept': 'application/json'
      }
    });
    
    console.log('📊 Response:', resp3.status, resp3.statusText);
    const text3 = await resp3.text();
    
    if (resp3.ok) {
      const statusData = JSON.parse(text3);
      console.log('✅ SUCCESS! Status retrieved:');
      console.log(JSON.stringify(statusData, null, 2));
    } else {
      console.log('❌ FAILED:', text3);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

(async () => {
  console.log('\n🚀 Sumsub Full Flow Test');
  console.log('Testing both methods: externalUserId lookup + direct ID\n');

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
  console.log('');

  await testFullFlow(appToken, secretKey, baseUrl);

  console.log('\n✅ Done!\n');
  await prisma.$disconnect();
})();

