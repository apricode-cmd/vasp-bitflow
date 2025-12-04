/**
 * Virtual IBAN Account Details Page
 * 
 * Детальная страница счёта с:
 * - Header (IBAN, BIC, status, actions)
 * - Quick Stats (balance, transactions, etc.)
 * - Tabs: Overview, Transactions, Top-Up Requests
 * 
 * Переиспользует паттерн из users/[id]/page.tsx
 */

'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { VirtualIbanHeader } from './_components/VirtualIbanHeader';
import { VirtualIbanQuickStats } from './_components/VirtualIbanQuickStats';
import { OverviewTab } from './_components/OverviewTab';
import { TransactionsTab } from './_components/TransactionsTab';
import { TopUpRequestsTab } from './_components/TopUpRequestsTab';
import { toast } from 'sonner';

interface PageProps {
  params: {
    id: string;
  };
}

export default function VirtualIbanDetailsPage({ params }: PageProps): JSX.Element {
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [topUpRequests, setTopUpRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccountDetails();
  }, [params.id]);

  const fetchAccountDetails = async (): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/virtual-iban/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setAccount({
          ...data.data.account,
          createdAt: new Date(data.data.account.createdAt),
          updatedAt: new Date(data.data.account.updatedAt),
          lastBalanceUpdate: data.data.account.lastBalanceUpdate 
            ? new Date(data.data.account.lastBalanceUpdate) 
            : null,
          suspendedAt: data.data.account.suspendedAt 
            ? new Date(data.data.account.suspendedAt) 
            : null,
        });

        setTransactions(data.data.transactions.map((tx: any) => ({
          ...tx,
          createdAt: new Date(tx.createdAt),
          processedAt: tx.processedAt ? new Date(tx.processedAt) : null,
          reconciledAt: tx.reconciledAt ? new Date(tx.reconciledAt) : null,
        })));

        // Set top-up requests
        if (data.data.topUpRequests) {
          setTopUpRequests(data.data.topUpRequests.map((req: any) => ({
            ...req,
            createdAt: new Date(req.createdAt),
            expiresAt: new Date(req.expiresAt),
            completedAt: req.completedAt ? new Date(req.completedAt) : null,
            cancelledAt: req.cancelledAt ? new Date(req.cancelledAt) : null,
          })));
        }
      } else {
        toast.error('Failed to load account details');
      }
    } catch (error) {
      console.error('Fetch account error:', error);
      toast.error('Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (): Promise<void> => {
    const toastId = toast.loading('Syncing account...');
    try {
      const response = await fetch(`/api/admin/virtual-iban/${params.id}/sync`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Account synced successfully', { id: toastId });
        fetchAccountDetails();
      } else {
        toast.error('Failed to sync account', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to sync account', { id: toastId });
    }
  };

  const handleSuspend = async (): Promise<void> => {
    const toastId = toast.loading('Suspending account...');
    try {
      const response = await fetch(`/api/admin/virtual-iban/${params.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Suspended by admin' }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Account suspended', { id: toastId });
        fetchAccountDetails();
      } else {
        toast.error('Failed to suspend account', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to suspend account', { id: toastId });
    }
  };

  const handleReactivate = async (): Promise<void> => {
    const toastId = toast.loading('Reactivating account...');
    try {
      const response = await fetch(`/api/admin/virtual-iban/${params.id}/reactivate`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Account reactivated', { id: toastId });
        fetchAccountDetails();
      } else {
        toast.error('Failed to reactivate account', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to reactivate account', { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Account not found</p>
      </div>
    );
  }

  // Calculate stats
  const completedTransactions = transactions.filter(tx => tx.status === 'COMPLETED');
  const creditTransactions = completedTransactions.filter(tx => tx.type === 'CREDIT');
  const totalReceived = creditTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const unreconciledCount = transactions.filter(tx => !tx.orderId && !tx.payInId && tx.type === 'CREDIT').length;

  const stats = {
    balance: account.balance,
    currency: account.currency,
    totalTransactions: completedTransactions.length,
    totalReceived,
    unreconciledCount,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <VirtualIbanHeader
        account={account}
        onSync={handleSync}
        onSuspend={handleSuspend}
        onReactivate={handleReactivate}
      />

      {/* Quick Stats */}
      <VirtualIbanQuickStats stats={stats} />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions ({transactions.length})
          </TabsTrigger>
          <TabsTrigger value="topup-requests">
            Top-Up Requests ({topUpRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab account={account} />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsTab 
            transactions={transactions} 
            accountCurrency={account.currency}
            userId={account.userId}
            onRefresh={fetchAccountDetails}
          />
        </TabsContent>

        <TabsContent value="topup-requests">
          <TopUpRequestsTab 
            requests={topUpRequests} 
            accountCurrency={account.currency} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}





