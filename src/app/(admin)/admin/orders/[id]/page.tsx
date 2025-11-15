/**
 * Order Details Page - Enterprise Level
 * Complete order management with tabs and full information
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { OrderHeader } from './_components/OrderHeader';
import { OrderQuickStats } from './_components/OrderQuickStats';
import { OrderOverviewTab } from './_components/OrderOverviewTab';
import { OrderPayInTab } from './_components/OrderPayInTab';
import { OrderPayOutTab } from './_components/OrderPayOutTab';
import { OrderTimelineTab } from './_components/OrderTimelineTab';
import { OrderDocumentsTab } from './_components/OrderDocumentsTab';
import { OrderUserTab } from './_components/OrderUserTab';
import { OrderNotesTab } from './_components/OrderNotesTab';
import { OrderTransitionDialog } from '@/components/admin/OrderTransitionDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LayoutGrid, 
  TrendingDown, 
  TrendingUp, 
  History, 
  FileText, 
  User,
  MessageSquare
} from 'lucide-react';
import type { OrderStatus } from '@prisma/client';

interface OrderData {
  id: string;
  paymentReference: string;
  status: string;
  cryptoAmount: number;
  currencyCode: string;
  fiatCurrencyCode: string;
  fiatAmount: number;
  rate: number;
  feePercent: number;
  feeAmount: number;
  totalFiat: number;
  walletAddress: string;
  blockchainCode?: string | null;
  paymentMethodCode?: string | null;
  transactionHash?: string | null;
  adminNotes?: string | null;
  createdByAdmin: boolean;
  processedAt?: string | null;
  processedBy?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    } | null;
  };
  currency: {
    code: string;
    symbol: string;
    name: string;
  };
  fiatCurrency: {
    code: string;
    symbol: string;
  };
  blockchain?: {
    code: string;
    name: string;
    explorerUrl: string;
  } | null;
  paymentMethod?: {
    code: string;
    name: string;
  } | null;
  payIn?: {
    id: string;
    status: string;
    amount: number;
    currencyType: string;
    fiatCurrencyCode?: string | null;
    cryptocurrencyCode?: string | null;
    senderName?: string | null;
    paymentMethodCode?: string | null;
    fiatCurrency?: { code: string; name: string; symbol: string } | null;
    cryptocurrency?: { code: string; name: string; symbol: string } | null;
    paymentMethod?: { code: string; name: string } | null;
    network?: { code: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  payOut?: {
    id: string;
    status: string;
    amount: number;
    currencyType: string;
    fiatCurrencyCode?: string | null;
    cryptocurrencyCode?: string | null;
    transactionHash?: string | null;
    fiatCurrency?: { code: string; name: string; symbol: string } | null;
    cryptocurrency?: { code: string; name: string; symbol: string } | null;
    paymentMethod?: { code: string; name: string } | null;
    network?: { code: string; name: string; explorerUrl?: string } | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  statusHistory?: Array<{
    id: string;
    oldStatus: string;
    newStatus: string;
    changedBy: string;
    note?: string | null;
    createdAt: string;
  }>;
  paymentProofs?: Array<{
    id: string;
    proofUrl: string;
    status: string;
    createdAt: string;
  }>;
}

export default function OrderDetailsPage(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Reference data for OrderTransitionDialog
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [fiatCurrencies, setFiatCurrencies] = useState<any[]>([]);
  const [cryptocurrencies, setCryptocurrencies] = useState<any[]>([]);
  const [networks, setNetworks] = useState<any[]>([]);
  
  // Transition dialog state
  const [transitionDialog, setTransitionDialog] = useState<{
    open: boolean;
    order: OrderData | null;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus | null;
  }>({
    open: false,
    order: null,
    fromStatus: null,
    toStatus: null
  });

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
      fetchReferenceData();
    }
  }, [orderId]);

  const fetchOrderDetails = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setOrder(data.data);
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
      router.push('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string): Promise<void> => {
    if (!order) return;

    try {
      setActionLoading(true);

      switch (action) {
        case 'payment-pending':
          // Open dialog for PayIn creation
          setTransitionDialog({
            open: true,
            order,
            fromStatus: order.status as OrderStatus,
            toStatus: 'PAYMENT_PENDING'
          });
          break;
        
        case 'payment-received':
          // Open dialog for PayIn update to RECEIVED
          setTransitionDialog({
            open: true,
            order,
            fromStatus: order.status as OrderStatus,
            toStatus: 'PAYMENT_RECEIVED'
          });
          break;
        
        case 'verify':
          // Open dialog for PayIn verification
          setTransitionDialog({
            open: true,
            order,
            fromStatus: order.status as OrderStatus,
            toStatus: 'PROCESSING'
          });
          break;
        
        case 'send-crypto':
          // Open dialog for PayOut creation
          setTransitionDialog({
            open: true,
            order,
            fromStatus: order.status as OrderStatus,
            toStatus: 'COMPLETED'
          });
          break;
        
        case 'cancel':
          if (confirm('Are you sure you want to cancel this order?')) {
            await updateOrderStatus('CANCELLED');
          }
          break;
        
        case 'export':
          await exportOrder();
          break;
        
        case 'view-user':
          router.push(`/admin/users/${order.user.id}`);
          break;
        
        default:
          toast.info('Action not implemented yet');
      }
    } catch (error) {
      console.error('Action error:', error);
      toast.error('Failed to perform action');
    } finally {
      setActionLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string): Promise<void> => {
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update status');
    }

    toast.success('Order status updated');
    await fetchOrderDetails();
  };

  const fetchReferenceData = async (): Promise<void> => {
    try {
      const [methodsRes, fiatRes, cryptoRes, networksRes] = await Promise.all([
        fetch('/api/admin/payment-methods'),
        fetch('/api/admin/resources/fiat-currencies'),
        fetch('/api/admin/resources/currencies?active=true'),
        fetch('/api/admin/blockchains')
      ]);

      if (methodsRes.ok) {
        const data = await methodsRes.json();
        setPaymentMethods(data.methods || data.data || []);
      }
      if (fiatRes.ok) {
        const data = await fiatRes.json();
        setFiatCurrencies(data.data || []);
      }
      if (cryptoRes.ok) {
        const data = await cryptoRes.json();
        setCryptocurrencies(data.data || []);
      }
      if (networksRes.ok) {
        const data = await networksRes.json();
        setNetworks(data.networks || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
      // Don't show error to user, reference data is not critical
    }
  };

  const exportOrder = async (): Promise<void> => {
    const downloadPromise = async () => {
      // Call API to generate PDF
      const response = await fetch(`/api/admin/orders/${orderId}/report`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to generate report');
      }
      
      // Get PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-report-${order.paymentReference}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return 'Order report downloaded successfully';
    };

    toast.promise(downloadPromise(), {
      loading: 'Generating order report...',
      success: (message) => message,
      error: (err) => err.message || 'Failed to export order',
    });
  };

  const handleTransitionConfirm = async (data: any): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update order');
      }

      toast.success('Order updated successfully');
      setTransitionDialog({ open: false, order: null, fromStatus: null, toStatus: null });
      await fetchOrderDetails();
    } catch (error) {
      console.error('Transition error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update order');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-[400px] w-full" />
          </div>
          <div className="lg:col-span-3">
            <Skeleton className="h-[600px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Order not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <OrderHeader 
        order={order} 
        onAction={handleAction}
        loading={actionLoading}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Quick Stats */}
        <div className="lg:col-span-1">
          <OrderQuickStats order={order} />
        </div>

        {/* Right Content - Tabs */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="overview">
                <LayoutGrid className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="payin">
                <TrendingDown className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">PayIn</span>
              </TabsTrigger>
              <TabsTrigger value="payout">
                <TrendingUp className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">PayOut</span>
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <History className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Timeline</span>
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
              <TabsTrigger value="user">
                <User className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">User</span>
              </TabsTrigger>
              <TabsTrigger value="notes">
                <MessageSquare className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Notes</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <OrderOverviewTab order={order} />
            </TabsContent>

            <TabsContent value="payin" className="space-y-4">
              <OrderPayInTab 
                order={order} 
                onCreatePayIn={() => router.push(`/admin/pay-in?orderId=${order.id}`)}
              />
            </TabsContent>

            <TabsContent value="payout" className="space-y-4">
              <OrderPayOutTab 
                order={order}
                onCreatePayOut={() => router.push(`/admin/pay-out?orderId=${order.id}`)}
              />
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <OrderTimelineTab order={order} />
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <OrderDocumentsTab order={order} />
            </TabsContent>

            <TabsContent value="user" className="space-y-4">
              <OrderUserTab order={order} />
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <OrderNotesTab 
                order={order} 
                onSaveNotes={async (notes) => {
                  await fetch(`/api/admin/orders/${orderId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ adminNotes: notes })
                  });
                  await fetchOrderDetails();
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Order Transition Dialog */}
      {transitionDialog.order && transitionDialog.fromStatus && transitionDialog.toStatus && (
        <OrderTransitionDialog
          open={transitionDialog.open}
          onOpenChange={(open) => setTransitionDialog({ ...transitionDialog, open })}
          order={transitionDialog.order}
          fromStatus={transitionDialog.fromStatus}
          toStatus={transitionDialog.toStatus}
          onConfirm={handleTransitionConfirm}
          paymentMethods={paymentMethods}
          fiatCurrencies={fiatCurrencies}
          cryptocurrencies={cryptocurrencies}
          networks={networks}
        />
      )}
    </div>
  );
}

