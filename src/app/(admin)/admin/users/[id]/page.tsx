/**
 * User Detail Page
 * 
 * Detailed view of user with orders, activity, and management options
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';

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
  } | null;
  kycSession: {
    status: string;
    submittedAt: string | null;
    reviewedAt: string | null;
    documents: Array<{
      documentType: string;
      fileName: string;
      uploadedAt: string;
    }>;
  } | null;
  orders: Array<{
    id: string;
    paymentReference: string;
    cryptoAmount: number;
    totalFiat: number;
    status: string;
    createdAt: string;
    currency: { code: string; symbol: string };
    fiatCurrency: { code: string; symbol: string };
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
    auditLogs: number;
  };
}

export default function UserDetailPage({ params }: { params: { id: string } }): JSX.Element {
  const { id } = params;
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'activity' | 'kyc'>('overview');

  useEffect(() => {
    fetchUserDetails();
    fetchActivity();
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

  const fetchActivity = async (): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/users/${id}/activity?limit=20`);
      const data = await response.json();

      if (data.success) {
        setActivity(data.data);
      }
    } catch (error) {
      console.error('Fetch activity error:', error);
    }
  };

  const toggleUserStatus = async (): Promise<void> => {
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
      toast.error('Failed to update user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">Loading user details...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">User not found</div>
          <Link href="/admin/users">
            <Button className="mt-4">Back to Users</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{user.profile?.firstName} {user.profile?.lastName}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users">
            <Button variant="outline">Back</Button>
          </Link>
          <Button
            variant={user.isActive ? 'destructive' : 'default'}
            onClick={toggleUserStatus}
          >
            {user.isActive ? 'Block User' : 'Unblock User'}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Role</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'default'}>
              {user.role}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={user.isActive ? 'default' : 'secondary'}>
              {user.isActive ? 'Active' : 'Blocked'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user._count.orders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">KYC Status</CardTitle>
          </CardHeader>
          <CardContent>
            {user.kycSession ? (
              <Badge
                variant={
                  user.kycSession.status === 'APPROVED'
                    ? 'default'
                    : user.kycSession.status === 'REJECTED'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {user.kycSession.status}
              </Badge>
            ) : (
              <span className="text-muted-foreground">Not started</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {['overview', 'orders', 'activity', 'kyc'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {user.profile ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{user.profile.firstName} {user.profile.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">{user.profile.phoneNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Country:</span>
                    <span className="font-medium">{user.profile.country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">City:</span>
                    <span className="font-medium">{user.profile.city || 'N/A'}</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No profile information</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">{format(new Date(user.createdAt), 'PPP')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Login:</span>
                <span className="font-medium">
                  {user.lastLogin ? format(new Date(user.lastLogin), 'PPP') : 'Never'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Activity Logs:</span>
                <span className="font-medium">{user._count.auditLogs}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Wallets</CardTitle>
              <CardDescription>User cryptocurrency wallets</CardDescription>
            </CardHeader>
            <CardContent>
              {user.userWallets.length > 0 ? (
                <div className="space-y-2">
                  {user.userWallets.map((wallet) => (
                    <div key={wallet.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{wallet.currency.code} - {wallet.blockchain.name}</div>
                        <div className="text-sm text-muted-foreground">{wallet.address}</div>
                        {wallet.label && <div className="text-sm text-muted-foreground">{wallet.label}</div>}
                      </div>
                      {wallet.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No wallets added</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'orders' && (
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>All orders created by this user</CardDescription>
          </CardHeader>
          <CardContent>
            {user.orders.length > 0 ? (
              <div className="space-y-4">
                {user.orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{order.paymentReference}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.cryptoAmount} {order.currency.code} = {formatCurrency(order.totalFiat, order.fiatCurrency.code)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(order.createdAt), 'PPP')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{order.status}</Badge>
                      <Link href={`/admin/orders`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No orders yet</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle>Activity History</CardTitle>
            <CardDescription>Recent actions performed by this user</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length > 0 ? (
              <div className="space-y-4">
                {activity.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{log.action.replace(/_/g, ' ')}</div>
                      <div className="text-sm text-muted-foreground">{log.entity}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(log.createdAt), 'PPP p')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No activity yet</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'kyc' && (
        <Card>
          <CardHeader>
            <CardTitle>KYC Information</CardTitle>
            <CardDescription>KYC verification details</CardDescription>
          </CardHeader>
          <CardContent>
            {user.kycSession ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant={
                      user.kycSession.status === 'APPROVED'
                        ? 'default'
                        : user.kycSession.status === 'REJECTED'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {user.kycSession.status}
                  </Badge>
                </div>
                {user.kycSession.submittedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted:</span>
                    <span>{format(new Date(user.kycSession.submittedAt), 'PPP')}</span>
                  </div>
                )}
                {user.kycSession.reviewedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reviewed:</span>
                    <span>{format(new Date(user.kycSession.reviewedAt), 'PPP')}</span>
                  </div>
                )}
                {user.kycSession.documents.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Documents</h3>
                    <div className="space-y-2">
                      {user.kycSession.documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{doc.documentType}</div>
                            <div className="text-sm text-muted-foreground">{doc.fileName}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(doc.uploadedAt), 'PPP')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">KYC not started</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

