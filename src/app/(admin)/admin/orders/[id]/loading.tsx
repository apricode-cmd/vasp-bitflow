/**
 * Loading Skeleton for Order Details Page
 * Matches the exact structure: Header + Grid (Sidebar + Tabs)
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function OrderDetailsLoading() {
  return (
    <div className="container mx-auto p-6 space-y-6 animate-pulse">
      {/* Order Header Card */}
      <Card>
        <CardHeader>
          <div className="space-y-6">
            {/* Top: Back button + Title + Actions */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-4 flex-1">
                {/* Back button */}
                <Skeleton className="h-9 w-24" />
                
                {/* Title and reference */}
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-5 w-48" />
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-36" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>

            <Separator />

            {/* Status badge and timestamps */}
            <div className="flex flex-wrap items-center gap-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-5 w-52" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content: Sidebar + Tabs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Quick Stats (1 column) */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            {/* Quick Stats Cards - Stacked Vertically */}
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-5 w-5 rounded" />
                    </div>
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Content - Tabs (3 columns) */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Tabs List */}
                <div className="grid grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>

                {/* Tab Content Area */}
                <div className="space-y-6 pt-4">
                  {/* Section 1 */}
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-40" />
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center justify-between py-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-5 w-28" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Section 2 */}
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-36" />
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between py-2">
                          <Skeleton className="h-5 w-28" />
                          <Skeleton className="h-5 w-32" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Section 3 */}
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-44" />
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between py-2">
                          <Skeleton className="h-5 w-36" />
                          <Skeleton className="h-5 w-24" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Full width section */}
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
