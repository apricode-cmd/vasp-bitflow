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

async function testMultipleEndpoints(id, appToken, secretKey, baseUrl) {
  console.log('Testing Applicant ID:', id);
  console.log('App Token:', appToken.substring(0, 20) + '...');
  console.log('Base URL:', baseUrl);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Get applicant status
  console.log('1️⃣ Testing: GET /resources/applicants/{id}/status');
  try {
    const path1 = `/resources/applicants/${id}/status`;
    const ts1 = Math.floor(Date.now() / 1000).toString();
    const sig1 = buildSignature(ts1, 'GET', path1, secretKey);
    
    const resp1 = await fetch(baseUrl + path1, {
      method: 'GET',
      headers: {
        'X-App-Token': appToken,
        'X-App-Access-Ts': ts1,
        'X-App-Access-Sig': sig1,
        'Accept': 'application/json'
      }
    });
    
    console.log('   Status:', resp1.status, resp1.statusText);
    const text1 = await resp1.text();
    if (resp1.ok) {
      console.log('   ✅ SUCCESS:', JSON.parse(text1));
    } else {
      console.log('   ❌ Error:', text1);
    }
  } catch (e) {
    console.log('   ❌ Exception:', e.message);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 2: Get applicant details
  console.log('2️⃣ Testing: GET /resources/applicants/{id}/one');
  try {
    const path2 = `/resources/applicants/${id}/one`;
    const ts2 = Math.floor(Date.now() / 1000).toString();
    const sig2 = buildSignature(ts2, 'GET', path2, secretKey);
    
    const resp2 = await fetch(baseUrl + path2, {
      method: 'GET',
      headers: {
        'X-App-Token': appToken,
        'X-App-Access-Ts': ts2,
        'X-App-Access-Sig': sig2,
        'Accept': 'application/json'
      }
    });
    
    console.log('   Status:', resp2.status, resp2.statusText);
    const text2 = await resp2.text();
    if (resp2.ok) {
      const data = JSON.parse(text2);
      console.log('   ✅ SUCCESS:');
      console.log('      - ID:', data.id);
      console.log('      - External ID:', data.externalUserId);
      console.log('      - Email:', data.email);
      console.log('      - Review Status:', data.review?.reviewStatus);
      console.log('      - Review Answer:', data.review?.reviewAnswer);
    } else {
      console.log('   ❌ Error:', text2);
    }
  } catch (e) {
    console.log('   ❌ Exception:', e.message);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 3: Get applicant required ID docs
  console.log('3️⃣ Testing: GET /resources/applicants/{id}/requiredIdDocsStatus');
  try {
    const path3 = `/resources/applicants/${id}/requiredIdDocsStatus`;
    const ts3 = Math.floor(Date.now() / 1000).toString();
    const sig3 = buildSignature(ts3, 'GET', path3, secretKey);
    
    const resp3 = await fetch(baseUrl + path3, {
      method: 'GET',
      headers: {
        'X-App-Token': appToken,
        'X-App-Access-Ts': ts3,
        'X-App-Access-Sig': sig3,
        'Accept': 'application/json'
      }
    });
    
    console.log('   Status:', resp3.status, resp3.statusText);
    const text3 = await resp3.text();
    if (resp3.ok) {
      console.log('   ✅ SUCCESS:', JSON.parse(text3));
    } else {
      console.log('   ❌ Error:', text3);
    }
  } catch (e) {
    console.log('   ❌ Exception:', e.message);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 4: Try without encoding
  console.log('4️⃣ Testing: GET /resources/applicants/' + id + '/status (no encoding)');
  try {
    const path4 = '/resources/applicants/' + id + '/status';
    const ts4 = Math.floor(Date.now() / 1000).toString();
    const sig4 = buildSignature(ts4, 'GET', path4, secretKey);
    
    const resp4 = await fetch(baseUrl + path4, {
      method: 'GET',
      headers: {
        'X-App-Token': appToken,
        'X-App-Access-Ts': ts4,
        'X-App-Access-Sig': sig4,
        'Accept': 'application/json'
      }
    });
    
    console.log('   Status:', resp4.status, resp4.statusText);
    const text4 = await resp4.text();
    if (resp4.ok) {
      console.log('   ✅ SUCCESS:', JSON.parse(text4));
    } else {
      console.log('   ❌ Error:', text4);
    }
  } catch (e) {
    console.log('   ❌ Exception:', e.message);
  }
}

(async () => {
  console.log('\n🚀 Sumsub Applicant Direct Test');
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

  await testMultipleEndpoints(applicantId, appToken, secretKey, baseUrl);

  console.log('\n✅ Done!\n');
  await prisma.$disconnect();
})();

