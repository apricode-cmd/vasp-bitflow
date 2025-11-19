/**
 * Zod Validation Schemas for Trigger Configuration
 * 
 * Defines filter rules and trigger configuration for workflow triggers
 */

import { z } from 'zod';

// ============================================
// FILTER OPERATORS
// ============================================

export const FilterOperator = z.enum([
  // Comparison
  '==',
  '!=',
  '>',
  '<',
  '>=',
  '<=',
  
  // Array
  'in',
  'not_in',
  
  // String
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'matches', // regex
  
  // Range
  'between',
]);

export type FilterOperator = z.infer<typeof FilterOperator>;

// ============================================
// FILTER RULE
// ============================================

export const FilterRule = z.object({
  field: z.string().min(1, 'Field is required'),
  operator: FilterOperator,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
  logicOperator: z.enum(['AND', 'OR']).optional(), // For chaining multiple filters
});

export type FilterRule = z.infer<typeof FilterRule>;

// ============================================
// TRIGGER CONFIG
// ============================================

export const TriggerConfig = z.object({
  filters: z.array(FilterRule).default([]),
  logic: z.enum(['AND', 'OR']).default('OR'), // How to combine filters
  enabled: z.boolean().default(true),
});

export type TriggerConfig = z.infer<typeof TriggerConfig>;

// ============================================
// FIELD DEFINITIONS PER TRIGGER
// ============================================

// ORDER_CREATED available fields
export const ORDER_CREATED_FIELDS = [
  // Amount
  { value: 'fiatAmount', label: 'Fiat Amount', type: 'number', category: 'Amount' },
  { value: 'cryptoAmount', label: 'Crypto Amount', type: 'number', category: 'Amount' },
  { value: 'totalFiat', label: 'Total Fiat (with fee)', type: 'number', category: 'Amount' },
  { value: 'rate', label: 'Exchange Rate', type: 'number', category: 'Amount' },
  { value: 'feeAmount', label: 'Fee Amount', type: 'number', category: 'Amount' },
  
  // Currency
  { value: 'fiatCurrency', label: 'Fiat Currency', type: 'select', category: 'Currency', options: ['EUR', 'PLN', 'USD', 'GBP'] },
  { value: 'currency', label: 'Crypto Currency', type: 'select', category: 'Currency', options: ['BTC', 'ETH', 'USDT', 'SOL'] },
  
  // Status
  { value: 'status', label: 'Order Status', type: 'select', category: 'Status', options: ['PENDING', 'PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED'] },
  
  // User
  { value: 'user.kycStatus', label: 'User KYC Status', type: 'select', category: 'User', options: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'] },
  { value: 'user.country', label: 'User Country', type: 'string', category: 'User' },
  { value: 'user.email', label: 'User Email', type: 'string', category: 'User' },
  { value: 'user.registeredDays', label: 'Days Since Registration', type: 'number', category: 'User' },
  { value: 'user.totalOrders', label: 'User Total Orders', type: 'number', category: 'User' },
  { value: 'user.totalVolume', label: 'User Total Volume', type: 'number', category: 'User' },
  
  // Payment
  { value: 'paymentMethod', label: 'Payment Method', type: 'select', category: 'Payment', options: ['SEPA', 'SWIFT', 'BANK_TRANSFER'] },
  { value: 'blockchain', label: 'Blockchain', type: 'select', category: 'Payment', options: ['BITCOIN', 'ETHEREUM', 'TRON', 'SOLANA'] },
  
  // Time
  { value: 'createdAt.hour', label: 'Created Hour (0-23)', type: 'number', category: 'Time' },
  { value: 'createdAt.dayOfWeek', label: 'Day of Week', type: 'select', category: 'Time', options: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] },
  
  // Risk Flags (computed)
  { value: 'isFirstOrder', label: 'Is First Order', type: 'boolean', category: 'Risk' },
  { value: 'isHighValue', label: 'Is High Value (>10K)', type: 'boolean', category: 'Risk' },
  { value: 'createdByAdmin', label: 'Created By Admin', type: 'boolean', category: 'Risk' },
] as const;

// KYC_SUBMITTED available fields
export const KYC_SUBMITTED_FIELDS = [
  // User
  { value: 'user.country', label: 'User Country', type: 'string', category: 'User' },
  { value: 'user.email', label: 'User Email', type: 'string', category: 'User' },
  { value: 'user.registeredDays', label: 'Days Since Registration', type: 'number', category: 'User' },
  { value: 'user.hasOrders', label: 'Has Orders', type: 'boolean', category: 'User' },
  { value: 'user.totalOrders', label: 'Total Orders', type: 'number', category: 'User' },
  
  // KYC Data
  { value: 'kycSession.status', label: 'KYC Status', type: 'select', category: 'KYC', options: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'] },
  { value: 'kycSession.attempts', label: 'Attempt Number', type: 'number', category: 'KYC' },
  { value: 'kycSession.rejectionReason', label: 'Previous Rejection Reason', type: 'string', category: 'KYC' },
  
  // Profile Data
  { value: 'profile.country', label: 'Profile Country', type: 'string', category: 'Profile' },
  { value: 'profile.nationality', label: 'Nationality', type: 'string', category: 'Profile' },
  { value: 'profile.placeOfBirth', label: 'Place of Birth', type: 'string', category: 'Profile' },
  { value: 'profile.age', label: 'Age', type: 'number', category: 'Profile' },
  
  // Risk Flags
  { value: 'isResubmission', label: 'Is Resubmission', type: 'boolean', category: 'Risk' },
  { value: 'hasTempEmail', label: 'Has Temp Email', type: 'boolean', category: 'Risk' },
  { value: 'phoneCountryMismatch', label: 'Phone Country Mismatch', type: 'boolean', category: 'Risk' },
] as const;

// PAYIN_RECEIVED available fields
export const PAYIN_RECEIVED_FIELDS = [
  { value: 'amount', label: 'Received Amount', type: 'number', category: 'Amount' },
  { value: 'expectedAmount', label: 'Expected Amount', type: 'number', category: 'Amount' },
  { value: 'amountMismatch', label: 'Amount Mismatch', type: 'number', category: 'Amount' },
  { value: 'status', label: 'PayIn Status', type: 'select', category: 'Status', options: ['PENDING', 'RECEIVED', 'VERIFIED', 'PARTIAL', 'MISMATCH', 'RECONCILED', 'FAILED', 'REFUNDED', 'EXPIRED'] },
  { value: 'matchedToOrder', label: 'Matched to Order', type: 'boolean', category: 'Matching' },
  { value: 'sourceAccount', label: 'Source Account', type: 'string', category: 'Source' },
  { value: 'senderName', label: 'Sender Name', type: 'string', category: 'Source' },
  { value: 'delayHours', label: 'Delay (hours)', type: 'number', category: 'Time' },
  { value: 'receivedAt.hour', label: 'Received Hour (0-23)', type: 'number', category: 'Time' },
] as const;

// PAYOUT_REQUESTED available fields
export const PAYOUT_REQUESTED_FIELDS = [
  { value: 'cryptoAmount', label: 'Crypto Amount', type: 'number', category: 'Amount' },
  { value: 'fiatEquivalent', label: 'Fiat Equivalent', type: 'number', category: 'Amount' },
  { value: 'toAddress', label: 'Destination Address', type: 'string', category: 'Destination' },
  { value: 'isNewAddress', label: 'Is New Address', type: 'boolean', category: 'Destination' },
  { value: 'addressVerified', label: 'Address Verified', type: 'boolean', category: 'Destination' },
  { value: 'user.kycStatus', label: 'User KYC Status', type: 'select', category: 'User', options: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'] },
  { value: 'user.totalPayouts', label: 'Total Payouts', type: 'number', category: 'User' },
  { value: 'user.lastPayoutDays', label: 'Days Since Last Payout', type: 'number', category: 'User' },
  { value: 'isFirstPayout', label: 'Is First Payout', type: 'boolean', category: 'Risk' },
  { value: 'velocityAlert', label: 'Velocity Alert', type: 'boolean', category: 'Risk' },
  { value: 'blockchain', label: 'Blockchain', type: 'select', category: 'Blockchain', options: ['BITCOIN', 'ETHEREUM', 'TRON', 'SOLANA'] },
  { value: 'estimatedFee', label: 'Estimated Network Fee', type: 'number', category: 'Blockchain' },
] as const;

// USER_REGISTERED available fields
export const USER_REGISTERED_FIELDS = [
  { value: 'email', label: 'Email', type: 'string', category: 'User' },
  { value: 'emailDomain', label: 'Email Domain', type: 'string', category: 'User' },
  { value: 'country', label: 'Country', type: 'string', category: 'User' },
  { value: 'phoneCountry', label: 'Phone Country', type: 'string', category: 'User' },
  { value: 'phoneCountryMismatch', label: 'Phone Country Mismatch', type: 'boolean', category: 'Risk' },
  { value: 'registeredAt.hour', label: 'Registered Hour (0-23)', type: 'number', category: 'Time' },
  { value: 'registeredAt.dayOfWeek', label: 'Day of Week', type: 'select', category: 'Time', options: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] },
  { value: 'suspiciousPattern', label: 'Suspicious Pattern Detected', type: 'boolean', category: 'Risk' },
] as const;

// WALLET_ADDED available fields
export const WALLET_ADDED_FIELDS = [
  { value: 'blockchain', label: 'Blockchain', type: 'select', category: 'Wallet', options: ['BITCOIN', 'ETHEREUM', 'TRON', 'SOLANA'] },
  { value: 'currency', label: 'Currency', type: 'select', category: 'Wallet', options: ['BTC', 'ETH', 'USDT', 'SOL'] },
  { value: 'isVerified', label: 'Is Verified', type: 'boolean', category: 'Wallet' },
  { value: 'isDefault', label: 'Is Default', type: 'boolean', category: 'Wallet' },
  { value: 'user.kycStatus', label: 'User KYC Status', type: 'select', category: 'User', options: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'] },
  { value: 'user.walletCount', label: 'User Wallet Count', type: 'number', category: 'User' },
  { value: 'addressRiskScore', label: 'Address Risk Score (0-1)', type: 'number', category: 'Risk' },
  { value: 'isMixerRelated', label: 'Mixer Related', type: 'boolean', category: 'Risk' },
  { value: 'isSanctioned', label: 'Sanctioned Address', type: 'boolean', category: 'Risk' },
] as const;

// AMOUNT_THRESHOLD available fields (special cron-based trigger)
export const AMOUNT_THRESHOLD_FIELDS = [
  { value: 'checkPeriod', label: 'Check Period', type: 'select', category: 'Period', options: ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'] },
  { value: 'timeWindow', label: 'Time Window', type: 'select', category: 'Period', options: ['1H', '6H', '12H', '24H', '7D', '30D'] },
  { value: 'thresholdAmount', label: 'Threshold Amount', type: 'number', category: 'Threshold' },
  { value: 'thresholdCurrency', label: 'Threshold Currency', type: 'select', category: 'Threshold', options: ['EUR', 'USD', 'BTC', 'ETH'] },
  { value: 'aggregationType', label: 'Aggregation Type', type: 'select', category: 'Threshold', options: ['SUM', 'COUNT', 'AVG'] },
  { value: 'scopeType', label: 'Scope', type: 'select', category: 'Scope', options: ['USER', 'COUNTRY', 'GLOBAL'] },
  { value: 'includeStatuses', label: 'Include Statuses', type: 'multiselect', category: 'Scope', options: ['COMPLETED', 'PROCESSING', 'PAYMENT_RECEIVED'] },
] as const;

// ============================================
// FIELD REGISTRY
// ============================================

export const TRIGGER_FIELD_REGISTRY = {
  ORDER_CREATED: ORDER_CREATED_FIELDS,
  KYC_SUBMITTED: KYC_SUBMITTED_FIELDS,
  PAYIN_RECEIVED: PAYIN_RECEIVED_FIELDS,
  PAYOUT_REQUESTED: PAYOUT_REQUESTED_FIELDS,
  USER_REGISTERED: USER_REGISTERED_FIELDS,
  WALLET_ADDED: WALLET_ADDED_FIELDS,
  AMOUNT_THRESHOLD: AMOUNT_THRESHOLD_FIELDS,
} as const;

export type TriggerType = keyof typeof TRIGGER_FIELD_REGISTRY;

// Helper to get fields for a trigger
export function getFieldsForTrigger(trigger: TriggerType) {
  return TRIGGER_FIELD_REGISTRY[trigger] || [];
}

// Helper to validate if a field exists for a trigger
export function isValidField(trigger: TriggerType, field: string): boolean {
  const fields = getFieldsForTrigger(trigger);
  return fields.some((f) => f.value === field);
}

// Helper to get field definition
export function getFieldDefinition(trigger: TriggerType, field: string) {
  const fields = getFieldsForTrigger(trigger);
  return fields.find((f) => f.value === field);
}

