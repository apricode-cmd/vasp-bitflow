/**
 * PayOut Details Page
 * 
 * Complete PayOut view with:
 * - Header with status and actions
 * - Quick stats (4 metrics)
 * - Tabs: Overview, History
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PayOutHeader } from './_components/PayOutHeader';
import { PayOutQuickStats } from './_components/PayOutQuickStats';
import { PayOutOverviewTab } from './_components/PayOutOverviewTab';
import { PayOutHistoryTab } from './_components/PayOutHistoryTab';
import { toast } from 'sonner';

interface PayOutDetails {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  destinationAddress: string;
  destinationTag: string | null;
  networkFee: number | null;
  status: string;
  
  // Blockchain information
  transactionHash: string | null;
  blockNumber: number | null;
  confirmations: number;
  explorerUrl: string | null;
  
  // Recipient information
  recipientName: string | null;
  
  // Processing
  processedBy: string | null;
  processedAt: string | null;
  processingNotes: string | null;
  
  // Approval workflow
  approvalRequired: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  initiatedBy: string | null;
  initiatedAt: string | null;
  
  // Timestamps
  sentAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  
  order: {
    id: string;
    paymentReference: string;
    cryptoAmount: number;
    currencyCode: string;
    status: string;
    fiatAmount: number;
    rate: number;
    feePercent: number;
    feeAmount: number;
    totalFiat: number;
  };
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      phoneNumber: string | null;
      country: string;
    } | null;
  };
  cryptocurrency: {
    code: string;
    name: string;
    symbol: string;
  };
  network: {
    code: string;
    name: string;
    chainId: string | null;
  };
  paymentMethod: {
    code: string;
    name: string;
    description: string | null;
  } | null;
  userWallet: {
    id: string;
    address: string;
    label: string | null;
    isVerified: boolean;
  } | null;
  processor: {
    id: string;
    email: string;
  } | null;
  approver: {
    id: string;
    email: string;
  } | null;
  initiator: {
    id: string;
    email: string;
  } | null;
}

export default function PayOutDetailsPage(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [payOut, setPayOut] = useState<PayOutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPayOutDetails();
  }, [id]);

  const fetchPayOutDetails = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/pay-out/${id}`);
      const data = await response.json();

      if (data.success) {
        setPayOut(data.data);
      } else {
        toast.error('Failed to fetch PayOut details');
      }
    } catch (error) {
      console.error('Fetch PayOut details error:', error);
      toast.error('Failed to fetch PayOut details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string): Promise<void> => {
    if (!payOut) return;

    try {
      setRefreshing(true);
      const response = await fetch(`/api/admin/pay-out/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`PayOut status updated to ${newStatus}`);
        await fetchPayOutDetails();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update PayOut status error:', error);
      toast.error('Failed to update status');
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAsSent = async (): Promise<void> => {
    await handleStatusUpdate('SENT');
  };

  const handleConfirm = async (): Promise<void> => {
    await handleStatusUpdate('CONFIRMED');
  };

  const handleFail = async (): Promise<void> => {
    await handleStatusUpdate('FAILED');
  };

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchPayOutDetails();
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!payOut) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-lg font-semibold">PayOut not found</p>
          <p className="text-sm text-muted-foreground mt-2">
            The PayOut transaction you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PayOutHeader
        payOut={payOut}
        onMarkAsSent={handleMarkAsSent}
        onConfirm={handleConfirm}
        onFail={handleFail}
        onRefresh={handleRefresh}
        isLoading={refreshing}
      />

      {/* Quick Stats */}
      <PayOutQuickStats 
        payOut={payOut} 
        onMarkAsSent={handleMarkAsSent}
        onConfirm={handleConfirm}
        onFail={handleFail}
      />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <PayOutOverviewTab payOut={payOut} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <PayOutHistoryTab payOutId={payOut.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

