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
import { BrandLoaderPage } from '@/components/ui/brand-loader';
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
    return <BrandLoaderPage text="Loading KYC details..." />;
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

