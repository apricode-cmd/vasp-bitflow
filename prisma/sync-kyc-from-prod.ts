/**
 * Sync KYC Fields from Production
 */

import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

// Production KYC fields data
const prodKycFields: Prisma.KycFormFieldCreateInput[] = [
  { id: 'cmh82azw2001434whdqfd3ak0', fieldName: 'first_name', label: 'First Name', fieldType: 'text', isRequired: true, isEnabled: true, category: 'personal', validation: {"minLength":2,"maxLength":50}, options: Prisma.JsonNull, priority: 1, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'cmh82azw4001534wh6s3wmekm', fieldName: 'last_name', label: 'Last Name', fieldType: 'text', isRequired: true, isEnabled: true, category: 'personal', validation: {"minLength":2,"maxLength":50}, options: Prisma.JsonNull, priority: 2, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'cmh82azw4001634wh9i6khno3', fieldName: 'date_of_birth', label: 'Date of Birth', fieldType: 'date', isRequired: true, isEnabled: true, category: 'personal', validation: {"minAge":18,"maxAge":120}, options: Prisma.JsonNull, priority: 3, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'kyc-field-place_of_birth', fieldName: 'place_of_birth', label: 'Place of Birth', fieldType: 'text', isRequired: false, isEnabled: true, category: 'personal', validation: {"maxLength":100}, options: Prisma.JsonNull, priority: 4, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'cmh82azw5001734whf8kelm9r', fieldName: 'nationality', label: 'Nationality', fieldType: 'select', isRequired: true, isEnabled: true, category: 'personal', validation: Prisma.JsonNull, options: ["PL","DE","FR","IT","ES","GB","US","UA","Other"], priority: 5, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'kyc-field-email', fieldName: 'email', label: 'Email Address', fieldType: 'email', isRequired: true, isEnabled: true, category: 'contact', validation: {"pattern":"^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"}, options: Prisma.JsonNull, priority: 10, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'kyc-field-phone', fieldName: 'phone', label: 'Phone Number', fieldType: 'phone', isRequired: true, isEnabled: true, category: 'contact', validation: {"minLength":8,"maxLength":20}, options: Prisma.JsonNull, priority: 11, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'kyc-field-address_street', fieldName: 'address_street', label: 'Street Address', fieldType: 'text', isRequired: true, isEnabled: true, category: 'address', validation: {"minLength":5,"maxLength":200}, options: Prisma.JsonNull, priority: 20, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'kyc-field-address_city', fieldName: 'address_city', label: 'City', fieldType: 'text', isRequired: true, isEnabled: true, category: 'address', validation: {"minLength":2,"maxLength":100}, options: Prisma.JsonNull, priority: 21, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'kyc-field-address_region', fieldName: 'address_region', label: 'Region/State', fieldType: 'text', isRequired: false, isEnabled: true, category: 'address', validation: {"maxLength":100}, options: Prisma.JsonNull, priority: 22, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'kyc-field-address_country', fieldName: 'address_country', label: 'Country', fieldType: 'select', isRequired: true, isEnabled: true, category: 'address', validation: Prisma.JsonNull, options: ["PL","DE","FR","IT","ES","GB","US","UA","Other"], priority: 23, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'kyc-field-address_postal', fieldName: 'address_postal', label: 'Postal Code', fieldType: 'text', isRequired: true, isEnabled: true, category: 'address', validation: {"minLength":3,"maxLength":20}, options: Prisma.JsonNull, priority: 24, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'kyc-field-proof_of_address_type', fieldName: 'proof_of_address_type', label: 'Proof of Address Type', fieldType: 'select', isRequired: false, isEnabled: true, category: 'address', validation: Prisma.JsonNull, options: ["utility_bill", "bank_statement", "tax_statement", "rental_agreement", "other"], priority: 25, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'kyc-field-proof_of_address', fieldName: 'proof_of_address', label: 'Proof of Address', fieldType: 'file', isRequired: true, isEnabled: true, category: 'address', validation: {"maxSize": 10485760, "acceptedFormats": ["image/jpeg", "image/png", "application/pdf"]}, options: Prisma.JsonNull, priority: 26, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'kyc-field-id_type', fieldName: 'id_type', label: 'ID Document Type', fieldType: 'select', isRequired: true, isEnabled: true, category: 'documents', validation: Prisma.JsonNull, options: ["passport", "id_card", "drivers_license"], priority: 30, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'cmh82azw9001d34whiixlwlma', fieldName: 'passport_number', label: 'Passport Number', fieldType: 'text', isRequired: false, isEnabled: false, category: 'documents', validation: {"maxLength": 20, "minLength": 5}, options: Prisma.JsonNull, priority: 28, dependsOn: 'id_type', showWhen: {"value": "passport", "operator": "=="} },
  { id: 'kyc-field-passport_scan', fieldName: 'passport_scan', label: 'Passport Scan', fieldType: 'file', isRequired: false, isEnabled: true, category: 'documents', validation: {"maxSize": 10485760, "acceptedFormats": ["image/jpeg", "image/png", "application/pdf"]}, options: Prisma.JsonNull, priority: 29, dependsOn: 'id_type', showWhen: {"value": "passport", "operator": "=="} },
  { id: 'cmh82azw9001e34whl9f6ecqh', fieldName: 'id_number', label: 'ID Number', fieldType: 'text', isRequired: true, isEnabled: false, category: 'documents', validation: {"minLength":5,"maxLength":50}, options: Prisma.JsonNull, priority: 31, dependsOn: 'id_type', showWhen: {"value": ["id_card", "drivers_license"], "operator": "in"} },
  { id: 'kyc-field-id_scan_front', fieldName: 'id_scan_front', label: 'ID Front Scan', fieldType: 'file', isRequired: true, isEnabled: true, category: 'documents', validation: {"acceptedFormats":["image/jpeg","image/png","application/pdf"],"maxSize":10485760}, options: Prisma.JsonNull, priority: 36, dependsOn: 'id_type', showWhen: {"value": ["id_card", "drivers_license"], "operator": "in"} },
  { id: 'kyc-field-id_scan_back', fieldName: 'id_scan_back', label: 'ID Back Scan', fieldType: 'file', isRequired: true, isEnabled: true, category: 'documents', validation: {"acceptedFormats":["image/jpeg","image/png","application/pdf"],"maxSize":10485760}, options: Prisma.JsonNull, priority: 37, dependsOn: 'id_type', showWhen: {"value": ["id_card", "drivers_license"], "operator": "in"} },
  { id: 'kyc-field-intended_use', fieldName: 'intended_use', label: 'Intended Use', fieldType: 'textarea', isRequired: false, isEnabled: true, category: 'purpose', validation: {"maxLength":500}, options: Prisma.JsonNull, priority: 61, dependsOn: null, showWhen: Prisma.JsonNull },
  { id: 'b7070798-be59-4b7b-a099-38c1fe1cde15', fieldName: 'gender', label: 'Gender', fieldType: 'select', isRequired: false, isEnabled: true, category: 'personal', validation: {"options": [{"label": "Male", "value": "M"}, {"label": "Female", "value": "F"}, {"label": "Other", "value": "O"}]}, options: Prisma.JsonNull, priority: 85, dependsOn: null, showWhen: Prisma.JsonNull },
];

async function main() {
  console.log('🔄 Syncing KYC fields from production...');
  
  // Clear existing fields
  await prisma.kycFormField.deleteMany({});
  console.log('✅ Cleared existing KYC fields');
  
  // Insert production fields
  for (const field of prodKycFields) {
    try {
      await prisma.kycFormField.create({ data: field });
      console.log(`✅ Created: ${field.fieldName}`);
    } catch (e) {
      console.error(`❌ Failed to create ${field.fieldName}:`, e);
    }
  }
  
  console.log(`\n✅ Done! Synced ${prodKycFields.length} KYC fields from production`);
}

main().finally(() => prisma.$disconnect());

