const crypto = require('crypto');

// Config from logs
const APP_TOKEN = 'sbx:rFY8jfemC5BROOtQCTWAypTw.K6qJEzzYCSpezYWGtlZxKQDIQiEHguyT';
const SECRET_KEY = 'r2F4ck4c3xZ2wrFs34qra0ZYVA73qC7z';
const BASE_URL = 'https://api.sumsub.com';
const APPLICANT_ID = '690f1896defa308891cd8c44'; // From logs

// Build HMAC signature
function buildSignature(method, path, timestamp, body = null) {
  const payload = timestamp + method.toUpperCase() + path + (body || '');
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex');
}

async function checkStatus() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = `/resources/applicants/${APPLICANT_ID}/status`;
  const signature = buildSignature('GET', path, timestamp);

  console.log('📊 Checking Sumsub applicant status...');
  console.log('================================');
  console.log('Applicant ID:', APPLICANT_ID);
  console.log('Timestamp:', timestamp);
  console.log('Signature:', signature.substring(0, 20) + '...');
  console.log('');

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-App-Token': APP_TOKEN,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestamp
      }
    });

    console.log('📡 Response Status:', response.status, response.statusText);
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Sumsub Status Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    console.log('📋 Summary:');
    console.log('  Review Status:', data.reviewStatus || 'N/A');
    console.log('  Review Answer:', data.reviewAnswer || 'N/A');
    console.log('  Review Reject Type:', data.reviewRejectType || 'N/A');
    console.log('  Moderation Comment:', data.moderationComment || 'N/A');
    console.log('  Client Comment:', data.clientComment || 'N/A');

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

checkStatus();
