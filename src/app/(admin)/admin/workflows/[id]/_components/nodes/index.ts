/**
 * Workflow Node Types Export
 * 
 * All custom nodes for React Flow
 */

import TriggerNode from './TriggerNode';
import ConditionNode from './ConditionNode';
import ActionNode from './ActionNode';

export const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

export { TriggerNode, ConditionNode, ActionNode };

export type { TriggerNodeData } from './TriggerNode';
export type { ConditionNodeData } from './ConditionNode';
export type { ActionNodeData } from './ActionNode';

