/**
 * Client Dashboard Page
 * 
 * Enhanced main dashboard for authenticated clients with modern UI
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { OrderStatusBadge } from '@/components/features/OrderStatusBadge';
import { KycAlert } from '@/components/features/KycAlert';
import { 
  ShoppingCart, Shield, TrendingUp, Package, AlertCircle, 
  CheckCircle2, Clock, Wallet, ArrowRight, Zap
} from 'lucide-react';
import { formatDateTime, formatFiatCurrency, formatCryptoWithSymbol } from '@/lib/formatters';

export default async function DashboardPage(): Promise<React.ReactElement> {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Get user data with KYC status
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      kycSession: true
    }
  });

  // Get user's recent orders
  const recentOrders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      currency: true,
      fiatCurrency: true
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  // Get order statistics
  const totalOrders = await prisma.order.count({
    where: { userId: session.user.id }
  });

  const completedOrders = await prisma.order.count({
    where: { 
      userId: session.user.id,
      status: 'COMPLETED'
    }
  });

  const pendingOrders = await prisma.order.count({
    where: { 
      userId: session.user.id,
      status: { in: ['PENDING', 'PAYMENT_PENDING', 'PROCESSING'] }
    }
  });

  // Calculate total volume
  const orderVolume = await prisma.order.aggregate({
    where: {
      userId: session.user.id,
      status: 'COMPLETED'
    },
    _sum: {
      totalFiat: true
    }
  });

  const kycStatus = user?.kycSession?.status || null;
  const isKycApproved = kycStatus === 'APPROVED';
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  // Get user initials for avatar
  const userInitials = `${user?.profile?.firstName?.charAt(0) || ''}${user?.profile?.lastName?.charAt(0) || ''}`.toUpperCase();

  return (
    <div className="space-y-6 animate-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border-2 border-primary/20 ring-2 ring-primary/10">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-lg font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Welcome back, {user?.profile?.firstName}!
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {isKycApproved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">
                    Your account is verified and ready to trade
                  </span>
                </>
              ) : kycStatus === 'PENDING' ? (
                <>
                  <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />
                  <span className="text-sm text-muted-foreground">
                    KYC verification in progress
                  </span>
                </>
              ) : kycStatus === 'REJECTED' ? (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-muted-foreground">
                    KYC verification failed - please resubmit
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-muted-foreground">
                    Complete KYC verification to start trading
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {isKycApproved && (
          <Link href="/buy">
            <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Buy Crypto
            </Button>
          </Link>
        )}
      </div>

      {/* KYC Alert - Reusable Component */}
      <KycAlert status={kycStatus} isApproved={isKycApproved} />

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-lift bg-card/50 backdrop-blur-sm border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedOrders} completed
            </p>
            {totalOrders > 0 && (
              <Progress value={completionRate} className="mt-3 h-1" />
            )}
          </CardContent>
        </Card>

        <Card className="hover-lift bg-card/50 backdrop-blur-sm border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="h-8 w-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting processing
            </p>
            {pendingOrders > 0 && (
              <Link href="/orders" className="mt-3 block">
                <Button variant="ghost" size="sm" className="w-full">
                  View Details
                  <ArrowRight className="h-3 w-3 ml-2" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="hover-lift bg-card/50 backdrop-blur-sm border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orderVolume._sum.totalFiat 
                ? formatFiatCurrency(orderVolume._sum.totalFiat, 'EUR')
                : '€0.00'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime trading value
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift bg-card/50 backdrop-blur-sm border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Status</CardTitle>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              isKycApproved 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : kycStatus === 'PENDING'
                ? 'bg-yellow-100 dark:bg-yellow-900/30'
                : kycStatus === 'REJECTED'
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-muted'
            }`}>
              <Shield className={`h-4 w-4 ${
                isKycApproved 
                  ? 'text-green-600 dark:text-green-400' 
                  : kycStatus === 'PENDING'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : kycStatus === 'REJECTED'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground'
              }`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {isKycApproved ? (
                <span className="text-green-600 dark:text-green-400">Verified</span>
              ) : kycStatus === 'PENDING' ? (
                <span className="text-yellow-600 dark:text-yellow-400">Pending</span>
              ) : kycStatus === 'REJECTED' ? (
                <span className="text-red-600 dark:text-red-400">Rejected</span>
              ) : (
                <span className="text-muted-foreground">Not Started</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isKycApproved 
                ? 'Ready to trade' 
                : kycStatus === 'PENDING'
                ? 'Under review'
                : kycStatus === 'REJECTED'
                ? 'Action required'
                : 'Verification needed'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {isKycApproved && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link href="/buy" className="group">
                <div className="flex items-center gap-3 p-4 rounded-lg border border-primary bg-primary/5 hover:bg-primary/10 transition-all hover:border-primary/50 hover:shadow-md">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">Buy Crypto</p>
                    <p className="text-xs text-muted-foreground">Purchase with fiat</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Link>

              <Link href="/orders" className="group">
                <div className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all hover:shadow-md">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Package className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">My Orders</p>
                    <p className="text-xs text-muted-foreground">{totalOrders} total</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Link>

              <Link href="/wallets" className="group">
                <div className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all hover:shadow-md">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Wallet className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">Wallets</p>
                    <p className="text-xs text-muted-foreground">Saved addresses</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Your latest cryptocurrency purchases</CardDescription>
            </div>
            {totalOrders > 5 && (
              <Link href="/orders">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-4">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {isKycApproved 
                  ? 'Start your cryptocurrency journey by placing your first order.'
                  : 'Complete KYC verification to start trading.'}
              </p>
              {isKycApproved ? (
                <Link href="/buy">
                  <Button size="lg" className="gradient-primary">
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Place Your First Order
                  </Button>
                </Link>
              ) : (
                <Link href="/kyc">
                  <Button size="lg">
                    <Shield className="h-5 w-5 mr-2" />
                    Start KYC Verification
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link 
                  key={order.id} 
                  href={`/orders/${order.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 hover:border-primary/50 transition-all cursor-pointer group">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <span className="text-lg font-bold text-primary">
                        {order.currencyCode.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold truncate">
                          {formatCryptoWithSymbol(order.cryptoAmount, order.currencyCode)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {order.currencyCode}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatFiatCurrency(order.totalFiat, order.fiatCurrencyCode)} • {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={order.status} />
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
