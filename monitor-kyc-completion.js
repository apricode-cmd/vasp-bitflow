const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Sumsub config
const APP_TOKEN = 'sbx:rFY8jfemC5BROOtQCTWAypTw.K6qJEzzYCSpezYWGtlZxKQDIQiEHguyT';
const SECRET_KEY = 'r2F4ck4c3xZ2wrFs34qra0ZYVA73qC7z';
const BASE_URL = 'https://api.sumsub.com';
const USER_ID = 'cmh91d0lu000g12itgjrnkd61';
const APPLICANT_ID = '690f1896defa308891cd8c44';

function buildSignature(method, path, timestamp) {
  const payload = timestamp + method.toUpperCase() + path;
  return crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
}

async function checkStatus() {
  console.log('\n🔍 Checking KYC completion status...');
  console.log('=====================================\n');

  // 1. Check DB
  const session = await prisma.kycSession.findUnique({
    where: { userId: USER_ID }
  });

  console.log('📊 Database Status:');
  console.log('  Session ID:', session.id);
  console.log('  Status:', session.status);
  console.log('  Applicant ID:', session.applicantId);
  console.log('  Submitted At:', session.submittedAt);
  console.log('  Completed At:', session.completedAt);
  console.log('');

  // 2. Check metadata preservation
  console.log('📦 Metadata Check:');
  console.log('  externalUserId:', session.metadata?.applicant?.externalUserId || '❌ LOST!');
  console.log('  lastChecked:', session.metadata?.lastChecked);
  console.log('  applicantStatus:', session.metadata?.applicantStatus);
  console.log('');

  // 3. Check Sumsub API
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = `/resources/applicants/${APPLICANT_ID}/status`;
  const signature = buildSignature('GET', path, timestamp);

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Accept': 'application/json',
      'X-App-Token': APP_TOKEN,
      'X-App-Access-Sig': signature,
      'X-App-Access-Ts': timestamp
    }
  });

  const sumsubStatus = await response.json();

  console.log('📡 Sumsub API Status:');
  console.log('  Review Status:', sumsubStatus.reviewStatus);
  console.log('  Review Answer:', sumsubStatus.reviewAnswer || 'N/A');
  console.log('  Review Reject Type:', sumsubStatus.reviewRejectType || 'N/A');
  console.log('  Attempt Count:', sumsubStatus.attemptCnt);
  console.log('');

  // 4. Final verdict
  console.log('🎯 Final Verdict:');
  console.log('  ✅ externalUserId preserved?', 
    session.metadata?.applicant?.externalUserId ? 'YES ✅' : 'NO ❌'
  );
  console.log('  ✅ Status synced?', 
    sumsubStatus.reviewStatus === session.metadata?.applicantStatus ? 'YES ✅' : 'NO ❌'
  );
  console.log('');

  await prisma.$disconnect();
}

checkStatus().catch(console.error);
