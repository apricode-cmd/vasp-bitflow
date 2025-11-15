const crypto = require('crypto');

const APP_TOKEN = 'sbx:rFY8jfemC5BROOtQCTWAypTw.K6qJEzzYCSpezYWGtlZxKQDIQiEHguyT';
const SECRET_KEY = 'r2F4ck4c3xZ2wrFs34qra0ZYVA73qC7z';
const BASE_URL = 'https://api.sumsub.com';
const LEVEL_NAME = 'id-and-liveness';

function buildSignature(method, path, timestamp) {
  const payload = timestamp + method.toUpperCase() + path;
  return crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
}

async function findRealApplicant() {
  console.log('🔍 Searching for REAL applicant that SDK used...\n');
  
  // SDK creates token with externalUserId, then SDK finds applicant by externalUserId + levelName
  const externalUserId = 'cmh91d0lu000g12itgjrnkd61-1762597014276';
  
  console.log('1️⃣ Trying to get access token (like SDK does)...');
  const timestamp1 = Math.floor(Date.now() / 1000).toString();
  const tokenPath = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${encodeURIComponent(LEVEL_NAME)}`;
  const tokenSig = buildSignature('POST', tokenPath, timestamp1);
  
  const tokenResponse = await fetch(`${BASE_URL}${tokenPath}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'X-App-Token': APP_TOKEN,
      'X-App-Access-Sig': tokenSig,
      'X-App-Access-Ts': timestamp1
    }
  });
  
  console.log('   Response:', tokenResponse.status);
  
  if (tokenResponse.ok) {
    const tokenData = await tokenResponse.json();
    console.log('   ✅ Token created! This means applicant EXISTS!');
    console.log('   User ID from token:', tokenData.userId);
    console.log('');
    
    // Now try to find this applicant
    console.log('2️⃣ Searching applicant by externalUserId + levelName...');
    
    // Sumsub SDK internally uses this endpoint
    const timestamp2 = Math.floor(Date.now() / 1000).toString();
    const searchPath = `/resources/applicants/-;externalUserId=${encodeURIComponent(externalUserId)};levelName=${encodeURIComponent(LEVEL_NAME)}/one`;
    const searchSig = buildSignature('GET', searchPath, timestamp2);
    
    const searchResponse = await fetch(`${BASE_URL}${searchPath}`, {
      headers: {
        'Accept': 'application/json',
        'X-App-Token': APP_TOKEN,
        'X-App-Access-Sig': searchSig,
        'X-App-Access-Ts': timestamp2
      }
    });
    
    console.log('   Response:', searchResponse.status);
    
    if (searchResponse.ok) {
      const applicant = await searchResponse.json();
      console.log('   ✅ FOUND THE REAL APPLICANT!');
      console.log('');
      console.log('📊 Applicant Details:');
      console.log('   ID:', applicant.id);
      console.log('   External User ID:', applicant.externalUserId);
      console.log('   Created:', applicant.createdAt);
      console.log('   Review Status:', applicant.review?.reviewStatus);
      console.log('   Review Answer:', applicant.review?.reviewAnswer);
      console.log('');
      
      // Check full status
      const timestamp3 = Math.floor(Date.now() / 1000).toString();
      const statusPath = `/resources/applicants/${applicant.id}/status`;
      const statusSig = buildSignature('GET', statusPath, timestamp3);
      
      const statusResponse = await fetch(`${BASE_URL}${statusPath}`, {
        headers: {
          'Accept': 'application/json',
          'X-App-Token': APP_TOKEN,
          'X-App-Access-Sig': statusSig,
          'X-App-Access-Ts': timestamp3
        }
      });
      
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log('📋 Full Status:');
        console.log(JSON.stringify(status, null, 2));
      }
    } else {
      const error = await searchResponse.text();
      console.log('   Error:', error);
    }
  } else {
    const error = await tokenResponse.text();
    console.log('   ❌ Token creation failed:', error);
    console.log('   This means applicant does NOT exist with this externalUserId');
  }
}

findRealApplicant();
