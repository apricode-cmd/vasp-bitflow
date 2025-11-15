#!/usr/bin/env node
/**
 * Test Admin Profile & Security Settings
 * 
 * Проверка всех настроек: сохранение, обновление, логаут
 */

const ADMIN_EMAIL = 'admin@apricode.io'; // Замените на ваш email

console.log('🧪 Testing Admin Profile & Security Settings\n');

async function testSecuritySettings() {
  console.log('📋 Test #1: Get current security settings');
  
  try {
    const response = await fetch('http://localhost:3000/api/admin/security-settings', {
      headers: {
        'Cookie': 'next-auth.session-token.admin=YOUR_SESSION_TOKEN'
      }
    });
    
    const data = await response.json();
    console.log('✅ Current settings:', JSON.stringify(data, null, 2));
    
    if (!data.success) {
      console.error('❌ Failed to get settings:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
  
  console.log('\n📋 Test #2: Update security settings');
  
  try {
    const newSettings = {
      idleTimeout: 15,
      maxSessionDuration: 8,
      loginNotifications: true,
      securityAlerts: true,
      activityDigest: false,
    };
    
    const response = await fetch('http://localhost:3000/api/admin/security-settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token.admin=YOUR_SESSION_TOKEN'
      },
      body: JSON.stringify(newSettings)
    });
    
    const data = await response.json();
    console.log('✅ Update result:', JSON.stringify(data, null, 2));
    
    if (!data.success) {
      console.error('❌ Failed to update settings:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
  
  return true;
}

async function testProfile() {
  console.log('\n📋 Test #3: Get admin profile');
  
  try {
    const response = await fetch('http://localhost:3000/api/admin/profile', {
      headers: {
        'Cookie': 'next-auth.session-token.admin=YOUR_SESSION_TOKEN'
      }
    });
    
    const data = await response.json();
    console.log('✅ Profile:', JSON.stringify(data, null, 2));
    
    if (!data.success) {
      console.error('❌ Failed to get profile:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
  
  console.log('\n📋 Test #4: Update profile');
  
  try {
    const updatedProfile = {
      firstName: 'Test',
      lastName: 'Admin',
      email: ADMIN_EMAIL
    };
    
    const response = await fetch('http://localhost:3000/api/admin/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token.admin=YOUR_SESSION_TOKEN'
      },
      body: JSON.stringify(updatedProfile)
    });
    
    const data = await response.json();
    console.log('✅ Update result:', JSON.stringify(data, null, 2));
    
    if (!data.success) {
      console.error('❌ Failed to update profile:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
  
  return true;
}

async function testPasskeys() {
  console.log('\n📋 Test #5: Get passkeys');
  
  try {
    const response = await fetch('http://localhost:3000/api/admin/passkeys', {
      headers: {
        'Cookie': 'next-auth.session-token.admin=YOUR_SESSION_TOKEN'
      }
    });
    
    const data = await response.json();
    console.log('✅ Passkeys:', JSON.stringify(data, null, 2));
    
    if (!data.success) {
      console.error('❌ Failed to get passkeys:', data.error);
      return false;
    }
    
    console.log(`   Found ${data.passkeys.length} passkey(s)`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
  
  return true;
}

// Run tests
(async () => {
  console.log('⚠️  NOTE: This script requires a valid admin session token.');
  console.log('   Please login at http://localhost:3000/admin/auth/login first,');
  console.log('   then get the session token from DevTools → Application → Cookies\n');
  console.log('   Update YOUR_SESSION_TOKEN in this script before running.\n');
  
  const results = {
    securitySettings: await testSecuritySettings(),
    profile: await testProfile(),
    passkeys: await testPasskeys()
  };
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  console.log('='.repeat(50));
  console.log(`Security Settings: ${results.securitySettings ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Profile: ${results.profile ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Passkeys: ${results.passkeys ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(50));
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Check logs above.');
    process.exit(1);
  }
})();

