/**
 * Workflow Validation Schemas
 * 
 * Zod schemas for workflow engine validation
 */

import { z } from 'zod';

// Workflow Trigger enum
export const WorkflowTriggerSchema = z.enum([
  'ORDER_CREATED',
  'PAYIN_RECEIVED',
  'PAYOUT_REQUESTED',
  'KYC_SUBMITTED',
  'USER_REGISTERED',
  'WALLET_ADDED',
  'AMOUNT_THRESHOLD',
]);

// Workflow Status enum
export const WorkflowStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'ARCHIVED',
]);

// Workflow Action Type enum
export const WorkflowActionTypeSchema = z.enum([
  'FREEZE_ORDER',
  'REJECT_TRANSACTION',
  'REQUEST_DOCUMENT',
  'REQUIRE_APPROVAL',
  'SEND_NOTIFICATION',
  'FLAG_FOR_REVIEW',
  'AUTO_APPROVE',
  'ESCALATE_TO_COMPLIANCE',
]);

// Node types for React Flow
export const NodeTypeSchema = z.enum(['trigger', 'condition', 'action']);

// Operator for conditions
export const OperatorSchema = z.enum([
  '==',
  '!=',
  '>',
  '<',
  '>=',
  '<=',
  'in',
  'not_in',
  'contains',
  'matches',
]);

// Trigger Node Data
export const TriggerNodeDataSchema = z.object({
  trigger: WorkflowTriggerSchema,
  config: z.record(z.any()).optional(),
});

// Condition Node Data
export const ConditionNodeDataSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  operator: OperatorSchema,
  value: z.any(),
  label: z.string().optional(),
});

// Action Node Data
export const ActionNodeDataSchema = z.object({
  actionType: WorkflowActionTypeSchema,
  config: z.object({
    reason: z.string().optional(),
    documentType: z.string().optional(),
    message: z.string().optional(),
    recipientRole: z.string().optional(),
    template: z.string().optional(),
    approverRole: z.string().optional(),
    minApprovals: z.number().int().positive().optional(),
  }).passthrough(), // Allow additional fields
});

// React Flow Node
export const NodeSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.union([
    TriggerNodeDataSchema,
    ConditionNodeDataSchema,
    ActionNodeDataSchema,
  ]),
});

// React Flow Edge
export const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  type: z.string().optional(),
  animated: z.boolean().optional(),
  label: z.string().optional(),
  style: z.record(z.any()).optional(),
  markerEnd: z.record(z.any()).optional(),
});

// Visual State (React Flow graph)
export const VisualStateSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

// json-logic format (simplified validation)
export const JsonLogicSchema = z.record(z.any());

// Create Workflow
export const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  trigger: WorkflowTriggerSchema,
  triggerConfig: z.record(z.any()).optional(),
  visualState: VisualStateSchema,
  logicState: JsonLogicSchema.optional(), // Will be auto-compiled from visualState
  priority: z.number().int().min(0).max(100).optional().default(0),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

// Update Workflow
export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  visualState: VisualStateSchema.optional(),
  logicState: JsonLogicSchema.optional(),
  status: WorkflowStatusSchema.optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
});

export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;

// Test Workflow
export const testWorkflowSchema = z.object({
  contextData: z.record(z.any()),
});

export type TestWorkflowInput = z.infer<typeof testWorkflowSchema>;

// Workflow List Filters
export const workflowFiltersSchema = z.object({
  trigger: WorkflowTriggerSchema.optional(),
  status: WorkflowStatusSchema.optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'priority', 'executionCount']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type WorkflowFiltersInput = z.infer<typeof workflowFiltersSchema>;

// Execute Workflow
export const executeWorkflowSchema = z.object({
  trigger: WorkflowTriggerSchema,
  contextData: z.record(z.any()),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export type ExecuteWorkflowInput = z.infer<typeof executeWorkflowSchema>;

