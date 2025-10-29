/**
 * Test KYCAID API direct request
 */

import { prisma } from './src/lib/prisma';
import { decrypt } from './src/lib/services/encryption.service';

async function testKycaidApi() {
  try {
    console.log('🧪 Testing KYCAID API...\n');
    
    // Get integration
    const integration = await prisma.integration.findUnique({
      where: { service: 'kycaid' }
    });
    
    if (!integration?.apiKey) {
      console.error('❌ No KYCAID integration found');
      return;
    }
    
    const apiKey = decrypt(integration.apiKey);
    const baseUrl = integration.apiEndpoint || 'https://api.kycaid.com';
    
    console.log('📋 Config:');
    console.log('  - Base URL:', baseUrl);
    console.log('  - API Key:', apiKey.substring(0, 10) + '...');
    console.log('');
    
    // Get session
    const session = await prisma.kycSession.findUnique({
      where: { id: 'cmhb6w3640003yofizeu0bic2' }
    });
    
    if (!session) {
      console.error('❌ Session not found');
      return;
    }
    
    const applicantId = session.kycaidApplicantId!;
    const verificationId = session.kycaidVerificationId!;
    
    console.log('📄 Testing requests:');
    console.log('  - Applicant ID:', applicantId);
    console.log('  - Verification ID:', verificationId);
    console.log('');
    
    // Test 1: Simple applicant request (no verification_id)
    console.log('1️⃣ GET /applicants/{applicant_id}');
    try {
      const url1 = `${baseUrl}/applicants/${applicantId}`;
      console.log('   URL:', url1);
      
      const response1 = await fetch(url1, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   Status:', response1.status, response1.statusText);
      
      if (response1.ok) {
        const data = await response1.json();
        console.log('   ✅ SUCCESS');
        console.log('   Documents:', data.documents?.length || 0);
        console.log('   Verification status:', data.verification_status);
      } else {
        const error = await response1.text();
        console.log('   ❌ FAILED');
        console.log('   Error:', error.substring(0, 200));
      }
    } catch (error: any) {
      console.log('   ❌ EXCEPTION:', error.message);
    }
    
    console.log('');
    
    // Test 2: With verification_id parameter
    console.log('2️⃣ GET /applicants/{applicant_id}?verification_id={verification_id}');
    try {
      const url2 = `${baseUrl}/applicants/${applicantId}?verification_id=${verificationId}`;
      console.log('   URL:', url2);
      
      const response2 = await fetch(url2, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   Status:', response2.status, response2.statusText);
      
      if (response2.ok) {
        const data = await response2.json();
        console.log('   ✅ SUCCESS');
        console.log('   Documents:', data.documents?.length || 0);
        console.log('   Documents IDs:', data.documents || []);
      } else {
        const error = await response2.text();
        console.log('   ❌ FAILED');
        console.log('   Error:', error.substring(0, 200));
      }
    } catch (error: any) {
      console.log('   ❌ EXCEPTION:', error.message);
    }
    
    console.log('');
    
    // Test 3: Get verification directly
    console.log('3️⃣ GET /verifications/{verification_id}');
    try {
      const url3 = `${baseUrl}/verifications/${verificationId}`;
      console.log('   URL:', url3);
      
      const response3 = await fetch(url3, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   Status:', response3.status, response3.statusText);
      
      if (response3.ok) {
        const data = await response3.json();
        console.log('   ✅ SUCCESS');
        console.log('   Status:', data.status);
        console.log('   Verified:', data.verified);
        console.log('   Verifications:', Object.keys(data.verifications || {}));
      } else {
        const error = await response3.text();
        console.log('   ❌ FAILED');
        console.log('   Error:', error.substring(0, 200));
      }
    } catch (error: any) {
      console.log('   ❌ EXCEPTION:', error.message);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testKycaidApi();

