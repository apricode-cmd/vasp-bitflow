/**
 * Debug Admin Session
 * 
 * Добавьте этот код в DevTools Console для отладки
 */

// 1. Проверить cookie
const adminCookie = document.cookie
  .split('; ')
  .find(row => row.startsWith('next-auth.session-token.admin='));

console.log('🍪 Admin Cookie:', adminCookie ? 'EXISTS' : 'MISSING');
console.log('🍪 All Cookies:', document.cookie);

// 2. Проверить session через API
fetch('/api/admin/profile')
  .then(r => r.json())
  .then(data => {
    console.log('👤 Profile API:', data);
  })
  .catch(err => {
    console.error('❌ Profile Error:', err);
  });

// 3. Проверить NextAuth session
fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => {
    console.log('🔐 NextAuth Session:', data);
  });

