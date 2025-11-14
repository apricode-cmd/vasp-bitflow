/**
 * User Details Page - REDESIGNED
 * 
 * Complete user profile with:
 * - Header with actions
 * - Quick stats (4 metrics)
 * - Profile & Financial summary
 * - Tabs: Overview, Orders, Wallets, Pay-In, Pay-Out, KYC, Activity
 */

'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserHeader } from './_components/UserHeader';
import { UserQuickStats } from './_components/UserQuickStats';
import { ProfileSummary } from './_components/ProfileSummary';
import { FinancialSummary } from './_components/FinancialSummary';
import { OverviewTab } from './_components/OverviewTab';
import { OrdersTab } from './_components/OrdersTab';
import { PayInTab } from './_components/PayInTab';
import { PayOutTab } from './_components/PayOutTab';
import { KycTab } from './_components/KycTab';
import { WalletsTab } from './_components/WalletsTab';
import { ActivityTab } from './_components/ActivityTab';
import { toast } from 'sonner';
import type { KycStatus } from '@prisma/client';

interface UserDetails {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  profile: {
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    country: string;
    city: string | null;
    // All KYC fields
    dateOfBirth?: string | null;
    placeOfBirth?: string | null;
    nationality?: string | null;
    addressStreet?: string | null;
    addressCity?: string | null;
    addressRegion?: string | null;
    addressPostalCode?: string | null;
    addressCountry?: string | null;
    idType?: string | null;
    idNumber?: string | null;
    idIssuingCountry?: string | null;
    idIssueDate?: string | null;
    idExpiryDate?: string | null;
    isPep?: boolean | null;
    pepRole?: string | null;
    employmentStatus?: string | null;
    occupation?: string | null;
    employerName?: string | null;
    sourceOfFunds?: string | null;
    sourceOfWealth?: string | null;
    purposeOfAccount?: string | null;
    intendedUse?: string | null;
  } | null;
  kycSession: {
    status: KycStatus;
    submittedAt: string | null;
    reviewedAt: string | null;
  } | null;
  orders: Array<{
    id: string;
    paymentReference: string;
    cryptoAmount: number;
    totalFiat: number;
    status: string;
    createdAt: string;
    currency: { code: string };
    fiatCurrency: { code: string };
  }>;
  userWallets: Array<{
    id: string;
    address: string;
    label: string | null;
    isDefault: boolean;
    currency: { code: string };
    blockchain: { name: string };
  }>;
  _count: {
    orders: number;
  };
}

export default function UserDetailPage({ params }: { params: { id: string } }): JSX.Element {
  const { id } = params;
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const fetchUserDetails = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${id}`);
      const data = await response.json();

      if (data.success) {
        setUser(data.data);
      } else {
        toast.error('Failed to fetch user details');
      }
    } catch (error) {
      console.error('Fetch user details error:', error);
      toast.error('Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (): Promise<void> => {
    if (!user) return;

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(user.isActive ? 'User blocked' : 'User unblocked');
        await fetchUserDetails();
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Toggle user status error:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDelete = async (): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('User deleted successfully');
        window.location.href = '/admin/users';
      } else {
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('An error occurred');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">User not found</h2>
          <p className="text-muted-foreground">The requested user could not be found.</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const completedOrders = user.orders.filter(o => o.status === 'COMPLETED').length;
  const processingOrders = user.orders.filter(o => o.status === 'PROCESSING' || o.status === 'PAYMENT_PENDING').length;
  const cancelledOrders = user.orders.filter(o => o.status === 'CANCELLED' || o.status === 'FAILED').length;
  const pendingOrders = user.orders.filter(o => o.status === 'PENDING').length;
  const totalSpent = user.orders
    .filter(o => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + Number(o.totalFiat), 0);
  const averageOrderValue = completedOrders > 0 ? totalSpent / completedOrders : 0;

  const quickStats = {
    totalOrders: user._count.orders,
    totalSpent,
    pendingOrders,
    kycStatus: user.kycSession?.status || 'Not Started',
    completedOrders,
  };

  const financialStats = {
    totalSpent,
    totalOrders: user._count.orders,
    completedOrders,
    processingOrders,
    cancelledOrders,
    averageOrderValue,
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <UserHeader
        user={{
          ...user,
          createdAt: new Date(user.createdAt),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
        }}
        onToggleStatus={handleToggleStatus}
        onDelete={() => setDeleteDialogOpen(true)}
      />

      {/* Quick Stats */}
      <UserQuickStats stats={quickStats} />

      {/* Profile & Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfileSummary
          user={{
            ...user,
            createdAt: new Date(user.createdAt),
            lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
          }}
        />
        <FinancialSummary stats={financialStats} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">
            Orders
            <Badge variant="secondary" className="ml-2">
              {user._count.orders}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="wallets">
            Wallets
            {user.userWallets.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {user.userWallets.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pay-in">Pay-In</TabsTrigger>
          <TabsTrigger value="pay-out">Pay-Out</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <TabsContent value="overview">
          <OverviewTab userId={id} />
        </TabsContent>

        <TabsContent value="orders">
          <OrdersTab userId={id} />
        </TabsContent>

        <TabsContent value="wallets">
          <WalletsTab wallets={user.userWallets} />
        </TabsContent>

        <TabsContent value="pay-in">
          <PayInTab userId={id} />
        </TabsContent>

        <TabsContent value="pay-out">
          <PayOutTab userId={id} />
        </TabsContent>

        <TabsContent value="kyc">
          <KycTab user={user} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab userId={id} />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account,
              including all related data (profile, KYC session, orders history).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

