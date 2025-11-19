/**
 * Workflow Actions Configuration Schemas
 * 
 * Enterprise-grade validation for all action types
 */

import { z } from 'zod';

// ==================== REJECT_TRANSACTION ====================
export const RejectTransactionConfig = z.object({
  // Rejection Details
  rejectionType: z.enum(['HARD', 'SOFT']).default('HARD'),
  reasonCategory: z.enum([
    'AML_SANCTIONS',
    'HIGH_RISK_COUNTRY',
    'VELOCITY_LIMIT',
    'INSUFFICIENT_KYC',
    'MANUAL_REVIEW_FAILED',
    'FRAUD_SUSPECTED',
    'OTHER',
  ]),
  customReason: z.string().optional(),
  riskScore: z.number().min(0).max(100).optional(),
  
  // Customer Communication
  notifyCustomer: z.boolean().default(true),
  messageTemplate: z.string().optional(),
  includeNextSteps: z.boolean().default(true),
  supportContact: z.string().optional(),
  
  // Refund & Accounting
  processRefund: z.boolean().default(false),
  refundMethod: z.enum(['SAME', 'ALTERNATIVE', 'MANUAL']).default('SAME'),
  refundTiming: z.enum(['IMMEDIATE', '24H', '48H', '72H']).default('24H'),
  
  // Blacklist
  addToBlacklist: z.boolean().default(false),
  blacklistDuration: z.enum(['PERMANENT', 'TEMPORARY']).default('TEMPORARY'),
  blacklistDays: z.number().min(1).max(365).optional(),
});

export type RejectTransactionConfig = z.infer<typeof RejectTransactionConfig>;

// ==================== FREEZE_ORDER ====================
export const FreezeOrderConfig = z.object({
  // Freeze Configuration
  immediateFreeze: z.boolean().default(true),
  freezeDuration: z.enum(['INDEFINITE', '24H', '48H', '7D', '30D', 'CUSTOM']).default('24H'),
  customDurationHours: z.number().min(1).max(720).optional(), // Max 30 days
  
  reason: z.string().min(1, 'Reason is required'),
  reasonCategory: z.enum([
    'SUSPICIOUS_ACTIVITY',
    'AML_ALERT',
    'MANUAL_REVIEW',
    'FRAUD_INVESTIGATION',
    'COMPLIANCE_CHECK',
    'OTHER',
  ]),
  
  // Notifications
  notifyCustomer: z.boolean().default(true),
  notificationTemplate: z.string().optional(),
  
  // Auto-Unfreeze Conditions
  autoUnfreezeEnabled: z.boolean().default(false),
  autoUnfreezeConditions: z.object({
    approvedByRole: z.enum(['ADMIN', 'COMPLIANCE', 'SUPER_ADMIN']).optional(),
    documentsVerified: z.boolean().default(false),
    riskScoreBelow: z.number().min(0).max(100).optional(),
    timeElapsed: z.boolean().default(false),
  }).optional(),
  
  // Approval
  requireApprovalToUnfreeze: z.boolean().default(true),
  approverRole: z.enum(['ADMIN', 'COMPLIANCE', 'SUPER_ADMIN']).default('COMPLIANCE'),
});

export type FreezeOrderConfig = z.infer<typeof FreezeOrderConfig>;

// ==================== REQUEST_DOCUMENT ====================
export const RequestDocumentConfig = z.object({
  // Document Request
  documentTypes: z.array(z.enum([
    'PROOF_OF_ADDRESS',
    'BANK_STATEMENT',
    'SOURCE_OF_FUNDS',
    'TAX_RETURN',
    'UTILITY_BILL',
    'PAYSLIP',
    'PHOTO_ID',
    'SELFIE',
    'OTHER',
  ])).min(1, 'At least one document type is required'),
  
  dueDate: z.enum(['3D', '7D', '14D', '30D', 'CUSTOM']).default('7D'),
  customDueDays: z.number().min(1).max(90).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  allowPartialUpload: z.boolean().default(false),
  
  // Customer Message
  template: z.string().optional(),
  customMessage: z.string().optional(),
  language: z.enum(['AUTO', 'EN', 'PL', 'RU', 'ES', 'FR', 'DE']).default('AUTO'),
  includeUploadLink: z.boolean().default(true),
  
  // Acceptance Criteria
  requiredQuality: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  minFileSizeKB: z.number().min(10).max(1024).default(100),
  maxFileSizeMB: z.number().min(1).max(50).default(10),
  acceptedFormats: z.array(z.enum(['PDF', 'JPG', 'JPEG', 'PNG', 'HEIC'])).default(['PDF', 'JPG', 'PNG']),
  autoVerify: z.boolean().default(false),
  
  // Follow-up
  reminderAfterDays: z.number().min(1).max(30).default(3),
  autoRejectIfNotSubmitted: z.boolean().default(false),
  escalateAfterDays: z.number().min(1).max(90).default(7),
});

export type RequestDocumentConfig = z.infer<typeof RequestDocumentConfig>;

// ==================== REQUIRE_APPROVAL ====================
export const RequireApprovalConfig = z.object({
  // Approval Configuration
  approvalType: z.enum(['SEQUENTIAL', 'PARALLEL', 'QUORUM']).default('SEQUENTIAL'),
  
  requiredApprovers: z.array(z.object({
    role: z.enum(['ADMIN', 'COMPLIANCE', 'SUPER_ADMIN']),
    minApprovals: z.number().min(1).default(1),
    specificUserId: z.string().optional(),
  })).min(1, 'At least one approver is required'),
  
  timeout: z.number().min(1).max(168).default(24), // Hours, max 1 week
  autoApproveOnTimeout: z.boolean().default(false),
  
  // Approval Context
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  includeOrderDetails: z.boolean().default(true),
  includeUserProfile: z.boolean().default(true),
  includeRiskAssessment: z.boolean().default(true),
  includeTransactionHistory: z.boolean().default(false),
  
  // Actions on Response
  onApprove: z.enum(['CONTINUE', 'COMPLETE', 'CUSTOM']).default('CONTINUE'),
  onReject: z.enum(['CANCEL', 'FREEZE', 'ESCALATE', 'CUSTOM']).default('CANCEL'),
  onTimeout: z.enum(['ESCALATE', 'CANCEL', 'AUTO_APPROVE', 'CUSTOM']).default('ESCALATE'),
  notifyRequester: z.boolean().default(true),
});

export type RequireApprovalConfig = z.infer<typeof RequireApprovalConfig>;

// ==================== SEND_NOTIFICATION ====================
export const SendNotificationConfig = z.object({
  // Recipients
  recipients: z.array(z.object({
    type: z.enum(['ROLE', 'USER', 'EMAIL']),
    value: z.string(),
    cc: z.boolean().default(false),
  })).min(1, 'At least one recipient is required'),
  
  dynamicRecipients: z.array(z.string()).optional(), // Expression strings
  
  // Channels
  channels: z.array(z.enum(['EMAIL', 'IN_APP', 'SMS', 'SLACK', 'TELEGRAM'])).min(1),
  
  // Message Content
  template: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  
  // Action Button
  actionButton: z.string().optional(),
  actionButtonLink: z.string().optional(),
  
  // Delivery Options
  sendImmediately: z.boolean().default(true),
  delayMinutes: z.number().min(0).max(1440).default(0), // Max 24h
  retryOnFailure: z.number().min(0).max(5).default(3),
  trackReadStatus: z.boolean().default(true),
});

export type SendNotificationConfig = z.infer<typeof SendNotificationConfig>;

// ==================== FLAG_FOR_REVIEW ====================
export const FlagForReviewConfig = z.object({
  // Flag Configuration
  flagType: z.enum([
    'MANUAL_REVIEW',
    'AML_INVESTIGATION',
    'FRAUD_CHECK',
    'DOCUMENT_VERIFICATION',
    'RISK_ASSESSMENT',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  reason: z.string().min(1, 'Reason is required'),
  evidence: z.array(z.string()).optional(), // URLs or file paths
  
  // Assignment
  assignmentType: z.enum(['AUTO', 'ROLE', 'USER', 'ROUND_ROBIN']).default('AUTO'),
  assignRole: z.enum(['ADMIN', 'COMPLIANCE', 'SUPER_ADMIN']).optional(),
  assignUserId: z.string().optional(),
  slaHours: z.number().min(1).max(168).default(24), // Max 1 week
  escalateAfterHours: z.number().min(1).max(336).default(48), // Max 2 weeks
  
  // Review Context
  includeInReviewQueue: z.boolean().default(true),
  blockTransaction: z.boolean().default(false),
  notifyCustomer: z.boolean().default(false),
  showRelatedFlags: z.boolean().default(true),
});

export type FlagForReviewConfig = z.infer<typeof FlagForReviewConfig>;

// ==================== AUTO_APPROVE ====================
export const AutoApproveConfig = z.object({
  // Approval Configuration
  approvalReason: z.string().default('Auto-approved based on conditions'),
  conditionsSummary: z.string().optional(), // Display only
  riskScore: z.number().min(0).max(100).optional(),
  bypassManualReview: z.boolean().default(true),
  
  // Logging & Audit
  logApproval: z.boolean().default(true),
  reasonCategory: z.enum([
    'LOW_RISK_SCORE',
    'TRUSTED_CUSTOMER',
    'SMALL_AMOUNT',
    'WHITELISTED',
    'VERIFIED_USER',
  ]).default('LOW_RISK_SCORE'),
  note: z.string().optional(),
  
  // Post-Approval Actions
  notifyCustomer: z.boolean().default(true),
  sendReceipt: z.boolean().default(true),
  updateUserTier: z.boolean().default(false),
  addToFastTrack: z.boolean().default(false),
});

export type AutoApproveConfig = z.infer<typeof AutoApproveConfig>;

// ==================== ESCALATE_TO_COMPLIANCE ====================
export const EscalateToComplianceConfig = z.object({
  // Escalation Details
  escalationType: z.enum([
    'AML_ALERT',
    'SANCTIONS_HIT',
    'HIGH_RISK_TRANSACTION',
    'FRAUD_SUSPECTED',
    'KYC_ISSUE',
    'REGULATORY_REPORTING',
    'OTHER',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('HIGH'),
  urgency: z.enum(['LOW', 'NORMAL', 'HIGH', 'IMMEDIATE']).default('HIGH'),
  reason: z.string().min(1, 'Reason is required'),
  evidence: z.array(z.string()).optional(), // URLs or file paths
  
  // Compliance Assignment
  primaryContact: z.enum(['AUTO', 'SELECT']).default('AUTO'),
  primaryContactUserId: z.string().optional(),
  backupContactUserId: z.string().optional(),
  slaHours: z.number().min(1).max(48).default(4), // Max 48h for compliance
  autoEscalateToMLRO: z.boolean().default(false),
  escalateToMLROAfterHours: z.number().min(1).max(168).default(8),
  
  // Customer Impact
  blockAllTransactions: z.boolean().default(true),
  freezeAccount: z.boolean().default(false),
  notifyCustomer: z.boolean().default(false),
  
  // External Reporting
  externalReportingRequired: z.boolean().default(false),
  externalReportingTypes: z.array(z.enum([
    'FINCEN_SAR',
    'FIU_STR',
    'SANCTIONS_REPORT',
    'OTHER',
  ])).optional(),
  
  // Case Management
  createCase: z.boolean().default(true),
  caseType: z.enum(['INVESTIGATION', 'REVIEW', 'INCIDENT', 'REPORT']).default('INVESTIGATION'),
  relatedCaseIds: z.array(z.string()).optional(),
  trackTime: z.boolean().default(true),
});

export type EscalateToComplianceConfig = z.infer<typeof EscalateToComplianceConfig>;

// ==================== UNIFIED ACTION CONFIG SCHEMA ====================
export const WorkflowActionConfigSchema = z.union([
  RejectTransactionConfig,
  FreezeOrderConfig,
  RequestDocumentConfig,
  RequireApprovalConfig,
  SendNotificationConfig,
  FlagForReviewConfig,
  AutoApproveConfig,
  EscalateToComplianceConfig,
]);

export type WorkflowActionConfig = z.infer<typeof WorkflowActionConfigSchema>;

