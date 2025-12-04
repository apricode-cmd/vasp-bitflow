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
    // 1. Get BCB adapter and config
    const bcbAdapter = await integrationFactory.getVirtualIbanProvider();
    
    const integration = await prisma.integration.findUnique({
      where: { service: 'BCB_GROUP' },
    });

    if (!integration?.config) {
      throw new Error('BCB integration not configured');
    }

    const config = integration.config as any;
    const segregatedAccountId = config.segregatedAccountId;

    if (!segregatedAccountId) {
      throw new Error('segregatedAccountId not found in config');
    }

    // 2. Look back 10 minutes (overlap for reliability)
    const dateFrom = new Date(Date.now() - 10 * 60 * 1000);
    const dateFromISO = dateFrom.toISOString();

    console.log(`[Cron] Checking payments since: ${dateFromISO}`);
    console.log(`[Cron] Segregated Account ID: ${segregatedAccountId}`);

    // 3. Get payments from BCB Client API
    const response = await bcbAdapter.clientApiRequest<{
      count: number;
      results: string[]; // Array of transactionIds
    }>(
      'GET',
      `/v1/accounts/${segregatedAccountId}/payments?dateFrom=${dateFromISO}&pageSize=100`
    );

    console.log(`[Cron] Found ${response.count} payments in BCB`);

    if (response.count === 0) {
      console.log('[Cron] ✅ No payments to process');
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

    // 4. Process each payment
    for (const transactionId of response.results) {
      try {
        // 4.1 Check if already in database (idempotency)
        const exists = await prisma.virtualIbanTransaction.findUnique({
          where: { providerTransactionId: transactionId },
        });

        if (exists) {
          skippedCount++;
          continue; // Already processed
        }

        // 4.2 Get payment details from Client API
        const payment = await bcbAdapter.clientApiRequest<BCBPaymentDetails>(
          'GET',
          `/v1/accounts/${segregatedAccountId}/payments/transaction/${transactionId}`
        );

        // 4.3 Only process Settled payments
        if (payment.status !== 'Settled') {
          console.log(`[Cron] Payment ${transactionId} status: ${payment.status}, skipping`);
          continue;
        }

        console.log(`[Cron] 🎯 Missed payment detected: ${transactionId}, amount: ${payment.amount} ${payment.currency}`);
        missedCount++;

        // 4.4 PROBLEM: Client API doesn't return recipient IBAN!
        // Solution: Cross-reference with Services API transactions
        
        const dateFromDate = dateFrom.toISOString().split('T')[0]; // YYYY-MM-DD
        const transactions = await bcbAdapter.request<BCBTransaction[]>(
          'GET',
          `/v3/accounts/${segregatedAccountId}/transactions?limit=100&dateFrom=${dateFromDate}`
        );

        console.log(`[Cron] Cross-referencing with ${transactions.length} transactions from Services API`);

        // 4.5 Find matching transaction by amount and currency
        const matchingTx = transactions.find(
          (tx) => {
            const amountMatch = Math.abs(parseFloat(tx.amount) - parseFloat(payment.amount)) < 0.01;
            const currencyMatch = tx.ticker === payment.currency;
            const isCredit = tx.credit === 1;
            const hasIban = !!tx.iban || !!tx.details?.iban;
            
            return amountMatch && currencyMatch && isCredit && hasIban;
          }
        );

        if (!matchingTx) {
          console.warn(`[Cron] ⚠️  Cannot find matching transaction for ${transactionId}`);
          
          // Log as error in audit
          await virtualIbanAuditService.log({
            type: 'WEBHOOK_MISSED',
            severity: 'ERROR',
            action: 'POLLING_FAILED',
            metadata: {
              transactionId,
              payment,
              reason: 'Cannot determine recipient IBAN via cross-reference',
              timestamp: new Date(),
            },
            reason: 'Polling detected missed payment but cannot determine Virtual IBAN',
          });
          
          errorCount++;
          continue;
        }

        const recipientIban = matchingTx.iban || matchingTx.details?.iban;
        
        if (!recipientIban) {
          console.warn(`[Cron] ⚠️  No IBAN found in matching transaction`);
          errorCount++;
          continue;
        }

        console.log(`[Cron] ✅ Found recipient IBAN: ${recipientIban}`);

        // 4.6 Process as webhook (reuse existing logic)
        const webhookPayload = {
          tx_id: payment.transactionId,
          account_id: parseInt(segregatedAccountId),
          amount: parseFloat(payment.amount),
          currency: payment.currency,
          ticker: payment.currency,
          credit: 1,
          iban: recipientIban,
          details: {
            iban: recipientIban,
            reference: matchingTx.details?.reference || payment.nonce,
            sender_name: matchingTx.details?.sender_name,
            sender_iban: matchingTx.details?.sender_iban,
          },
        };

        const transaction = await virtualIbanService.processIncomingTransaction(webhookPayload);

        console.log(`[Cron] ✅ Transaction processed: ${transaction.id}`);

        // 4.7 Log successful recovery in audit
        await virtualIbanAuditService.logPollingDetected(
          payment.transactionId,
          transaction.virtualIbanId,
          parseFloat(payment.amount)
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
      total: response.count,
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

