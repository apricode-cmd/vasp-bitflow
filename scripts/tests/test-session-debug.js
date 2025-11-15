/**
 * Admin Session Debug Test
 * Тестирует всю цепочку авторизации
 */

const baseUrl = 'http://localhost:3000';

async function testAdminSession() {
  console.log('🔍 ТЕСТИРОВАНИЕ ADMIN SESSION\n');
  console.log('='.repeat(60));

  try {
    // 1. Проверка cookies после входа
    console.log('\n1️⃣  Проверка cookies после входа:');
    console.log('   👉 Откройте DevTools → Application → Cookies → localhost:3000');
    console.log('   👉 Найдите: next-auth.session-token.admin');
    console.log('   👉 Проверьте Expires (должно быть +30 дней)');
    console.log('   ❓ Cookie есть? (да/нет)');

    // 2. Тест: NextAuth session endpoint
    console.log('\n2️⃣  Проверка NextAuth session:');
    const sessionResp = await fetch(`${baseUrl}/api/auth/session`, {
      credentials: 'include'
    });
    const sessionData = await sessionResp.json();
    console.log('   Status:', sessionResp.status);
    console.log('   Data:', JSON.stringify(sessionData, null, 2));
    
    if (!sessionData || !sessionData.user) {
      console.error('   ❌ NextAuth session НЕ найдена!');
      console.log('   🔍 Это означает что cookie не отправляется или JWT невалиден');
    } else {
      console.log('   ✅ NextAuth session OK:', sessionData.user.email);
    }

    // 3. Тест: Admin API endpoint
    console.log('\n3️⃣  Проверка Admin API (/api/admin/profile):');
    const profileResp = await fetch(`${baseUrl}/api/admin/profile`, {
      credentials: 'include'
    });
    const profileData = await profileResp.json();
    console.log('   Status:', profileResp.status);
    console.log('   Data:', JSON.stringify(profileData, null, 2));
    
    if (profileResp.status === 401) {
      console.error('   ❌ Admin API возвращает 401!');
      console.log('   🔍 getAdminSession() не находит сессию');
    } else {
      console.log('   ✅ Admin API OK');
    }

    // 4. Тест: Stats endpoint
    console.log('\n4️⃣  Проверка Stats API (/api/admin/stats):');
    const statsResp = await fetch(`${baseUrl}/api/admin/stats?range=week`, {
      credentials: 'include'
    });
    const statsData = await statsResp.json();
    console.log('   Status:', statsResp.status);
    console.log('   Success:', statsData.success);
    
    if (statsResp.status === 401) {
      console.error('   ❌ Stats API возвращает 401!');
      console.log('   🔍 Это вызывает разлогинивание');
    } else {
      console.log('   ✅ Stats API OK');
    }

    // 5. Проверка headers
    console.log('\n5️⃣  Проверка Request Headers:');
    console.log('   👉 Откройте DevTools → Network → любой запрос к /api/admin/*');
    console.log('   👉 Request Headers → Cookie:');
    console.log('   ❓ Видите next-auth.session-token.admin? (да/нет)');

    console.log('\n' + '='.repeat(60));
    console.log('📋 ДИАГНОСТИКА:');
    console.log('   Если cookie ЕСТЬ, но session НЕ найдена:');
    console.log('   → Проблема в JWT decryption (NEXTAUTH_ADMIN_SECRET)');
    console.log('   Если cookie НЕТ:');
    console.log('   → Cookie не сохраняется (path, sameSite, httpOnly)');
    console.log('   Если 401 только на /api/admin/*:');
    console.log('   → getAdminSession() не работает в API routes');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
  }
}

// Инструкции для запуска
console.log('📖 ИНСТРУКЦИЯ:');
console.log('1. Откройте http://localhost:3000/admin/auth/login');
console.log('2. Войдите с Passkey');
console.log('3. Откройте DevTools Console (F12)');
console.log('4. Вставьте этот код в Console и нажмите Enter:\n');
console.log('-'.repeat(60));

// Export for browser console
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testAdminSession };
}

