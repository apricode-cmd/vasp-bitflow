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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { OrderStatusBadge } from '@/components/features/OrderStatusBadge';
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

  const kycStatus = user?.kycSession?.status || 'PENDING';
  const isKycApproved = kycStatus === 'APPROVED';
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  // Get user initials for avatar
  const userInitials = `${user?.profile?.firstName?.charAt(0) || ''}${user?.profile?.lastName?.charAt(0) || ''}`.toUpperCase();

  return (
    <div className="space-y-6 animate-in">
      {/* Welcome Header with Avatar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarFallback className="bg-gradient-primary text-white text-xl font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user?.profile?.firstName}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {isKycApproved ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Your account is verified and ready to trade
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  Complete KYC verification to start trading
                </span>
              )}
            </p>
          </div>
        </div>
        {isKycApproved && (
          <Link href="/buy">
            <Button size="lg" className="gradient-primary">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Buy Crypto
            </Button>
          </Link>
        )}
      </div>

      {/* KYC Alert */}
      {!isKycApproved && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <Shield className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="text-yellow-900 dark:text-yellow-100">
            KYC Verification {kycStatus === 'PENDING' ? 'Pending' : 'Required'}
          </AlertTitle>
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            {kycStatus === 'PENDING' ? (
              <div className="space-y-3">
                <p>Your KYC verification is being reviewed. This usually takes 2-4 hours.</p>
                <div className="flex items-center gap-3">
                  <Progress value={60} className="flex-1" />
                  <span className="text-sm font-medium">60%</span>
                </div>
                <Link href="/kyc">
                  <Button variant="outline" size="sm">
                    <Clock className="h-4 w-4 mr-2" />
                    Check Status
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p>Complete your KYC verification to unlock cryptocurrency trading and enjoy all platform features.</p>
                <Link href="/kyc">
                  <Button className="bg-yellow-600 hover:bg-yellow-700">
                    <Shield className="h-4 w-4 mr-2" />
                    Start Verification
                  </Button>
                </Link>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-blue-600" />
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

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600" />
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

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-purple-600" />
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

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Status</CardTitle>
            <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="mt-1">
              <KycStatusBadge status={kycStatus} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isKycApproved ? 'Verified account' : 'Verification needed'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {isKycApproved && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Start trading or manage your orders</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/buy">
                <Button size="lg" className="gradient-primary">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Buy Cryptocurrency
                </Button>
              </Link>
              <Link href="/orders">
                <Button variant="outline" size="lg">
                  <Package className="h-5 w-5 mr-2" />
                  View All Orders
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="outline" size="lg">
                  <Wallet className="h-5 w-5 mr-2" />
                  Saved Wallets
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
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
