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

async function listApplicants(appToken, secretKey, baseUrl) {
  try {
    // Get list of applicants
    const path = '/resources/applicants';
    const method = 'GET';
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = buildSignature(ts, method, path, secretKey);

    const headers = {
      'X-App-Token': appToken,
      'X-App-Access-Ts': ts,
      'X-App-Access-Sig': signature,
      'Accept': 'application/json'
    };

    console.log('🔍 Fetching applicants list...');
    console.log('📋 URL:', baseUrl + path);

    const response = await fetch(baseUrl + path, {
      method: method,
      headers
    });

    console.log('📊 Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', error);
      return null;
    }

    const data = await response.json();
    
    console.log('\n✅ Found', data.items?.length || 0, 'applicants:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (data.items && data.items.length > 0) {
      data.items.forEach((applicant, index) => {
        console.log(`${index + 1}. Applicant:`);
        console.log(`   - ID: ${applicant.id}`);
        console.log(`   - External ID: ${applicant.externalUserId || 'N/A'}`);
        console.log(`   - Email: ${applicant.email || 'N/A'}`);
        console.log(`   - Level: ${applicant.levelName || 'N/A'}`);
        console.log(`   - Review Status: ${applicant.review?.reviewStatus || 'N/A'}`);
        console.log(`   - Review Answer: ${applicant.review?.reviewAnswer || 'N/A'}`);
        console.log(`   - Created: ${applicant.createdAt || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('No applicants found');
    }

    return data;

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

(async () => {
  console.log('\n🚀 Sumsub Applicants List');
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
  console.log('   - Base URL:', baseUrl);
  console.log('   - Level Name:', config.levelName);
  console.log('');

  await listApplicants(appToken, secretKey, baseUrl);

  console.log('\n✅ Done!\n');
  await prisma.$disconnect();
})();

