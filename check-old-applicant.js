const crypto = require('crypto');

const APP_TOKEN = 'sbx:rFY8jfemC5BROOtQCTWAypTw.K6qJEzzYCSpezYWGtlZxKQDIQiEHguyT';
const SECRET_KEY = 'r2F4ck4c3xZ2wrFs34qra0ZYVA73qC7z';
const BASE_URL = 'https://api.sumsub.com';

// OLD applicant from 409 error
const OLD_APPLICANT_ID = '690e7f5976808036b2e8fa38';

function buildSignature(method, path, timestamp) {
  const payload = timestamp + method.toUpperCase() + path;
  return crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
}

async function checkOldApplicant() {
  console.log('🔍 Checking OLD applicant (from 409 Conflict)...\n');
  console.log('Applicant ID:', OLD_APPLICANT_ID);
  console.log('');
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = `/resources/applicants/${OLD_APPLICANT_ID}/status`;
  const signature = buildSignature('GET', path, timestamp);
  
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Accept': 'application/json',
      'X-App-Token': APP_TOKEN,
      'X-App-Access-Sig': signature,
      'X-App-Access-Ts': timestamp
    }
  });
  
  console.log('📡 Response:', response.status, response.statusText);
  console.log('');
  
  if (response.ok) {
    const status = await response.json();
    console.log('✅ Status Response:');
    console.log(JSON.stringify(status, null, 2));
    console.log('');
    console.log('🎯 THIS is the applicant SDK found!');
    console.log('  Review Status:', status.reviewStatus);
    console.log('  Review Answer:', status.reviewAnswer);
  } else {
    const error = await response.text();
    console.log('❌ Error:', error);
  }
}

checkOldApplicant();
