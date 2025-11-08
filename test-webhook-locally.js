const crypto = require('crypto');

const SECRET_KEY = 'r2F4ck4c3xZ2wrFs34qra0ZYVA73qC7z';

// Simulate Sumsub webhook payload
const payload = {
  applicantId: '690f1896defa308891cd8c44',
  inspectionId: 'test-inspection-123',
  correlationId: 'test-correlation-123',
  levelName: 'id-and-liveness',
  externalUserId: 'cmh91d0lu000g12itgjrnkd61-1762597014276',
  type: 'applicantReviewed',
  reviewStatus: 'completed',
  reviewResult: {
    reviewAnswer: 'GREEN'
  },
  createdAt: new Date().toISOString()
};

const body = JSON.stringify(payload);

// Generate signature
const signature = crypto
  .createHmac('sha256', SECRET_KEY)
  .update(body)
  .digest('hex');

console.log('🧪 Testing Sumsub Webhook Locally...\n');
console.log('📦 Payload:', JSON.stringify(payload, null, 2));
console.log('\n📝 Signature:', signature);
console.log('\n🚀 Sending to local webhook...\n');

// Send to local webhook
fetch('http://localhost:3000/api/kyc/webhook/sumsub', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-payload-digest': signature
  },
  body: body
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ Webhook Response:', JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error('❌ Webhook Error:', err.message);
  });
