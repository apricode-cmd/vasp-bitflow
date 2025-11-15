const crypto = require('crypto');

const APP_TOKEN = 'sbx:rFY8jfemC5BROOtQCTWAypTw.K6qJEzzYCSpezYWGtlZxKQDIQiEHguyT';
const SECRET_KEY = 'r2F4ck4c3xZ2wrFs34qra0ZYVA73qC7z';
const BASE_URL = 'https://api.sumsub.com';

// ORIGINAL externalUserId (without suffix)
const ORIGINAL_EXTERNAL_ID = 'cmh91d0lu000g12itgjrnkd61';

function buildSignature(method, path, timestamp) {
  const payload = timestamp + method.toUpperCase() + path;
  return crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
}

async function checkOriginalExternalId() {
  console.log('🔍 Checking by ORIGINAL externalUserId (no suffix)...\n');
  console.log('External User ID:', ORIGINAL_EXTERNAL_ID);
  console.log('');
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = `/resources/applicants/-;externalUserId=${encodeURIComponent(ORIGINAL_EXTERNAL_ID)}/one`;
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
    const applicant = await response.json();
    console.log('✅ Found applicant:');
    console.log('  Applicant ID:', applicant.id);
    console.log('  External User ID:', applicant.externalUserId);
    console.log('  Review Status:', applicant.review?.reviewStatus);
    console.log('  Review Answer:', applicant.review?.reviewAnswer);
    console.log('');
    console.log('🎯 THIS is what SDK uses!');
    console.log('');
    
    // Check status
    const timestamp2 = Math.floor(Date.now() / 1000).toString();
    const pathStatus = `/resources/applicants/${applicant.id}/status`;
    const sigStatus = buildSignature('GET', pathStatus, timestamp2);
    
    const statusResponse = await fetch(`${BASE_URL}${pathStatus}`, {
      headers: {
        'Accept': 'application/json',
        'X-App-Token': APP_TOKEN,
        'X-App-Access-Sig': sigStatus,
        'X-App-Access-Ts': timestamp2
      }
    });
    
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('📊 Full Status:');
      console.log(JSON.stringify(status, null, 2));
    }
  } else {
    const error = await response.text();
    console.log('❌ Error:', error);
  }
}

checkOriginalExternalId();
