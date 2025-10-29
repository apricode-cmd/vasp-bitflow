/**
 * Test script to download KYC report
 */

import { downloadKycReport } from './src/lib/services/kyc.service';

async function testDownloadReport() {
  try {
    const sessionId = 'cmhb6w3640003yofizeu0bic2';
    console.log('📄 Testing report download for session:', sessionId);
    
    const buffer = await downloadKycReport(sessionId);
    
    console.log(`✅ Success! Downloaded ${buffer.length} bytes`);
    console.log('First 100 bytes:', buffer.toString('utf8', 0, Math.min(100, buffer.length)));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDownloadReport();

