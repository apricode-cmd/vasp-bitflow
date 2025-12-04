/**
 * BCB Group Virtual IBAN Adapter
 * 
 * Enterprise-grade implementation for BCB Group API v3/v4
 * 
 * Authentication: OAuth 2.0 Client Credentials
 * API Docs: https://bcbdigital.docs.apiary.io
 * 
 * Architecture:
 * BCB provides pre-created pooled bank accounts with IBANs.
 * Users are assigned these existing accounts via settlement_reference.
 * 
 * Endpoints used:
 * - GET /v3/accounts - List accounts (including Virtual IBANs)
 * - GET /v3/balances/:account_id - Get balance
 * - GET /v3/accounts/:account_id/transactions - Get transactions
 * 
 * NOTE: POST /v4/accounts is for creating BENEFICIARIES (external accounts
 * to send money TO), NOT for creating Virtual IBANs for receiving payments.
 */

import { randomUUID } from 'crypto';
import {
  IVirtualIbanProvider,
  VirtualIbanCreateRequest,
  VirtualIbanAccount,
  VirtualIbanTransaction,
  VirtualIbanBalance,
  VirtualIbanWebhookPayload,
} from '../../categories/IVirtualIbanProvider';
import { IntegrationCategory, BaseIntegrationConfig, IntegrationTestResult } from '../../types';

// ==========================================
// CONFIGURATION INTERFACE
// ==========================================

interface BCBConfig extends BaseIntegrationConfig {
  sandbox?: boolean;
  clientId: string;          // OAuth Client ID
  clientSecret?: string;     // OAuth Client Secret
  counterpartyId: string;    // BCB numeric counterparty ID
  baseUrl?: string;          // Services API base URL (v3/v4)
  clientApiUrl?: string;     // Client API base URL for Virtual Accounts
  authUrl?: string;          // OAuth token URL
  cid?: string;              // BCB alpha-numeric client ID (fetched automatically)
  segregatedAccountId?: string; // BCB segregated account ID for virtual accounts
}

// ==========================================
// BCB API RESPONSE TYPES
// ==========================================

interface BCBAccount {
  id: number;
  counterparty_id: number;
  aid: string;               // Alpha-numeric account ID
  cid: string;               // Alpha-numeric counterparty ID
  account_type: 'Bank' | 'Wallet' | 'Custodial';
  ccy: string;               // Currency ticker
  host_name: string;         // Bank name
  host_hub?: string;         // Branch/sort code
  host_location?: string;    // Bank address
  host_country?: string;     // Bank country
  node_name: string;         // Account holder name
  node_address?: string;     // Account number
  node_location?: string;    // Holder address
  node_country?: string;     // Holder country
  iban?: string;
  bic?: string;
  account_label?: string;
  description?: string;
  bcb_controlled: number;    // 1 if BCB controls, 0 otherwise
  settlement_reference?: string;
  created_at: string;
  updated_at: string;
  email?: string;
  is_beneficiary?: number;
}

interface BCBBalance {
  account_id: number;
  ticker: string;
  balance: number;
  account_type: string;
  bcb_controlled: number;
  iban?: string;
  bic?: string;
  host_name?: string;
  host_location?: string;
  host_country?: string;
}

interface BCBTransaction {
  tx_id: string;
  account_id: number;
  network?: string;          // FPS, CHAPS, SWIFT, BLINC
  value_date: string;
  credit: number;            // 1 = credit, 0 = debit
  details: {
    bic?: string;
    iban?: string;
    reference?: string;
    sort_code?: string;
    account_name?: string;
    account_number?: string;
    counterparty_reference?: string;
    endToEndIdentifier?: string;
  };
  ticker: string;
  amount: number;
  approved: number;          // 1 = approved
  notes?: string;
  source_name?: string;
}

interface BCBOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

// ==========================================
// CLIENT API RESPONSE TYPES (Virtual Accounts)
// ==========================================

interface BCBVirtualAccountDetails {
  id: string;
  status: 'ACTIVE' | 'PENDING' | 'CLOSED';
  iban?: string;
  accountNumber?: string;
  sortCode?: string;
  bic?: string;
}

interface BCBVirtualAccountOwnerDetails {
  name: string;
  iban?: string;
  accountNumber?: string;
  sortCode?: string;
  bic?: string;
}

interface BCBVirtualAccountData {
  correlationId: string;
  virtualAccountDetails: BCBVirtualAccountDetails;
  ownerDetails: BCBVirtualAccountOwnerDetails;
}

// ==========================================
// CLIENT API PAYMENT TYPES
// ==========================================

interface BCBPayment {
  transactionId: string;
  virtualAccountId: string; // UUID of the Virtual IBAN
  amount: number;
  currency: string;
  credit: boolean; // true = incoming, false = outgoing
  valueDate: string;
  details: {
    reference?: string;
    endToEndId?: string;
    iban?: string;
    bic?: string;
    accountName?: string;
    accountNumber?: string;
    sortCode?: string;
  };
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  createdAt: string;
}

interface PagedPaymentResponse {
  data: BCBPayment[];
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

interface BCBVirtualAccountListResponse {
  count: number;
  results: BCBVirtualAccountData[];
}

// ==========================================
// ADAPTER IMPLEMENTATION
// ==========================================

export class BCBGroupAdapter implements IVirtualIbanProvider {
  readonly providerId = 'BCB_GROUP_VIRTUAL_IBAN';
  readonly category = IntegrationCategory.VIRTUAL_IBAN as const;

  private config: BCBConfig | null = null;
  private baseUrl: string = '';      // Services API (v3/v4 endpoints)
  private clientApiUrl: string = ''; // Client API for Virtual Accounts
  private authUrl: string = '';
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private cachedCid: string | null = null;
  private segregatedAccountId: number | null = null; // BCB account ID for virtual accounts

  // ==========================================
  // INITIALIZATION
  // ==========================================

  async initialize(config: BaseIntegrationConfig): Promise<void> {
    const bcbConfig = config as BCBConfig;
    
    console.log('[BCB] Initializing with config:', {
      hasClientId: !!bcbConfig.clientId,
      hasClientSecret: !!(bcbConfig.clientSecret || bcbConfig.apiKey),
      counterpartyId: bcbConfig.counterpartyId,
      sandbox: bcbConfig.sandbox,
    });

    // Validate required config
    if (!bcbConfig.counterpartyId) {
      throw new Error('BCB Group: Missing required config (counterpartyId)');
    }

    if (!bcbConfig.clientId) {
      throw new Error('BCB Group: Missing required config (clientId)');
    }

    // Get client secret (from clientSecret or apiKey)
    const clientSecret = bcbConfig.clientSecret || bcbConfig.apiKey;
    if (!clientSecret) {
      throw new Error('BCB Group: Missing required config (clientSecret)');
    }

    // Store config with resolved clientSecret
    this.config = {
      ...bcbConfig,
      clientSecret,
    };

    // Set API URLs based on environment
    const isSandbox = bcbConfig.sandbox ?? true;
    this.baseUrl = bcbConfig.baseUrl || (isSandbox 
      ? 'https://api.uat.bcb.group' 
      : 'https://api.bcb.group');
    
    // Client API for Virtual Accounts (separate from Services API)
    this.clientApiUrl = bcbConfig.clientApiUrl || (isSandbox
      ? 'https://client-api.uat.bcb.group'
      : 'https://client-api.bcb.group');
    
    this.authUrl = bcbConfig.authUrl || (isSandbox
      ? 'https://auth.uat.bcb.group/oauth/token'
      : 'https://auth.bcb.group/oauth/token');

    console.log('[BCB] Configuration:', {
      baseUrl: this.baseUrl,
      clientApiUrl: this.clientApiUrl,
      authUrl: this.authUrl,
      counterpartyId: this.config.counterpartyId,
      sandbox: isSandbox,
    });

    // Test authentication
    await this.authenticate();
    
    // Fetch CID and segregated account ID from first account
    await this.fetchAccountInfo();
  }

  // ==========================================
  // AUTHENTICATION (OAuth 2.0)
  // ==========================================

  private async authenticate(): Promise<string> {
    if (!this.config) {
      throw new Error('BCB Group: Not initialized');
    }

    // Check if token is still valid (with 5 min buffer)
    if (this.token && this.tokenExpiry && this.tokenExpiry.getTime() > Date.now() + 5 * 60 * 1000) {
      return this.token;
    }

    console.log('[BCB] Authenticating via OAuth...');

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        audience: this.baseUrl,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[BCB] Authentication failed:', response.status, error);
      throw new Error(`BCB authentication failed: ${response.status}`);
    }

    const data: BCBOAuthResponse = await response.json();
    this.token = data.access_token;
    
    // Token typically expires in 24h-30d
    const expiresIn = data.expires_in || 86400;
    this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    console.log('[BCB] Authentication successful, token expires:', this.tokenExpiry.toISOString());

    return this.token;
  }

  /**
   * Fetch CID and segregated account ID from existing BCB accounts
   * The segregated account is needed for virtual account creation via Client API
   */
  private async fetchAccountInfo(): Promise<void> {
    // Use cached values if provided
    if (this.config?.cid) {
      this.cachedCid = this.config.cid;
    }
    if (this.config?.segregatedAccountId) {
      this.segregatedAccountId = parseInt(this.config.segregatedAccountId, 10);
    }

    // If we have both, no need to fetch
    if (this.cachedCid && this.segregatedAccountId) {
      console.log('[BCB] Using configured CID and segregated account:', {
        cid: this.cachedCid,
        segregatedAccountId: this.segregatedAccountId,
      });
      return;
    }

    try {
      // Fetch BCB-controlled Bank accounts (these are the segregated accounts for virtual IBANs)
      const accounts = await this.request<BCBAccount[]>(
        'GET', 
        `/v3/accounts?counterparty_id=${this.config?.counterpartyId}&limit=10`
      );

      if (accounts && accounts.length > 0) {
        // Get CID from first account
        if (!this.cachedCid) {
          this.cachedCid = accounts[0].cid;
          console.log('[BCB] Fetched CID from account:', this.cachedCid);
        }

        // IMPORTANT: Find the EUR account marked as "(VIRTUAL)" - this is configured for Client API
        // Account labels like "EUR (VIRTUAL)" indicate accounts enabled for virtual IBAN creation
        const virtualEurAccount = accounts.find(acc => 
          acc.account_type === 'Bank' && 
          acc.bcb_controlled === 1 && 
          acc.iban && 
          acc.ccy === 'EUR' &&
          acc.account_label?.toUpperCase().includes('VIRTUAL')
        );

        if (virtualEurAccount && !this.segregatedAccountId) {
          this.segregatedAccountId = virtualEurAccount.id;
          console.log('[BCB] Found EUR VIRTUAL segregated account:', {
            id: this.segregatedAccountId,
            iban: virtualEurAccount.iban,
            label: virtualEurAccount.account_label,
            ccy: virtualEurAccount.ccy,
          });
        } else if (!virtualEurAccount) {
          // Fallback: try any EUR BCB-controlled Bank account with IBAN
          const eurAccount = accounts.find(acc => 
            acc.account_type === 'Bank' && 
            acc.bcb_controlled === 1 && 
            acc.iban && 
            acc.ccy === 'EUR'
          );
          if (eurAccount && !this.segregatedAccountId) {
            this.segregatedAccountId = eurAccount.id;
            console.log('[BCB] Found EUR segregated account (fallback):', {
              id: this.segregatedAccountId,
              iban: eurAccount.iban,
              label: eurAccount.account_label,
              ccy: eurAccount.ccy,
            });
          }
        }
      }
    } catch (error) {
      console.warn('[BCB] Could not fetch account info:', error);
    }
  }

  // ==========================================
  // HTTP REQUEST HELPER
  // ==========================================

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: Record<string, any>
  ): Promise<T> {
    if (!this.config) {
      throw new Error('BCB Group: Not initialized');
    }

    // Ensure authenticated
    if (!this.token) {
      await this.authenticate();
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };

    console.log(`[BCB] ${method} ${endpoint}`);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Re-authenticate on 401
    if (response.status === 401) {
      console.log('[BCB] Token expired, re-authenticating...');
      this.token = null;
      await this.authenticate();
      
      // Retry request
      const retryResponse = await fetch(url, {
        method,
        headers: {
          ...headers,
          'Authorization': `Bearer ${this.token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.text();
        throw new Error(`BCB API error: ${retryResponse.status} ${error}`);
      }

      return retryResponse.json();
    }

    if (!response.ok) {
      const error = await response.text();
      console.error(`[BCB] API error:`, response.status, error);
      throw new Error(`BCB API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * HTTP request helper for Client API (Virtual Accounts)
   */
  private async clientApiRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: Record<string, any> | Record<string, any>[]
  ): Promise<T> {
    if (!this.config) {
      throw new Error('BCB Group: Not initialized');
    }

    // Ensure authenticated
    if (!this.token) {
      await this.authenticate();
    }

    const url = `${this.clientApiUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };

    console.log(`[BCB Client API] ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Re-authenticate on 401
    if (response.status === 401) {
      console.log('[BCB Client API] Token expired, re-authenticating...');
      this.token = null;
      await this.authenticate();
      
      // Retry request
      const retryResponse = await fetch(url, {
        method,
        headers: {
          ...headers,
          'Authorization': `Bearer ${this.token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.text();
        throw new Error(`BCB Client API error: ${retryResponse.status} ${error}`);
      }

      // 202 Accepted doesn't have body
      if (retryResponse.status === 202) {
        return {} as T;
      }

      return retryResponse.json();
    }

    // 202 Accepted is success for async operations
    if (response.status === 202) {
      console.log('[BCB Client API] Request accepted (202)');
      return {} as T;
    }

    if (!response.ok) {
      const error = await response.text();
      console.error(`[BCB Client API] API error:`, response.status, error);
      throw new Error(`BCB Client API error: ${response.status} ${error}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text);
  }

  // ==========================================
  // INTEGRATION PROVIDER INTERFACE
  // ==========================================

  async test(): Promise<IntegrationTestResult> {
    try {
      await this.authenticate();
      
      // Test by getting account list
      const accounts = await this.request<BCBAccount[]>(
        'GET', 
        `/v3/accounts?counterparty_id=${this.config?.counterpartyId}&limit=5`
      );
      
      return {
        success: true,
        message: `BCB Group connection successful. Found ${accounts.length} account(s).`,
        timestamp: new Date(),
        details: {
          accountCount: accounts.length,
          counterpartyId: this.config?.counterpartyId,
          cid: this.cachedCid,
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `BCB Group connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        details: error,
      };
    }
  }

  isConfigured(): boolean {
    return this.config !== null && 
           !!this.config.clientId && 
           !!this.config.clientSecret &&
           !!this.config.counterpartyId;
  }

  getConfig(): Partial<BaseIntegrationConfig> {
    if (!this.config) return {};
    
    return {
      apiEndpoint: this.baseUrl,
      metadata: {
        counterpartyId: this.config.counterpartyId,
        cid: this.cachedCid,
        sandbox: this.config.sandbox,
      },
    };
  }

  // ==========================================
  // VIRTUAL IBAN PROVIDER INTERFACE
  // ==========================================

  async createAccount(request: VirtualIbanCreateRequest): Promise<VirtualIbanAccount> {
    if (!this.config) {
      throw new Error('BCB Group: Not initialized');
    }

    // Need segregated account ID for Client API
    if (!this.segregatedAccountId) {
      throw new Error('BCB Group: Segregated account ID not available. Please configure a BCB EUR account.');
    }

    console.log('[BCB] Creating virtual IBAN account via Client API:', {
      userId: request.userId,
      currency: request.currency,
      country: request.country,
      segregatedAccountId: this.segregatedAccountId,
    });

    // Format date of birth as YYYY-MM-DD
    const dateOfBirth = request.dateOfBirth 
      ? new Date(request.dateOfBirth).toISOString().split('T')[0]
      : null;

    if (!dateOfBirth) {
      throw new Error('BCB Group: Date of birth is required for virtual account creation');
    }

    // Generate UUID for BCB correlationId (BCB requires UUID format)
    // We'll store this UUID and map it back to our userId
    const correlationId = randomUUID();

    // Build payload for CreateNoBankDetailsVirtualAccountForIndividual
    // This creates a Virtual IBAN for receiving payments (no withdrawal bank details needed)
    const ownerPayload = {
      correlationId, // BCB requires UUID format
      name: `${request.firstName} ${request.lastName}`.substring(0, 255),
      addressLine1: request.address.street.substring(0, 255),
      city: request.address.city.substring(0, 255),
      postcode: request.address.postalCode?.substring(0, 255),
      country: request.address.country.substring(0, 2).toUpperCase(),
      nationality: (request.nationality || request.address.country).substring(0, 2).toUpperCase(),
      dateOfBirth,
      isIndividual: true,
    };

    console.log('[BCB] Client API - Create virtual account payload:', ownerPayload);

    // Client API expects an array of owners
    try {
      await this.clientApiRequest<void>(
        'POST', 
        `/v2/accounts/${this.segregatedAccountId}/virtual`,
        [ownerPayload]
      );
    } catch (error) {
      // Provide more specific error messages
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      if (errorMsg.includes('No segregated account found')) {
        throw new Error(
          'BCB Client API: Segregated account not configured for virtual accounts. ' +
          'Please contact BCB support to enable Client API access for your account.'
        );
      }
      
      throw error;
    }

    console.log('[BCB] Virtual account creation request accepted (202)');

    // BCB creates accounts asynchronously - poll until we get the IBAN
    // Typically takes 1-5 seconds in sandbox, up to 30 seconds in production
    const maxAttempts = 10;
    const pollInterval = 2000; // 2 seconds between attempts
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.sleep(pollInterval);
      
      console.log(`[BCB] Polling for virtual account (attempt ${attempt}/${maxAttempts})...`);
      
      const virtualAccount = await this.findVirtualAccountByCorrelationId(correlationId);
      
      if (virtualAccount) {
        const details = virtualAccount.virtualAccountDetails;
        
        // Check if IBAN is ready (not just PENDING status)
        if (details?.iban && details.status === 'ACTIVE') {
          console.log('[BCB] Virtual account ready:', {
            correlationId: virtualAccount.correlationId,
            iban: details.iban,
            status: details.status,
          });
          
          return this.mapClientApiAccountToVirtualIban(virtualAccount, request.userId, request.country);
        }
        
        console.log('[BCB] Account found but not ready yet:', {
          status: details?.status,
          hasIban: !!details?.iban,
        });
      }
    }

    // After max attempts, return what we have (might still be pending)
    const finalAccount = await this.findVirtualAccountByCorrelationId(correlationId);
    
    if (finalAccount) {
      console.log('[BCB] Returning account (may still be pending):', {
        correlationId: finalAccount.correlationId,
        iban: finalAccount.virtualAccountDetails?.iban || 'PENDING',
        status: finalAccount.virtualAccountDetails?.status,
      });
      
      return this.mapClientApiAccountToVirtualIban(finalAccount, request.userId, request.country);
    }

    // Fallback - return pending status with correlation ID for later sync
    console.log('[BCB] Account not found after polling, returning pending status');
    
    return {
      accountId: `pending-${correlationId}`,
      userId: request.userId,
      iban: 'PENDING',
      bic: undefined,
      bankName: 'BCB Partner Bank',
      accountHolder: `${request.firstName} ${request.lastName}`,
      currency: request.currency,
      country: request.country,
      status: 'pending',
      balance: 0,
      createdAt: new Date(),
      metadata: {
        bcbCorrelationId: correlationId,
        segregatedAccountId: this.segregatedAccountId,
        creationPending: true,
      },
    };
  }

  /**
   * Helper to add delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Find virtual account by correlation ID
   */
  private async findVirtualAccountByCorrelationId(correlationId: string): Promise<BCBVirtualAccountData | null> {
    if (!this.segregatedAccountId) return null;

    try {
      const response = await this.clientApiRequest<BCBVirtualAccountListResponse>(
        'GET',
        `/v1/accounts/${this.segregatedAccountId}/virtual/all-account-data?pageSize=100`
      );

      const account = response.results?.find(acc => acc.correlationId === correlationId);
      return account || null;
    } catch (error) {
      console.warn('[BCB] Error fetching virtual accounts:', error);
      return null;
    }
  }

  /**
   * Sync pending account - fetch latest status from BCB
   * Called for accounts that were created but IBAN wasn't ready yet
   */
  async syncPendingAccount(correlationId: string, userId: string, country?: string): Promise<VirtualIbanAccount | null> {
    console.log('[BCB] Syncing pending account:', correlationId);

    // Ensure we have segregated account ID
    if (!this.segregatedAccountId) {
      await this.fetchAccountInfo();
    }

    const virtualAccount = await this.findVirtualAccountByCorrelationId(correlationId);
    
    if (!virtualAccount) {
      console.warn('[BCB] Account not found for correlation ID:', correlationId);
      return null;
    }

    const details = virtualAccount.virtualAccountDetails;
    
    if (details?.iban && details.status === 'ACTIVE') {
      console.log('[BCB] Account is now active:', {
        iban: details.iban,
        status: details.status,
      });
      
      return this.mapClientApiAccountToVirtualIban(virtualAccount, userId, country);
    }

    console.log('[BCB] Account still pending:', {
      status: details?.status,
      hasIban: !!details?.iban,
    });

    return null;
  }

  /**
   * Get all virtual accounts for the segregated account
   * Useful for reconciliation and admin views
   */
  async getAllVirtualAccounts(): Promise<BCBVirtualAccountData[]> {
    if (!this.segregatedAccountId) {
      await this.fetchAccountInfo();
    }

    if (!this.segregatedAccountId) {
      return [];
    }

    try {
      const response = await this.clientApiRequest<BCBVirtualAccountListResponse>(
        'GET',
        `/v1/accounts/${this.segregatedAccountId}/virtual/all-account-data?pageSize=1000`
      );

      return response.results || [];
    } catch (error) {
      console.error('[BCB] Error fetching all virtual accounts:', error);
      return [];
    }
  }

  async getAccountDetails(accountId: string): Promise<VirtualIbanAccount> {
    const accounts = await this.request<BCBAccount[]>(
      'GET',
      `/v3/accounts?id=${accountId}`
    );

    if (!accounts || accounts.length === 0) {
      throw new Error(`Account ${accountId} not found`);
    }

    return this.mapBcbAccountToVirtualIban(accounts[0]);
  }

  async getTransactions(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<VirtualIbanTransaction[]> {
    // For Virtual IBAN transactions, we need to use the Client API
    // accountId here is actually the Virtual IBAN UUID (providerAccountId)
    // We need to get payments from the segregated account and filter by Virtual IBAN
    
    // Build query parameters
    const params = new URLSearchParams();
    if (startDate) {
      params.append('dateFrom', startDate.toISOString());
    }
    if (endDate) {
      params.append('dateTo', endDate.toISOString());
    }
    params.append('pageSize', '1000'); // Max allowed by API
    
    const endpoint = `/v1/accounts/${this.segregatedAccountId}/payments?${params.toString()}`;
    
    // Use Client API
    const response = await this.clientApiRequest<PagedPaymentResponse>('GET', endpoint);
    
    if (!response || !response.data) {
      return [];
    }
    
    // Filter payments by Virtual IBAN (accountId is the Virtual IBAN UUID)
    // and map to our VirtualIbanTransaction format
    return response.data
      .filter(payment => payment.virtualAccountId === accountId)
      .map(payment => this.mapClientApiPaymentToVirtualIban(payment));
  }

  async getBalance(accountId: string): Promise<VirtualIbanBalance> {
    const balances = await this.request<BCBBalance[]>(
      'GET',
      `/v3/balances/${accountId}`
    );

    if (!balances || balances.length === 0) {
      throw new Error(`Balance for account ${accountId} not found`);
    }

    const balance = balances[0];

    return {
      balance: balance.balance,
      currency: balance.ticker,
      availableBalance: balance.balance,
      lastUpdated: new Date(),
    };
  }

  async suspendAccount(accountId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    // BCB doesn't have direct suspend - would need to contact support
    console.warn('[BCB] Account suspension not directly supported via API');
    return {
      success: false,
      error: 'Account suspension requires contacting BCB support',
    };
  }

  async reactivateAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
    // BCB doesn't have direct reactivation - would need to contact support
    console.warn('[BCB] Account reactivation not directly supported via API');
    return {
      success: false,
      error: 'Account reactivation requires contacting BCB support',
    };
  }

  async closeAccount(iban: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.segregatedAccountId) {
      await this.fetchAccountInfo();
    }

    if (!this.segregatedAccountId) {
      return {
        success: false,
        error: 'Segregated account ID not available',
      };
    }

    try {
      console.log('[BCB] Closing virtual account:', { iban, reason });

      await this.clientApiRequest<void>(
        'POST',
        `/v1/accounts/${this.segregatedAccountId}/virtual/${iban}/close`
      );

      console.log('[BCB] Virtual account closed successfully');

      return { success: true };
    } catch (error) {
      console.error('[BCB] Failed to close account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close account',
      };
    }
  }

  // ==========================================
  // WEBHOOK HANDLING
  // ==========================================

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // BCB webhook verification - implement based on BCB's webhook spec
    // For now, return true (implement actual verification when BCB provides spec)
    console.warn('[BCB] Webhook signature verification not implemented');
    return true;
  }

  processWebhook(payload: any): VirtualIbanWebhookPayload {
    // Normalize BCB webhook payload
    return {
      accountId: payload.account_id?.toString() || '',
      transactionId: payload.tx_id || '',
      type: payload.credit === 1 ? 'credit' : 'debit',
      amount: payload.amount || 0,
      currency: payload.ticker || payload.ccy || '',
      senderName: payload.details?.account_name,
      senderIban: payload.details?.iban,
      reference: payload.details?.reference || payload.details?.counterparty_reference,
      metadata: payload,
    };
  }

  // ==========================================
  // MAPPING HELPERS
  // ==========================================

  private mapBcbAccountToVirtualIban(
    bcbAccount: BCBAccount,
    userId?: string
  ): VirtualIbanAccount {
    return {
      accountId: bcbAccount.id.toString(),
      userId: userId || bcbAccount.settlement_reference || '',
      iban: bcbAccount.iban || '',
      bic: bcbAccount.bic,
      bankName: bcbAccount.host_name || 'BCB Partner Bank',
      accountHolder: bcbAccount.node_name,
      currency: bcbAccount.ccy,
      country: bcbAccount.host_country || bcbAccount.node_country || '',
      status: 'active', // BCB doesn't have status field
      balance: undefined, // Need separate balance call
      createdAt: new Date(bcbAccount.created_at),
      metadata: {
        aid: bcbAccount.aid,
        cid: bcbAccount.cid,
        counterpartyId: bcbAccount.counterparty_id,
        bcbControlled: bcbAccount.bcb_controlled === 1,
        accountType: bcbAccount.account_type,
        email: bcbAccount.email,
      },
    };
  }

  /**
   * Map Client API Virtual Account to internal format
   */
  private mapClientApiAccountToVirtualIban(
    virtualAccount: BCBVirtualAccountData,
    userId: string,
    country?: string
  ): VirtualIbanAccount {
    const details = virtualAccount.virtualAccountDetails;
    const owner = virtualAccount.ownerDetails;
    
    // Map status to Prisma enum (UPPERCASE)
    let status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'CLOSED' | 'FAILED' = 'PENDING';
    if (details.status === 'ACTIVE') status = 'ACTIVE';
    else if (details.status === 'CLOSED') status = 'CLOSED';
    else if (details.status === 'PENDING') status = 'PENDING';
    
    // Extract country from IBAN (country where the account is physically located)
    // BCB assigns IBANs from their pool, so IBAN country may differ from user's country
    let accountCountry = '';
    if (details.iban) {
      // IBAN first 2 letters are country code (e.g., DK for Denmark)
      accountCountry = details.iban.substring(0, 2);
    } else if (country) {
      // Fallback to provided country if IBAN not yet available
      accountCountry = country;
    }
    
    return {
      accountId: details.id,
      userId,
      iban: details.iban || 'PENDING',
      bic: details.bic || owner.bic,
      bankName: 'BCB Partner Bank',
      accountHolder: owner.name,
      currency: 'EUR', // Client API is for EUR accounts
      country: accountCountry,
      status,
      balance: undefined,
      createdAt: new Date(),
      metadata: {
        correlationId: virtualAccount.correlationId,
        accountNumber: details.accountNumber,
        sortCode: details.sortCode,
        segregatedAccountId: this.segregatedAccountId,
      },
    };
  }

  private mapBcbTransactionToVirtualIban(tx: BCBTransaction): VirtualIbanTransaction {
    return {
      transactionId: tx.tx_id,
      accountId: tx.account_id.toString(),
      type: tx.credit === 1 ? 'credit' : 'debit',
      amount: tx.amount,
      currency: tx.ticker,
      senderName: tx.details?.account_name,
      senderIban: tx.details?.iban,
      reference: tx.details?.reference || tx.details?.counterparty_reference,
      status: tx.approved === 1 ? 'completed' : 'pending',
      processedAt: new Date(tx.value_date),
      metadata: {
        network: tx.network,
        notes: tx.notes,
        sourceName: tx.source_name,
        endToEndId: tx.details?.endToEndIdentifier,
      },
    };
  }

  /**
   * Map BCB Client API Payment to VirtualIbanTransaction
   */
  private mapClientApiPaymentToVirtualIban(payment: BCBPayment): VirtualIbanTransaction {
    return {
      transactionId: payment.transactionId,
      accountId: payment.virtualAccountId,
      type: payment.credit ? 'credit' : 'debit',
      amount: payment.amount,
      currency: payment.currency,
      senderName: payment.details?.accountName,
      senderIban: payment.details?.iban,
      senderBic: payment.details?.bic,
      reference: payment.details?.reference,
      status: payment.status === 'COMPLETED' ? 'completed' : 
              payment.status === 'PENDING' ? 'pending' : 'failed',
      processedAt: new Date(payment.valueDate),
      metadata: {
        endToEndId: payment.details?.endToEndId,
        accountNumber: payment.details?.accountNumber,
        sortCode: payment.details?.sortCode,
        createdAt: payment.createdAt,
      },
    };
  }
}
