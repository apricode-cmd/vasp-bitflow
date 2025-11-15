import * as PasskeyService from './src/lib/services/passkey.service';

async function test() {
  try {
    console.log('Testing PasskeyService...');
    console.log('Available functions:', Object.keys(PasskeyService));
    
    const email = 'admin@apricode.io';
    
    console.log('\nTrying to generate auth options...');
    const options = await PasskeyService.generatePasskeyAuthenticationOptions(email);
    
    console.log('✅ Success!');
    console.log('Challenge:', options.challenge.substring(0, 30) + '...');
    console.log('RP ID:', options.rpId);
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

test();
