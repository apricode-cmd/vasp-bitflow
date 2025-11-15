const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const applicantId = process.argv[2] || '690e7f5976808036b2e8fa38';

function buildSignature(ts, method, path, secretKey, body = '') {
  const payload = ts + method.toUpperCase() + path + body;
  console.log('🔐 Building signature:');
  console.log('  - Timestamp:', ts);
  console.log('  - Method:', method.toUpperCase());
  console.log('  - Path:', path);
  console.log('  - Body:', body || '(empty)');
  console.log('  - Payload:', payload);
  
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
  
  console.log('  - Signature:', signature);
  return signature;
}

async function testApplicantStatus(id, appToken, secretKey, baseUrl) {
  try {
    const path = `/resources/applicants/${encodeURIComponent(id)}/status`;
    const method = 'GET';
    const ts = Math.floor(Date.now() / 1000).toString();
    
    console.log('\n📋 Request Details:');
    console.log('  - Base URL:', baseUrl);
    console.log('  - Path:', path);
    console.log('  - Full URL:', baseUrl + path);
    console.log('  - Method:', method);
    console.log('  - Applicant ID:', id);
    console.log('  - App Token:', appToken.substring(0, 15) + '...');
    console.log('  - Secret Key:', '***' + secretKey.substring(secretKey.length - 4));
    console.log('');
    
    const signature = buildSignature(ts, method, path, secretKey);
    
    const headers = {
      'X-App-Token': appToken,
      'X-App-Access-Ts': ts,
      'X-App-Access-Sig': signature,
      'Accept': 'application/json'
    };

    console.log('\n📤 Request Headers:');
    console.log('  - X-App-Token:', appToken.substring(0, 15) + '...');
    console.log('  - X-App-Access-Ts:', ts);
    console.log('  - X-App-Access-Sig:', signature);
    console.log('');

    console.log('🚀 Sending request...\n');

    const response = await fetch(baseUrl + path, {
      method: method,
      headers
    });

    console.log('📊 Response Status:', response.status, response.statusText);
    console.log('📋 Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  - ${key}: ${value}`);
    }
    console.log('');

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('❌ Error Response Body:', responseText);
      
      // Try to parse as JSON
      try {
        const errorJson = JSON.parse(responseText);
        console.log('\n❌ Parsed Error:');
        console.log(JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('\n❌ Raw Error:', responseText);
      }
      
      return null;
    }

    const data = JSON.parse(responseText);
    console.log('✅ Success! Response Body:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.error('Stack:', error.stack);
    return null;
  }
}

(async () => {
  console.log('\n🚀 Sumsub Applicant Status - Detailed Debug');
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

  if (!appToken || !secretKey) {
    console.error('❌ Credentials incomplete!');
    await prisma.$disconnect();
    process.exit(1);
  }

  await testApplicantStatus(applicantId, appToken, secretKey, baseUrl);

  console.log('\n✅ Done!\n');
  await prisma.$disconnect();
})();

