# 🚀 Virtual IBAN - Enterprise Implementation Plan

## 📊 Текущий статус

### ✅ Что уже работает (MVP):
1. **Virtual IBAN Creation** - создание счетов через BCB Client API
2. **Webhook Processing** - real-time обработка входящих платежей
3. **Balance Management** - локальное отслеживание балансов
4. **Top-Up Requests** - система запросов на пополнение с инвойсами
5. **Order Integration** - покупка крипты через Virtual IBAN Balance
6. **Transaction History** - история операций
7. **VOP Handling** - обработка Verification of Payee

### ❌ Что нужно для Enterprise:
1. Fallback механизм (Polling)
2. Balance Validation (сверка с BCB)
3. Comprehensive Audit Logging
4. Monitoring & Alerting
5. Automated Reconciliation
6. Multi-provider Support (готовность к масштабированию)
7. Performance Optimization (Redis caching, indexes)
8. Security Enhancements
9. Admin Tools для reconciliation

---

## 🎯 Phase 1: Critical Infrastructure (Week 1-2)

### 1.1 Database Schema Extensions
**Priority:** 🔴 CRITICAL  
**Effort:** 2 days

**Tasks:**
- [ ] Создать `VirtualIbanAuditLog` модель
- [ ] Создать `VirtualIbanReconciliationReport` модель  
- [ ] Создать `VirtualIbanBalanceSnapshot` модель (для daily snapshots)
- [ ] Добавить indexes для performance

```typescript
// prisma/schema.prisma

model VirtualIbanAuditLog {
  id        String   @id @default(cuid())
  
  // Context
  accountId String?  // VirtualIbanAccount ID (optional)
  userId    String?  // User ID (optional)
  adminId   String?  // Admin ID who performed action (optional)
  
  // Event details
  type      VirtualIbanAuditType
  severity  AuditSeverity
  action    String   // e.g., "BALANCE_SYNC", "WEBHOOK_PROCESSED", "MANUAL_ADJUSTMENT"
  
  // Data
  oldValue  Json?    // Previous state
  newValue  Json?    // New state
  metadata  Json?    // Additional context
  
  // Reconciliation
  diff      Float?   // For balance mismatches
  reason    String?  // Human-readable reason
  
  createdAt DateTime @default(now())
  
  // Relations
  account   VirtualIbanAccount? @relation(fields: [accountId], references: [id])
  user      User?               @relation(fields: [userId], references: [id])
  admin     Admin?              @relation(fields: [adminId], references: [id])
  
  @@index([accountId])
  @@index([type])
  @@index([createdAt])
  @@index([severity])
}

enum VirtualIbanAuditType {
  ACCOUNT_CREATED
  ACCOUNT_CLOSED
  BALANCE_CREDIT
  BALANCE_DEBIT
  BALANCE_SYNC
  BALANCE_MISMATCH
  WEBHOOK_RECEIVED
  WEBHOOK_MISSED
  POLLING_DETECTED
  MANUAL_ADJUSTMENT
  RECONCILIATION
  VOP_REVIEW
}

enum AuditSeverity {
  INFO
  WARNING
  ERROR
  CRITICAL
}

model VirtualIbanBalanceSnapshot {
  id                    String   @id @default(cuid())
  
  // Snapshot time
  snapshotDate          DateTime @default(now())
  
  // BCB data
  segregatedAccountId   String
  bcbTotalBalance       Float
  bcbBalanceSnapshot    Json     // Full BCB response
  
  // Our data
  localTotalBalance     Float
  activeAccountsCount   Int
  accountBreakdown      Json     // Array of {accountId, iban, balance, userId}
  
  // Validation
  isValid               Boolean  // bcbTotal === localTotal (with tolerance)
  difference            Float?   // Absolute difference
  
  // Reconciliation
  reconciliationNeeded  Boolean  @default(false)
  reconciledAt          DateTime?
  reconciledBy          String?
  reconciledByAdmin     Admin?   @relation(fields: [reconciledBy], references: [id])
  
  createdAt             DateTime @default(now())
  
  @@index([snapshotDate])
  @@index([segregatedAccountId])
  @@index([reconciliationNeeded])
}

model VirtualIbanReconciliationReport {
  id        String   @id @default(cuid())
  
  // Period
  startDate DateTime
  endDate   DateTime
  
  // Summary
  totalTransactions        Int
  totalCredits             Float
  totalDebits              Float
  netChange                Float
  
  // Balance check
  startingBalance          Float
  endingBalance            Float
  calculatedEndingBalance  Float // starting + netChange
  bcbEndingBalance         Float
  
  // Validation
  isBalanced               Boolean
  discrepancies            Json?   // Array of issues found
  
  // Status
  status                   ReconciliationStatus
  resolvedAt               DateTime?
  resolvedBy               String?
  resolvedByAdmin          Admin?   @relation(fields: [resolvedBy], references: [id])
  
  createdAt                DateTime @default(now())
  
  @@index([startDate])
  @@index([status])
}

enum ReconciliationStatus {
  PENDING
  IN_PROGRESS
  BALANCED
  DISCREPANCY_FOUND
  RESOLVED
  FAILED
}
```

**Migration command:**
```bash
npx prisma migrate dev --name add_virtual_iban_audit_and_reconciliation
```

---

### 1.2 Audit Logging Service
**Priority:** 🔴 CRITICAL  
**Effort:** 1 day

**File:** `src/lib/services/virtual-iban-audit.service.ts`

```typescript
/**
 * Virtual IBAN Audit Logging Service
 * 
 * Comprehensive audit trail for compliance and debugging
 */

import { prisma } from '@/lib/db';
import { VirtualIbanAuditType, AuditSeverity } from '@prisma/client';

interface CreateAuditLogParams {
  type: VirtualIbanAuditType;
  severity: AuditSeverity;
  action: string;
  accountId?: string;
  userId?: string;
  adminId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  diff?: number;
  reason?: string;
}

class VirtualIbanAuditService {
  /**
   * Create audit log entry
   */
  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await prisma.virtualIbanAuditLog.create({
        data: {
          type: params.type,
          severity: params.severity,
          action: params.action,
          accountId: params.accountId,
          userId: params.userId,
          adminId: params.adminId,
          oldValue: params.oldValue,
          newValue: params.newValue,
          metadata: params.metadata,
          diff: params.diff,
          reason: params.reason,
        },
      });

      // For CRITICAL events, also send alert
      if (params.severity === 'CRITICAL') {
        await this.sendCriticalAlert(params);
      }
    } catch (error) {
      // Don't throw - audit logging should never break main flow
      console.error('[Audit] Failed to log:', error);
    }
  }

  /**
   * Log balance change
   */
  async logBalanceChange(
    accountId: string,
    oldBalance: number,
    newBalance: number,
    reason: string,
    userId?: string,
    adminId?: string
  ): Promise<void> {
    const type = newBalance > oldBalance ? 'BALANCE_CREDIT' : 'BALANCE_DEBIT';
    const diff = Math.abs(newBalance - oldBalance);

    await this.log({
      type,
      severity: 'INFO',
      action: reason,
      accountId,
      userId,
      adminId,
      oldValue: { balance: oldBalance },
      newValue: { balance: newBalance },
      diff,
      reason,
    });
  }

  /**
   * Log balance mismatch (CRITICAL)
   */
  async logBalanceMismatch(
    segregatedAccountId: string,
    bcbTotal: number,
    localTotal: number,
    accountBreakdown: any[]
  ): Promise<void> {
    const diff = Math.abs(bcbTotal - localTotal);

    await this.log({
      type: 'BALANCE_MISMATCH',
      severity: 'CRITICAL',
      action: 'AUTOMATED_VALIDATION',
      metadata: {
        segregatedAccountId,
        bcbTotal,
        localTotal,
        accountBreakdown,
        timestamp: new Date(),
      },
      diff,
      reason: `Segregated account balance (€${bcbTotal}) does not match sum of local balances (€${localTotal})`,
    });
  }

  /**
   * Log webhook processing
   */
  async logWebhookProcessed(
    transactionId: string,
    accountId: string,
    amount: number,
    success: boolean,
    error?: string
  ): Promise<void> {
    await this.log({
      type: 'WEBHOOK_RECEIVED',
      severity: success ? 'INFO' : 'ERROR',
      action: 'WEBHOOK_PROCESSING',
      accountId,
      metadata: {
        transactionId,
        amount,
        success,
        error,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Log missed payment detected by polling
   */
  async logPollingDetected(
    transactionId: string,
    accountId: string,
    amount: number
  ): Promise<void> {
    await this.log({
      type: 'POLLING_DETECTED',
      severity: 'WARNING',
      action: 'MISSED_WEBHOOK_RECOVERED',
      accountId,
      metadata: {
        transactionId,
        amount,
        timestamp: new Date(),
      },
      reason: 'Webhook was missed, recovered via polling',
    });
  }

  /**
   * Get audit history for account
   */
  async getAccountHistory(
    accountId: string,
    limit = 100
  ): Promise<any[]> {
    return prisma.virtualIbanAuditLog.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        admin: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Get critical events (last 24 hours)
   */
  async getCriticalEvents(): Promise<any[]> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return prisma.virtualIbanAuditLog.findMany({
      where: {
        severity: 'CRITICAL',
        createdAt: {
          gte: yesterday,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Send critical alert to admins
   */
  private async sendCriticalAlert(params: CreateAuditLogParams): Promise<void> {
    // TODO: Implement actual alerting (email, Slack, PagerDuty)
    console.error('🚨 CRITICAL ALERT:', {
      type: params.type,
      action: params.action,
      reason: params.reason,
      metadata: params.metadata,
    });

    // Example: Send email
    // await emailService.sendAlert({
    //   to: 'admin@apricode.agency',
    //   subject: `[CRITICAL] Virtual IBAN: ${params.action}`,
    //   body: JSON.stringify(params, null, 2),
    // });
  }
}

export const virtualIbanAuditService = new VirtualIbanAuditService();
```

**Tasks:**
- [ ] Создать `virtual-iban-audit.service.ts`
- [ ] Интегрировать в существующие сервисы (balance, webhook)
- [ ] Добавить alerts через email/Slack

---

### 1.3 Polling Fallback (Cron Job)
**Priority:** 🔴 CRITICAL  
**Effort:** 3 days

**File:** `src/lib/cron/sync-virtual-iban-payments.ts`

```typescript
/**
 * Polling Fallback for Virtual IBAN Payments
 * 
 * Runs every 5 minutes to detect missed webhooks
 */

import { CronJob } from 'cron';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';
import { virtualIbanAuditService } from '@/lib/services/virtual-iban-audit.service';
import { prisma } from '@/lib/db';

export const syncVirtualIbanPaymentsCron = new CronJob(
  '*/5 * * * *', // Every 5 minutes
  async () => {
    console.log('[Cron] 🔄 Syncing Virtual IBAN payments...');

    try {
      const bcbAdapter = await integrationFactory.getVirtualIbanProvider();
      
      // Get segregatedAccountId from integration config
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

      // Look back 10 minutes (overlap for reliability)
      const dateFrom = new Date(Date.now() - 10 * 60 * 1000);

      console.log(`[Cron] Checking payments since: ${dateFrom.toISOString()}`);

      // Get payments from BCB Client API
      const response = await bcbAdapter.clientApiRequest<{
        count: number;
        results: string[]; // Array of transactionIds
      }>(
        'GET',
        `/v1/accounts/${segregatedAccountId}/payments?dateFrom=${dateFrom.toISOString()}&pageSize=100`
      );

      console.log(`[Cron] Found ${response.count} payments`);

      let processedCount = 0;
      let skippedCount = 0;
      let missedCount = 0;

      // Process each payment
      for (const transactionId of response.results) {
        // Check if already in database
        const exists = await prisma.virtualIbanTransaction.findUnique({
          where: { providerTransactionId: transactionId },
        });

        if (exists) {
          skippedCount++;
          continue;
        }

        // Get payment details
        const payment = await bcbAdapter.clientApiRequest<{
          transactionId: string;
          endToEndId: string;
          nonce: string;
          status: string;
          currency: string;
          amount: string;
        }>(
          'GET',
          `/v1/accounts/${segregatedAccountId}/payments/transaction/${transactionId}`
        );

        // Only process Settled payments
        if (payment.status !== 'Settled') {
          console.log(`[Cron] Payment ${transactionId} status: ${payment.status}, skipping`);
          continue;
        }

        console.log(`[Cron] 🎯 Missed payment detected: ${transactionId}`);
        missedCount++;

        // ⚠️ PROBLEM: We need IBAN of recipient!
        // Payment response doesn't include Virtual IBAN details
        // Need to cross-reference with Services API transactions

        try {
          // Try to get transaction details from Services API
          const transactions = await bcbAdapter.request<any[]>(
            'GET',
            `/v3/accounts/${segregatedAccountId}/transactions?limit=100&dateFrom=${dateFrom.toISOString().split('T')[0]}`
          );

          // Find matching transaction by amount and currency
          const matchingTx = transactions.find(
            (tx) =>
              Math.abs(parseFloat(tx.amount) - parseFloat(payment.amount)) < 0.01 &&
              tx.ticker === payment.currency &&
              tx.credit === 1
          );

          if (!matchingTx || !matchingTx.iban) {
            console.warn(`[Cron] Cannot find IBAN for transaction ${transactionId}`);
            
            // Log this as an issue
            await virtualIbanAuditService.log({
              type: 'WEBHOOK_MISSED',
              severity: 'ERROR',
              action: 'POLLING_FAILED',
              metadata: {
                transactionId,
                payment,
                reason: 'Cannot determine recipient IBAN',
              },
              reason: 'Polling detected missed payment but cannot determine Virtual IBAN',
            });
            
            continue;
          }

          // Process as webhook
          await virtualIbanService.processIncomingTransaction({
            tx_id: payment.transactionId,
            account_id: parseInt(segregatedAccountId),
            amount: parseFloat(payment.amount),
            currency: payment.currency,
            ticker: payment.currency,
            credit: 1,
            iban: matchingTx.iban, // ← Found via cross-reference!
            details: {
              iban: matchingTx.iban,
              reference: matchingTx.details?.reference || payment.nonce,
              sender_name: matchingTx.details?.sender_name,
              sender_iban: matchingTx.details?.sender_iban,
            },
          });

          // Log successful recovery
          await virtualIbanAuditService.logPollingDetected(
            payment.transactionId,
            matchingTx.iban,
            parseFloat(payment.amount)
          );

          processedCount++;

        } catch (txError) {
          console.error(`[Cron] Error processing transaction ${transactionId}:`, txError);
        }
      }

      console.log(`[Cron] ✅ Sync completed:`, {
        total: response.count,
        processed: processedCount,
        skipped: skippedCount,
        missed: missedCount,
      });

    } catch (error) {
      console.error('[Cron] ❌ Sync failed:', error);

      // Log critical error
      await virtualIbanAuditService.log({
        type: 'POLLING_DETECTED',
        severity: 'CRITICAL',
        action: 'CRON_FAILED',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
        },
        reason: 'Polling cron job failed',
      });
    }
  }
);
```

**Tasks:**
- [ ] Создать `sync-virtual-iban-payments.ts`
- [ ] Протестировать cross-reference logic (Client API + Services API)
- [ ] Добавить в `src/lib/cron/index.ts`
- [ ] Setup в production (vercel cron или external service)

---

### 1.4 Balance Validation (Cron Job)
**Priority:** 🔴 CRITICAL  
**Effort:** 2 days

**File:** `src/lib/cron/validate-virtual-iban-balance.ts`

```typescript
/**
 * Balance Validation Cron
 * 
 * Validates that Σ(local balances) === BCB segregated balance
 * Runs every hour
 */

import { CronJob } from 'cron';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { virtualIbanAuditService } from '@/lib/services/virtual-iban-audit.service';
import { prisma } from '@/lib/db';

export const validateVirtualIbanBalanceCron = new CronJob(
  '0 * * * *', // Every hour at :00
  async () => {
    console.log('[Cron] 🔍 Validating Virtual IBAN balance...');

    try {
      const bcbAdapter = await integrationFactory.getVirtualIbanProvider();

      // Get segregatedAccountId
      const integration = await prisma.integration.findUnique({
        where: { service: 'BCB_GROUP' },
      });

      const segregatedAccountId = (integration?.config as any)?.segregatedAccountId;

      if (!segregatedAccountId) {
        throw new Error('segregatedAccountId not configured');
      }

      // 1. Get BCB total balance
      const bcbBalances = await bcbAdapter.request<any[]>(
        'GET',
        `/v3/balances/${segregatedAccountId}`
      );

      const bcbTotal = bcbBalances[0]?.balance || 0;

      // 2. Sum all local balances
      const localSum = await prisma.virtualIbanAccount.aggregate({
        where: {
          status: 'ACTIVE',
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

      // 3. Get breakdown for audit
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
          userId: true,
          user: {
            select: {
              email: true,
              fullName: true,
            },
          },
        },
      });

      const accountBreakdown = accounts.map((acc) => ({
        accountId: acc.id,
        iban: acc.iban,
        balance: acc.balance,
        userId: acc.userId,
        userEmail: acc.user.email,
        userName: acc.user.fullName,
      }));

      // 4. Compare with tolerance (1 cent for float precision)
      const diff = Math.abs(bcbTotal - localTotal);
      const tolerance = 0.01;
      const isValid = diff <= tolerance;

      console.log('[Cron] Balance comparison:', {
        bcbTotal: `€${bcbTotal.toFixed(2)}`,
        localTotal: `€${localTotal.toFixed(2)}`,
        diff: `€${diff.toFixed(2)}`,
        activeAccounts,
        isValid: isValid ? '✅' : '❌',
      });

      // 5. Create snapshot
      await prisma.virtualIbanBalanceSnapshot.create({
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

      // 6. If mismatch, create CRITICAL alert
      if (!isValid) {
        console.error('🚨 BALANCE MISMATCH DETECTED!');
        console.error(`BCB: €${bcbTotal}, Local: €${localTotal}, Diff: €${diff}`);
        console.error('Account breakdown:', accountBreakdown);

        // Log audit
        await virtualIbanAuditService.logBalanceMismatch(
          segregatedAccountId,
          bcbTotal,
          localTotal,
          accountBreakdown
        );

        // TODO: Send emergency alert to admins
      } else {
        console.log('✅ Balance validated successfully');
      }

    } catch (error) {
      console.error('[Cron] ❌ Balance validation failed:', error);

      await virtualIbanAuditService.log({
        type: 'BALANCE_SYNC',
        severity: 'CRITICAL',
        action: 'VALIDATION_CRON_FAILED',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
        },
        reason: 'Balance validation cron failed',
      });
    }
  }
);
```

**Tasks:**
- [ ] Создать `validate-virtual-iban-balance.ts`
- [ ] Интегрировать с audit service
- [ ] Setup alerts для balance mismatch
- [ ] Добавить в cron index

---

## 📋 Full Implementation Checklist

### Week 1: Foundation
- [ ] Day 1-2: Database schema (audit, snapshots, reconciliation)
- [ ] Day 3: Audit service implementation
- [ ] Day 4-5: Polling fallback cron

### Week 2: Validation & Monitoring
- [ ] Day 1-2: Balance validation cron
- [ ] Day 3: Daily reconciliation report
- [ ] Day 4: Admin dashboard для reconciliation
- [ ] Day 5: Testing & fixes

### Week 3: Optimization & Security
- [ ] Redis caching для API responses
- [ ] Database indexes optimization
- [ ] Rate limiting для cron jobs
- [ ] Security audit

### Week 4: Production Deployment
- [ ] Setup Vercel Cron или external scheduler
- [ ] Configure monitoring (Datadog/Sentry)
- [ ] Setup alerting (email/Slack)
- [ ] Production testing
- [ ] Documentation

---

## 🎯 Next Steps

1. **Approve Plan** - подтверди что план выглядит хорошо
2. **Start Implementation** - начнем с Phase 1.1 (Database Schema)
3. **Iterative Development** - по одной задаче за раз
4. **Testing** - тестировать каждый компонент отдельно

Начинаем? 🚀

