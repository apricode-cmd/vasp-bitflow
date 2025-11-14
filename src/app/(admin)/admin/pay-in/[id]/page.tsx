/**
 * PayIn Details Page
 * 
 * Complete PayIn view with:
 * - Header with status and actions
 * - Quick stats (4 metrics)
 * - Tabs: Overview, History
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PayInHeader } from './_components/PayInHeader';
import { PayInQuickStats } from './_components/PayInQuickStats';
import { PayInOverviewTab } from './_components/PayInOverviewTab';
import { PayInHistoryTab } from './_components/PayInHistoryTab';
import { toast } from 'sonner';

interface PayInDetails {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  expectedAmount: number;
  receivedAmount: number | null;
  amountMismatch: boolean;
  currencyType: string;
  status: string;
  
  // Sender information
  senderName: string | null;
  senderAccount: string | null;
  senderBank: string | null;
  reference: string | null;
  
  // Blockchain information
  senderAddress: string | null;
  transactionHash: string | null;
  blockNumber: number | null;
  confirmations: number;
  explorerUrl: string | null;
  
  transactionId: string | null;
  paymentDate: string | null;
  receivedDate: string | null;
  
  // Verification
  verifiedBy: string | null;
  verifiedAt: string | null;
  reconciledBy: string | null;
  reconciledAt: string | null;
  verificationNotes: string | null;
  
  // Approval workflow
  approvalRequired: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  initiatedBy: string | null;
  initiatedAt: string | null;
  
  // Proofs
  proofUrls: string[];
  
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
    paymentProofs: Array<{
      id: string;
      fileUrl: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      uploadedAt: string;
      user: {
        email: string;
      };
    }>;
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
  fiatCurrency: {
    code: string;
    name: string;
    symbol: string;
  } | null;
  cryptocurrency: {
    code: string;
    name: string;
    symbol: string;
  } | null;
  paymentMethod: {
    code: string;
    name: string;
    description: string | null;
    type: string;
    instructions: string | null;
    bankAccount: {
      id: string;
      currency: string;
      bankName: string;
      bankAddress: string | null;
      accountHolder: string;
      iban: string;
      swift: string | null;
      bic: string | null;
      sortCode: string | null;
      referenceTemplate: string;
      instructions: string | null;
    } | null;
    paymentAccount: {
      id: string;
      code: string;
      name: string;
      type: string;
      bankName: string | null;
      bankAddress: string | null;
      accountHolder: string | null;
      iban: string | null;
      swift: string | null;
      bic: string | null;
      sortCode: string | null;
      address: string | null;
      instructions: string | null;
    } | null;
  } | null;
  network: {
    code: string;
    name: string;
  } | null;
  verifier: {
    id: string;
    email: string;
  } | null;
  reconciler: {
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

export default function PayInDetailsPage(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [payIn, setPayIn] = useState<PayInDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPayInDetails();
  }, [id]);

  const fetchPayInDetails = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/pay-in/${id}`);
      const data = await response.json();

      if (data.success) {
        setPayIn(data.data);
      } else {
        toast.error('Failed to fetch PayIn details');
      }
    } catch (error) {
      console.error('Fetch PayIn details error:', error);
      toast.error('Failed to fetch PayIn details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string): Promise<void> => {
    if (!payIn) return;

    try {
      setRefreshing(true);
      const response = await fetch(`/api/admin/pay-in/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`PayIn status updated to ${newStatus}`);
        await fetchPayInDetails();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update PayIn status error:', error);
      toast.error('Failed to update status');
    } finally {
      setRefreshing(false);
    }
  };

  const handleVerify = async (): Promise<void> => {
    await handleStatusUpdate('VERIFIED');
  };

  const handleReconcile = async (): Promise<void> => {
    await handleStatusUpdate('RECONCILED');
  };

  const handleFail = async (): Promise<void> => {
    await handleStatusUpdate('FAILED');
  };

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchPayInDetails();
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

  if (!payIn) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-lg font-semibold">PayIn not found</p>
          <p className="text-sm text-muted-foreground mt-2">
            The PayIn transaction you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PayInHeader
        payIn={payIn}
        onVerify={handleVerify}
        onReconcile={handleReconcile}
        onFail={handleFail}
        onRefresh={handleRefresh}
        isLoading={refreshing}
      />

      {/* Quick Stats */}
      <PayInQuickStats 
        payIn={payIn} 
        onVerify={handleVerify}
        onFail={handleFail}
      />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <PayInOverviewTab payIn={payIn} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <PayInHistoryTab payInId={payIn.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

