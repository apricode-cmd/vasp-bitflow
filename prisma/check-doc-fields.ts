import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const fields = await prisma.kycFormField.findMany({
    where: {
      OR: [
        { fieldName: { contains: 'scan' } },
        { fieldName: { startsWith: 'id_' } },
        { fieldName: 'id_type' },
        { fieldName: 'passport_scan' },
        { fieldName: 'passport_number' }
      ]
    },
    select: {
      fieldName: true,
      label: true,
      isEnabled: true,
      dependsOn: true,
      showWhen: true
    }
  });
  console.log('📋 Document fields:');
  console.log(JSON.stringify(fields, null, 2));
}

main().finally(() => prisma.$disconnect());

