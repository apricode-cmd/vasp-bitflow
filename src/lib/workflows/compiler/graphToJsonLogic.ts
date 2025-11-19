/**
 * Workflow Graph to JSON Logic Compiler
 * 
 * Converts React Flow graph (nodes + edges) into executable json-logic format
 */

import type { Node, Edge } from '@xyflow/react';

/**
 * Compile workflow graph to json-logic
 */
export function compileWorkflow(
  nodes: Node[],
  edges: Edge[]
): any {
  // Find trigger node (entry point)
  const triggerNode = nodes.find(n => n.type === 'trigger');
  
  if (!triggerNode) {
    throw new Error('Workflow must have a trigger node');
  }

  // Traverse from trigger node
  return traverseNode(triggerNode.id, nodes, edges);
}

/**
 * Recursively traverse nodes and build json-logic
 */
function traverseNode(
  nodeId: string,
  nodes: Node[],
  edges: Edge[]
): any {
  const node = nodes.find(n => n.id === nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  // Find outgoing edges
  const outgoingEdges = edges.filter(e => e.source === nodeId);

  // Handle node types
  switch (node.type) {
    case 'trigger':
      // Trigger just passes through to next node
      if (outgoingEdges.length === 0) {
        throw new Error('Trigger node must connect to at least one node');
      }
      return traverseNode(outgoingEdges[0].target, nodes, edges);

    case 'condition':
      // Condition creates an if-then-else structure
      const trueEdge = outgoingEdges.find(e => e.sourceHandle === 'true');
      const falseEdge = outgoingEdges.find(e => e.sourceHandle === 'false');

      if (!trueEdge && !falseEdge) {
        throw new Error('Condition node must have at least one output');
      }

      const condition = buildCondition(node.data);
      const trueBranch = trueEdge ? traverseNode(trueEdge.target, nodes, edges) : null;
      const falseBranch = falseEdge ? traverseNode(falseEdge.target, nodes, edges) : null;

      return {
        if: [
          condition,
          trueBranch,
          falseBranch,
        ],
      };

    case 'action':
      // Action is the end result
      return {
        action: node.data.actionType,
        config: node.data.config || {},
      };

    default:
      throw new Error(`Unknown node type: ${node.type}`);
  }
}

/**
 * Build json-logic condition from condition node data
 */
function buildCondition(data: any): any {
  const { field, operator, value } = data;

  // Map operators to json-logic operators
  const operatorMap: Record<string, string> = {
    '==': '==',
    '!=': '!=',
    '>': '>',
    '<': '<',
    '>=': '>=',
    '<=': '<=',
    'in': 'in',
    'not_in': '!in',
    'contains': 'in',
    'matches': '!!',
  };

  const jsonLogicOp = operatorMap[operator] || '==';

  // Special handling for array operators
  if (operator === 'in' || operator === 'not_in') {
    return {
      [jsonLogicOp]: [
        { var: field },
        value,
      ],
    };
  }

  // Special handling for contains (string.includes)
  if (operator === 'contains') {
    return {
      in: [
        value,
        { var: field },
      ],
    };
  }

  // Special handling for regex matches
  if (operator === 'matches') {
    return {
      '!!': {
        method: [
          { var: field },
          'match',
          value,
        ],
      },
    };
  }

  // Standard comparison operators
  return {
    [jsonLogicOp]: [
      { var: field },
      value,
    ],
  };
}

/**
 * Validate workflow graph before compilation
 */
export function validateWorkflowGraph(
  nodes: Node[],
  edges: Edge[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check 1: Must have at least one trigger node
  const triggerNodes = nodes.filter(n => n.type === 'trigger');
  if (triggerNodes.length === 0) {
    errors.push('Workflow must have at least one trigger node');
  }
  if (triggerNodes.length > 1) {
    errors.push('Workflow can only have one trigger node');
  }

  // Check 2: Must have at least one action node
  const actionNodes = nodes.filter(n => n.type === 'action');
  if (actionNodes.length === 0) {
    errors.push('Workflow must have at least one action node');
  }

  // Check 3: All nodes must be connected (no orphans)
  const connectedNodeIds = new Set<string>();
  edges.forEach(e => {
    connectedNodeIds.add(e.source);
    connectedNodeIds.add(e.target);
  });

  const orphanNodes = nodes.filter(n => !connectedNodeIds.has(n.id) && n.type !== 'trigger');
  if (orphanNodes.length > 0) {
    errors.push(`${orphanNodes.length} orphan node(s) found - all nodes must be connected`);
  }

  // Check 4: No circular dependencies (detect cycles)
  if (hasCycles(nodes, edges)) {
    errors.push('Workflow contains circular dependencies (cycles) - this is not allowed');
  }

  // Check 5: Condition nodes must have at least one output
  const conditionNodes = nodes.filter(n => n.type === 'condition');
  conditionNodes.forEach(node => {
    const outgoing = edges.filter(e => e.source === node.id);
    if (outgoing.length === 0) {
      errors.push(`Condition node "${node.id}" has no outputs`);
    }
  });

  // Check 6: Validate node data
  nodes.forEach(node => {
    if (node.type === 'condition') {
      if (!node.data.field || !node.data.operator || node.data.value === undefined) {
        errors.push(`Condition node "${node.id}" is missing required fields (field, operator, value)`);
      }
    }
    if (node.type === 'action') {
      if (!node.data.actionType) {
        errors.push(`Action node "${node.id}" is missing actionType`);
      }
    }
    if (node.type === 'trigger') {
      if (!node.data.trigger) {
        errors.push(`Trigger node "${node.id}" is missing trigger type`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Detect cycles in graph (DFS-based cycle detection)
 */
function hasCycles(nodes: Node[], edges: Edge[]): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    // Find outgoing edges
    const outgoing = edges.filter(e => e.source === nodeId);
    
    for (const edge of outgoing) {
      const targetId = edge.target;
      
      if (!visited.has(targetId)) {
        if (dfs(targetId)) {
          return true; // Cycle found
        }
      } else if (recursionStack.has(targetId)) {
        return true; // Back edge found (cycle)
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Start DFS from trigger nodes
  const triggerNodes = nodes.filter(n => n.type === 'trigger');
  for (const trigger of triggerNodes) {
    if (dfs(trigger.id)) {
      return true;
    }
  }

  return false;
}

