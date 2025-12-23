/**
 * Virtual IBAN Service
 * 
 * Enterprise-grade business logic for managing Virtual IBAN accounts.
 * Supports multiple providers with intelligent routing based on:
 * - Currency (EUR, GBP, USD, PLN)
 * - Country (SEPA, UK, US)
 * - Provider availability and health
 * 
 * Providers: BCB Group, Currency Cloud, Modulr, Railsbank, etc.
 */

import { prisma } from '@/lib/prisma';
import { VirtualIbanAccount } from '@prisma/client';
import { virtualIbanRouter } from '@/lib/integrations/VirtualIbanRouter';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { IVirtualIbanProvider, VirtualIbanCreateRequest } from '@/lib/integrations/categories/IVirtualIbanProvider';
import type {
  VirtualIbanAccount as ProviderAccount,
  VirtualIbanTransaction as ProviderTransaction,
} from '@/lib/integrations/categories/IVirtualIbanProvider';
import type {
  VirtualIbanAccount,
  VirtualIbanTransaction,
  VirtualIbanStatus,
  VirtualIbanTransactionType,
  VirtualIbanTransactionStatus,
} from '@prisma/client';
import { virtualIbanAuditService } from './virtual-iban-audit.service';

// ==========================================
// SERVICE CLASS
// ==========================================

class VirtualIbanService {
  /**
   * Get Virtual IBAN provider for a specific account
   * Uses the providerId stored in the account record
   */
  private async getProviderForAccount(account: VirtualIbanAccount): Promise<IVirtualIbanProvider> {
    try {
      return await virtualIbanRouter.getProviderById(account.providerId);
    } catch (error) {
      console.error('[VirtualIBAN] Failed to get provider for account:', error);
      // Fallback to default provider
      return await integrationFactory.getVirtualIbanProvider();
    }
  }

  /**
   * Get best provider for creating new account
   * Routes based on currency and country
   */
  private async getProviderForNewAccount(currency: string, country: string): Promise<{
    provider: IVirtualIbanProvider;
    providerId: string;
  }> {
    try {
      const result = await virtualIbanRouter.getProvider({
        currency,
        country,
        accountType: 'individual',
      });
      console.log('[VirtualIBAN] Router selected provider:', result.reason);
      return { provider: result.provider, providerId: result.providerId };
    } catch (error) {
      console.warn('[VirtualIBAN] Router failed, using default provider:', error);
      const provider = await integrationFactory.getVirtualIbanProvider();
      return { provider, providerId: provider.providerId };
    }
  }

  /**
   * Get available providers for a currency
   */
  async getAvailableProviders(currency: string): Promise<{
    providerId: string;
    name: string;
    countries: string[];
  }[]> {
    return virtualIbanRouter.getProvidersForCurrency(currency);
  }

  // ==========================================
  // ACCOUNT MANAGEMENT
  // ==========================================

  /**
   * Create Virtual IBAN account for user
   * 
   * @param userId - User ID
   * @param options - Optional parameters for currency and preferred provider
   */
  async createAccountForUser(
    userId: string,
    options?: {
      currency?: string;
      preferredProviderId?: string;
    }
  ): Promise<VirtualIbanAccount> {
    const currency = options?.currency || 'EUR';
    
    console.log('[VirtualIBAN] ========================================');
    console.log('[VirtualIBAN] Creating account for user:', { userId, currency });
    console.log('[VirtualIBAN] ========================================');

    // Get user with profile and KYC session
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        profile: true,
        kycSession: {
          include: {
            profile: true, // KycProfile (may have address from webhook)
          },
        },
      },
    });

    if (!user || !user.profile) {
      throw new Error('User or profile not found');
    }

    // Check if user already has an active account for this currency
    const existingAccount = await prisma.virtualIbanAccount.findFirst({
      where: {
        userId,
        currency,
        status: 'ACTIVE', // Only check for ACTIVE accounts (pending removed)
      },
    });

    if (existingAccount) {
      console.log('[VirtualIBAN] User already has an ACTIVE account:', existingAccount.id);
      return existingAccount;
    }

    // Get best provider using router (or specific if requested)
    let provider: IVirtualIbanProvider;
    let providerId: string;

    if (options?.preferredProviderId) {
      // Use specific provider
      provider = await virtualIbanRouter.getProviderById(options.preferredProviderId);
      providerId = options.preferredProviderId;
    } else {
      // Let router decide based on currency/country
      const result = await this.getProviderForNewAccount(currency, user.profile.country);
      provider = result.provider;
      providerId = result.providerId;
    }

    console.log('[VirtualIBAN] Selected provider:', providerId);

    // ✅ Priority: Get verified address from Sumsub API
    // Fallback to KycProfile, then to user profile
    let addressStreet = user.profile.address || '';
    let addressCity = user.profile.city || '';
    let addressPostalCode = user.profile.postalCode || '';
    let addressCountry = user.profile.country;

    // Try to get address from Sumsub API if KYC session exists
    console.log('[VirtualIBAN] Checking KYC session for Sumsub address:', {
      hasKycSession: !!user.kycSession,
      applicantId: user.kycSession?.applicantId,
      kycProviderId: user.kycSession?.kycProviderId,
      willFetchFromSumsub: !!(user.kycSession?.applicantId && user.kycSession?.kycProviderId === 'sumsub'),
    });

    if (user.kycSession?.applicantId && user.kycSession?.kycProviderId === 'sumsub') {
      try {
        console.log('[VirtualIBAN] Fetching verified address from Sumsub API...');
        
        // Get KYC provider
        const { integrationFactory } = await import('@/lib/integrations/IntegrationFactory');
        const kycProvider = await integrationFactory.getProviderByService('sumsub');
        
        if (kycProvider && typeof kycProvider.getApplicant === 'function') {
          console.log('[VirtualIBAN] Calling Sumsub API getApplicant with applicantId:', user.kycSession.applicantId);
          const applicant = await kycProvider.getApplicant(user.kycSession.applicantId);
          console.log('[VirtualIBAN] Sumsub API response received:', {
            applicantId: applicant.applicantId,
            hasMetadata: !!applicant.metadata,
            hasInfo: !!applicant.metadata?.info,
            hasFixedInfo: !!applicant.metadata?.fixedInfo,
          });
          
          // Extract address from Sumsub response
          // Sumsub stores address in:
          // - data.info.addresses (from webhook/status)
          // - data.fixedInfo.addresses (from fixedInfo)
          const sumsubInfo = applicant.metadata?.info;
          const sumsubFixedInfo = applicant.metadata?.fixedInfo;
          const addresses = sumsubInfo?.addresses || 
                          sumsubFixedInfo?.addresses || 
                          sumsubInfo?.fixedInfo?.addresses || 
                          [];
          
          console.log('[VirtualIBAN] Extracted addresses from Sumsub response:', {
            addressesCount: addresses.length,
            sumsubInfoHasAddresses: !!sumsubInfo?.addresses,
            sumsubFixedInfoHasAddresses: !!sumsubFixedInfo?.addresses,
            firstAddress: addresses[0] || null,
          });
          
          if (addresses.length > 0) {
            // Use first address (usually the main one)
            const sumsubAddress = addresses[0];
            
            if (sumsubAddress.street || sumsubAddress.town) {
              addressStreet = sumsubAddress.street || '';
              addressCity = sumsubAddress.town || '';
              addressPostalCode = sumsubAddress.postCode || '';
              // Convert ISO-3 to ISO-2 for country
              if (sumsubAddress.country) {
                const { alpha3ToIso2 } = await import('@/lib/utils/country-codes');
                addressCountry = alpha3ToIso2(sumsubAddress.country) || sumsubAddress.country;
              }
              
              console.log('[VirtualIBAN] ✅ Using verified address from Sumsub API:', {
                street: addressStreet,
                city: addressCity,
                postalCode: addressPostalCode,
                country: addressCountry,
              });
            }
          } else {
            console.log('[VirtualIBAN] ⚠️ Sumsub applicant found but no address in response');
          }
        } else {
          console.log('[VirtualIBAN] ⚠️ KYC provider not found or getApplicant method not available');
        }
      } catch (error) {
        console.error('[VirtualIBAN] ❌ Failed to fetch address from Sumsub API, using fallback:', error);
        console.error('[VirtualIBAN] Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Fallback to KycProfile or user profile
      }
    } else {
      console.log('[VirtualIBAN] ⚠️ Skipping Sumsub API call - conditions not met:', {
        hasApplicantId: !!user.kycSession?.applicantId,
        isSumsub: user.kycSession?.kycProviderId === 'sumsub',
      });
    }
    
    // Fallback: Try KycProfile if Sumsub API didn't return address
    if (!addressStreet && !addressCity) {
      const kycProfile = user.kycSession?.profile;
      if (kycProfile?.addressStreet && kycProfile?.addressCity) {
        addressStreet = kycProfile.addressStreet;
        addressCity = kycProfile.addressCity;
        addressPostalCode = kycProfile.addressPostal || '';
        addressCountry = kycProfile.addressCountry || user.profile.country;
        
        console.log('[VirtualIBAN] Using address from KycProfile (webhook data):', {
          street: addressStreet,
          city: addressCity,
          postalCode: addressPostalCode,
          country: addressCountry,
        });
      } else {
        console.log('[VirtualIBAN] Using address from user profile:', {
          street: addressStreet,
          city: addressCity,
          postalCode: addressPostalCode,
          country: addressCountry,
        });
      }
    }

    // Prepare request
    const createRequest: VirtualIbanCreateRequest = {
      userId: user.id,
      userEmail: user.email,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      dateOfBirth: user.profile.dateOfBirth 
        ? (() => {
            // ✅ FIX: Use UTC date to prevent "1 day less" bug
            const d = new Date(user.profile.dateOfBirth);
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          })()
        : (() => {
            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          })(),
      nationality: user.profile.nationality || user.profile.country,
      country: user.profile.country,
      currency,
      address: {
        street: addressStreet,
        city: addressCity,
        postalCode: addressPostalCode,
        country: addressCountry,
      },
    };

    // Create account in provider (BCB Group, Currency Cloud, etc.)
    let providerAccount: ProviderAccount;
    try {
      providerAccount = await provider.createAccount(createRequest);
    } catch (error) {
      console.error('[VirtualIBAN] Provider failed to create account:', error);
      throw new Error(`Failed to create Virtual IBAN: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Map provider status to DB status
    // Provider interface uses lowercase ('active', 'closed'), but with iban='PENDING' for pending accounts
    // DB uses uppercase ENUM ('ACTIVE', 'PENDING', 'CLOSED')
    let dbStatus: 'ACTIVE' | 'PENDING' | 'CLOSED' = 'ACTIVE';
    if (providerAccount.status === 'closed') {
      dbStatus = 'CLOSED';
    } else if (providerAccount.iban === 'PENDING') {
      // Account exists but IBAN not allocated yet
      dbStatus = 'PENDING';
    }

    // Use upsert to handle retry scenarios (if account with same correlationId exists)
    const metadata = providerAccount.metadata as Record<string, any> || {};
    const correlationId = metadata.bcbCorrelationId || providerAccount.accountId;
    
    // Try to find existing pending account by metadata
    const existingPending = await prisma.virtualIbanAccount.findFirst({
      where: {
        userId,
        providerId,
        currency,
        status: 'PENDING',
      },
    });

    let dbAccount: VirtualIbanAccount;
    
    if (existingPending) {
      // Update existing pending account
      console.log('[VirtualIBAN] Updating existing pending account:', existingPending.id);
      dbAccount = await prisma.virtualIbanAccount.update({
        where: { id: existingPending.id },
        data: {
          providerAccountId: providerAccount.accountId,
          iban: providerAccount.iban,
          bic: providerAccount.bic,
          bankName: providerAccount.bankName,
          accountHolder: providerAccount.accountHolder,
          country: providerAccount.country,
          status: dbStatus,
          balance: providerAccount.balance || 0,
          lastBalanceUpdate: new Date(),
          metadata: providerAccount.metadata,
        },
      });
    } else {
      // Create new account
      dbAccount = await prisma.virtualIbanAccount.create({
        data: {
          userId,
          providerId,
          providerAccountId: providerAccount.accountId,
          iban: providerAccount.iban,
          bic: providerAccount.bic,
          bankName: providerAccount.bankName,
          accountHolder: providerAccount.accountHolder,
          currency: providerAccount.currency,
          country: providerAccount.country,
          status: dbStatus,
          balance: providerAccount.balance || 0,
          lastBalanceUpdate: new Date(),
          metadata: providerAccount.metadata,
        },
      });
    }

    console.log('[VirtualIBAN] Account created successfully:', {
      id: dbAccount.id,
      iban: dbAccount.iban,
      providerId: dbAccount.providerId,
      status: dbAccount.status,
    });

    return dbAccount;
  }

  /**
   * Get user's Virtual IBAN accounts
   * Automatically syncs PENDING accounts with provider
   */
  async getUserAccounts(userId: string): Promise<VirtualIbanAccount[]> {
    const accounts = await prisma.virtualIbanAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Auto-sync any accounts with PENDING IBAN (regardless of status)
    for (const account of accounts) {
      if (account.iban === 'PENDING') {
        try {
          await this.syncPendingAccount(account.id);
        } catch (error) {
          console.warn('[VirtualIBAN] Failed to sync pending account:', account.id, error);
        }
      }
    }

    // Return fresh data after sync
    return prisma.virtualIbanAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Sync a PENDING account with the provider
   * Fetches latest status and updates IBAN if ready
   */
  async syncPendingAccount(accountId: string): Promise<VirtualIbanAccount | null> {
    const account = await prisma.virtualIbanAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return null;
    }

    // Only sync accounts with PENDING IBAN
    if (account.iban !== 'PENDING') {
      return account;
    }

    // Get correlation ID from metadata (support both field names)
    const metadata = account.metadata as Record<string, any> || {};
    const correlationId = metadata.correlationId || metadata.bcbCorrelationId;

    if (!correlationId) {
      console.warn('[VirtualIBAN] No correlation ID for pending account:', accountId);
      return account;
    }

    console.log('[VirtualIBAN] Syncing pending account:', { accountId, correlationId });

    try {
      // Get provider and sync
      const provider = await this.getProviderForAccount(account);
      
      // Call provider-specific sync method if available
      if ('syncPendingAccount' in provider && typeof provider.syncPendingAccount === 'function') {
        const syncedAccount = await (provider as any).syncPendingAccount(correlationId, account.userId);
        
        if (syncedAccount && syncedAccount.iban && syncedAccount.iban !== 'PENDING') {
          // Update database with real IBAN
          const updated = await prisma.virtualIbanAccount.update({
            where: { id: accountId },
            data: {
              iban: syncedAccount.iban,
              bic: syncedAccount.bic,
              providerAccountId: syncedAccount.accountId,
              status: 'ACTIVE',
              bankName: syncedAccount.bankName || account.bankName,
              lastBalanceUpdate: new Date(),
              metadata: {
                ...metadata,
                ...syncedAccount.metadata,
              },
            },
          });

          console.log('[VirtualIBAN] Account synced successfully:', {
            id: updated.id,
            iban: updated.iban,
            status: updated.status,
          });

          return updated;
        }
      }
    } catch (error) {
      console.error('[VirtualIBAN] Failed to sync pending account:', error);
    }

    return account;
  }

  /**
   * Sync all PENDING accounts (for cron job or admin action)
   */
  async syncAllPendingAccounts(): Promise<{ synced: number; failed: number }> {
    const pendingAccounts = await prisma.virtualIbanAccount.findMany({
      where: {
        iban: 'PENDING', // Sync any account with pending IBAN, regardless of status
      },
    });

    console.log('[VirtualIBAN] Syncing', pendingAccounts.length, 'pending accounts');

    let synced = 0;
    let failed = 0;

    for (const account of pendingAccounts) {
      try {
        const result = await this.syncPendingAccount(account.id);
        if (result && result.status === 'ACTIVE') {
          synced++;
        }
      } catch (error) {
        console.error('[VirtualIBAN] Failed to sync account:', account.id, error);
        failed++;
      }
    }

    return { synced, failed };
  }

  /**
   * Get account by ID
   */
  async getAccountById(accountId: string): Promise<VirtualIbanAccount | null> {
    return prisma.virtualIbanAccount.findUnique({
      where: { id: accountId },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });
  }

  /**
   * Get account by IBAN
   */
  async getAccountByIban(iban: string): Promise<VirtualIbanAccount | null> {
    return prisma.virtualIbanAccount.findUnique({
      where: { iban },
    });
  }

  /**
   * Sync account details from provider
   * Uses the correct provider based on account's providerId
   */
  async syncAccountDetails(accountId: string): Promise<VirtualIbanAccount> {
    const account = await this.getAccountById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Get provider that owns this account
    const provider = await this.getProviderForAccount(account);

    // Get fresh account details from provider (status, IBAN, BIC, etc.)
    // For BCB: use providerAccountId which is the Virtual IBAN UUID
    const providerAccount = await provider.getAccountDetails(account.providerAccountId);

    // Normalize status to uppercase for Prisma enum
    let normalizedStatus: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'CLOSED' | 'FAILED' = 'PENDING';
    if (providerAccount.status) {
      const statusUpper = providerAccount.status.toUpperCase();
      if (['ACTIVE', 'PENDING', 'SUSPENDED', 'CLOSED', 'FAILED'].includes(statusUpper)) {
        normalizedStatus = statusUpper as 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'CLOSED' | 'FAILED';
      }
    }

    // Update in DB (but NOT balance - balance is only updated via webhooks/polling)
    const updatedAccount = await prisma.virtualIbanAccount.update({
      where: { id: accountId },
      data: {
        status: normalizedStatus,
        bic: providerAccount.bic || account.bic,
        bankName: providerAccount.bankName || account.bankName,
        metadata: providerAccount.metadata,
        updatedAt: new Date(),
      },
    });

    // Audit log for account metadata update
    await virtualIbanAuditService.log({
      type: 'ACCOUNT_UPDATED',
      severity: 'INFO',
      action: 'SYNC_ACCOUNT_DETAILS',
      accountId,
      metadata: {
        statusChanged: account.status !== normalizedStatus,
        oldStatus: account.status,
        newStatus: normalizedStatus,
        bicUpdated: providerAccount.bic !== account.bic,
        timestamp: new Date(),
      },
      reason: 'Manual sync via admin panel',
    });

    return updatedAccount;
  }

  /**
   * Suspend account
   * Uses the correct provider based on account's providerId
   */
  async suspendAccount(
    accountId: string,
    adminId: string,
    reason?: string
  ): Promise<VirtualIbanAccount> {
    const account = await this.getAccountById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Get provider that owns this account
    const provider = await this.getProviderForAccount(account);

    // Suspend in provider (if supported)
    await provider.suspendAccount(account.providerAccountId, reason);

    // Update in DB
    return prisma.virtualIbanAccount.update({
      where: { id: accountId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendedBy: adminId,
        suspendReason: reason,
      },
    });
  }

  /**
   * Reactivate suspended account
   * Uses the correct provider based on account's providerId
   */
  async reactivateAccount(accountId: string): Promise<VirtualIbanAccount> {
    const account = await this.getAccountById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Get provider that owns this account
    const provider = await this.getProviderForAccount(account);

    // Reactivate in provider
    await provider.reactivateAccount(account.providerAccountId);

    // Update in DB
    return prisma.virtualIbanAccount.update({
      where: { id: accountId },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspendedBy: null,
        suspendReason: null,
      },
    });
  }

  // ==========================================
  // TRANSACTION MANAGEMENT
  // ==========================================

  /**
   * Get transactions for account
   */
  async getAccountTransactions(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<VirtualIbanTransaction[]> {
    return prisma.virtualIbanTransaction.findMany({
      where: {
        virtualIbanId: accountId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        order: true,
        payIn: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Sync transactions from provider
   */
  async syncTransactions(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ synced: number; new: number }> {
    const account = await this.getAccountById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Get provider that owns this account
    const provider = await this.getProviderForAccount(account);

    // Fetch from provider
    const providerTransactions = await provider.getTransactions(
      account.providerAccountId,
      startDate,
      endDate
    );

    let synced = 0;
    let newCount = 0;

    for (const tx of providerTransactions) {
      // Check if transaction already exists
      const existing = await prisma.virtualIbanTransaction.findUnique({
        where: { providerTransactionId: tx.transactionId },
      });

      if (existing) {
        // Update status if changed
        if (existing.status !== (tx.status as VirtualIbanTransactionStatus)) {
          await prisma.virtualIbanTransaction.update({
            where: { id: existing.id },
            data: { status: tx.status as VirtualIbanTransactionStatus },
          });
          synced++;
        }
      } else {
        // Create new transaction
        await prisma.virtualIbanTransaction.create({
          data: {
            virtualIbanId: accountId,
            providerTransactionId: tx.transactionId,
            type: tx.type.toUpperCase() as VirtualIbanTransactionType,
            amount: tx.amount,
            currency: tx.currency,
            senderName: tx.senderName,
            senderIban: tx.senderIban,
            reference: tx.reference,
            status: tx.status as VirtualIbanTransactionStatus,
            processedAt: tx.processedAt,
            metadata: tx.metadata,
          },
        });
        newCount++;
        synced++;
      }
    }

    console.log('[VirtualIBAN] Synced transactions:', { synced, new: newCount });

    return { synced, new: newCount };
  }

  /**
   * Process incoming transaction from webhook
   * Supports both BCB format and normalized format
   */
  async processIncomingTransaction(payload: any): Promise<VirtualIbanTransaction> {
    // Normalize webhook payload (handle both BCB format and direct format)
    const data = payload.data || payload;
    
    const normalized = {
      transactionId: data.tx_id || data.transactionId || `webhook-${Date.now()}`,
      accountId: String(data.account_id || data.accountId),
      type: data.credit === 1 || data.credit === true || data.type === 'credit' ? 'credit' : 'debit',
      amount: parseFloat(data.amount) || 0,
      currency: data.ticker || data.currency || 'EUR',
      senderName: data.details?.sender_name || data.senderName || null,
      senderIban: data.details?.sender_iban || data.details?.iban || data.senderIban || null,
      reference: data.details?.reference || data.reference || null,
      iban: data.iban || data.details?.iban || null,
      status: 'COMPLETED' as const,
      metadata: data,
    };

    console.log('[VirtualIBAN] Processing webhook transaction:', {
      transactionId: normalized.transactionId,
      amount: normalized.amount,
      currency: normalized.currency,
      reference: normalized.reference,
      iban: normalized.iban,
    });

    // Find account by IBAN or provider account ID
    let account = await prisma.virtualIbanAccount.findFirst({
      where: { iban: normalized.iban },
    });

    if (!account && normalized.accountId) {
      account = await prisma.virtualIbanAccount.findFirst({
        where: { providerAccountId: normalized.accountId },
      });
    }

    if (!account) {
      throw new Error(`Virtual IBAN account not found for IBAN: ${normalized.iban} or provider ID: ${normalized.accountId}`);
    }

    // Check if transaction already exists
    let transaction = await prisma.virtualIbanTransaction.findUnique({
      where: { providerTransactionId: normalized.transactionId },
    });

    if (transaction) {
      console.log('[VirtualIBAN] Transaction already exists, updating:', transaction.id);
      
      // Update existing
      transaction = await prisma.virtualIbanTransaction.update({
        where: { id: transaction.id },
        data: {
          status: normalized.status,
          processedAt: new Date(),
          webhookReceivedAt: new Date(),
          webhookPayload: payload,
        },
      });
    } else {
      // Create new transaction
      const txType = normalized.type.toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT';
      
      transaction = await prisma.virtualIbanTransaction.create({
        data: {
          virtualIbanId: account.id,
          providerTransactionId: normalized.transactionId,
          type: txType as VirtualIbanTransactionType,
          amount: normalized.amount,
          currency: normalized.currency,
          senderName: normalized.senderName,
          senderIban: normalized.senderIban,
          reference: normalized.reference,
          status: 'COMPLETED',
          processedAt: new Date(),
          webhookReceivedAt: new Date(),
          webhookPayload: payload,
          metadata: normalized.metadata,
        },
      });

      console.log('[VirtualIBAN] Transaction created:', {
        id: transaction.id,
        type: txType,
        amount: normalized.amount,
      });
    }

    // Update account balance
    const balanceChange = normalized.type === 'credit' ? normalized.amount : -normalized.amount;
    
    await prisma.virtualIbanAccount.update({
      where: { id: account.id },
      data: {
        balance: { increment: balanceChange },
        lastBalanceUpdate: new Date(),
      },
    });

    console.log('[VirtualIBAN] Balance updated:', {
      accountId: account.id,
      change: balanceChange,
    });

    return transaction;
  }

  // ==========================================
  // ADMIN QUERIES
  // ==========================================

  /**
   * Get all accounts (admin)
   */
  async getAllAccounts(filters?: {
    status?: VirtualIbanStatus | null;
    providerId?: string | null;
    currency?: string | null;
  }): Promise<VirtualIbanAccount[]> {
    // Build where clause, excluding null/undefined/empty values
    const where: any = {};
    
    if (filters?.status && filters.status !== null && filters.status !== undefined) {
      where.status = filters.status;
    }
    if (filters?.providerId && filters.providerId !== null && filters.providerId !== undefined && filters.providerId.trim() !== '') {
      where.providerId = filters.providerId;
    }
    if (filters?.currency && filters.currency !== null && filters.currency !== undefined && filters.currency.trim() !== '') {
      where.currency = filters.currency;
    }

    // Only pass where clause if it has keys
    const queryOptions: any = {
      include: {
        user: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: 'desc' as const },
    };

    if (Object.keys(where).length > 0) {
      queryOptions.where = where;
    }

    return prisma.virtualIbanAccount.findMany(queryOptions);
  }

  /**
   * Get unreconciled transactions (admin)
   * 
   * Returns CREDIT transactions that are:
   * - Not linked to an Order (orderId = null)
   * - Not linked to a PayIn (payInId = null)  
   * - Not linked to a TopUpRequest (topUpRequest = null)
   * - Completed
   * 
   * These are "orphan" payments that need manual investigation
   */
  async getUnreconciledTransactions(): Promise<VirtualIbanTransaction[]> {
    return prisma.virtualIbanTransaction.findMany({
      where: {
        orderId: null,
        payInId: null,
        topUpRequest: null, // ← Relation, not topUpRequestId
        type: 'CREDIT',
        status: 'COMPLETED',
      },
      include: {
        virtualIban: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get account statistics
   */
  async getStatistics() {
    const totalAccounts = await prisma.virtualIbanAccount.count();
    const activeAccounts = await prisma.virtualIbanAccount.count({
      where: { status: 'ACTIVE' },
    });
    const suspendedAccounts = await prisma.virtualIbanAccount.count({
      where: { status: 'SUSPENDED' },
    });
    const totalTransactions = await prisma.virtualIbanTransaction.count();
    const unreconciledTransactions = await prisma.virtualIbanTransaction.count({
      where: {
        orderId: null,
        payInId: null,
        topUpRequest: null, // ← Exclude TopUp transactions
        type: 'CREDIT',
        status: 'COMPLETED',
      },
    });

    // Total volume (sum of all completed credit transactions)
    const volumeResult = await prisma.virtualIbanTransaction.aggregate({
      where: {
        type: 'CREDIT',
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });

    return {
      totalAccounts,
      activeAccounts,
      suspendedAccounts,
      totalTransactions,
      unreconciledTransactions,
      totalVolume: volumeResult._sum.amount || 0,
    };
  }

  /**
   * Close Virtual IBAN account
   */
  async closeAccount(
    accountId: string,
    reason?: string,
    closedBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get account
      const account = await prisma.virtualIbanAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      if (account.status === 'CLOSED') {
        return { success: false, error: 'Account is already closed' };
      }

      // Get provider
      const provider = await this.getProviderForAccount(account);

      // Close via provider API (if IBAN exists)
      if (account.iban && account.iban !== 'PENDING') {
        const result = await provider.closeAccount(account.iban, reason);
        
        if (!result.success) {
          console.error('[VirtualIBAN] Provider close failed:', result.error);
          // Continue to update DB even if provider fails
        }
      }

      // Update database
      await prisma.virtualIbanAccount.update({
        where: { id: accountId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          metadata: {
            ...(typeof account.metadata === 'object' ? account.metadata : {}),
            closedBy: closedBy || 'user',
            closeReason: reason || 'User requested closure',
            closedViaApi: true,
          },
        },
      });

      console.log('[VirtualIBAN] Account closed:', {
        accountId,
        iban: account.iban,
        closedBy,
        reason,
      });

      return { success: true };
    } catch (error) {
      console.error('[VirtualIBAN] Close account failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get pending transactions for an account
   */
  async getPendingTransactions(accountId: string): Promise<VirtualIbanTransaction[]> {
    return prisma.virtualIbanTransaction.findMany({
      where: {
        virtualIbanId: accountId,
        status: { in: ['PENDING', 'VOP_HELD'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

// Export singleton instance
export const virtualIbanService = new VirtualIbanService();

