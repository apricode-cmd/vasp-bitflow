/**
 * Workflow Node Types Export
 * 
 * All custom nodes for React Flow
 */

import TriggerNode from './TriggerNode';
import ConditionNode from './ConditionNode';
import ActionNode from './ActionNode';
import HttpRequestNode from './HttpRequestNode';

export const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  httpRequest: HttpRequestNode,
};

export { TriggerNode, ConditionNode, ActionNode, HttpRequestNode };

export type { TriggerNodeData } from './TriggerNode';
export type { ConditionNodeData } from './ConditionNode';
export type { ActionNodeData } from './ActionNode';
export type { HttpRequestNodeData } from './HttpRequestNode';

