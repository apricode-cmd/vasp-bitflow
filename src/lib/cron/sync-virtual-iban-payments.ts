/**
 * Virtual IBAN Payments Sync Cron Job
 * 
 * Polling fallback to catch missed webhooks
 * Runs every 5 minutes, checks last 10 minutes (overlap for reliability)
 */

import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';
import { virtualIbanAuditService } from '@/lib/services/virtual-iban-audit.service';
import { prisma } from '@/lib/prisma';

interface BCBPaymentDetails {
  transactionId: string;
  endToEndId: string;
  nonce: string;
  status: 'Received' | 'Initiated' | 'Cancelled' | 'Pending' | 'Processing' | 'Rejected' | 'Settled';
  currency: string;
  amount: string;
  rejectReason?: string;
}

interface BCBTransaction {
  tx_id: string;
  account_id: number;
  amount: string;
  ticker: string;
  credit: number;
  iban?: string;
  details?: {
    iban?: string;
    sender_name?: string;
    sender_iban?: string;
    reference?: string;
  };
}

export async function syncVirtualIbanPayments() {
  console.log('[Cron] 🔄 Syncing Virtual IBAN payments...');

  try {
    // 1. Get BCB adapter (already initialized with segregatedAccountId)
    const bcbAdapter = await integrationFactory.getVirtualIbanProvider();
    
    if (!bcbAdapter) {
      throw new Error('BCB provider not available');
    }

    // Get segregatedAccountId from adapter (fetched during initialization)
    const segregatedAccountId = (bcbAdapter as any).segregatedAccountId;

    if (!segregatedAccountId) {
      throw new Error('segregatedAccountId not found - BCB adapter not properly initialized');
    }

    // 2. Look back 30 DAYS for testing to find ANY payments (normally 10 minutes for cron)
    const daysBack = 30; // TODO: Change to 10 minutes for production cron
    const dateFrom = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const dateFromISO = dateFrom.toISOString();

    console.log(`[Cron] Checking payments since: ${dateFromISO} (${daysBack} days ago)`);
    console.log(`[Cron] Segregated Account ID: ${segregatedAccountId}`);

    // 3. IMPORTANT: Use Services API /v3/transactions NOT Client API /v1/payments
    // Payments API = outgoing only, Transactions API = all (incoming + outgoing)
    console.log('[Cron] Fetching transactions from Services API...');
    
    const dateFromDate = dateFrom.toISOString().split('T')[0]; // YYYY-MM-DD
    const transactionsResponse = await (bcbAdapter as any).request(
      'GET',
      `/v3/accounts/${segregatedAccountId}/transactions?dateFrom=${dateFromDate}&limit=100`
    );

    console.log('[Cron] RAW BCB TRANSACTIONS API RESPONSE:');
    console.log(JSON.stringify(transactionsResponse, null, 2));
    console.log(`[Cron] Response type: ${typeof transactionsResponse}`);
    console.log(`[Cron] Found ${transactionsResponse?.length || 0} transactions`);
    
    // Filter only CREDIT transactions (incoming payments)
    const creditTransactions = (transactionsResponse || []).filter((tx: any) => tx.credit === 1);
    console.log(`[Cron] Found ${creditTransactions.length} credit (incoming) transactions`);

    if (creditTransactions.length === 0) {
      console.log('[Cron] ✅ No incoming payments to process');
      return {
        success: true,
        total: 0,
        processed: 0,
        skipped: 0,
        missed: 0,
        errors: 0,
      };
    }

    let processedCount = 0;
    let skippedCount = 0;
    let missedCount = 0;
    let errorCount = 0;

    // 4. Process each credit transaction
    for (const transaction of creditTransactions) {
      const transactionId = transaction.tx_id;
      try {
        // 4.1 Check if already in database (idempotency)
        const exists = await prisma.virtualIbanTransaction.findUnique({
          where: { providerTransactionId: transactionId },
        });

        if (exists) {
          skippedCount++;
          console.log(`[Cron] Transaction ${transactionId} already processed, skipping`);
          continue; // Already processed
        }

        // 4.2 Extract recipient IBAN from transaction
        // For Virtual IBAN incoming payments, the recipient IBAN is in details.virtual.iban
        // transaction.iban contains the SENDER's IBAN
        const recipientIban = transaction.details?.virtual?.iban || transaction.details?.iban || transaction.iban;
        
        if (!recipientIban) {
          console.warn(`[Cron] ⚠️  No IBAN found in transaction ${transactionId}`);
          console.log('[Cron] Transaction details:', JSON.stringify(transaction, null, 2));
          errorCount++;
          continue;
        }

        console.log(`[Cron] 🎯 New incoming payment detected!`);
        console.log(`[Cron]   Transaction ID: ${transactionId}`);
        console.log(`[Cron]   Amount: ${transaction.amount} ${transaction.ticker}`);
        console.log(`[Cron]   Recipient IBAN: ${recipientIban}`);
        console.log(`[Cron]   Reference: ${transaction.details?.reference || 'N/A'}`);
        console.log(`[Cron]   Sender: ${transaction.details?.account_name || 'N/A'}`);
        
        missedCount++;

        // 4.3 Process as webhook (reuse existing logic)
        const webhookPayload = {
          tx_id: transaction.tx_id,
          account_id: transaction.account_id,
          amount: parseFloat(transaction.amount),
          currency: transaction.ticker,
          ticker: transaction.ticker,
          credit: 1,
          iban: recipientIban,
          details: {
            iban: recipientIban,
            reference: transaction.details?.reference,
            sender_name: transaction.details?.account_name,
            sender_iban: transaction.details?.iban,
            sort_code: transaction.details?.sort_code,
            account_number: transaction.details?.account_number,
          },
        };

        const processedTx = await virtualIbanService.processIncomingTransaction(webhookPayload);

        console.log(`[Cron] ✅ Transaction processed: ${processedTx.id}`);

        // 4.4 Try to auto-reconcile with TopUp Request
        try {
          const { topUpRequestService } = await import('../services/topup-request.service');
          
          const matchedRequest = await topUpRequestService.matchPaymentToRequest(
            processedTx.virtualIbanId,
            transaction.details?.reference,
            parseFloat(transaction.amount)
          );

          if (matchedRequest) {
            console.log('[Cron] 🎯 Matched TopUp request:', {
              requestId: matchedRequest.id,
              reference: matchedRequest.reference,
            });

            await topUpRequestService.completeRequest(
              matchedRequest.id,
              processedTx.id
            );

            console.log('[Cron] ✅ TopUp auto-reconciled');
          } else {
            console.log('[Cron] No TopUp match found - transaction will be unreconciled');
          }
        } catch (topUpError) {
          console.warn('[Cron] TopUp matching failed:', topUpError);
          // Continue - transaction will remain unreconciled
        }

        // 4.5 Log successful recovery in audit
        await virtualIbanAuditService.logPollingDetected(
          transaction.tx_id,
          processedTx.virtualIbanId,
          parseFloat(transaction.amount)
        );

        processedCount++;

      } catch (txError) {
        console.error(`[Cron] ❌ Error processing transaction ${transactionId}:`, txError);
        errorCount++;
        
        // Log error in audit
        await virtualIbanAuditService.log({
          type: 'WEBHOOK_MISSED',
          severity: 'ERROR',
          action: 'POLLING_ERROR',
          metadata: {
            transactionId,
            error: txError instanceof Error ? txError.message : String(txError),
            timestamp: new Date(),
          },
          reason: 'Failed to process missed payment',
        });
      }
    }

    const result = {
      success: true,
      total: creditTransactions.length,
      processed: processedCount,
      skipped: skippedCount,
      missed: missedCount,
      errors: errorCount,
    };

    console.log(`[Cron] ✅ Sync completed:`, result);

    // If we found missed payments, log as WARNING
    if (missedCount > 0) {
      await virtualIbanAuditService.log({
        type: 'POLLING_DETECTED',
        severity: 'WARNING',
        action: 'MISSED_WEBHOOKS_RECOVERED',
        metadata: {
          ...result,
          timestamp: new Date(),
        },
        reason: `Recovered ${missedCount} missed webhook(s) via polling`,
      });
    }

    return result;

  } catch (error) {
    console.error('[Cron] ❌ Sync failed:', error);

    // Log critical error
    await virtualIbanAuditService.log({
      type: 'POLLING_DETECTED',
      severity: 'CRITICAL',
      action: 'CRON_FAILED',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date(),
      },
      reason: 'Polling cron job failed',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// For testing
if (require.main === module) {
  syncVirtualIbanPayments()
    .then((result) => {
      console.log('\n📊 Final Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

