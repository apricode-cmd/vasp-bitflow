/**
 * Update Email Templates Script
 * 
 * Updates existing email templates with new content from presets.json
 * Run: npx tsx prisma/update-email-templates.ts
 */

import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('📧 Updating email templates...\n');

  // Import getBaseEmailLayout
  const { getBaseEmailLayout } = await import('../src/lib/email-templates/base-layout.js');
  
  // Load presets
  const presetsPath = join(__dirname, '../src/lib/email-templates/presets.json');
  const presetsData = await readFile(presetsPath, 'utf-8');
  const emailTemplates = JSON.parse(presetsData);
  
  console.log(`Found ${emailTemplates.length} templates in presets.json\n`);

  let updated = 0;
  let created = 0;

  for (const template of emailTemplates) {
    // Check if template exists
    const existing = await prisma.emailTemplate.findFirst({
      where: { 
        key: template.key,
        orgId: null,
      },
    });

    // Wrap body content in base layout with white-label placeholders
    const fullHtmlContent = getBaseEmailLayout(template.bodyContent, {
      brandName: '{{brandName}}',
      brandLogo: '{{brandLogo}}',
      primaryColor: '{{primaryColor}}',
      supportEmail: '{{supportEmail}}',
      supportPhone: '{{supportPhone}}',
    });

    if (existing) {
      // Update existing template
      await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: {
          name: template.name,
          description: template.description,
          category: template.category,
          subject: template.subject,
          preheader: template.preheader,
          htmlContent: fullHtmlContent,
          layout: template.layout,
          variables: template.variables,
          updatedAt: new Date(),
        },
      });
      console.log(`  ✅ Updated: ${template.key}`);
      updated++;
    } else {
      // Create new template
      await prisma.emailTemplate.create({
        data: {
          key: template.key,
          name: template.name,
          description: template.description,
          category: template.category,
          subject: template.subject,
          preheader: template.preheader,
          htmlContent: fullHtmlContent,
          textContent: '',
          layout: template.layout,
          variables: template.variables,
          version: 1,
          isActive: true,
          isDefault: true,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
      console.log(`  ✨ Created: ${template.key}`);
      created++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Updated: ${updated} templates`);
  console.log(`  ✨ Created: ${created} templates`);
  console.log(`  📧 Total: ${emailTemplates.length} templates\n`);
  console.log('✅ Email templates update completed!\n');
}

main()
  .catch((error) => {
    console.error('❌ Error updating templates:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

