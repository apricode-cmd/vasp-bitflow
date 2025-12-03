/**
 * Restore KYC Fields from backup
 * 
 * Run: npx ts-node prisma/restore-kyc-fields.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const kycFields = [
  { id: 'cmh82azw2001434whdqfd3ak0', fieldName: 'first_name', label: 'First Name', fieldType: 'text', isRequired: true, isEnabled: true, category: 'personal', validation: '{"minLength":2,"maxLength":50}', options: null, priority: 1, dependsOn: null, showWhen: null },
  { id: 'cmh82azw4001534wh6s3wmekm', fieldName: 'last_name', label: 'Last Name', fieldType: 'text', isRequired: true, isEnabled: true, category: 'personal', validation: '{"minLength":2,"maxLength":50}', options: null, priority: 2, dependsOn: null, showWhen: null },
  { id: 'cmh82azw4001634wh9i6khno3', fieldName: 'date_of_birth', label: 'Date of Birth', fieldType: 'date', isRequired: true, isEnabled: true, category: 'personal', validation: '{"minAge":18,"maxAge":120}', options: null, priority: 3, dependsOn: null, showWhen: null },
  { id: 'kyc-field-place_of_birth', fieldName: 'place_of_birth', label: 'Place of Birth', fieldType: 'text', isRequired: false, isEnabled: false, category: 'personal', validation: '{"maxLength":100}', options: null, priority: 4, dependsOn: null, showWhen: null },
  { id: 'cmh82azw5001734whf8kelm9r', fieldName: 'nationality', label: 'Nationality', fieldType: 'country', isRequired: true, isEnabled: true, category: 'personal', validation: null, options: null, priority: 5, dependsOn: null, showWhen: null },
  
  // Contact
  { id: 'kyc-field-email', fieldName: 'email', label: 'Email Address', fieldType: 'email', isRequired: true, isEnabled: true, category: 'contact', validation: '{"pattern":"^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$"}', options: null, priority: 10, dependsOn: null, showWhen: null },
  { id: 'kyc-field-phone', fieldName: 'phone', label: 'Phone Number', fieldType: 'phone', isRequired: true, isEnabled: true, category: 'contact', validation: '{"minLength":8,"maxLength":20}', options: null, priority: 11, dependsOn: null, showWhen: null },
  { id: 'kyc-field-phone_country', fieldName: 'phone_country', label: 'Phone Country Code', fieldType: 'select', isRequired: false, isEnabled: false, category: 'contact', validation: null, options: '["PL","DE","FR","IT","ES","GB","US","UA"]', priority: 12, dependsOn: null, showWhen: null },
  
  // Address
  { id: 'kyc-field-address_street', fieldName: 'address_street', label: 'Street Address', fieldType: 'text', isRequired: true, isEnabled: true, category: 'address', validation: '{"minLength":5,"maxLength":200}', options: null, priority: 20, dependsOn: null, showWhen: null },
  { id: 'kyc-field-address_city', fieldName: 'address_city', label: 'City', fieldType: 'text', isRequired: true, isEnabled: true, category: 'address', validation: '{"minLength":2,"maxLength":100}', options: null, priority: 21, dependsOn: null, showWhen: null },
  { id: 'kyc-field-address_region', fieldName: 'address_region', label: 'Region/State', fieldType: 'text', isRequired: false, isEnabled: true, category: 'address', validation: '{"maxLength":100}', options: null, priority: 22, dependsOn: null, showWhen: null },
  { id: 'kyc-field-address_country', fieldName: 'address_country', label: 'Country', fieldType: 'country', isRequired: true, isEnabled: true, category: 'address', validation: null, options: null, priority: 23, dependsOn: null, showWhen: null },
  { id: 'kyc-field-address_postal', fieldName: 'address_postal', label: 'Postal Code', fieldType: 'text', isRequired: true, isEnabled: true, category: 'address', validation: '{"minLength":3,"maxLength":20}', options: null, priority: 24, dependsOn: null, showWhen: null },
  { id: 'kyc-field-proof_of_address_type', fieldName: 'proof_of_address_type', label: 'Proof of Address Type', fieldType: 'select', isRequired: false, isEnabled: true, category: 'address', validation: null, options: '["utility_bill","bank_statement","tax_statement","rental_agreement","other"]', priority: 25, dependsOn: null, showWhen: null },
  { id: 'kyc-field-proof_of_address', fieldName: 'proof_of_address', label: 'Proof of Address', fieldType: 'file', isRequired: true, isEnabled: true, category: 'address', validation: '{"maxSize":10485760,"acceptedFormats":["image/jpeg","image/png","application/pdf"]}', options: null, priority: 26, dependsOn: null, showWhen: null },
  
  // Documents
  { id: 'kyc-field-id_type', fieldName: 'id_type', label: 'ID Document Type', fieldType: 'select', isRequired: true, isEnabled: true, category: 'documents', validation: null, options: '["passport","id_card","drivers_license"]', priority: 30, dependsOn: null, showWhen: null },
  { id: 'cmh82azw9001d34whiixlwlma', fieldName: 'passport_number', label: 'Passport Number', fieldType: 'text', isRequired: false, isEnabled: false, category: 'documents', validation: '{"maxLength":20,"minLength":5}', options: null, priority: 28, dependsOn: 'id_type', showWhen: '{"value":"passport","operator":"=="}' },
  { id: 'kyc-field-passport_scan', fieldName: 'passport_scan', label: 'Passport Scan', fieldType: 'file', isRequired: false, isEnabled: true, category: 'documents', validation: '{"maxSize":10485760,"acceptedFormats":["image/jpeg","image/png","application/pdf"]}', options: null, priority: 29, dependsOn: 'id_type', showWhen: '{"value":"passport","operator":"=="}' },
  { id: 'cmh82azw9001e34whl9f6ecqh', fieldName: 'id_number', label: 'ID Number', fieldType: 'text', isRequired: false, isEnabled: false, category: 'documents', validation: '{"minLength":5,"maxLength":50}', options: null, priority: 31, dependsOn: 'id_type', showWhen: '{"value":["id_card","drivers_license"],"operator":"in"}' },
  { id: 'kyc-field-id_issuing_country', fieldName: 'id_issuing_country', label: 'Issuing Country', fieldType: 'country', isRequired: false, isEnabled: false, category: 'documents', validation: null, options: null, priority: 32, dependsOn: null, showWhen: null },
  { id: 'kyc-field-id_issuing_authority', fieldName: 'id_issuing_authority', label: 'Issuing Authority', fieldType: 'text', isRequired: false, isEnabled: false, category: 'documents', validation: '{"maxLength":100}', options: null, priority: 33, dependsOn: 'id_type', showWhen: '{"value":["passport","id_card","drivers_license"],"operator":"in"}' },
  { id: 'kyc-field-id_issue_date', fieldName: 'id_issue_date', label: 'Issue Date', fieldType: 'date', isRequired: false, isEnabled: false, category: 'documents', validation: null, options: null, priority: 34, dependsOn: 'id_type', showWhen: '{"value":["id_card","drivers_license"],"operator":"in"}' },
  { id: 'kyc-field-id_expiry_date', fieldName: 'id_expiry_date', label: 'Expiry Date', fieldType: 'date', isRequired: true, isEnabled: false, category: 'documents', validation: null, options: null, priority: 35, dependsOn: 'id_type', showWhen: '{"value":["passport","id_card","drivers_license"],"operator":"in"}' },
  { id: 'kyc-field-id_scan_front', fieldName: 'id_scan_front', label: 'ID Front Scan', fieldType: 'file', isRequired: true, isEnabled: false, category: 'documents', validation: '{"acceptedFormats":["image/jpeg","image/png","application/pdf"],"maxSize":10485760}', options: null, priority: 36, dependsOn: 'id_type', showWhen: '{"value":["id_card","drivers_license"],"operator":"in"}' },
  { id: 'kyc-field-id_scan_back', fieldName: 'id_scan_back', label: 'ID Back Scan', fieldType: 'file', isRequired: true, isEnabled: false, category: 'documents', validation: '{"acceptedFormats":["image/jpeg","image/png","application/pdf"],"maxSize":10485760}', options: null, priority: 37, dependsOn: 'id_type', showWhen: '{"value":["id_card","drivers_license"],"operator":"in"}' },
  { id: 'kyc-field-liveness_selfie', fieldName: 'liveness_selfie', label: 'Liveness Selfie', fieldType: 'file', isRequired: false, isEnabled: false, category: 'documents', validation: '{"acceptedFormats":["image/jpeg","image/png"],"maxSize":10485760}', options: null, priority: 38, dependsOn: null, showWhen: null },
  
  // PEP & Sanctions
  { id: 'kyc-field-pep_status', fieldName: 'pep_status', label: 'PEP Status', fieldType: 'select', isRequired: false, isEnabled: false, category: 'pep_sanctions', validation: '{"required":true,"message":"Please select a PEP status"}', options: '["no","yes_self","yes_family","yes_close_associate"]', priority: 40, dependsOn: null, showWhen: null },
  { id: 'kyc-field-pep_category', fieldName: 'pep_category', label: 'PEP Category (if applicable)', fieldType: 'text', isRequired: false, isEnabled: false, category: 'pep_sanctions', validation: null, options: null, priority: 41, dependsOn: null, showWhen: null },
  
  // Employment  
  { id: 'kyc-field-employment_status', fieldName: 'employment_status', label: 'Employment Status', fieldType: 'select', isRequired: true, isEnabled: true, category: 'employment', validation: '{"required":true,"message":"Please select your employment status"}', options: '["EMPLOYED_FT","EMPLOYED_PT","SELF_EMPLOYED","UNEMPLOYED","STUDENT","RETIRED","HOMEMAKER","OTHER"]', priority: 50, dependsOn: null, showWhen: null },
  { id: 'kyc-field-occupation', fieldName: 'occupation', label: 'Occupation', fieldType: 'text', isRequired: false, isEnabled: true, category: 'employment', validation: '{"maxLength":100}', options: null, priority: 51, dependsOn: null, showWhen: null },
  { id: 'kyc-field-employer_name', fieldName: 'employer_name', label: 'Employer Name', fieldType: 'text', isRequired: false, isEnabled: true, category: 'employment', validation: '{"maxLength":200}', options: null, priority: 51, dependsOn: null, showWhen: null },
  { id: 'cmhb3xylz0002h107ad5p3zrk', fieldName: 'job_title', label: 'Job Title / Role', fieldType: 'text', isRequired: false, isEnabled: true, category: 'employment', validation: null, options: null, priority: 52, dependsOn: null, showWhen: null },
  { id: 'cmhb3xym00003h1078j3361b2', fieldName: 'industry', label: 'Industry / Sector', fieldType: 'select', isRequired: false, isEnabled: true, category: 'employment', validation: null, options: '["IT","Finance","Construction","Retail","Manufacturing","Public_sector","Healthcare","Education","Other"]', priority: 53, dependsOn: null, showWhen: null },
  { id: 'cmhb3xym30004h107h75u2fr7', fieldName: 'employment_country', label: 'Country of Employment', fieldType: 'select', isRequired: false, isEnabled: true, category: 'employment', validation: null, options: null, priority: 54, dependsOn: null, showWhen: null },
  { id: 'cmhb3xym30005h107l2aikwo1', fieldName: 'employment_years', label: 'Length of Employment (years)', fieldType: 'number', isRequired: false, isEnabled: true, category: 'employment', validation: '{"min":0,"max":60}', options: null, priority: 55, dependsOn: null, showWhen: null },
  { id: 'cmhb3xym50006h1073fgc5tk6', fieldName: 'income_band_monthly', label: 'Monthly Net Income Band', fieldType: 'select', isRequired: false, isEnabled: true, category: 'employment', validation: null, options: '["<€1k","€1–3k","€3–7k",">€7k"]', priority: 56, dependsOn: null, showWhen: null },
  
  // Purpose
  { id: 'kyc-field-purpose_of_account', fieldName: 'purpose_of_account', label: 'Purpose of Account', fieldType: 'textarea', isRequired: false, isEnabled: false, category: 'purpose', validation: '{"minLength":10,"maxLength":500}', options: null, priority: 60, dependsOn: null, showWhen: null },
  { id: 'kyc-field-intended_use', fieldName: 'intended_use', label: 'Intended Use', fieldType: 'textarea', isRequired: false, isEnabled: true, category: 'purpose', validation: '{"maxLength":500}', options: null, priority: 61, dependsOn: null, showWhen: null },
  
  // Funds
  { id: 'cmhb3xym9000fh1075y8z1ppx', fieldName: 'primary_source_of_funds', label: 'Primary Source of Funds', fieldType: 'select', isRequired: true, isEnabled: true, category: 'funds', validation: null, options: '["salary","business","investments","savings","pension","gift_inheritance","benefits","family_support","other"]', priority: 65, dependsOn: null, showWhen: null },
  { id: 'kyc-field-source_of_wealth', fieldName: 'source_of_wealth', label: 'Source of Wealth (for EDD)', fieldType: 'textarea', isRequired: false, isEnabled: false, category: 'funds', validation: '{"maxLength":1000}', options: null, priority: 81, dependsOn: null, showWhen: null },
  
  // Activity
  { id: 'kyc-field-expected_volume', fieldName: 'expected_volume', label: 'Expected Average Transaction Amount (EUR)', fieldType: 'number', isRequired: false, isEnabled: true, category: 'activity', validation: '{"min":0,"max":1000000}', options: null, priority: 70, dependsOn: null, showWhen: null },
  { id: 'kyc-field-expected_frequency', fieldName: 'expected_frequency', label: 'Expected Transaction Frequency', fieldType: 'select', isRequired: false, isEnabled: true, category: 'activity', validation: null, options: '["daily","weekly","monthly","occasionally"]', priority: 71, dependsOn: null, showWhen: null },
  
  // Consents
  { id: 'kyc-field-consent_kyc', fieldName: 'consent_kyc', label: 'I consent to KYC verification', fieldType: 'checkbox', isRequired: false, isEnabled: false, category: 'consents', validation: null, options: null, priority: 90, dependsOn: null, showWhen: null },
  { id: 'kyc-field-consent_aml', fieldName: 'consent_aml', label: 'I consent to AML screening', fieldType: 'checkbox', isRequired: false, isEnabled: false, category: 'consents', validation: null, options: null, priority: 91, dependsOn: null, showWhen: null },
  { id: 'kyc-field-consent_tfr', fieldName: 'consent_tfr', label: 'I consent to TFR reporting', fieldType: 'checkbox', isRequired: false, isEnabled: false, category: 'consents', validation: null, options: null, priority: 92, dependsOn: null, showWhen: null },
  { id: 'kyc-field-consent_privacy', fieldName: 'consent_privacy', label: 'I accept Privacy Policy', fieldType: 'checkbox', isRequired: false, isEnabled: false, category: 'consents', validation: null, options: null, priority: 93, dependsOn: null, showWhen: null },
];

async function main() {
  console.log('🔄 Restoring KYC fields from backup...');
  
  // Delete existing KYC fields
  await prisma.kycFormField.deleteMany({});
  console.log('✅ Cleared existing KYC fields');
  
  // Insert new fields
  for (const field of kycFields) {
    await prisma.kycFormField.create({
      data: {
        id: field.id,
        fieldName: field.fieldName,
        label: field.label,
        fieldType: field.fieldType,
        isRequired: field.isRequired,
        isEnabled: field.isEnabled,
        category: field.category,
        validation: field.validation ? JSON.parse(field.validation) : undefined,
        options: field.options ? JSON.parse(field.options) : undefined,
        priority: field.priority,
        dependsOn: field.dependsOn ?? undefined,
        showWhen: field.showWhen ? JSON.parse(field.showWhen) : undefined,
      },
    });
  }
  
  console.log(`✅ Restored ${kycFields.length} KYC fields`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

