/**
 * Add Complete Employment & Source of Funds Fields
 * Run: npx ts-node prisma/add-employment-fields.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Adding complete Employment & Source of Funds fields...');

  // 1. Employment Status (required)
  await prisma.kycFormField.upsert({
    where: { fieldName: 'employment_status' },
    update: {
      label: 'Employment Status',
      fieldType: 'select',
      category: 'employment',
      isRequired: true,
      isEnabled: true,
      priority: 50,
      validation: JSON.stringify({
        required: true,
        message: 'Please select your employment status'
      }),
      options: JSON.stringify([
        'EMPLOYED_FT',
        'EMPLOYED_PT',
        'SELF_EMPLOYED',
        'UNEMPLOYED',
        'STUDENT',
        'RETIRED',
        'HOMEMAKER',
        'OTHER'
      ])
    },
    create: {
      fieldName: 'employment_status',
      label: 'Employment Status',
      fieldType: 'select',
      category: 'employment',
      isRequired: true,
      isEnabled: true,
      priority: 50,
      validation: JSON.stringify({
        required: true,
        message: 'Please select your employment status'
      }),
      options: JSON.stringify([
        'EMPLOYED_FT',
        'EMPLOYED_PT',
        'SELF_EMPLOYED',
        'UNEMPLOYED',
        'STUDENT',
        'RETIRED',
        'HOMEMAKER',
        'OTHER'
      ])
    }
  });
  console.log('✅ Employment Status field created');

  // 2. Employer name (for EMPLOYED)
  await prisma.kycFormField.upsert({
    where: { fieldName: 'employer_name' },
    update: {
      label: 'Employer Name',
      fieldType: 'text',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 51
    },
    create: {
      fieldName: 'employer_name',
      label: 'Employer Name',
      fieldType: 'text',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 51
    }
  });

  // 3. Job title
  await prisma.kycFormField.upsert({
    where: { fieldName: 'job_title' },
    update: {
      label: 'Job Title / Role',
      fieldType: 'text',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 52
    },
    create: {
      fieldName: 'job_title',
      label: 'Job Title / Role',
      fieldType: 'text',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 52
    }
  });

  // 4. Industry / Sector
  await prisma.kycFormField.upsert({
    where: { fieldName: 'industry' },
    update: {
      label: 'Industry / Sector',
      fieldType: 'select',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 53,
      options: JSON.stringify([
        'IT',
        'Finance',
        'Construction',
        'Retail',
        'Manufacturing',
        'Public_sector',
        'Healthcare',
        'Education',
        'Other'
      ])
    },
    create: {
      fieldName: 'industry',
      label: 'Industry / Sector',
      fieldType: 'select',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 53,
      options: JSON.stringify([
        'IT',
        'Finance',
        'Construction',
        'Retail',
        'Manufacturing',
        'Public_sector',
        'Healthcare',
        'Education',
        'Other'
      ])
    }
  });

  // 5. Country of employment
  await prisma.kycFormField.upsert({
    where: { fieldName: 'employment_country' },
    update: {
      label: 'Country of Employment',
      fieldType: 'select',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 54
    },
    create: {
      fieldName: 'employment_country',
      label: 'Country of Employment',
      fieldType: 'select',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 54
    }
  });

  // 6. Length of employment (years)
  await prisma.kycFormField.upsert({
    where: { fieldName: 'employment_years' },
    update: {
      label: 'Length of Employment (years)',
      fieldType: 'number',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 55,
      validation: JSON.stringify({
        min: 0,
        max: 60
      })
    },
    create: {
      fieldName: 'employment_years',
      label: 'Length of Employment (years)',
      fieldType: 'number',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 55,
      validation: JSON.stringify({
        min: 0,
        max: 60
      })
    }
  });

  // 7. Monthly net income band
  await prisma.kycFormField.upsert({
    where: { fieldName: 'income_band_monthly' },
    update: {
      label: 'Monthly Net Income Band',
      fieldType: 'select',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 56,
      options: JSON.stringify([
        '<€1k',
        '€1–3k',
        '€3–7k',
        '>€7k'
      ])
    },
    create: {
      fieldName: 'income_band_monthly',
      label: 'Monthly Net Income Band',
      fieldType: 'select',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 56,
      options: JSON.stringify([
        '<€1k',
        '€1–3k',
        '€3–7k',
        '>€7k'
      ])
    }
  });

  // 8. Business / trade name (for SELF_EMPLOYED)
  await prisma.kycFormField.upsert({
    where: { fieldName: 'biz_name' },
    update: {
      label: 'Business / Trade Name',
      fieldType: 'text',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 57
    },
    create: {
      fieldName: 'biz_name',
      label: 'Business / Trade Name',
      fieldType: 'text',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 57
    }
  });

  // 9. Business activity / Industry
  await prisma.kycFormField.upsert({
    where: { fieldName: 'biz_activity' },
    update: {
      label: 'Business Activity / Industry',
      fieldType: 'text',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 58
    },
    create: {
      fieldName: 'biz_activity',
      label: 'Business Activity / Industry',
      fieldType: 'text',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 58
    }
  });

  // 10. Business country
  await prisma.kycFormField.upsert({
    where: { fieldName: 'biz_country' },
    update: {
      label: 'Business Country',
      fieldType: 'select',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 59
    },
    create: {
      fieldName: 'biz_country',
      label: 'Business Country',
      fieldType: 'select',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 59
    }
  });

  // 11. Years in business
  await prisma.kycFormField.upsert({
    where: { fieldName: 'biz_years' },
    update: {
      label: 'Years in Business',
      fieldType: 'number',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 60,
      validation: JSON.stringify({
        min: 0,
        max: 60
      })
    },
    create: {
      fieldName: 'biz_years',
      label: 'Years in Business',
      fieldType: 'number',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 60,
      validation: JSON.stringify({
        min: 0,
        max: 60
      })
    }
  });

  // 12. Annual revenue band
  await prisma.kycFormField.upsert({
    where: { fieldName: 'revenue_band_annual' },
    update: {
      label: 'Annual Revenue Band',
      fieldType: 'select',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 61,
      options: JSON.stringify([
        '<€25k',
        '€25–100k',
        '€100–500k',
        '>€500k'
      ])
    },
    create: {
      fieldName: 'revenue_band_annual',
      label: 'Annual Revenue Band',
      fieldType: 'select',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 61,
      options: JSON.stringify([
        '<€25k',
        '€25–100k',
        '€100–500k',
        '>€500k'
      ])
    }
  });

  // 13. Tax/Reg number (optional)
  await prisma.kycFormField.upsert({
    where: { fieldName: 'tax_or_reg_number' },
    update: {
      label: 'Tax/Registration Number (optional)',
      fieldType: 'text',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 62
    },
    create: {
      fieldName: 'tax_or_reg_number',
      label: 'Tax/Registration Number (optional)',
      fieldType: 'text',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 62
    }
  });

  // 14. Institution name (for STUDENT)
  await prisma.kycFormField.upsert({
    where: { fieldName: 'institution_name' },
    update: {
      label: 'Institution Name',
      fieldType: 'text',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 63
    },
    create: {
      fieldName: 'institution_name',
      label: 'Institution Name',
      fieldType: 'text',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 63
    }
  });

  // 15. Student funding source
  await prisma.kycFormField.upsert({
    where: { fieldName: 'student_funding_source' },
    update: {
      label: 'Funding Source',
      fieldType: 'select',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 64,
      options: JSON.stringify([
        'family',
        'scholarship',
        'part_time',
        'savings',
        'other'
      ])
    },
    create: {
      fieldName: 'student_funding_source',
      label: 'Funding Source',
      fieldType: 'select',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 64,
      options: JSON.stringify([
        'family',
        'scholarship',
        'part_time',
        'savings',
        'other'
      ])
    }
  });

  // 16. Primary Source of Funds
  await prisma.kycFormField.upsert({
    where: { fieldName: 'primary_source_of_funds' },
    update: {
      label: 'Primary Source of Funds',
      fieldType: 'select',
      category: 'funds',
      isRequired: true,
      isEnabled: true,
      priority: 65,
      options: JSON.stringify([
        'salary',
        'business',
        'investments',
        'savings',
        'pension',
        'gift_inheritance',
        'benefits',
        'family_support',
        'other'
      ])
    },
    create: {
      fieldName: 'primary_source_of_funds',
      label: 'Primary Source of Funds',
      fieldType: 'select',
      category: 'funds',
      isRequired: true,
      isEnabled: true,
      priority: 65,
      options: JSON.stringify([
        'salary',
        'business',
        'investments',
        'savings',
        'pension',
        'gift_inheritance',
        'benefits',
        'family_support',
        'other'
      ])
    }
  });

  // 17. Other employment note
  await prisma.kycFormField.upsert({
    where: { fieldName: 'other_employment_note' },
    update: {
      label: 'Describe Your Situation',
      fieldType: 'textarea',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 66,
      validation: JSON.stringify({
        minLength: 3
      })
    },
    create: {
      fieldName: 'other_employment_note',
      label: 'Describe Your Situation',
      fieldType: 'textarea',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 66,
      validation: JSON.stringify({
        minLength: 3
      })
    }
  });

  console.log('✅ All Employment & Source of Funds fields created successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

