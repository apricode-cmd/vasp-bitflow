const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const APP_TOKEN = 'sbx:rFY8jfemC5BROOtQCTWAypTw.K6qJEzzYCSpezYWGtlZxKQDIQiEHguyT';
const SECRET_KEY = 'r2F4ck4c3xZ2wrFs34qra0ZYVA73qC7z';
const BASE_URL = 'https://api.sumsub.com';

function buildSignature(method, path, timestamp) {
  const payload = timestamp + method.toUpperCase() + path;
  return crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
}

async function debugSDKToken() {
  console.log('🔍 Debugging SDK Token Generation...\n');
  
  // 1. Check what's in DB
  const session = await prisma.kycSession.findUnique({
    where: { userId: 'cmh91d0lu000g12itgjrnkd61' }
  });
  
  console.log('📊 Database Session:');
  console.log('  Applicant ID:', session.applicantId);
  console.log('  Verification ID:', session.verificationId);
  console.log('  externalUserId:', session.metadata?.applicant?.externalUserId);
  console.log('');
  
  // 2. What SDK token would use
  const externalUserIdFromMetadata = session.metadata?.applicant?.externalUserId;
  const externalUserIdFallback = 'cmh91d0lu000g12itgjrnkd61';
  
  console.log('🎫 SDK Token Generation:');
  console.log('  Would use externalUserId:', externalUserIdFromMetadata || externalUserIdFallback);
  console.log('');
  
  // 3. Try to find applicant by externalUserId
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const externalUserId = externalUserIdFromMetadata || externalUserIdFallback;
  
  // Try to get applicant by externalUserId
  const pathByExternal = `/resources/applicants/-;externalUserId=${encodeURIComponent(externalUserId)}/one`;
  const sigByExternal = buildSignature('GET', pathByExternal, timestamp);
  
  console.log('🔍 Searching by externalUserId:', externalUserId);
  
  const responseByExternal = await fetch(`${BASE_URL}${pathByExternal}`, {
    headers: {
      'Accept': 'application/json',
      'X-App-Token': APP_TOKEN,
      'X-App-Access-Sig': sigByExternal,
      'X-App-Access-Ts': timestamp
    }
  });
  
  console.log('  Response:', responseByExternal.status, responseByExternal.statusText);
  
  if (responseByExternal.ok) {
    const applicant = await responseByExternal.json();
    console.log('  ✅ Found applicant:', applicant.id);
    console.log('  Review Status:', applicant.review?.reviewStatus);
    console.log('');
    
    // Now check this applicant's status
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
    
    console.log('📊 Status Check:');
    console.log('  Response:', statusResponse.status);
    
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('  Review Status:', status.reviewStatus);
      console.log('  Review Answer:', status.reviewAnswer);
    } else {
      const error = await statusResponse.text();
      console.log('  Error:', error);
    }
  } else {
    const error = await responseByExternal.text();
    console.log('  ❌ Error:', error);
  }
  
  await prisma.$disconnect();
}

debugSDKToken().catch(console.error);
