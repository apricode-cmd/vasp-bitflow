/**
 * BCB Group Virtual IBAN Webhook
 * 
 * POST /api/webhooks/bcb/virtual-iban - Receive payment notifications from BCB Group
 * 
 * This webhook receives real-time payment notifications when:
 * - Incoming payment (credit) is received
 * - Payment status changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';
import { virtualIbanReconciliationService } from '@/lib/services/virtual-iban-reconciliation.service';
import { topUpRequestService } from '@/lib/services/topup-request.service';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { virtualIbanAuditService } from '@/lib/services/virtual-iban-audit.service';

export async function POST(req: NextRequest) {
  console.log('[BCB Webhook] Received payment notification');

  try {
    // Parse webhook payload
    const payload = await req.json();
    
    console.log('[BCB Webhook] Payload:', JSON.stringify(payload, null, 2));

    // Verify webhook signature (if provider supports it)
    const signature = req.headers.get('x-bcb-signature') || '';
    
    if (signature) {
      try {
        const provider = await integrationFactory.getVirtualIbanProvider();
        
        if (provider.verifyWebhookSignature) {
          const rawBody = JSON.stringify(payload);
          const isValid = provider.verifyWebhookSignature(rawBody, signature);
          
          if (!isValid) {
            console.error('[BCB Webhook] Invalid signature');
            return NextResponse.json(
              { error: 'Invalid webhook signature' },
              { status: 401 }
            );
          }
        }
      } catch (error) {
        console.warn('[BCB Webhook] Signature verification skipped:', error);
        // Continue without signature verification for development
      }
    }

    // Process transaction
    const transaction = await virtualIbanService.processIncomingTransaction(payload);

    console.log('[BCB Webhook] Transaction processed:', {
      id: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      reference: transaction.reference,
      vopStatus: transaction.vopStatus,
    });
    
    // Log audit
    await virtualIbanAuditService.logWebhookProcessed(
      transaction.providerTransactionId,
      transaction.virtualIbanId,
      transaction.amount,
      true
    ).catch(err => console.error('[Audit] Failed to log webhook:', err));

    // =========================================
    // STEP 0: Check for VOP (Verification of Payee)
    // =========================================
    // For EUR SEPA payments, BCB may hold payment for VOP review
    if (transaction.status === 'VOP_HELD' || transaction.vopStatus) {
      console.log('[BCB Webhook] ⚠️  VOP held for review:', {
        vopStatus: transaction.vopStatus,
        vopMatchedName: transaction.vopMatchedName,
      });

      // VOP statuses: MATCH (auto-approved), CLOSE_MATCH, NO_MATCH, IMPOSSIBLE_MATCH (require admin review)
      if (transaction.vopStatus === 'MATCH') {
        // Auto-approve exact matches
        console.log('[BCB Webhook] ✅ VOP MATCH - auto-approved');
        // Transaction will proceed to matching below
      } else {
        // Requires admin review (CLOSE_MATCH, NO_MATCH, IMPOSSIBLE_MATCH)
        console.log('[BCB Webhook] 🔍 VOP requires admin review - pausing processing');
        
        return NextResponse.json({
          success: true,
          transactionId: transaction.id,
          vopStatus: transaction.vopStatus,
          vopMatchedName: transaction.vopMatchedName,
          requiresReview: true,
          message: 'Transaction held for VOP review',
        });
      }
    }

    // =========================================
    // STEP 1: Try to match TopUp Request first
    // =========================================
    try {
      const matchedRequest = await topUpRequestService.matchPaymentToRequest(
        transaction.virtualIbanId,
        transaction.reference,
        transaction.amount
      );

      if (matchedRequest) {
        console.log('[BCB Webhook] 🎯 Matched TopUp request:', {
          requestId: matchedRequest.id,
          reference: matchedRequest.reference,
        });

        // Complete the top-up request
        const completed = await topUpRequestService.completeRequest(
          matchedRequest.id,
          transaction.id
        );

        console.log('[BCB Webhook] ✅ TopUp completed:', {
          requestId: completed.topUpRequest.id,
          newBalance: completed.newBalance,
        });

        return NextResponse.json({
          success: true,
          transactionId: transaction.id,
          matchType: 'topup_request',
          topUpRequestId: matchedRequest.id,
          topUpReference: matchedRequest.reference,
          newBalance: completed.newBalance,
          message: 'TopUp request completed successfully',
        });
      }
    } catch (topUpError) {
      console.warn('[BCB Webhook] TopUp matching failed:', topUpError);
      // Continue to order reconciliation
    }

    // =========================================
    // STEP 2: Try to match Order (crypto purchase)
    // =========================================
    try {
      const reconciliation = await virtualIbanReconciliationService.reconcileTransaction(
        transaction.id
      );

      if (reconciliation.order) {
        console.log('[BCB Webhook] ✅ Auto-reconciled with Order:', {
          orderId: reconciliation.order.id,
          method: reconciliation.method,
        });

        return NextResponse.json({
          success: true,
          transactionId: transaction.id,
          matchType: 'order',
          reconciled: true,
          orderId: reconciliation.order.id,
          method: reconciliation.method,
          message: 'Webhook processed and auto-reconciled',
        });
      } else {
        console.log('[BCB Webhook] ⚠️  No match - manual reconciliation needed');

        return NextResponse.json({
          success: true,
          transactionId: transaction.id,
          matchType: 'none',
          reconciled: false,
          message: 'Transaction saved - manual reconciliation required',
        });
      }
    } catch (reconError) {
      console.error('[BCB Webhook] Reconciliation failed:', reconError);

      // Still return success (transaction is saved)
      return NextResponse.json({
        success: true,
        transactionId: transaction.id,
        matchType: 'none',
        reconciled: false,
        error: reconError instanceof Error ? reconError.message : 'Reconciliation error',
        message: 'Transaction saved - reconciliation failed',
      });
    }
  } catch (error) {
    console.error('[BCB Webhook] Processing failed:', error);
    
    // Return 200 even on error to avoid BCB retries
    // But log the error for manual investigation
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 200 });
  }
}

// Support GET for webhook verification (some providers send GET first)
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'BCB Virtual IBAN webhook endpoint',
  });
}

