/**
 * Workflow Trigger Integration
 * 
 * Helper to execute workflows when events occur in the system
 */

import { prisma } from '@/lib/db/prisma';
import { WorkflowExecutor } from '@/lib/services/workflow-executor.service';
import type { WorkflowTrigger } from '@prisma/client';

/**
 * Trigger workflows for a specific event
 * 
 * @param trigger - The event type (ORDER_CREATED, PAYIN_RECEIVED, etc.)
 * @param context - The data context for the event (order, payIn, kyc, etc.)
 * @returns Array of actions to execute
 */
export async function triggerWorkflows(
  trigger: WorkflowTrigger,
  context: Record<string, any>
): Promise<Array<{ action: string; config: Record<string, any> }>> {
  const startTime = Date.now();

  try {
    // Find all active workflows for this trigger
    const workflows = await prisma.workflow.findMany({
      where: {
        trigger,
        isActive: true,
        status: 'ACTIVE',
      },
      orderBy: {
        priority: 'desc', // Higher priority runs first
      },
    });

    if (workflows.length === 0) {
      console.log(`[Workflow] No active workflows found for trigger: ${trigger}`);
      return [];
    }

    console.log(`[Workflow] Found ${workflows.length} workflow(s) for trigger: ${trigger}`);

    // Execute workflows in order of priority
    const allActions: Array<{ action: string; config: Record<string, any> }> = [];

    for (const workflow of workflows) {
      try {
        console.log(`[Workflow] Executing workflow: ${workflow.name} (ID: ${workflow.id})`);

        // Execute workflow
        const result = await WorkflowExecutor.executeWorkflow(
          workflow.logicState as any,
          context
        );

        const executionTime = Date.now() - startTime;

        // Log execution
        await prisma.workflowExecution.create({
          data: {
            workflowId: workflow.id,
            trigger,
            contextData: context,
            success: true,
            result,
            executionTimeMs: executionTime,
            entityType: getEntityType(trigger),
            entityId: getEntityId(context, trigger),
          },
        });

        // Update workflow stats
        await prisma.workflow.update({
          where: { id: workflow.id },
          data: {
            executionCount: { increment: 1 },
            lastExecutedAt: new Date(),
          },
        });

        // Collect actions
        if (result.actions && Array.isArray(result.actions)) {
          allActions.push(...result.actions);
        } else if (result.action) {
          allActions.push({
            action: result.action,
            config: result.config || {},
          });
        }

        console.log(`[Workflow] ✅ ${workflow.name} completed in ${executionTime}ms`);
      } catch (error) {
        console.error(`[Workflow] ❌ Error executing ${workflow.name}:`, error);

        // Log failed execution
        await prisma.workflowExecution.create({
          data: {
            workflowId: workflow.id,
            trigger,
            contextData: context,
            success: false,
            result: {},
            error: error instanceof Error ? error.message : 'Unknown error',
            executionTimeMs: Date.now() - startTime,
            entityType: getEntityType(trigger),
            entityId: getEntityId(context, trigger),
          },
        });
      }
    }

    return allActions;
  } catch (error) {
    console.error(`[Workflow] Failed to trigger workflows for ${trigger}:`, error);
    return [];
  }
}

/**
 * Helper: Get entity type from trigger
 */
function getEntityType(trigger: WorkflowTrigger): string {
  const map: Record<WorkflowTrigger, string> = {
    ORDER_CREATED: 'Order',
    PAYIN_RECEIVED: 'PayIn',
    PAYOUT_REQUESTED: 'PayOut',
    KYC_SUBMITTED: 'KYC',
    USER_REGISTERED: 'User',
    WALLET_ADDED: 'Wallet',
    AMOUNT_THRESHOLD: 'Order',
  };
  return map[trigger] || 'Unknown';
}

/**
 * Helper: Extract entity ID from context
 */
function getEntityId(context: Record<string, any>, trigger: WorkflowTrigger): string | null {
  switch (trigger) {
    case 'ORDER_CREATED':
    case 'AMOUNT_THRESHOLD':
      return context.orderId || context.id || null;
    case 'PAYIN_RECEIVED':
      return context.payInId || context.id || null;
    case 'PAYOUT_REQUESTED':
      return context.payOutId || context.id || null;
    case 'KYC_SUBMITTED':
      return context.kycSessionId || context.id || null;
    case 'USER_REGISTERED':
      return context.userId || context.id || null;
    case 'WALLET_ADDED':
      return context.walletId || context.id || null;
    default:
      return null;
  }
}

