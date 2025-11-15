/**
 * KYC Details Page
 * 
 * Dedicated page for reviewing KYC session details
 * Replaces Sheet modal with full-page experience
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { KycSessionDetail } from './_components/types';
import { KycHeader } from './_components/KycHeader';
import { KycDetailsTabs } from './_components/KycDetailsTabs';

interface PageProps {
  params: {
    id: string;
  };
}

export default function KycDetailsPage({ params }: PageProps): JSX.Element {
  const router = useRouter();
  const [session, setSession] = useState<KycSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession();
  }, [params.id]);

  const fetchSession = async (): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/kyc/${params.id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSession(result.data);
        } else {
          toast.error(result.error || 'Failed to load KYC session');
          router.push('/admin/kyc');
        }
      } else {
        toast.error('Failed to load KYC session');
        router.push('/admin/kyc');
      }
    } catch (error) {
      console.error('Failed to fetch KYC session:', error);
      toast.error('Failed to load KYC session');
      router.push('/admin/kyc');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (): void => {
    fetchSession();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in p-6 max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* Quick Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Content Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return null; // KycHeader will show not found state
  }

  return (
    <div className="space-y-6 animate-in p-6 max-w-7xl mx-auto">
      {/* Header with actions */}
      <KycHeader session={session} onUpdate={handleUpdate} />

      {/* Tabs with detailed information */}
      <KycDetailsTabs session={session} onUpdate={handleUpdate} />
    </div>
  );
}

