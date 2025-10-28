/**
 * Add Complete PEP & Sanctions Fields
 * Run: npx ts-node prisma/add-pep-fields.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Adding complete PEP & Sanctions fields...');

  // 1. Update PEP Status field with correct options
  await prisma.kycFormField.upsert({
    where: { fieldName: 'pep_status' },
    update: {
      label: 'PEP Status',
      fieldType: 'select',
      category: 'pep_sanctions',
      isRequired: true,
      isEnabled: true,
      priority: 40,
      validation: JSON.stringify({
        required: true,
        message: 'Please select a PEP status'
      }),
      options: JSON.stringify([
        'NO',
        'SELF_CURRENT',
        'SELF_FORMER',
        'FAMILY_CURRENT',
        'FAMILY_FORMER',
        'ASSOCIATE_CURRENT',
        'ASSOCIATE_FORMER'
      ])
    },
    create: {
      fieldName: 'pep_status',
      label: 'PEP Status',
      fieldType: 'select',
      category: 'pep_sanctions',
      isRequired: true,
      isEnabled: true,
      priority: 40,
      validation: JSON.stringify({
        required: true,
        message: 'Please select a PEP status'
      }),
      options: JSON.stringify([
        'NO',
        'SELF_CURRENT',
        'SELF_FORMER',
        'FAMILY_CURRENT',
        'FAMILY_FORMER',
        'ASSOCIATE_CURRENT',
        'ASSOCIATE_FORMER'
      ])
    }
  });
  console.log('✅ PEP Status field updated');

  // 2. PEP Role / Title (conditional)
  await prisma.kycFormField.upsert({
    where: { fieldName: 'pep_role_title' },
    update: {
      label: 'PEP Role / Title',
      fieldType: 'text',
      category: 'pep_sanctions',
      isRequired: false, // Conditionally required in UI
      isEnabled: true,
      priority: 41,
      validation: JSON.stringify({
        maxLength: 200,
        message: 'PEP role/title is required'
      })
    },
    create: {
      fieldName: 'pep_role_title',
      label: 'PEP Role / Title',
      fieldType: 'text',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 41,
      validation: JSON.stringify({
        maxLength: 200,
        message: 'PEP role/title is required'
      })
    }
  });
  console.log('✅ PEP Role/Title field created');

  // 3. Institution / Body
  await prisma.kycFormField.upsert({
    where: { fieldName: 'pep_institution' },
    update: {
      label: 'Institution / Body',
      fieldType: 'text',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 42,
      validation: JSON.stringify({
        maxLength: 200,
        message: 'Institution is required'
      })
    },
    create: {
      fieldName: 'pep_institution',
      label: 'Institution / Body',
      fieldType: 'text',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 42,
      validation: JSON.stringify({
        maxLength: 200,
        message: 'Institution is required'
      })
    }
  });
  console.log('✅ Institution field created');

  // 4. Country / Jurisdiction
  await prisma.kycFormField.upsert({
    where: { fieldName: 'pep_country' },
    update: {
      label: 'Country / Jurisdiction',
      fieldType: 'select',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 43,
      validation: JSON.stringify({
        required: false,
        message: 'Country is required'
      })
    },
    create: {
      fieldName: 'pep_country',
      label: 'Country / Jurisdiction',
      fieldType: 'select',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 43,
      validation: JSON.stringify({
        required: false,
        message: 'Country is required'
      })
    }
  });
  console.log('✅ Country field created');

  // 5. Since (YYYY-MM)
  await prisma.kycFormField.upsert({
    where: { fieldName: 'pep_since' },
    update: {
      label: 'Since (YYYY-MM)',
      fieldType: 'text',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 44,
      validation: JSON.stringify({
        pattern: '^[0-9]{4}-[0-9]{2}$',
        message: 'Start month is required (YYYY-MM)'
      })
    },
    create: {
      fieldName: 'pep_since',
      label: 'Since (YYYY-MM)',
      fieldType: 'text',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 44,
      validation: JSON.stringify({
        pattern: '^[0-9]{4}-[0-9]{2}$',
        message: 'Start month is required (YYYY-MM)'
      })
    }
  });
  console.log('✅ Since field created');

  // 6. Until (YYYY-MM)
  await prisma.kycFormField.upsert({
    where: { fieldName: 'pep_until' },
    update: {
      label: 'Until (YYYY-MM)',
      fieldType: 'text',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 45,
      validation: JSON.stringify({
        pattern: '^[0-9]{4}-[0-9]{2}$',
        message: 'End month is required (YYYY-MM)'
      })
    },
    create: {
      fieldName: 'pep_until',
      label: 'Until (YYYY-MM)',
      fieldType: 'text',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 45,
      validation: JSON.stringify({
        pattern: '^[0-9]{4}-[0-9]{2}$',
        message: 'End month is required (YYYY-MM)'
      })
    }
  });
  console.log('✅ Until field created');

  // 7. Relationship to PEP
  await prisma.kycFormField.upsert({
    where: { fieldName: 'relationship_to_pep' },
    update: {
      label: 'Relationship to PEP',
      fieldType: 'select',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 46,
      validation: JSON.stringify({
        required: false,
        message: 'Relationship to the PEP is required'
      }),
      options: JSON.stringify([
        'spouse_partner',
        'parent',
        'child',
        'sibling',
        'other'
      ])
    },
    create: {
      fieldName: 'relationship_to_pep',
      label: 'Relationship to PEP',
      fieldType: 'select',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 46,
      validation: JSON.stringify({
        required: false,
        message: 'Relationship to the PEP is required'
      }),
      options: JSON.stringify([
        'spouse_partner',
        'parent',
        'child',
        'sibling',
        'other'
      ])
    }
  });
  console.log('✅ Relationship field created');

  // 8. Additional Details
  await prisma.kycFormField.upsert({
    where: { fieldName: 'pep_additional_info' },
    update: {
      label: 'Additional Details',
      fieldType: 'textarea',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 47,
      validation: JSON.stringify({
        maxLength: 1000
      })
    },
    create: {
      fieldName: 'pep_additional_info',
      label: 'Additional Details',
      fieldType: 'textarea',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 47,
      validation: JSON.stringify({
        maxLength: 1000
      })
    }
  });
  console.log('✅ Additional Details field created');

  // 9. Supporting Document
  await prisma.kycFormField.upsert({
    where: { fieldName: 'pep_evidence_file' },
    update: {
      label: 'Supporting Document (optional)',
      fieldType: 'file',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 48,
      validation: JSON.stringify({
        accept: 'application/pdf,image/jpeg,image/jpg,image/png',
        maxSize: 10485760 // 10 MB
      })
    },
    create: {
      fieldName: 'pep_evidence_file',
      label: 'Supporting Document (optional)',
      fieldType: 'file',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: true,
      priority: 48,
      validation: JSON.stringify({
        accept: 'application/pdf,image/jpeg,image/jpg,image/png',
        maxSize: 10485760 // 10 MB
      })
    }
  });
  console.log('✅ Supporting Document field created');

  // 10. Disable old pep_category field
  await prisma.kycFormField.updateMany({
    where: { fieldName: 'pep_category' },
    data: { isEnabled: false }
  });
  console.log('✅ Disabled old pep_category field');

  console.log('✅ All PEP & Sanctions fields created successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

