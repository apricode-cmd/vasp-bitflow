/**
 * KycProviderInfo
 * 
 * Displays KYC provider information
 * Supports multiple providers (KYCAID, Sumsub, etc.)
 */

'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, ExternalLink } from 'lucide-react';
import type { KycSessionDetail } from './types';
import { Button } from '@/components/ui/button';

interface KycProviderInfoProps {
  session: KycSessionDetail;
}

export function KycProviderInfo({ session }: KycProviderInfoProps): JSX.Element {
  // Determine provider details
  const provider = session.provider;
  const providerId = session.kycProviderId || (session.metadata as any)?.provider;
  
  // Get verification IDs based on provider
  const getVerificationIds = () => {
    const ids: { label: string; value: string }[] = [];

    // KYCAID
    if (session.kycaidVerificationId) {
      ids.push({
        label: 'KYCAID Verification ID',
        value: session.kycaidVerificationId
      });
    }
    if (session.kycaidApplicantId) {
      ids.push({
        label: 'KYCAID Applicant ID',
        value: session.kycaidApplicantId
      });
    }

    // Generic/Sumsub
    if (session.verificationId && session.verificationId !== session.kycaidVerificationId) {
      ids.push({
        label: 'Verification ID',
        value: session.verificationId
      });
    }
    if (session.applicantId && session.applicantId !== session.kycaidApplicantId) {
      ids.push({
        label: 'Applicant ID',
        value: session.applicantId
      });
    }

    return ids;
  };

  const verificationIds = getVerificationIds();

  // Get provider dashboard URL
  const getProviderDashboardUrl = () => {
    if (!providerId) return null;

    switch (providerId.toLowerCase()) {
      case 'kycaid':
        if (session.kycaidApplicantId) {
          return `https://dashboard.kycaid.com/applicants/${session.kycaidApplicantId}`;
        }
        break;
      case 'sumsub':
        if (session.applicantId) {
          return `https://cockpit.sumsub.com/checkus/applicants/${session.applicantId}`;
        }
        break;
    }
    return null;
  };

  const dashboardUrl = getProviderDashboardUrl();

  if (!provider && !providerId && verificationIds.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          KYC Provider
        </h3>
        <p className="text-sm text-muted-foreground">No provider information available</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Shield className="h-4 w-4" />
        KYC Provider
      </h3>
      <div className="space-y-4">
        {/* Provider Name & Status */}
        {provider && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{provider.name}</span>
                    {provider.status === 'active' && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Service: {provider.service}
                  </p>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Provider ID */}
        {providerId && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Provider</p>
            <Badge variant="outline" className="font-mono">
              {providerId.toUpperCase()}
            </Badge>
          </div>
        )}

        {/* Verification IDs */}
        {verificationIds.length > 0 && (
          <>
            {providerId && <Separator />}
            <div className="space-y-3">
              {verificationIds.map((id, index) => (
                <div key={index}>
                  <p className="text-sm text-muted-foreground mb-1">{id.label}</p>
                  <p className="font-mono text-sm bg-muted px-3 py-2 rounded-md break-all">
                    {id.value}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Dashboard Link */}
        {dashboardUrl && (
          <>
            <Separator />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open(dashboardUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View in {providerId?.toUpperCase()} Dashboard
            </Button>
          </>
        )}

        {/* Metadata (for debugging) */}
        {process.env.NODE_ENV === 'development' && session.metadata && (
          <>
            <Separator />
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Provider Metadata (dev)
              </summary>
              <pre className="mt-2 bg-muted p-2 rounded text-[10px] overflow-auto max-h-40">
                {JSON.stringify(session.metadata, null, 2)}
              </pre>
            </details>
          </>
        )}
      </div>
    </Card>
  );
}

