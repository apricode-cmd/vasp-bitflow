/**
 * Admin API - Test BCB API Connectivity
 * 
 * POST /api/admin/test-bcb-api
 * 
 * Tests BCB API endpoints and returns detailed diagnostics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const result = await requireAdminRole('ADMIN');
    if (result instanceof NextResponse) {
      return result;
    }

    console.log('[Test BCB API] Starting diagnostics...');

    const results: any[] = [];
    const provider = await integrationFactory.getVirtualIbanProvider();

    // Test 1: Get Accounts
    try {
      console.log('[Test 1] Fetching accounts...');
      const accounts = await (provider as any).request('GET', '/v3/accounts?counterparty_id=13608&limit=10');
      
      results.push({
        test: 'GET /v3/accounts',
        status: 'SUCCESS',
        data: {
          count: accounts?.length || 0,
          accounts: accounts?.map((a: any) => ({
            id: a.id,
            type: a.account_type,
            currency: a.ccy,
            iban: a.iban || 'N/A',
            label: a.account_label,
          })) || [],
        },
      });
    } catch (error: any) {
      results.push({
        test: 'GET /v3/accounts',
        status: 'FAILED',
        error: error.message,
      });
    }

    // Test 2: Get Virtual Accounts
    try {
      console.log('[Test 2] Fetching virtual accounts...');
      const virtualAccounts = await (provider as any).clientApiRequest('GET', '/v1/accounts/17218/virtual/all-account-data');
      
      results.push({
        test: 'GET /v1/accounts/{id}/virtual/all-account-data',
        status: 'SUCCESS',
        data: {
          count: virtualAccounts?.count || 0,
          accounts: virtualAccounts?.results?.map((va: any) => ({
            id: va.virtualAccountDetails.id,
            status: va.virtualAccountDetails.status,
            iban: va.virtualAccountDetails.iban || 'PENDING',
            owner: va.ownerDetails.name,
          })) || [],
        },
      });
    } catch (error: any) {
      results.push({
        test: 'GET /v1/accounts/{id}/virtual/all-account-data',
        status: 'FAILED',
        error: error.message,
      });
    }

    // Test 3: Get Payments (last 30 days)
    try {
      console.log('[Test 3] Fetching payments...');
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endpoint = `/v1/accounts/17218/payments?dateFrom=${thirtyDaysAgo.toISOString()}&pageSize=100`;
      
      const payments = await (provider as any).clientApiRequest('GET', endpoint);
      
      results.push({
        test: 'GET /v1/accounts/{id}/payments',
        status: 'SUCCESS',
        data: {
          totalRecords: payments?.totalRecords || 0,
          results: payments?.results?.slice(0, 5).map((p: any) => ({
            transactionId: p.transactionId,
            virtualAccountId: p.virtualAccountId,
            type: p.credit ? 'CREDIT' : 'DEBIT',
            amount: p.amount,
            currency: p.currency,
            status: p.status,
            createdAt: p.createdAt,
          })) || [],
        },
      });
    } catch (error: any) {
      results.push({
        test: 'GET /v1/accounts/{id}/payments',
        status: 'FAILED',
        error: error.message,
      });
    }

    // Test 4: Get Balances
    try {
      console.log('[Test 4] Fetching balances...');
      const balances = await (provider as any).request('GET', '/v3/balances/17218');
      
      results.push({
        test: 'GET /v3/balances/{id}',
        status: 'SUCCESS',
        data: {
          count: balances?.length || 0,
          balances: balances?.map((b: any) => ({
            accountId: b.account_id,
            currency: b.ticker,
            balance: b.balance,
            iban: b.iban || 'N/A',
          })) || [],
        },
      });
    } catch (error: any) {
      results.push({
        test: 'GET /v3/balances/{id}',
        status: 'FAILED',
        error: error.message,
      });
    }

    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    const failedCount = results.filter(r => r.status === 'FAILED').length;

    console.log(`[Test BCB API] Completed: ${successCount} passed, ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        passed: successCount,
        failed: failedCount,
      },
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Test BCB API] Failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

