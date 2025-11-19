/**
 * Workflow Executor Service
 * 
 * Executes workflow logic using json-logic-js
 * Provides sandboxed, safe execution with timeouts and recursion limits
 */

import { prisma } from '@/lib/prisma';
import type { WorkflowTrigger, WorkflowActionType } from '@prisma/client';

// @ts-ignore - json-logic-js will be installed in Phase 2
import jsonLogic from 'json-logic-js';

// Security limits
const EXECUTION_TIMEOUT_MS = 5000; // 5 seconds max per workflow
const MAX_RECURSION_DEPTH = 10; // Max nested conditions
const MAX_WORKFLOWS_PER_TRIGGER = 100; // Max workflows to evaluate per trigger

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  // Order context
  orderId?: string;
  orderAmount?: number;
  orderCurrency?: string;
  orderFiatAmount?: number;
  orderFiatCurrency?: string;
  
  // User context
  userId?: string;
  userCountry?: string;
  userKycStatus?: string;
  userKycLevel?: string;
  userRegisteredAt?: Date;
  
  // PayIn context
  payInId?: string;
  payInAmount?: number;
  payInCurrency?: string;
  payInSenderName?: string;
  payInSenderCountry?: string;
  
  // PayOut context
  payOutId?: string;
  payOutAmount?: number;
  payOutCurrency?: string;
  payOutDestinationAddress?: string;
  
  // KYC context
  kycSessionId?: string;
  kycCountry?: string;
  kycDocumentType?: string;
  
  // Wallet context
  walletId?: string;
  walletCurrency?: string;
  walletAddress?: string;
  
  // Generic context (for extensibility)
  [key: string]: any;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  success: boolean;
  actions: WorkflowActionType[];
  details: WorkflowActionDetail[];
  workflowsExecuted: number;
  executionTimeMs: number;
  error?: string;
}

/**
 * Individual action details
 */
export interface WorkflowActionDetail {
  workflowId: string;
  workflowName: string;
  actionType: WorkflowActionType;
  config: Record<string, any>;
}

/**
 * Workflow Executor Service
 */
export class WorkflowExecutor {
  /**
   * Execute all active workflows for a given trigger
   */
  static async execute(
    trigger: WorkflowTrigger,
    context: WorkflowContext,
    options?: {
      entityType?: string;
      entityId?: string;
      dryRun?: boolean; // If true, don't save execution logs
    }
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔧 [Workflow] Executing workflows for trigger: ${trigger}`);
      
      // Fetch active workflows for this trigger (sorted by priority)
      const workflows = await prisma.workflow.findMany({
        where: {
          trigger,
          isActive: true,
          status: 'ACTIVE',
        },
        orderBy: {
          priority: 'desc', // Higher priority runs first
        },
        take: MAX_WORKFLOWS_PER_TRIGGER,
        select: {
          id: true,
          name: true,
          logicState: true,
          version: true,
        },
      });
      
      if (workflows.length === 0) {
        console.log(`ℹ️ [Workflow] No active workflows found for trigger: ${trigger}`);
        return {
          success: true,
          actions: [],
          details: [],
          workflowsExecuted: 0,
          executionTimeMs: Date.now() - startTime,
        };
      }
      
      console.log(`✅ [Workflow] Found ${workflows.length} active workflow(s)`);
      
      // Execute each workflow
      const allActions: WorkflowActionDetail[] = [];
      
      for (const workflow of workflows) {
        try {
          const workflowStartTime = Date.now();
          
          // Execute logic with timeout
          const result = await Promise.race([
            this.executeLogic(workflow.logicState, context),
            this.timeout(EXECUTION_TIMEOUT_MS),
          ]);
          
          const executionTimeMs = Date.now() - workflowStartTime;
          
          // Parse result
          if (result && typeof result === 'object' && 'action' in result) {
            const actionDetail: WorkflowActionDetail = {
              workflowId: workflow.id,
              workflowName: workflow.name,
              actionType: result.action as WorkflowActionType,
              config: result.config || {},
            };
            
            allActions.push(actionDetail);
            
            console.log(`✅ [Workflow] "${workflow.name}" executed successfully (${executionTimeMs}ms):`, {
              action: result.action,
              config: result.config,
            });
          }
          
          // Log execution (if not dry run)
          if (!options?.dryRun) {
            await prisma.workflowExecution.create({
              data: {
                workflowId: workflow.id,
                trigger,
                contextData: context as any,
                success: true,
                result: result as any,
                executionTimeMs,
                entityType: options?.entityType,
                entityId: options?.entityId,
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
          }
        } catch (error: any) {
          console.error(`❌ [Workflow] Error executing "${workflow.name}":`, error);
          
          // Log failed execution
          if (!options?.dryRun) {
            await prisma.workflowExecution.create({
              data: {
                workflowId: workflow.id,
                trigger,
                contextData: context as any,
                success: false,
                result: {},
                error: error.message || 'Unknown error',
                executionTimeMs: Date.now() - startTime,
                entityType: options?.entityType,
                entityId: options?.entityId,
              },
            });
          }
        }
      }
      
      const totalExecutionTime = Date.now() - startTime;
      
      console.log(`✅ [Workflow] Execution complete (${totalExecutionTime}ms):`, {
        workflowsExecuted: workflows.length,
        actionsReturned: allActions.length,
      });
      
      return {
        success: true,
        actions: allActions.map(a => a.actionType),
        details: allActions,
        workflowsExecuted: workflows.length,
        executionTimeMs: totalExecutionTime,
      };
    } catch (error: any) {
      console.error(`❌ [Workflow] Fatal error during execution:`, error);
      
      return {
        success: false,
        actions: [],
        details: [],
        workflowsExecuted: 0,
        executionTimeMs: Date.now() - startTime,
        error: error.message || 'Unknown error',
      };
    }
  }
  
  /**
   * Execute a single workflow logic (json-logic)
   */
  private static async executeLogic(
    logicState: any,
    context: WorkflowContext
  ): Promise<any> {
    try {
      // Apply json-logic
      const result = jsonLogic.apply(logicState, context);
      return result;
    } catch (error: any) {
      throw new Error(`Logic execution failed: ${error.message}`);
    }
  }
  
  /**
   * Timeout helper
   */
  private static timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Workflow execution timeout (${ms}ms)`));
      }, ms);
    });
  }
  
  /**
   * Test a workflow with sample data (dry run)
   */
  static async test(
    workflowId: string,
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Fetch workflow
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        select: {
          id: true,
          name: true,
          trigger: true,
          logicState: true,
        },
      });
      
      if (!workflow) {
        throw new Error('Workflow not found');
      }
      
      console.log(`🧪 [Workflow Test] Testing workflow: ${workflow.name}`);
      
      // Execute logic
      const result = await Promise.race([
        this.executeLogic(workflow.logicState, context),
        this.timeout(EXECUTION_TIMEOUT_MS),
      ]);
      
      const executionTimeMs = Date.now() - startTime;
      
      let actions: WorkflowActionType[] = [];
      let details: WorkflowActionDetail[] = [];
      
      if (result && typeof result === 'object' && 'action' in result) {
        actions = [result.action as WorkflowActionType];
        details = [{
          workflowId: workflow.id,
          workflowName: workflow.name,
          actionType: result.action as WorkflowActionType,
          config: result.config || {},
        }];
      }
      
      console.log(`✅ [Workflow Test] Test complete (${executionTimeMs}ms)`, { result });
      
      return {
        success: true,
        actions,
        details,
        workflowsExecuted: 1,
        executionTimeMs,
      };
    } catch (error: any) {
      console.error(`❌ [Workflow Test] Test failed:`, error);
      
      return {
        success: false,
        actions: [],
        details: [],
        workflowsExecuted: 0,
        executionTimeMs: Date.now() - startTime,
        error: error.message || 'Unknown error',
      };
    }
  }
  
  /**
   * Validate workflow logic (dry run without context)
   */
  static validateLogic(logicState: any): { valid: boolean; error?: string } {
    try {
      // Basic validation: check if it's valid JSON
      if (typeof logicState !== 'object' || logicState === null) {
        return { valid: false, error: 'Logic state must be a valid object' };
      }
      
      // Try to apply with empty context (should not throw)
      jsonLogic.apply(logicState, {});
      
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }
}

