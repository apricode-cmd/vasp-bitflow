/**
 * KYC Form Configuration
 * Shared between client form (/kyc) and admin panel (/admin/kyc-fields)
 * 
 * Single source of truth for:
 * - Categories (with names, icons, descriptions)
 * - Steps (multi-step wizard configuration)
 * - Helper functions
 */

export interface KycCategory {
  code: string;
  name: string;
  description?: string;
  icon: string; // Lucide icon name
  priority: number;
}

export interface KycStep {
  id: number;
  title: string;
  description?: string;
  categories: string[];
}

export interface KycField {
  id: string;
  fieldName: string;
  label: string;
  fieldType: string;
  category: string;
  isRequired: boolean;
  isEnabled: boolean;
  priority: number;
  validation?: any;
  options?: any;
}

// =====================================
// CATEGORIES - Single Source of Truth
// =====================================

export const KYC_CATEGORIES: Record<string, KycCategory> = {
  personal: {
    code: 'personal',
    name: 'Personal Identification',
    description: 'Basic personal information',
    icon: 'User',
    priority: 1
  },
  contact: {
    code: 'contact',
    name: 'Contact Information',
    description: 'Email and phone',
    icon: 'Mail',
    priority: 2
  },
  address: {
    code: 'address',
    name: 'Residential Address',
    description: 'Current address',
    icon: 'MapPin',
    priority: 3
  },
  documents: {
    code: 'documents',
    name: 'Identity Documents',
    description: 'ID verification',
    icon: 'FileText',
    priority: 4
  },
  pep_sanctions: {
    code: 'pep_sanctions',
    name: 'PEP & Sanctions',
    description: 'Political exposure and sanctions screening',
    icon: 'ShieldCheck',
    priority: 5
  },
  employment: {
    code: 'employment',
    name: 'Employment',
    description: 'Current occupation',
    icon: 'Briefcase',
    priority: 6
  },
  purpose: {
    code: 'purpose',
    name: 'Purpose of Account',
    description: 'Why you need the account',
    icon: 'Target',
    priority: 7
  },
  activity: {
    code: 'activity',
    name: 'Expected Activity',
    description: 'Transaction volume and frequency',
    icon: 'Activity',
    priority: 8
  },
  funds: {
    code: 'funds',
    name: 'Source of Funds',
    description: 'Origin of your funds',
    icon: 'DollarSign',
    priority: 9
  },
  consents: {
    code: 'consents',
    name: 'Consents & Compliance',
    description: 'Legal consents',
    icon: 'CheckSquare',
    priority: 10
  }
};

// =====================================
// STEPS - Single Source of Truth
// =====================================

export const KYC_STEPS: KycStep[] = [
  {
    id: 1,
    title: 'Personal Info',
    description: 'Your basic personal details',
    categories: ['personal']
  },
  {
    id: 2,
    title: 'Contact & Address',
    description: 'How to reach you',
    categories: ['contact', 'address']
  },
  {
    id: 3,
    title: 'Compliance Profile',
    description: 'Identity verification and compliance',
    categories: ['documents', 'employment', 'pep_sanctions']
  },
  {
    id: 4,
    title: 'Purpose & Funds',
    description: 'Account purpose and source of funds',
    categories: ['purpose', 'activity', 'funds']
  }
];

// =====================================
// HELPER FUNCTIONS
// =====================================

/**
 * Get category name by code
 */
export function getCategoryName(code: string): string {
  return KYC_CATEGORIES[code]?.name || code;
}

/**
 * Get category icon by code
 */
export function getCategoryIcon(code: string): string {
  return KYC_CATEGORIES[code]?.icon || 'FileText';
}

/**
 * Get category description by code
 */
export function getCategoryDescription(code: string): string | undefined {
  return KYC_CATEGORIES[code]?.description;
}

/**
 * Get all category codes
 */
export function getAllCategories(): string[] {
  return Object.keys(KYC_CATEGORIES);
}

/**
 * Get only steps that have enabled fields
 * This hides empty steps from the user
 */
export function getStepsWithFields(fields: KycField[]): KycStep[] {
  return KYC_STEPS.filter(step => {
    // Check if step has at least one enabled field
    const hasEnabledFields = step.categories.some(category => 
      fields.some(field => field.category === category && field.isEnabled)
    );
    return hasEnabledFields;
  });
}

/**
 * Get fields for specific step
 */
export function getFieldsForStep(step: KycStep, fields: KycField[]): KycField[] {
  return fields
    .filter(f => step.categories.includes(f.category) && f.isEnabled)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get step by ID
 */
export function getStepById(stepId: number): KycStep | undefined {
  return KYC_STEPS.find(s => s.id === stepId);
}

/**
 * Check if category exists
 */
export function isCategoryValid(code: string): boolean {
  return code in KYC_CATEGORIES;
}

