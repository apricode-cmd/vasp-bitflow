/**
 * Conditional Field Logic
 * 
 * Determines which fields should be visible based on form data
 * Phase 1: Hardcoded logic (quick fix)
 * Phase 2: Will be moved to database configuration
 */

import { KycField } from './config';

/**
 * Determine if a field should be shown based on current form data
 */
export function shouldShowField(
  field: KycField,
  formData: Record<string, any>
): boolean {
  const fieldName = field.fieldName;

  // ============================================
  // PEP (Politically Exposed Person) Fields
  // ============================================
  
  const pepFields = [
    'pep_role_title',
    'pep_institution',
    'pep_country',
    'pep_since',
    'pep_until',
    'relationship_to_pep',
    'pep_additional_info',
    'pep_evidence_file'
  ];

  if (pepFields.includes(fieldName)) {
    const pepStatus = formData['pep_status'];
    
    // Hide ALL PEP subfields if status is NO or not selected
    if (!pepStatus || pepStatus === 'NO') {
      return false;
    }

    // Hide 'Until' field for CURRENT statuses (only for FORMER)
    if (fieldName === 'pep_until' && pepStatus.includes('CURRENT')) {
      return false;
    }

    // Hide 'Relationship' field for SELF statuses (only for FAMILY/ASSOCIATE)
    if (fieldName === 'relationship_to_pep' && pepStatus.startsWith('SELF_')) {
      return false;
    }

    return true; // Show other PEP fields
  }

  // ============================================
  // Employment Fields
  // ============================================
  
  const employmentStatus = formData['employment_status'];

  // Fields for EMPLOYED (Full-time or Part-time)
  const employedFields = [
    'employer_name',
    'job_title',
    'industry',
    'employment_country',
    'employment_years',
    'income_band_monthly'
  ];

  if (employedFields.includes(fieldName)) {
    return employmentStatus === 'EMPLOYED_FT' || employmentStatus === 'EMPLOYED_PT';
  }

  // Fields for SELF_EMPLOYED
  const selfEmployedFields = [
    'biz_name',
    'biz_activity',
    'biz_country',
    'biz_years',
    'revenue_band_annual',
    'tax_or_reg_number'
  ];

  if (selfEmployedFields.includes(fieldName)) {
    return employmentStatus === 'SELF_EMPLOYED';
  }

  // Fields for STUDENT
  const studentFields = [
    'institution_name',
    'student_funding_source'
  ];

  if (studentFields.includes(fieldName)) {
    return employmentStatus === 'STUDENT';
  }

  // Field for OTHER employment status
  if (fieldName === 'other_employment_note') {
    return employmentStatus === 'OTHER';
  }

  // ============================================
  // Purpose Fields
  // ============================================
  
  const purpose = formData['purpose'];

  // Purpose note required for certain purposes
  if (fieldName === 'purpose_note') {
    return purpose === 'other' || purpose === 'business_payments';
  }

  // ============================================
  // Default: Show field
  // ============================================
  
  return true;
}

/**
 * Check if a conditionally shown field is required
 */
export function isFieldConditionallyRequired(
  field: KycField,
  formData: Record<string, any>
): boolean {
  if (!shouldShowField(field, formData)) {
    return false; // Hidden fields are never required
  }

  const fieldName = field.fieldName;
  const pepStatus = formData['pep_status'];
  const employmentStatus = formData['employment_status'];

  // PEP fields are required when shown
  const pepFields = ['pep_role_title', 'pep_institution', 'pep_country', 'pep_since'];
  if (pepFields.includes(fieldName) && pepStatus && pepStatus !== 'NO') {
    return true;
  }

  // pep_until required for FORMER
  if (fieldName === 'pep_until' && pepStatus && pepStatus.includes('FORMER')) {
    return true;
  }

  // relationship_to_pep required for FAMILY/ASSOCIATE
  if (fieldName === 'relationship_to_pep' && pepStatus && 
      (pepStatus.includes('FAMILY') || pepStatus.includes('ASSOCIATE'))) {
    return true;
  }

  // Employment fields required when shown
  const employedFields = ['employer_name', 'job_title', 'industry', 'employment_country', 
                          'employment_years', 'income_band_monthly'];
  if (employedFields.includes(fieldName) && 
      (employmentStatus === 'EMPLOYED_FT' || employmentStatus === 'EMPLOYED_PT')) {
    return true;
  }

  // Self-employed fields required (except tax number)
  const selfEmployedFields = ['biz_name', 'biz_activity', 'biz_country', 'biz_years', 'revenue_band_annual'];
  if (selfEmployedFields.includes(fieldName) && employmentStatus === 'SELF_EMPLOYED') {
    return true;
  }

  // Student fields required
  const studentFields = ['institution_name', 'student_funding_source'];
  if (studentFields.includes(fieldName) && employmentStatus === 'STUDENT') {
    return true;
  }

  // Other employment note required
  if (fieldName === 'other_employment_note' && employmentStatus === 'OTHER') {
    return true;
  }

  // Default to field's isRequired property
  return field.isRequired;
}

