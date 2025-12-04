/**
 * Virtual IBAN Balance Validation Cron Job
 * 
 * Validates that Σ(local balances) === BCB segregated balance
 * Runs every hour
 * Creates snapshots for audit trail
 * Sends CRITICAL alerts if mismatch detected
 */

import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { virtualIbanAuditService } from '@/lib/services/virtual-iban-audit.service';
import { virtualIbanAlertService } from '@/lib/services/virtual-iban-alert.service';
import { prisma } from '@/lib/prisma';

export async function validateVirtualIbanBalance() {
  console.log('[Cron] 🔍 Validating Virtual IBAN balance...');

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

    console.log(`[Cron] Segregated Account ID: ${segregatedAccountId}`);

    // 2. Get BCB total balance (segregated account)
    const bcbBalances = await bcbAdapter.request<any[]>(
      'GET',
      `/v3/balances/${segregatedAccountId}`
    );

    const bcbTotal = bcbBalances[0]?.balance || 0;
    const bcbCurrency = bcbBalances[0]?.ticker || 'EUR';
    const bcbIban = bcbBalances[0]?.iban || 'N/A';

    console.log(`[Cron] BCB Total Balance: €${bcbTotal.toFixed(2)}`);
    console.log(`[Cron] BCB IBAN: ${bcbIban}`);

    // 3. Sum all local balances (active Virtual IBANs)
    const localSum = await prisma.virtualIbanAccount.aggregate({
      where: {
        status: 'ACTIVE',
        // Only for this segregated account
        metadata: {
          path: ['segregatedAccountId'],
          equals: segregatedAccountId,
        },
      },
      _sum: { balance: true },
      _count: true,
    });

    const localTotal = localSum._sum.balance || 0;
    const activeAccounts = localSum._count;

    console.log(`[Cron] Local Total Balance: €${localTotal.toFixed(2)}`);
    console.log(`[Cron] Active Accounts: ${activeAccounts}`);

    // 4. Get breakdown for audit
    const accounts = await prisma.virtualIbanAccount.findMany({
      where: {
        status: 'ACTIVE',
        metadata: {
          path: ['segregatedAccountId'],
          equals: segregatedAccountId,
        },
      },
      select: {
        id: true,
        iban: true,
        balance: true,
        currency: true,
        userId: true,
        user: {
          select: {
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const accountBreakdown = accounts.map((acc) => ({
      accountId: acc.id,
      iban: acc.iban,
      balance: acc.balance,
      currency: acc.currency,
      userId: acc.userId,
      userEmail: acc.user.email,
      userName: acc.user.profile
        ? `${acc.user.profile.firstName} ${acc.user.profile.lastName}`
        : 'N/A',
    }));

    console.log('\n📋 Account Breakdown:');
    accountBreakdown.forEach((acc, index) => {
      console.log(`  ${index + 1}. ${acc.iban}: €${acc.balance.toFixed(2)} (${acc.userEmail})`);
    });

    // 5. Compare with tolerance (1 cent for float precision)
    const diff = Math.abs(bcbTotal - localTotal);
    const tolerance = 0.01;
    const isValid = diff <= tolerance;

    console.log(`\n💰 Comparison:`);
    console.log(`  BCB Total:   €${bcbTotal.toFixed(2)}`);
    console.log(`  Local Total: €${localTotal.toFixed(2)}`);
    console.log(`  Difference:  €${diff.toFixed(2)}`);
    console.log(`  Status:      ${isValid ? '✅ VALID' : '❌ MISMATCH'}`);

    // 6. Create balance snapshot (for audit trail)
    const snapshot = await prisma.virtualIbanBalanceSnapshot.create({
      data: {
        segregatedAccountId,
        bcbTotalBalance: bcbTotal,
        bcbBalanceSnapshot: bcbBalances,
        localTotalBalance: localTotal,
        activeAccountsCount: activeAccounts,
        accountBreakdown,
        isValid,
        difference: diff,
        reconciliationNeeded: !isValid,
      },
    });

    console.log(`\n📸 Snapshot created: ${snapshot.id}`);

    // 7. If mismatch, create CRITICAL alert
    if (!isValid) {
      console.error('\n🚨 BALANCE MISMATCH DETECTED!');
      console.error(`BCB: €${bcbTotal}, Local: €${localTotal}, Diff: €${diff}`);

      // Log critical audit
      await virtualIbanAuditService.logBalanceMismatch(
        segregatedAccountId,
        bcbTotal,
        localTotal,
        accountBreakdown
      );

      // Send emergency alert to admins
      await virtualIbanAlertService.alertBalanceMismatch({
        segregatedAccountId,
        bcbBalance: bcbTotal,
        localBalance: localTotal,
        difference: bcbTotal - localTotal,
      });

      console.error('⚠️  ALERT: Manual reconciliation required!');
      console.error('Account breakdown:', accountBreakdown);

      return {
        success: true,
        isValid: false,
        bcbTotal,
        localTotal,
        difference: diff,
        activeAccounts,
        snapshotId: snapshot.id,
        alert: 'CRITICAL - Balance mismatch detected',
      };
    }

    console.log('\n✅ Balance validated successfully - all good!');

    return {
      success: true,
      isValid: true,
      bcbTotal,
      localTotal,
      difference: diff,
      activeAccounts,
      snapshotId: snapshot.id,
    };

  } catch (error) {
    console.error('[Cron] ❌ Balance validation failed:', error);

    // Send alert for cron failure
    await virtualIbanAlertService.alertReconciliationFailed({
      segregatedAccountId: 'unknown',
      reason: 'Balance validation cron failed',
      error: error instanceof Error ? error.message : String(error),
    });

    // Log critical error
    await virtualIbanAuditService.log({
      type: 'BALANCE_SYNC',
      severity: 'CRITICAL',
      action: 'VALIDATION_CRON_FAILED',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date(),
      },
      reason: 'Balance validation cron failed',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// For testing
if (require.main === module) {
  validateVirtualIbanBalance()
    .then((result) => {
      console.log('\n📊 Final Result:', JSON.stringify(result, null, 2));
      process.exit(result.success && result.isValid !== false ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

