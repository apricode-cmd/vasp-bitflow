import { integrationFactory } from './src/lib/integrations/IntegrationFactory';

async function checkApplicantStatus() {
  try {
    console.log('🔍 Checking Sumsub applicant status...');
    
    const applicantId = '69256964b65b1697e08496f5';
    const provider = await integrationFactory.getKycProvider();
    
    console.log('📋 Provider:', provider.providerId);
    console.log('👤 Applicant ID:', applicantId);
    
    const status = await provider.getVerificationStatus(applicantId);
    
    console.log('\n✅ Applicant Status:');
    console.log(JSON.stringify(status, null, 2));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkApplicantStatus();
