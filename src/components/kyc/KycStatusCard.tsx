/**
 * KycStatusCard - Display KYC status with actions
 * Handles all statuses: PENDING, IN_PROGRESS, APPROVED, REJECTED
 */
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QRCode } from '@/components/ui/shadcn-io/qr-code';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { 
  CheckCircle, XCircle, Clock, Loader2, RefreshCw,
  Shield, FileText, ExternalLink, Copy, Info, ArrowRight
} from 'lucide-react';
import { KycStatus } from '@prisma/client';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/formatters';

interface KycSession {
  id: string;
  status: KycStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  formUrl?: string | null;
  kycProviderId?: string | null;
}

interface Props {
  kycSession: KycSession;
  onRefresh: () => Promise<void>;
  userId?: string;
}

export function KycStatusCard({ kycSession, onRefresh, userId }: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          KYC Verification Status
        </h1>
        <p className="text-muted-foreground">
          Track your verification progress
        </p>
      </div>

      {/* Status Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Status
              </CardTitle>
              <CardDescription className="mt-1">
                {kycSession.reviewedAt && `Last updated: ${formatDateTime(kycSession.reviewedAt)}`}
              </CardDescription>
            </div>
            <KycStatusBadge status={kycSession.status} size="lg" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* PENDING or IN_PROGRESS */}
          {(kycSession.status === 'PENDING' || kycSession.status === 'IN_PROGRESS') && (
            <div className="space-y-6">
              {/* KYCAID QR Code (if KYCAID is active provider) */}
              {kycSession.kycProviderId === 'kycaid' && kycSession.formUrl ? (
                <>
                  {/* Main action area */}
                  <div className="grid md:grid-cols-[2fr,1fr] gap-8 items-center">
                    {/* Left: Desktop option */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <ExternalLink className="h-4 w-4" />
                        Continue on this device
                      </div>
                      <Button 
                        className="w-full"
                        size="lg"
                        onClick={() => window.open(kycSession.formUrl!, '_blank', 'width=800,height=900')}
                      >
                        <FileText className="h-5 w-5 mr-2" />
                        Open Verification Form
                      </Button>
                    </div>

                    {/* Right: Mobile QR */}
                    <div className="flex flex-col items-center justify-center gap-3 md:border-l md:pl-8 py-2">
                      <div className="text-xs font-medium text-muted-foreground text-center">
                        Or scan with phone
                      </div>
                      <QRCode
                        className="size-32 rounded-lg border bg-background p-2.5 shadow-sm hover:shadow-md transition-all"
                        data={kycSession.formUrl}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(kycSession.formUrl!)}
                        className="w-full max-w-[200px]"
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Copy Link
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Complete on mobile
                      </p>
                    </div>
                  </div>

                  {/* What to prepare - compact */}
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-background p-2 mt-0.5">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-sm font-medium">What you'll need</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li className="flex items-start gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                            <span>Government-issued ID (passport or ID card)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                            <span>Well-lit environment for selfie</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Your documents are being reviewed by our team. This usually takes 2-4 hours.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* APPROVED */}
          {kycSession.status === 'APPROVED' && (
            <div className="space-y-6">
              {/* Success header */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Verification Complete!</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    You now have full access to all features
                  </p>
                </div>
              </div>

              {/* CTA */}
              <Button 
                className="w-full"
                size="lg"
                onClick={() => window.location.href = '/buy'}
              >
                Start Trading
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* REJECTED */}
          {kycSession.status === 'REJECTED' && (
            <div className="space-y-6">
              {/* Error header */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="rounded-lg bg-destructive/10 p-3">
                  <XCircle className="h-7 w-7 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Verification Not Approved</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Please review the information below
                  </p>
                </div>
              </div>

              {/* Reason */}
              {kycSession.rejectionReason && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {kycSession.rejectionReason}
                  </AlertDescription>
                </Alert>
              )}

              {/* Next steps - compact */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-background p-2 mt-0.5">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-sm font-medium">What to do next</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                        <span>Contact our support team for details</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                        <span>Ensure your documents are clear and valid</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                        <span>You may reapply after addressing issues</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Button 
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => window.location.href = '/profile'}
              >
                Contact Support
              </Button>
            </div>
          )}

          {/* Refresh Button */}
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full hover:bg-primary/5 hover:border-primary/30 transition-all"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

