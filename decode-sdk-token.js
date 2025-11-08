const crypto = require('crypto');

const APP_TOKEN = 'sbx:rFY8jfemC5BROOtQCTWAypTw.K6qJEzzYCSpezYWGtlZxKQDIQiEHguyT';
const SECRET_KEY = 'r2F4ck4c3xZ2wrFs34qra0ZYVA73qC7z';
const BASE_URL = 'https://api.sumsub.com';
const LEVEL_NAME = 'id-and-liveness';

function buildSignature(method, path, timestamp) {
  const payload = timestamp + method.toUpperCase() + path;
  return crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
}

async function decodeToken() {
  const externalUserId = 'cmh91d0lu000g12itgjrnkd61-1762597014276';
  
  // Get token
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const tokenPath = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${encodeURIComponent(LEVEL_NAME)}`;
  const tokenSig = buildSignature('POST', tokenPath, timestamp);
  
  const tokenResponse = await fetch(`${BASE_URL}${tokenPath}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'X-App-Token': APP_TOKEN,
      'X-App-Access-Sig': tokenSig,
      'X-App-Access-Ts': timestamp
    }
  });
  
  const tokenData = await tokenResponse.json();
  console.log('🎫 SDK Token Response:');
  console.log(JSON.stringify(tokenData, null, 2));
  console.log('');
  
  // Try to decode JWT (if it's a JWT)
  if (tokenData.token && tokenData.token.includes('.')) {
    const parts = tokenData.token.split('.');
    if (parts.length >= 2) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        console.log('📦 Decoded JWT Payload:');
        console.log(JSON.stringify(payload, null, 2));
      } catch (e) {
        console.log('⚠️ Could not decode JWT');
      }
    }
  }
}

decodeToken();
