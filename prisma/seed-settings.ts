/**
 * Seed script for SystemSettings default values
 * 
 * Run: npx tsx prisma/seed-settings.ts
 */

import { prisma } from '../src/lib/prisma';

const defaultSettings = [
  // Brand Settings
  {
    key: 'brandName',
    value: 'Apricode Exchange',
    type: 'STRING' as const,
    category: 'brand',
    description: 'Platform name displayed across the site',
    isPublic: true
  },
  {
    key: 'brandTagline',
    value: 'Buy Cryptocurrency Securely',
    type: 'STRING' as const,
    category: 'brand',
    description: 'Platform tagline',
    isPublic: true
  },
  {
    key: 'brandLogo',
    value: '/logo.png',
    type: 'STRING' as const,
    category: 'brand',
    description: 'URL to platform logo',
    isPublic: true
  },
  {
    key: 'primaryColor',
    value: '#06b6d4',
    type: 'STRING' as const,
    category: 'brand',
    description: 'Primary brand color (hex)',
    isPublic: true
  },
  {
    key: 'supportEmail',
    value: 'support@apricode.io',
    type: 'STRING' as const,
    category: 'brand',
    description: 'Support email address',
    isPublic: true
  },
  {
    key: 'supportPhone',
    value: '+48 123 456 789',
    type: 'STRING' as const,
    category: 'brand',
    description: 'Support phone number',
    isPublic: true
  },

  // SEO Settings
  {
    key: 'seoTitle',
    value: 'Buy Cryptocurrency Securely | Apricode Exchange',
    type: 'STRING' as const,
    category: 'seo',
    description: 'Meta title for SEO',
    isPublic: true
  },
  {
    key: 'seoDescription',
    value: 'Purchase Bitcoin, Ethereum, Tether, and Solana with EUR or PLN. Secure, KYC-verified cryptocurrency exchange platform.',
    type: 'STRING' as const,
    category: 'seo',
    description: 'Meta description for SEO',
    isPublic: true
  },
  {
    key: 'seoKeywords',
    value: 'cryptocurrency, bitcoin, ethereum, buy crypto, exchange, EUR, PLN',
    type: 'STRING' as const,
    category: 'seo',
    description: 'SEO keywords (comma-separated)',
    isPublic: true
  },
  {
    key: 'ogImage',
    value: '/og-image.jpg',
    type: 'STRING' as const,
    category: 'seo',
    description: 'Open Graph image URL for social sharing',
    isPublic: true
  },

  // System Settings
  {
    key: 'maintenanceMode',
    value: 'false',
    type: 'BOOLEAN' as const,
    category: 'system',
    description: 'Enable maintenance mode to disable platform access',
    isPublic: false
  },
  {
    key: 'registrationEnabled',
    value: 'true',
    type: 'BOOLEAN' as const,
    category: 'system',
    description: 'Allow new user registrations',
    isPublic: true
  },
  {
    key: 'kycRequired',
    value: 'true',
    type: 'BOOLEAN' as const,
    category: 'system',
    description: 'Require KYC verification before trading',
    isPublic: true
  },
  {
    key: 'emailNotifications',
    value: 'true',
    type: 'BOOLEAN' as const,
    category: 'system',
    description: 'Send email notifications for orders and updates',
    isPublic: false
  },

  // Trading Settings
  {
    key: 'defaultFeePercent',
    value: '1.5',
    type: 'NUMBER' as const,
    category: 'trading',
    description: 'Default platform fee percentage',
    isPublic: true
  },
  {
    key: 'minOrderAmount',
    value: '10',
    type: 'NUMBER' as const,
    category: 'trading',
    description: 'Minimum order amount in EUR',
    isPublic: true
  },
  {
    key: 'maxOrderAmount',
    value: '50000',
    type: 'NUMBER' as const,
    category: 'trading',
    description: 'Maximum order amount in EUR',
    isPublic: true
  },
  {
    key: 'orderExpirationHours',
    value: '24',
    type: 'NUMBER' as const,
    category: 'trading',
    description: 'Order expiration time in hours',
    isPublic: false
  }
];

async function seedSettings() {
  console.log('🌱 Seeding System Settings...\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const setting of defaultSettings) {
    try {
      const existing = await prisma.systemSettings.findUnique({
        where: { key: setting.key }
      });

      if (existing) {
        // Update if value is different
        if (existing.value !== setting.value) {
          await prisma.systemSettings.update({
            where: { key: setting.key },
            data: {
              value: setting.value,
              type: setting.type,
              category: setting.category,
              description: setting.description,
              isPublic: setting.isPublic
            }
          });
          console.log(`✅ Updated: ${setting.key} = ${setting.value}`);
          updated++;
        } else {
          console.log(`⏭️  Skipped: ${setting.key} (unchanged)`);
          skipped++;
        }
      } else {
        // Create new
        await prisma.systemSettings.create({
          data: setting
        });
        console.log(`✨ Created: ${setting.key} = ${setting.value}`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${setting.key}:`, error);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✨ Created: ${created}`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📦 Total: ${defaultSettings.length}`);
  console.log('\n✅ Seeding complete!');
}

seedSettings()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

