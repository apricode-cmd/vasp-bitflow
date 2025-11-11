/**
 * Test Resend Integration After Saving API Key
 * 
 * Запустите этот скрипт после пересохранения API ключа в UI
 */

import { integrationFactory } from './src/lib/integrations/IntegrationFactory';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  console.log('🔍 Проверка Resend после пересохранения API ключа\n');
  
  try {
    // 1. Проверка в БД
    console.log('1️⃣ Проверка данных в БД...');
    const resend = await prisma.integration.findFirst({
      where: { service: 'resend' }
    });
    
    if (!resend) {
      console.log('❌ Resend не найден в БД');
      process.exit(1);
    }
    
    const config = resend.config as any;
    console.log('  ✅ Service:', resend.service);
    console.log('  ✅ Status:', resend.status);
    console.log('  ✅ Enabled:', resend.isEnabled);
    console.log('  ✅ API Key (integration.apiKey):', resend.apiKey?.substring(0, 30) + '...');
    console.log('  ✅ API Key (config.apiKey):', config?.apiKey?.substring(0, 15) + '...');
    console.log('  ✅ From Email:', config?.fromEmail);
    
    // Проверка формата ключа
    const apiKey = config?.apiKey || resend.apiKey;
    if (!apiKey) {
      console.log('\n❌ API ключ отсутствует!');
      process.exit(1);
    }
    
    if (apiKey.includes('xxxx') || apiKey.includes('****')) {
      console.log('\n❌ API ключ замаскирован! Нужен реальный ключ.');
      process.exit(1);
    }
    
    if (!apiKey.startsWith('re_')) {
      console.log('\n❌ API ключ не начинается с "re_"');
      process.exit(1);
    }
    
    console.log('\n✅ API ключ выглядит правильно!');
    
    // 2. Получение provider через Factory
    console.log('\n2️⃣ Инициализация email provider...');
    const emailProvider = await integrationFactory.getEmailProvider();
    console.log('  ✅ Provider ID:', emailProvider.providerId);
    console.log('  ✅ Configured:', emailProvider.isConfigured());
    
    // 3. Тестовая отправка
    console.log('\n3️⃣ Отправка тестового email...');
    const result = await emailProvider.sendEmail({
      to: 'bogdan.apricode@gmail.com',
      subject: `✅ Resend Test - ${new Date().toLocaleString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #07C3DD;">✅ Resend Integration Works!</h1>
          <p>This email confirms that your Resend integration is working correctly.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Test Details:</strong><br>
            Sent at: ${new Date().toLocaleString()}<br>
            From: ${config?.fromEmail}<br>
            Provider: Resend
          </div>
          <p style="color: #666; font-size: 12px;">
            If you received this email, your notification system is ready to use! 🎉
          </p>
        </div>
      `,
      text: 'Resend Integration Test - This email confirms that your Resend integration is working correctly.'
    });
    
    console.log('\n4️⃣ Результат отправки:');
    console.log('  - Success:', result.success);
    console.log('  - Message ID:', result.messageId);
    console.log('  - Error:', result.error);
    
    if (result.success && result.messageId) {
      console.log('\n🎉 УСПЕХ! Email отправлен через Resend!');
      console.log('📬 Message ID:', result.messageId);
      console.log('📧 Проверьте почту: bogdan.apricode@gmail.com');
      console.log('🔗 Логи Resend: https://resend.com/emails');
    } else {
      console.log('\n❌ ОШИБКА:', result.error);
      
      if (result.error?.includes('API key is invalid')) {
        console.log('\n💡 Решение:');
        console.log('  1. Получите новый API ключ: https://resend.com/api-keys');
        console.log('  2. Откройте /admin/integrations');
        console.log('  3. Нажмите Configure на Resend');
        console.log('  4. Вставьте новый API ключ');
        console.log('  5. Сохраните (потребуется MFA)');
      }
    }
    
  } catch (error: any) {
    console.error('\n❌ Exception:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();

