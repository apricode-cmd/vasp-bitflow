const crypto = require('crypto');

const APP_TOKEN = 'sbx:rFY8jfemC5BROOtQCTWAypTw.K6qJEzzYCSpezYWGtlZxKQDIQiEHguyT';
const SECRET_KEY = 'r2F4ck4c3xZ2wrFs34qra0ZYVA73qC7z';
const BASE_URL = 'https://api.sumsub.com';

function buildSignature(method, path, timestamp) {
  const payload = timestamp + method.toUpperCase() + path;
  return crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
}

async function listAllApplicants() {
  console.log('🔍 Listing ALL applicants for this token...\n');
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  
  // Try different endpoints
  const endpoints = [
    '/resources/applicants',
    '/resources/applicants?limit=100',
    '/resources/applicants/-/all'
  ];
  
  for (const path of endpoints) {
    console.log(`📡 Trying: ${path}`);
    const signature = buildSignature('GET', path, timestamp);
    
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Accept': 'application/json',
        'X-App-Token': APP_TOKEN,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestamp
      }
    });
    
    console.log(`   Response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   Data:', JSON.stringify(data, null, 2).substring(0, 500));
    } else {
      const error = await response.text();
      console.log('   Error:', error.substring(0, 200));
    }
    console.log('');
  }
  
  // Try to search by email
  console.log('🔍 Searching by email...');
  const emailPath = '/resources/applicants/-;email=apricode.studio@gmail.com/one';
  const emailSig = buildSignature('GET', emailPath, timestamp);
  
  const emailResponse = await fetch(`${BASE_URL}${emailPath}`, {
    headers: {
      'Accept': 'application/json',
      'X-App-Token': APP_TOKEN,
      'X-App-Access-Sig': emailSig,
      'X-App-Access-Ts': timestamp
    }
  });
  
  console.log(`   Response: ${emailResponse.status} ${emailResponse.statusText}`);
  
  if (emailResponse.ok) {
    const applicant = await emailResponse.json();
    console.log('   ✅ Found by email!');
    console.log('   Applicant ID:', applicant.id);
    console.log('   External User ID:', applicant.externalUserId);
    console.log('   Review Status:', applicant.review?.reviewStatus);
    console.log('   Review Answer:', applicant.review?.reviewAnswer);
  } else {
    const error = await emailResponse.text();
    console.log('   Error:', error);
  }
}

listAllApplicants();
