/**
 * KYC Form Fields Seeding
 * 
 * Seeds 37+ configurable KYC fields covering:
 * - Personal Identification
 * - Contact Information
 * - Address
 * - Identity Documents
 * - PEP & Sanctions
 * - Employment & Purpose
 * - Expected Activity
 * - Source of Funds/Wealth
 * - Consents
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedKycFormFields() {
  console.log('🔐 Seeding KYC Form Fields...');

  const fields = [
    // === PERSONAL IDENTIFICATION ===
    {
      id: 'kyc-field-first_name',
      fieldName: 'first_name',
      label: 'First Name',
      fieldType: 'text',
      category: 'personal',
      isRequired: true,
      isEnabled: true,
      priority: 1,
      validation: JSON.stringify({ minLength: 2, maxLength: 50 })
    },
    {
      id: 'kyc-field-last_name',
      fieldName: 'last_name',
      label: 'Last Name',
      fieldType: 'text',
      category: 'personal',
      isRequired: true,
      isEnabled: true,
      priority: 2,
      validation: JSON.stringify({ minLength: 2, maxLength: 50 })
    },
    {
      id: 'kyc-field-date_of_birth',
      fieldName: 'date_of_birth',
      label: 'Date of Birth',
      fieldType: 'date',
      category: 'personal',
      isRequired: true,
      isEnabled: true,
      priority: 3,
      validation: JSON.stringify({ minAge: 18, maxAge: 120 })
    },
    {
      id: 'kyc-field-place_of_birth',
      fieldName: 'place_of_birth',
      label: 'Place of Birth',
      fieldType: 'text',
      category: 'personal',
      isRequired: false,
      isEnabled: true,
      priority: 4,
      validation: JSON.stringify({ maxLength: 100 })
    },
    {
      id: 'kyc-field-nationality',
      fieldName: 'nationality',
      label: 'Nationality',
      fieldType: 'select',
      category: 'personal',
      isRequired: true,
      isEnabled: true,
      priority: 5,
      options: JSON.stringify(['PL', 'DE', 'FR', 'IT', 'ES', 'GB', 'US', 'UA', 'Other'])
    },

    // === CONTACT ===
    {
      id: 'kyc-field-email',
      fieldName: 'email',
      label: 'Email Address',
      fieldType: 'email',
      category: 'contact',
      isRequired: true,
      isEnabled: true,
      priority: 10,
      validation: JSON.stringify({ pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' })
    },
    {
      id: 'kyc-field-phone',
      fieldName: 'phone',
      label: 'Phone Number',
      fieldType: 'phone',
      category: 'contact',
      isRequired: true,
      isEnabled: true,
      priority: 11,
      validation: JSON.stringify({ minLength: 8, maxLength: 20 })
    },
    {
      id: 'kyc-field-phone_country',
      fieldName: 'phone_country',
      label: 'Phone Country Code',
      fieldType: 'select',
      category: 'contact',
      isRequired: false,
      isEnabled: true,
      priority: 12,
      options: JSON.stringify(['PL', 'DE', 'FR', 'IT', 'ES', 'GB', 'US', 'UA'])
    },

    // === ADDRESS ===
    {
      id: 'kyc-field-address_street',
      fieldName: 'address_street',
      label: 'Street Address',
      fieldType: 'text',
      category: 'address',
      isRequired: true,
      isEnabled: true,
      priority: 20,
      validation: JSON.stringify({ minLength: 5, maxLength: 200 })
    },
    {
      id: 'kyc-field-address_city',
      fieldName: 'address_city',
      label: 'City',
      fieldType: 'text',
      category: 'address',
      isRequired: true,
      isEnabled: true,
      priority: 21,
      validation: JSON.stringify({ minLength: 2, maxLength: 100 })
    },
    {
      id: 'kyc-field-address_region',
      fieldName: 'address_region',
      label: 'Region/State',
      fieldType: 'text',
      category: 'address',
      isRequired: false,
      isEnabled: true,
      priority: 22,
      validation: JSON.stringify({ maxLength: 100 })
    },
    {
      id: 'kyc-field-address_country',
      fieldName: 'address_country',
      label: 'Country',
      fieldType: 'select',
      category: 'address',
      isRequired: true,
      isEnabled: true,
      priority: 23,
      options: JSON.stringify(['PL', 'DE', 'FR', 'IT', 'ES', 'GB', 'US', 'UA', 'Other'])
    },
    {
      id: 'kyc-field-address_postal',
      fieldName: 'address_postal',
      label: 'Postal Code',
      fieldType: 'text',
      category: 'address',
      isRequired: true,
      isEnabled: true,
      priority: 24,
      validation: JSON.stringify({ minLength: 3, maxLength: 20 })
    },

    // === IDENTITY DOCUMENT ===
    {
      id: 'kyc-field-id_type',
      fieldName: 'id_type',
      label: 'ID Document Type',
      fieldType: 'select',
      category: 'documents',
      isRequired: true,
      isEnabled: true,
      priority: 30,
      options: JSON.stringify(['passport', 'id_card', 'residence_permit', 'drivers_license'])
    },
    {
      id: 'kyc-field-id_number',
      fieldName: 'id_number',
      label: 'ID Number',
      fieldType: 'text',
      category: 'documents',
      isRequired: true,
      isEnabled: true,
      priority: 31,
      validation: JSON.stringify({ minLength: 5, maxLength: 50 })
    },
    {
      id: 'kyc-field-id_issuing_country',
      fieldName: 'id_issuing_country',
      label: 'Issuing Country',
      fieldType: 'select',
      category: 'documents',
      isRequired: true,
      isEnabled: true,
      priority: 32,
      options: JSON.stringify(['PL', 'DE', 'FR', 'IT', 'ES', 'GB', 'US', 'UA', 'Other'])
    },
    {
      id: 'kyc-field-id_issuing_authority',
      fieldName: 'id_issuing_authority',
      label: 'Issuing Authority',
      fieldType: 'text',
      category: 'documents',
      isRequired: false,
      isEnabled: true,
      priority: 33,
      validation: JSON.stringify({ maxLength: 100 })
    },
    {
      id: 'kyc-field-id_issue_date',
      fieldName: 'id_issue_date',
      label: 'Issue Date',
      fieldType: 'date',
      category: 'documents',
      isRequired: false,
      isEnabled: true,
      priority: 34
    },
    {
      id: 'kyc-field-id_expiry_date',
      fieldName: 'id_expiry_date',
      label: 'Expiry Date',
      fieldType: 'date',
      category: 'documents',
      isRequired: true,
      isEnabled: true,
      priority: 35
    },
    {
      id: 'kyc-field-id_scan_front',
      fieldName: 'id_scan_front',
      label: 'ID Front Scan',
      fieldType: 'file',
      category: 'documents',
      isRequired: true,
      isEnabled: true,
      priority: 36,
      validation: JSON.stringify({ acceptedFormats: ['image/jpeg', 'image/png', 'application/pdf'], maxSize: 10485760 })
    },
    {
      id: 'kyc-field-id_scan_back',
      fieldName: 'id_scan_back',
      label: 'ID Back Scan',
      fieldType: 'file',
      category: 'documents',
      isRequired: false,
      isEnabled: true,
      priority: 37,
      validation: JSON.stringify({ acceptedFormats: ['image/jpeg', 'image/png', 'application/pdf'], maxSize: 10485760 })
    },
    {
      id: 'kyc-field-liveness_selfie',
      fieldName: 'liveness_selfie',
      label: 'Liveness Selfie',
      fieldType: 'file',
      category: 'documents',
      isRequired: false,
      isEnabled: true,
      priority: 38,
      validation: JSON.stringify({ acceptedFormats: ['image/jpeg', 'image/png'], maxSize: 10485760 })
    },

    // === PEP & SANCTIONS ===
    {
      id: 'kyc-field-pep_status',
      fieldName: 'pep_status',
      label: 'PEP Status',
      fieldType: 'select',
      category: 'pep_sanctions',
      isRequired: true,
      isEnabled: true,
      priority: 40,
      options: JSON.stringify(['no', 'yes_self', 'yes_family', 'yes_close_associate'])
    },
    {
      id: 'kyc-field-pep_category',
      fieldName: 'pep_category',
      label: 'PEP Category (if applicable)',
      fieldType: 'text',
      category: 'pep_sanctions',
      isRequired: false,
      isEnabled: false,
      priority: 41
    },

    // === EMPLOYMENT & PURPOSE ===
    {
      id: 'kyc-field-employment_status',
      fieldName: 'employment_status',
      label: 'Employment Status',
      fieldType: 'select',
      category: 'employment',
      isRequired: true,
      isEnabled: true,
      priority: 50,
      options: JSON.stringify(['employed', 'self_employed', 'unemployed', 'retired', 'student'])
    },
    {
      id: 'kyc-field-occupation',
      fieldName: 'occupation',
      label: 'Occupation',
      fieldType: 'text',
      category: 'employment',
      isRequired: false,
      isEnabled: true,
      priority: 51,
      validation: JSON.stringify({ maxLength: 100 })
    },
    {
      id: 'kyc-field-employer_name',
      fieldName: 'employer_name',
      label: 'Employer Name',
      fieldType: 'text',
      category: 'employment',
      isRequired: false,
      isEnabled: false,
      priority: 52,
      validation: JSON.stringify({ maxLength: 200 })
    },
    {
      id: 'kyc-field-purpose_of_account',
      fieldName: 'purpose_of_account',
      label: 'Purpose of Account',
      fieldType: 'textarea',
      category: 'purpose',
      isRequired: true,
      isEnabled: true,
      priority: 60,
      validation: JSON.stringify({ minLength: 10, maxLength: 500 })
    },
    {
      id: 'kyc-field-intended_use',
      fieldName: 'intended_use',
      label: 'Intended Use',
      fieldType: 'textarea',
      category: 'purpose',
      isRequired: false,
      isEnabled: true,
      priority: 61,
      validation: JSON.stringify({ maxLength: 500 })
    },

    // === EXPECTED ACTIVITY ===
    {
      id: 'kyc-field-expected_volume',
      fieldName: 'expected_volume',
      label: 'Expected Average Transaction Amount (EUR)',
      fieldType: 'number',
      category: 'activity',
      isRequired: false,
      isEnabled: true,
      priority: 70,
      validation: JSON.stringify({ min: 0, max: 1000000 })
    },
    {
      id: 'kyc-field-expected_frequency',
      fieldName: 'expected_frequency',
      label: 'Expected Transaction Frequency',
      fieldType: 'select',
      category: 'activity',
      isRequired: false,
      isEnabled: true,
      priority: 71,
      options: JSON.stringify(['daily', 'weekly', 'monthly', 'occasionally'])
    },

    // === SOURCE OF FUNDS ===
    {
      id: 'kyc-field-source_of_funds',
      fieldName: 'source_of_funds',
      label: 'Source of Funds',
      fieldType: 'select',
      category: 'funds',
      isRequired: true,
      isEnabled: true,
      priority: 80,
      options: JSON.stringify(['salary', 'business_income', 'investment', 'inheritance', 'savings', 'other'])
    },
    {
      id: 'kyc-field-source_of_wealth',
      fieldName: 'source_of_wealth',
      label: 'Source of Wealth (for EDD)',
      fieldType: 'textarea',
      category: 'funds',
      isRequired: false,
      isEnabled: false,
      priority: 81,
      validation: JSON.stringify({ maxLength: 1000 })
    },

    // === CONSENTS ===
    {
      id: 'kyc-field-consent_kyc',
      fieldName: 'consent_kyc',
      label: 'I consent to KYC verification',
      fieldType: 'checkbox',
      category: 'consents',
      isRequired: true,
      isEnabled: true,
      priority: 90
    },
    {
      id: 'kyc-field-consent_aml',
      fieldName: 'consent_aml',
      label: 'I consent to AML screening',
      fieldType: 'checkbox',
      category: 'consents',
      isRequired: true,
      isEnabled: true,
      priority: 91
    },
    {
      id: 'kyc-field-consent_tfr',
      fieldName: 'consent_tfr',
      label: 'I consent to TFR reporting',
      fieldType: 'checkbox',
      category: 'consents',
      isRequired: true,
      isEnabled: true,
      priority: 92
    },
    {
      id: 'kyc-field-consent_privacy',
      fieldName: 'consent_privacy',
      label: 'I accept Privacy Policy',
      fieldType: 'checkbox',
      category: 'consents',
      isRequired: true,
      isEnabled: true,
      priority: 93
    }
  ];

  console.log(`  Creating/updating ${fields.length} KYC form fields...`);

  for (const field of fields) {
    await prisma.kycFormField.upsert({
      where: { fieldName: field.fieldName },
      update: {
        label: field.label,
        fieldType: field.fieldType,
        category: field.category,
        isRequired: field.isRequired,
        isEnabled: field.isEnabled,
        priority: field.priority,
        validation: field.validation as any,
        options: field.options as any
      },
      create: field as any
    });
  }

  console.log(`✅ KYC Form Fields seeded successfully!\n`);
}

// If run directly
if (require.main === module) {
  seedKycFormFields()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}


