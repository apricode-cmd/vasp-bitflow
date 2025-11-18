/**
 * KycStatusCard - Display KYC status with actions
 * Handles all statuses: PENDING, IN_PROGRESS, APPROVED, REJECTED
 */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QRCode } from '@/components/ui/shadcn-io/qr-code';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { 
  CheckCircle, XCircle, Clock, Loader2, RefreshCw,
  Shield, FileText, ExternalLink, Copy, Info, ArrowRight, Camera
} from 'lucide-react';
import { KycStatus } from '@prisma/client';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/formatters';

// Maximum number of resubmission attempts allowed
const MAX_ATTEMPTS = 5;

interface KycSession {
  id: string;
  status: KycStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  formUrl?: string | null;
  kycProviderId?: string | null;
  // Resubmission fields
  canResubmit?: boolean;
  reviewRejectType?: string | null;
  moderationComment?: string | null;
  clientComment?: string | null;
  rejectLabels?: string[];
  attempts?: number;
}

interface Props {
  kycSession: KycSession;
  onRefresh: () => Promise<void>;
  userId?: string;
  onStartResubmission?: () => void; // Callback to show form
}

export function KycStatusCard({ kycSession, onRefresh, userId, onStartResubmission }: Props) {
  const { data: session } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sumsubMobileUrl, setSumsubMobileUrl] = useState<string | null>(null);

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

  // Fetch Sumsub mobile link for QR code
  useEffect(() => {
    if (kycSession.kycProviderId === 'sumsub' && session?.user?.id) {
      const fetchMobileLink = async () => {
        try {
          console.log('📱 Fetching Sumsub mobile link...');
          const response = await fetch('/api/kyc/mobile-link');
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Sumsub mobile link received:', data);
            
            if (data.mobileUrl) {
              setSumsubMobileUrl(data.mobileUrl);
              console.log('🔗 Mobile URL set:', data.mobileUrl);
            } else {
              console.error('❌ No mobileUrl in response:', data);
              toast.error('Failed to generate mobile link');
            }
          } else {
            const errorData = await response.json();
            console.error('❌ Failed to fetch mobile link:', errorData);
            toast.error('Failed to generate QR code');
          }
        } catch (error) {
          console.error('❌ Exception fetching Sumsub mobile link:', error);
          toast.error('Failed to load QR code');
        }
      };
      fetchMobileLink();
    }
  }, [kycSession.kycProviderId, session?.user?.id]);

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
              {/* Sumsub WebSDK */}
              {kycSession.kycProviderId === 'sumsub' && session?.user?.id ? (
                <>
                  {/* Main action area */}
                  <div className="grid md:grid-cols-[2fr,1fr] gap-8 items-center">
                    {/* Left: Desktop WebSDK option */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <ExternalLink className="h-4 w-4" />
                        Continue on this device
                      </div>
                      <Button 
                        className="w-full"
                        size="lg"
                        onClick={async () => {
                          try {
                            toast.info('Loading verification interface...');
                            
                            // 1. Fetch SDK token
                            const response = await fetch('/api/kyc/sdk-token');
                            if (!response.ok) {
                              throw new Error('Failed to get SDK token');
                            }
                            const { token } = await response.json();
                            
                            // 2. Create modal
                            const modal = document.createElement('div');
                            modal.id = 'sumsub-modal';
                            modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
                            modal.innerHTML = `
                              <div class="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto relative">
                                <button id="close-modal" class="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                  </svg>
                                </button>
                                <div id="sumsub-websdk-container" class="p-6 min-h-[600px]"></div>
                              </div>
                            `;
                            document.body.appendChild(modal);
                            
                            // 3. Close button handler
                            const closeBtn = document.getElementById('close-modal');
                            closeBtn?.addEventListener('click', () => {
                              modal.remove();
                            });
                            
                            // 4. Load Sumsub SDK script
                            const loadScript = () => {
                              return new Promise((resolve, reject) => {
                                if (document.getElementById('sumsub-websdk-script')) {
                                  resolve(true);
                                  return;
                                }
                                const script = document.createElement('script');
                                script.id = 'sumsub-websdk-script';
                                script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';
                                script.async = true;
                                script.onload = () => resolve(true);
                                script.onerror = () => reject(new Error('Failed to load SDK'));
                                document.body.appendChild(script);
                              });
                            };
                            
                            await loadScript();
                            
                            // 5. Initialize WebSDK
                            const snsWebSdk = (window as any).snsWebSdk;
                            if (!snsWebSdk) {
                              throw new Error('Sumsub SDK not loaded');
                            }
                            
                            const instance = snsWebSdk
                              .init(
                                token,
                                async () => {
                                  // Token refresh callback
                                  const refreshResponse = await fetch('/api/kyc/sdk-token');
                                  const refreshData = await refreshResponse.json();
                                  return refreshData.token;
                                }
                              )
                              .withConf({
                                lang: 'en',
                                theme: 'light'
                              })
                              .on('idCheck.onApplicantSubmitted', () => {
                                toast.success('Verification submitted! Please wait for review.');
                                modal.remove();
                                onRefresh();
                              })
                              .on('idCheck.onError', (error: any) => {
                                toast.error('Verification error: ' + (error.message || 'Unknown error'));
                              })
                              .build();
                            
                            // 6. Launch SDK
                            instance.launch('#sumsub-websdk-container');
                            
                          } catch (error: any) {
                            toast.error('Failed to load verification: ' + error.message);
                            console.error('Sumsub modal error:', error);
                          }
                        }}
                      >
                        <Camera className="h-5 w-5 mr-2" />
                        Start Verification
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Opens verification interface in a modal window
                      </p>
                    </div>

                    {/* Right: Mobile QR */}
                    <div className="flex flex-col items-center justify-center gap-3 md:border-l md:pl-8 py-2">
                      <div className="text-xs font-medium text-muted-foreground text-center">
                        Or scan with phone
                      </div>
                      {sumsubMobileUrl ? (
                        <>
                          <QRCode
                            className="size-32 rounded-lg border bg-background p-2.5 shadow-sm hover:shadow-md transition-all"
                            data={sumsubMobileUrl}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyLink(sumsubMobileUrl)}
                            className="w-full max-w-[200px]"
                          >
                            <Copy className="h-3 w-3 mr-2" />
                            Copy Link
                          </Button>
                        </>
                      ) : (
                        <div className="size-32 rounded-lg border bg-muted flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      )}
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
                            <span>Good lighting for selfie and document photos</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                            <span>5-7 minutes of your time</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              ) : kycSession.kycProviderId === 'kycaid' && kycSession.formUrl ? (
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
          {kycSession.status === 'REJECTED' && (() => {
            const currentAttempt = kycSession.attempts || 1;
            const canResubmit = currentAttempt < MAX_ATTEMPTS;
            
            return (
              <div className="space-y-6">
                {/* Error header */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="rounded-lg bg-destructive/10 p-3">
                    <XCircle className="h-7 w-7 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {canResubmit 
                        ? 'Verification Rejected'
                        : 'Maximum Attempts Reached'
                      }
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {canResubmit
                        ? `Attempt ${currentAttempt} of ${MAX_ATTEMPTS} - You can fix the issues and resubmit`
                        : `You've used all ${MAX_ATTEMPTS} attempts - Please contact support`
                      }
                    </p>
                  </div>
                </div>

                {/* Moderator comment */}
                {kycSession.moderationComment && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Moderator:</strong> {kycSession.moderationComment}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Rejection reason (fallback) */}
                {kycSession.rejectionReason && !kycSession.moderationComment && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {kycSession.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Rejection labels */}
                {kycSession.rejectLabels && kycSession.rejectLabels.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm font-medium mb-2">Issues Found:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {kycSession.rejectLabels.map((label, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                          <span>{label.replace(/_/g, ' ').toLowerCase()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CTA: Resubmit or Contact Support */}
                {canResubmit ? (
                  <div className="space-y-4">
                    {/* Resubmit form button */}
                    <div>
                      <Button 
                        variant="outline"
                        className="w-full"
                        size="lg"
                        onClick={() => {
                          if (onStartResubmission) {
                            onStartResubmission();
                          } else {
                            toast.info('Resubmission feature not available yet');
                          }
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Edit Form Data
                      </Button>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        Update your information if needed ({MAX_ATTEMPTS - currentAttempt} attempts remaining)
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or retry verification</span>
                      </div>
                    </div>

                    {/* Start verification button (same as PENDING) */}
                    {kycSession.kycProviderId === 'sumsub' && session?.user?.id ? (
                      <>
                        <div className="grid md:grid-cols-[2fr,1fr] gap-8 items-center">
                          {/* Left: Desktop WebSDK option */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <ExternalLink className="h-4 w-4" />
                              Continue on this device
                            </div>
                            <Button 
                              className="w-full"
                              size="lg"
                              onClick={async () => {
                                try {
                                  toast.info('Loading verification interface...');
                                  
                                  const response = await fetch('/api/kyc/sdk-token');
                                  if (!response.ok) throw new Error('Failed to get SDK token');
                                  const { token } = await response.json();
                                  
                                  const modal = document.createElement('div');
                                  modal.id = 'sumsub-modal';
                                  modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
                                  modal.innerHTML = `
                                    <div class="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto relative">
                                      <button id="close-modal" class="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                      </button>
                                      <div id="sumsub-websdk-container" class="p-6 min-h-[600px]"></div>
                                    </div>
                                  `;
                                  document.body.appendChild(modal);
                                  
                                  document.getElementById('close-modal')?.addEventListener('click', () => modal.remove());
                                  
                                  const loadScript = () => {
                                    return new Promise((resolve, reject) => {
                                      if (document.getElementById('sumsub-websdk-script')) { resolve(true); return; }
                                      const script = document.createElement('script');
                                      script.id = 'sumsub-websdk-script';
                                      script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';
                                      script.async = true;
                                      script.onload = () => resolve(true);
                                      script.onerror = () => reject(new Error('Failed to load SDK'));
                                      document.body.appendChild(script);
                                    });
                                  };
                                  
                                  await loadScript();
                                  
                                  const snsWebSdk = (window as any).snsWebSdk;
                                  if (!snsWebSdk) throw new Error('Sumsub SDK not loaded');
                                  
                                  const instance = snsWebSdk
                                    .init(token, async () => {
                                      const refreshResponse = await fetch('/api/kyc/sdk-token');
                                      const refreshData = await refreshResponse.json();
                                      return refreshData.token;
                                    })
                                    .withConf({ lang: 'en', theme: 'light' })
                                    .on('idCheck.onApplicantSubmitted', () => {
                                      toast.success('Verification submitted! Please wait for review.');
                                      modal.remove();
                                      onRefresh();
                                    })
                                    .on('idCheck.onError', (error: any) => {
                                      toast.error('Verification error: ' + (error.message || 'Unknown error'));
                                    })
                                    .build();
                                  
                                  instance.launch('#sumsub-websdk-container');
                                  
                                } catch (error: any) {
                                  toast.error('Failed to load verification: ' + error.message);
                                  console.error('Sumsub modal error:', error);
                                }
                              }}
                            >
                              <Camera className="h-5 w-5 mr-2" />
                              Retry Verification
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              Opens verification interface in a modal window
                            </p>
                          </div>

                          {/* Right: Mobile QR */}
                          <div className="flex flex-col items-center justify-center gap-3 md:border-l md:pl-8 py-2">
                            <div className="text-xs font-medium text-muted-foreground text-center">
                              Or scan with phone
                            </div>
                            {sumsubMobileUrl ? (
                              <>
                                <QRCode
                                  className="size-32 rounded-lg border bg-background p-2.5 shadow-sm hover:shadow-md transition-all"
                                  data={sumsubMobileUrl}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyLink(sumsubMobileUrl)}
                                  className="w-full max-w-[200px]"
                                >
                                  <Copy className="h-3 w-3 mr-2" />
                                  Copy Link
                                </Button>
                              </>
                            ) : (
                              <div className="size-32 rounded-lg border bg-muted flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                              </div>
                            )}
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
                                  <span>Good lighting for selfie and document photos</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                                  <span>5-7 minutes of your time</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Alert variant="destructive">
                      <AlertDescription>
                        <strong>Maximum Attempts Reached:</strong> You've used all {MAX_ATTEMPTS} resubmission attempts. 
                        Please contact support for further assistance.
                      </AlertDescription>
                    </Alert>
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
              </div>
            );
          })()}

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

