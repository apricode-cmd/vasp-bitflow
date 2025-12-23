/**
 * Virtual IBAN Custom Hook
 * 
 * Manages state and API calls for Virtual IBAN functionality
 * Features:
 * - Auto-polling for balance updates (every 30 seconds when account is active)
 * - Auto-sync PENDING accounts
 * - Manual refresh
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { VirtualIbanAccount, VirtualIbanTransaction, EligibilityData, TopUpRequest } from './types';

// Polling intervals
const BALANCE_POLL_INTERVAL = 30 * 1000; // 30 seconds for balance updates

interface UseVirtualIbanReturn {
  // State
  loading: boolean;
  creating: boolean;
  refreshing: boolean;
  account: VirtualIbanAccount | null;
  transactions: VirtualIbanTransaction[];
  topUpRequests: TopUpRequest[];
  eligibility: EligibilityData | null;
  
  // Actions
  checkEligibility: () => Promise<void>;
  createAccount: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useVirtualIban(): UseVirtualIbanReturn {
  // All useState hooks first
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [account, setAccount] = useState<VirtualIbanAccount | null>(null);
  const [transactions, setTransactions] = useState<VirtualIbanTransaction[]>([]);
  const [topUpRequests, setTopUpRequests] = useState<TopUpRequest[]>([]);
  const [eligibility, setEligibility] = useState<EligibilityData | null>(null);

  // useRef for tracking balance changes
  const prevBalanceRef = useRef<number | null>(null);

  const checkEligibility = useCallback(async () => {
    try {
      const response = await fetch('/api/client/virtual-iban/create');
      const data = await response.json();

      if (response.ok && data.success) {
        setEligibility(data);
        
        if (data.existingAccount) {
          setAccount(data.existingAccount);
          
          // Fetch transactions and top-up requests in parallel
          try {
            const [txResponse, topUpResponse] = await Promise.all([
              fetch(`/api/client/virtual-iban/${data.existingAccount.id}/transactions`),
              fetch(`/api/client/virtual-iban/${data.existingAccount.id}/topup`),
            ]);
            
            const [txData, topUpData] = await Promise.all([
              txResponse.json(),
              topUpResponse.json(),
            ]);
            
            if (txData.success) {
              setTransactions(txData.data || []);
            }
            if (topUpData.success) {
              setTopUpRequests(topUpData.data || []);
            }
          } catch {
            console.error('Failed to fetch transactions/top-up requests');
          }
        }
      }
    } catch (error) {
      console.error('Failed to check eligibility:', error);
      toast.error('Failed to load Virtual IBAN data');
    }
  }, []);

  const createAccount = useCallback(async (editedData?: Partial<UserData>): Promise<boolean> => {
    console.log('[useVirtualIban] ========================================');
    console.log('[useVirtualIban] createAccount called');
    console.log('[useVirtualIban] editedData:', editedData);
    console.log('[useVirtualIban] ========================================');
    
    setCreating(true);
    
    try {
      console.log('[useVirtualIban] Creating account with edited data:', editedData);
      console.log('[useVirtualIban] Making POST request to /api/client/virtual-iban/create');
      
      const response = await fetch('/api/client/virtual-iban/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ editedData: editedData || undefined }),
      });
      
      console.log('[useVirtualIban] Response received:', { 
        ok: response.ok, 
        status: response.status,
        statusText: response.statusText 
      });

      const data = await response.json();
      console.log('[useVirtualIban] API response:', { ok: response.ok, status: response.status, data });

      if (response.ok && data.success) {
        setAccount(data.data);
        toast.success('Virtual IBAN created successfully!', {
          description: data.alreadyExists 
            ? 'Your existing IBAN was retrieved.'
            : `Your new IBAN: ${data.data.iban}`,
          duration: 5000,
        });
        
        await checkEligibility();
        return true;
      } else {
        // Handle specific error codes
        if (data.code === 'KYC_REQUIRED') {
          toast.error('KYC Verification Required', { 
            description: data.message,
            duration: 6000,
          });
        } else if (data.code === 'PROFILE_INCOMPLETE' || data.code === 'MISSING_PROFILE_DATA') {
          toast.error('Profile Incomplete', { 
            description: data.message || `Missing: ${data.missingFields?.join(', ')}`,
            duration: 6000,
          });
        } else if (data.code === 'VALIDATION_ERROR') {
          toast.error('Validation Error', {
            description: data.message || `Validation failed: ${data.validationErrors?.join(', ')}`,
            duration: 6000,
          });
        } else if (data.code === 'VIRTUAL_IBAN_CREATION_TIMEOUT') {
          // Specific handling for BCB timeout
          toast.error('Virtual IBAN Creation Timeout', {
            description: 'BCB Group did not confirm account creation within 15 seconds. ' +
                        'This may indicate data validation issues. Please verify your profile data and try again.',
            duration: 10000,
          });
        } else {
          // Check if error message mentions timeout or validation
          const errorMsg = data.error || data.details || 'Failed to create Virtual IBAN';
          const isTimeout = errorMsg.toLowerCase().includes('timeout');
          const isValidation = errorMsg.toLowerCase().includes('validation') || 
                              errorMsg.toLowerCase().includes('data') ||
                              errorMsg.toLowerCase().includes('verify');
          
          toast.error(
            isTimeout ? 'Account Creation Timeout' : 'Creation Failed', 
            { 
              description: isValidation || isTimeout 
                ? 'Please verify your profile data (name, address, country match) and try again. Contact support if the issue persists.'
                : errorMsg,
              duration: 8000,
            }
          );
        }
        return false;
      }
    } catch (error) {
      console.error('Create account error:', error);
      toast.error('Network Error', {
        description: 'Unable to reach the server. Please check your connection and try again.',
        duration: 6000,
      });
      return false;
    } finally {
      setCreating(false);
    }
  }, [checkEligibility]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await checkEligibility();
      toast.success('Data refreshed successfully');
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, [checkEligibility]);

  // Silent refresh (no toast, for auto-polling)
  const silentRefresh = useCallback(async () => {
    try {
      const response = await fetch('/api/client/virtual-iban/create');
      const data = await response.json();

      if (response.ok && data.success && data.existingAccount) {
        const newAccount = data.existingAccount;
        const newBalance = newAccount.balance || 0;
        const prevBalance = prevBalanceRef.current;

        // Check if balance increased
        if (prevBalance !== null && newBalance > prevBalance) {
          const diff = newBalance - prevBalance;
          toast.success('Balance Updated!', {
            description: `+€${diff.toFixed(2)} received`,
          });
        }

        prevBalanceRef.current = newBalance;
        setAccount(newAccount);
        setEligibility(data);

        // Refresh transactions and top-up requests
        try {
          const [txResponse, topUpResponse] = await Promise.all([
            fetch(`/api/client/virtual-iban/${newAccount.id}/transactions`),
            fetch(`/api/client/virtual-iban/${newAccount.id}/topup`),
          ]);
          
          const [txData, topUpData] = await Promise.all([
            txResponse.json(),
            topUpResponse.json(),
          ]);
          
          if (txData.success) {
            setTransactions(txData.data || []);
          }
          if (topUpData.success) {
            setTopUpRequests(topUpData.data || []);
          }
        } catch {
          // Silent fail for transactions
        }
      }
    } catch {
      // Silent fail for auto-polling
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await checkEligibility();
      setLoading(false);
    };
    init();
  }, [checkEligibility]);

  // Auto-polling for balance updates (only when account is ACTIVE)
  useEffect(() => {
    if (!account || account.status !== 'ACTIVE') return;

    // Set initial balance ref
    if (prevBalanceRef.current === null) {
      prevBalanceRef.current = account.balance || 0;
    }

    console.log('[VirtualIBAN] Starting balance polling (every 30s)...');

    const interval = setInterval(() => {
      silentRefresh();
    }, BALANCE_POLL_INTERVAL);

    return () => {
      console.log('[VirtualIBAN] Stopping balance polling');
      clearInterval(interval);
    };
  }, [account, silentRefresh]);

  return {
    loading,
    creating,
    refreshing,
    account,
    transactions,
    topUpRequests,
    eligibility,
    checkEligibility,
    createAccount,
    refresh,
  };
}

