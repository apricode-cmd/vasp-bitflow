/**
 * Loading Skeleton for Order Details Page
 * Matches the exact structure of the real page
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function OrderDetailsLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Order Header Skeleton */}
      <Card>
        <CardHeader>
          <div className="space-y-6">
            {/* Top section: Back button + Actions */}
            <div className="flex items-start justify-between">
              <div className="space-y-4 flex-1">
                {/* Back button */}
                <Skeleton className="h-9 w-24" />
                
                {/* Title section */}
                <div className="space-y-3">
                  <Skeleton className="h-9 w-56" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>

            <Separator />

            {/* Status and timestamps */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-28" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-48" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats - 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Amount', hasIcon: true },
          { label: 'Crypto Amount', hasIcon: true },
          { label: 'Exchange Rate', hasIcon: false },
          { label: 'Platform Fee', hasIcon: false }
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  {stat.hasIcon && <Skeleton className="h-5 w-5 rounded" />}
                </div>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Card with Tabs */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="border-b">
              <div className="flex gap-6 pb-3 overflow-x-auto">
                {[
                  'Overview',
                  'Pay In',
                  'Pay Out',
                  'Timeline',
                  'Documents',
                  'User',
                  'Notes'
                ].map((tab, i) => (
                  <div key={i} className="flex items-center gap-2 shrink-0">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            </div>

            {/* Tab Content - Overview Tab Layout */}
            <div className="space-y-8">
              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Order Information Section */}
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-40" />
                    <div className="space-y-3">
                      {[
                        'Crypto Amount',
                        'Fiat Amount',
                        'Exchange Rate',
                        'Platform Fee',
                        'Total Amount'
                      ].map((label, i) => (
                        <div key={i} className="flex items-center justify-between py-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-5 w-28" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Details Section */}
                  <div className="space-y-4 pt-6 border-t">
                    <Skeleton className="h-6 w-36" />
                    <div className="space-y-3">
                      {[
                        'Payment Method',
                        'Blockchain Network'
                      ].map((label, i) => (
                        <div key={i} className="flex items-center justify-between py-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-5 w-24" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Customer Information Section */}
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-44" />
                    <div className="space-y-3">
                      {[
                        'Customer Name',
                        'Email Address',
                        'User ID',
                        'KYC Status'
                      ].map((label, i) => (
                        <div key={i} className="flex items-center justify-between py-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-5 w-36" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Wallet Information Section */}
                  <div className="space-y-4 pt-6 border-t">
                    <Skeleton className="h-6 w-40" />
                    <div className="space-y-3">
                      <div className="flex items-start justify-between py-2">
                        <Skeleton className="h-5 w-28" />
                        <div className="flex-1 ml-4">
                          <Skeleton className="h-5 w-full" />
                          <Skeleton className="h-4 w-3/4 mt-2" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Width Sections */}
              <div className="space-y-6 pt-6 border-t">
                {/* Admin Notes Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                  <Skeleton className="h-24 w-full rounded-md" />
                </div>

                {/* Transaction Hash Section */}
                <div className="space-y-4 pt-6 border-t">
                  <Skeleton className="h-6 w-40" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </div>
              </div>

              {/* Status Timeline Preview */}
              <div className="space-y-4 pt-6 border-t">
                <Skeleton className="h-6 w-36" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
