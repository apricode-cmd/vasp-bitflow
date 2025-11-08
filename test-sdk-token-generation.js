const crypto = require('crypto');

// Config
const APP_TOKEN = 'sbx:rFY8jfemC5BROOtQCTWAypTw.K6qJEzzYCSpezYWGtlZxKQDIQiEHguyT';
const SECRET_KEY = 'r2F4ck4c3xZ2wrFs34qra0ZYVA73qC7z';
const BASE_URL = 'https://api.sumsub.com';
const LEVEL_NAME = 'id-and-liveness';

// From metadata
const EXTERNAL_USER_ID = 'cmh91d0lu000g12itgjrnkd61-1762597014276';

function buildSignature(method, path, timestamp, body = null) {
  const payload = timestamp + method.toUpperCase() + path + (body || '');
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex');
}

async function generateSDKToken() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = `/resources/accessTokens?userId=${encodeURIComponent(EXTERNAL_USER_ID)}&levelName=${encodeURIComponent(LEVEL_NAME)}`;
  const signature = buildSignature('POST', path, timestamp);

  console.log('🎫 Generating SDK Token...');
  console.log('================================');
  console.log('External User ID:', EXTERNAL_USER_ID);
  console.log('Level Name:', LEVEL_NAME);
  console.log('Timestamp:', timestamp);
  console.log('');

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
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
    console.log('✅ SDK Token Generated:');
    console.log('  Token:', data.token ? data.token.substring(0, 30) + '...' : 'N/A');
    console.log('  User ID:', data.userId || 'N/A');
    console.log('');
    console.log('🎯 This token should work for applicant: 690f1896defa308891cd8c44');

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

generateSDKToken();
