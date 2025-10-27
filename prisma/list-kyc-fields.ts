import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listEnabledFields() {
  const fields = await prisma.kycFormField.findMany({
    where: { isEnabled: true },
    orderBy: { priority: 'asc' },
    select: {
      fieldName: true,
      category: true,
      isRequired: true,
      priority: true,
    }
  });

  console.log('\n📋 Enabled KYC Fields:\n');
  
  const grouped = fields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, typeof fields>);

  Object.entries(grouped).forEach(([category, categoryFields]) => {
    console.log(`\n${category.toUpperCase()}:`);
    categoryFields.forEach(f => {
      const req = f.isRequired ? '✅ Required' : '⚪️ Optional';
      console.log(`  ${req} - ${f.fieldName}`);
    });
  });

  console.log(`\n📊 Total: ${fields.length} enabled fields\n`);
}

listEnabledFields()
  .finally(() => prisma.$disconnect());

