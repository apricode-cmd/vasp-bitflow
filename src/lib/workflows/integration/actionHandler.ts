/**
 * Workflow Action Handler
 * 
 * Executes actions returned by workflows
 */

import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/email/send';
import type { WorkflowActionType } from '@prisma/client';

export interface WorkflowAction {
  action: WorkflowActionType;
  config: Record<string, any>;
}

/**
 * Execute workflow actions
 */
export async function executeActions(
  actions: WorkflowAction[],
  entityType: string,
  entityId: string
): Promise<void> {
  console.log(`[Actions] Executing ${actions.length} action(s) for ${entityType}:${entityId}`);

  for (const action of actions) {
    try {
      await executeAction(action, entityType, entityId);
      console.log(`[Actions] ✅ ${action.action} executed successfully`);
    } catch (error) {
      console.error(`[Actions] ❌ Failed to execute ${action.action}:`, error);
    }
  }
}

/**
 * Execute single action
 */
async function executeAction(
  action: WorkflowAction,
  entityType: string,
  entityId: string
): Promise<void> {
  const { action: actionType, config } = action;

  switch (actionType) {
    case 'FREEZE_ORDER':
      await freezeOrder(entityId, config);
      break;

    case 'REJECT_TRANSACTION':
      await rejectTransaction(entityType, entityId, config);
      break;

    case 'REQUEST_DOCUMENT':
      await requestDocument(entityId, config);
      break;

    case 'REQUIRE_APPROVAL':
      await requireApproval(entityType, entityId, config);
      break;

    case 'SEND_NOTIFICATION':
      await sendNotification(entityId, config);
      break;

    case 'FLAG_FOR_REVIEW':
      await flagForReview(entityType, entityId, config);
      break;

    case 'AUTO_APPROVE':
      await autoApprove(entityType, entityId, config);
      break;

    case 'ESCALATE_TO_COMPLIANCE':
      await escalateToCompliance(entityType, entityId, config);
      break;

    default:
      console.warn(`[Actions] Unknown action type: ${actionType}`);
  }
}

/**
 * Action implementations
 */

async function freezeOrder(orderId: string, config: Record<string, any>): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'FROZEN',
      freezeReason: config.reason || 'Triggered by automated workflow',
    },
  });
}

async function rejectTransaction(
  entityType: string,
  entityId: string,
  config: Record<string, any>
): Promise<void> {
  if (entityType === 'Order') {
    await prisma.order.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        rejectionReason: config.reason || 'Rejected by automated workflow',
      },
    });
  } else if (entityType === 'PayOut') {
    await prisma.payOut.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        rejectionReason: config.reason || 'Rejected by automated workflow',
      },
    });
  }
}

async function requestDocument(userId: string, config: Record<string, any>): Promise<void> {
  // Create document request notification
  await prisma.notification.create({
    data: {
      userId,
      type: 'DOCUMENT_REQUESTED',
      title: 'Document Required',
      message: config.message || `Please upload: ${config.documentType}`,
      data: {
        documentType: config.documentType,
        reason: config.reason,
      },
    },
  });
}

async function requireApproval(
  entityType: string,
  entityId: string,
  config: Record<string, any>
): Promise<void> {
  // Mark entity as requiring approval
  if (entityType === 'Order') {
    await prisma.order.update({
      where: { id: entityId },
      data: {
        requiresApproval: true,
        approvalReason: config.reason || 'Flagged by automated workflow',
        minApprovals: config.minApprovals || 1,
      },
    });
  }
}

async function sendNotification(userId: string, config: Record<string, any>): Promise<void> {
  // Send notification to user or admin
  await prisma.notification.create({
    data: {
      userId,
      type: 'INFO',
      title: config.title || 'System Notification',
      message: config.message || 'An automated workflow has triggered a notification',
      data: config.data || {},
    },
  });

  // Optionally send email
  if (config.sendEmail) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: config.title || 'System Notification',
        text: config.message || '',
      });
    }
  }
}

async function flagForReview(
  entityType: string,
  entityId: string,
  config: Record<string, any>
): Promise<void> {
  // Create admin review task
  await prisma.reviewTask.create({
    data: {
      entityType,
      entityId,
      reason: config.reason || 'Flagged by automated workflow',
      priority: config.priority || 'MEDIUM',
      assignedToRole: 'COMPLIANCE',
      status: 'PENDING',
    },
  });
}

async function autoApprove(
  entityType: string,
  entityId: string,
  config: Record<string, any>
): Promise<void> {
  if (entityType === 'Order') {
    await prisma.order.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approvedBy: 'SYSTEM',
        approvedAt: new Date(),
        approvalNote: config.reason || 'Auto-approved by workflow',
      },
    });
  } else if (entityType === 'KYC') {
    await prisma.kycSession.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approvedBy: 'SYSTEM',
        approvedAt: new Date(),
      },
    });
  }
}

async function escalateToCompliance(
  entityType: string,
  entityId: string,
  config: Record<string, any>
): Promise<void> {
  // Create high-priority compliance review
  await prisma.reviewTask.create({
    data: {
      entityType,
      entityId,
      reason: config.reason || 'Escalated by automated workflow',
      priority: 'HIGH',
      assignedToRole: 'COMPLIANCE',
      status: 'PENDING',
      escalated: true,
    },
  });

  // Notify compliance team
  const complianceAdmins = await prisma.admin.findMany({
    where: { role: 'COMPLIANCE', isActive: true },
    select: { id: true, workEmail: true },
  });

  for (const admin of complianceAdmins) {
    await sendEmail({
      to: admin.workEmail,
      subject: `🚨 Compliance Escalation: ${entityType}`,
      text: `A ${entityType} (ID: ${entityId}) has been escalated for compliance review.\n\nReason: ${config.reason}`,
    });
  }
}

