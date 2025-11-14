/**
 * KYC Verification Page - Refactored
 * Uses shared config and reusable components
 * 
 * Previous: 1981 lines (monolithic)
 * Current: ~150 lines (modular)
 */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { KycFormWizard } from '@/components/kyc/KycFormWizard';
import { KycStatusCard } from '@/components/kyc/KycStatusCard';
import { KycConsentScreen } from '@/components/kyc/KycConsentScreen';
import { useKycFields } from '@/components/kyc/hooks/useKycFields';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { KycStatus } from '@prisma/client';

interface KycSession {
  id: string;
  status: KycStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  formUrl?: string | null;
  kycProviderId?: string | null;
  formData?: any;
}

export default function KycPage(): React.ReactElement {
  const { data: session } = useSession();
  const { fields, loading, error, refetch } = useKycFields();
  
  const [kycSession, setKycSession] = useState<KycSession | null>(null);
  const [showConsents, setShowConsents] = useState(true);
  const [consentsAccepted, setConsentsAccepted] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  // Fetch KYC status on mount
  useEffect(() => {
    if (session?.user?.id) {
      fetchKycStatus();
    }
  }, [session]);

  const fetchKycStatus = async () => {
    try {
      setStatusLoading(true);
      const response = await fetch('/api/kyc/status');
      
      // Handle session expired/invalid (JWT error from Sumsub webhook)
      if (response.status === 401) {
        const data = await response.json();
        
        if (data.code === 'SESSION_INVALID') {
          toast.error('Session expired. Please log in again.');
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/login?redirect=/kyc';
          }, 1500);
          return;
        }
      }
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.status !== 'NOT_STARTED') {
          setKycSession({
            id: data.sessionId || '',
            status: data.status,
            submittedAt: null,
            reviewedAt: data.completedAt || null,
            rejectionReason: data.rejectionReason || null,
            formUrl: data.formUrl || null,
            kycProviderId: data.kycProviderId || null,
            formData: data.formData || null,
          });
          
          // If already submitted, skip consents
          if (data.status !== 'NOT_STARTED') {
            setConsentsAccepted(true);
            setShowConsents(false);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
      toast.error('Failed to load KYC status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleConsentsAccept = () => {
    setConsentsAccepted(true);
    setShowConsents(false);
  };

  // Loading state
  if (loading || statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading KYC verification...</p>
      </div>
          </div>
        );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
                </Alert>
      </div>
    );
  }

  // Show consents first (if not accepted yet)
  if (showConsents && !consentsAccepted) {
    return <KycConsentScreen onAccept={handleConsentsAccept} />;
  }

  // Show status card if KYC already submitted
  if (kycSession && kycSession.status !== 'NOT_STARTED') {
    return (
      <KycStatusCard 
        kycSession={kycSession}
        onRefresh={fetchKycStatus}
        userId={session?.user?.id}
      />
    );
  }

  // Show form wizard (new or in-progress)
  return (
    <KycFormWizard
      fields={fields}
      kycSession={kycSession}
      onComplete={fetchKycStatus}
    />
  );
}
