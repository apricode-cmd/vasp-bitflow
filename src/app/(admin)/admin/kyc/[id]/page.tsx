/**
 * KYC Details Page
 * 
 * Dedicated page for reviewing KYC session details
 * Replaces Sheet modal with full-page experience
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { KycStatus } from '@prisma/client';
import Link from 'next/link';

interface KycSession {
  id: string;
  userId: string;
  status: KycStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  kycProviderId: string | null;
  applicantId: string | null;
  verificationId: string | null;
  kycaidVerificationId: string | null;
  kycaidApplicantId: string | null;
  metadata?: any;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      country: string;
      phoneNumber?: string;
      phoneCountry?: string;
      dateOfBirth?: Date;
      placeOfBirth?: string;
      nationality?: string;
    } | null;
  };
  provider?: {
    name: string;
    service: string;
    status: string;
    isEnabled: boolean;
  } | null;
}

interface PageProps {
  params: {
    id: string;
  };
}

export default function KycDetailsPage({ params }: PageProps): JSX.Element {
  const router = useRouter();
  const [session, setSession] = useState<KycSession | null>(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">KYC session not found</p>
        <Link href="/admin/kyc">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to KYC Reviews
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in p-6">
      {/* Back Button */}
      <div>
        <Link href="/admin/kyc">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to KYC Reviews
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          KYC Review: {session.user.profile?.firstName} {session.user.profile?.lastName}
        </h1>
        <p className="text-muted-foreground mt-1">{session.user.email}</p>
      </div>

      {/* Temporary: Full data display for development */}
      <div className="bg-muted p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Session Data (Development View)</h2>
        <pre className="text-xs overflow-auto max-h-[600px]">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <p className="text-sm text-muted-foreground text-center py-8">
        🚧 Detailed KYC review components are being built...
      </p>
    </div>
  );
}

