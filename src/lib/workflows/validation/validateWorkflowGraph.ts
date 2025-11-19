/**
 * Workflow Graph Validation Utilities
 * 
 * Frontend validation helpers for React Flow graph
 */

import type { Node, Edge } from '@xyflow/react';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate workflow graph for frontend (real-time validation)
 */
export function validateGraph(
  nodes: Node[],
  edges: Edge[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Must have nodes
  if (nodes.length === 0) {
    errors.push('Workflow is empty - add at least one node');
    return { valid: false, errors, warnings };
  }

  // Must have trigger
  const triggerNodes = nodes.filter(n => n.type === 'trigger');
  if (triggerNodes.length === 0) {
    errors.push('Add a Trigger node to start your workflow');
  } else if (triggerNodes.length > 1) {
    errors.push('Only one Trigger node is allowed per workflow');
  }

  // Must have action
  const actionNodes = nodes.filter(n => n.type === 'action');
  if (actionNodes.length === 0) {
    warnings.push('Add at least one Action node to define what happens');
  }

  // Check orphan nodes
  if (edges.length === 0 && nodes.length > 1) {
    warnings.push('Connect your nodes together');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate before save
 */
export function validateBeforeSave(
  nodes: Node[],
  edges: Edge[]
): ValidationResult {
  const result = validateGraph(nodes, edges);
  
  // Additional strict checks for save
  if (nodes.length === 0) {
    result.errors.push('Cannot save empty workflow');
  }
  
  if (edges.length === 0 && nodes.length > 1) {
    result.errors.push('All nodes must be connected');
    result.valid = false;
  }

  return result;
}

