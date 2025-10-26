/**
 * KYC Verification Page
 * 
 * Enhanced user KYC verification with progress tracking
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { toast } from 'sonner';
import { 
  Shield, CheckCircle, XCircle, Clock, Loader2, 
  FileText, Camera, User, AlertCircle, ArrowRight
} from 'lucide-react';
import { KycStatus } from '@prisma/client';
import { formatDateTime } from '@/lib/formatters';

interface KycSession {
  id: string;
  status: KycStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  kycaidVerificationId: string | null;
}

const KYC_STEPS = [
  {
    title: 'Start Verification',
    description: 'Begin your KYC process',
    icon: User,
  },
  {
    title: 'Upload Documents',
    description: 'Provide identification documents',
    icon: FileText,
  },
  {
    title: 'Selfie Verification',
    description: 'Take a photo for identity confirmation',
    icon: Camera,
  },
  {
    title: 'Review',
    description: 'Our team reviews your submission',
    icon: Shield,
  },
];

export default function KycPage(): React.ReactElement {
  const [kycSession, setKycSession] = useState<KycSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch KYC status
  const fetchKycStatus = async () => {
    try {
      const response = await fetch('/api/kyc/status');
      if (response.ok) {
        const data = await response.json();
        if (data.status !== 'NOT_STARTED') {
          setKycSession(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const handleStartKyc = async () => {
    // Redirect to form page
    window.location.href = '/kyc/form';
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate progress
  const getProgress = () => {
    if (!kycSession) return 0;
    switch (kycSession.status) {
      case 'PENDING': return 75;
      case 'APPROVED': return 100;
      case 'REJECTED': return 50;
      default: return 0;
    }
  };

  const getCurrentStep = () => {
    if (!kycSession) return 0;
    switch (kycSession.status) {
      case 'PENDING': return 3;
      case 'APPROVED': return 4;
      case 'REJECTED': return 3;
      default: return 0;
    }
  };

  const progress = getProgress();
  const currentStep = getCurrentStep();

  // Not started
  if (!kycSession) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Identity Verification</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">KYC Verification</h1>
          <p className="text-muted-foreground text-lg">
            Complete verification to unlock cryptocurrency trading
          </p>
        </div>

        {/* What You'll Need */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>What You&apos;ll Need</CardTitle>
                <CardDescription>Prepare these items before starting</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Valid Government ID</p>
                  <p className="text-sm text-muted-foreground">
                    Passport, driver&apos;s license, or national ID card
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Clear Selfie Photo</p>
                  <p className="text-sm text-muted-foreground">
                    Recent photo of yourself for identity confirmation
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">5-10 Minutes</p>
                  <p className="text-sm text-muted-foreground">
                    Quick and simple verification process
                  </p>
                </div>
              </div>
            </div>

            <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">Why KYC?</AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                Identity verification helps prevent fraud and ensures compliance with financial 
                regulations. Your data is encrypted and securely stored.
              </AlertDescription>
            </Alert>

            <Button 
              size="lg" 
              className="w-full gradient-primary" 
              onClick={handleStartKyc}
            >
              <Shield className="h-5 w-5 mr-2" />
              Start Verification
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Verification Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Process</CardTitle>
            <CardDescription>What to expect during KYC</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {KYC_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <AccordionItem key={index} value={`step-${index}`}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">Step {index + 1}: {step.title}</p>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pl-11">
                      Details about {step.title.toLowerCase()} will be provided during the verification process.
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    );
  }

  // KYC Status Display
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
          <Shield className="h-4 w-4" />
          <span className="text-sm font-medium">Identity Verification</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Verification Status</h1>
        <div className="flex items-center justify-center gap-2">
          <KycStatusBadge status={kycSession.status} />
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Progress</CardTitle>
          <CardDescription>Track your verification journey</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Step {currentStep} of {KYC_STEPS.length}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-3">
            {KYC_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep - 1;
              
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    isCompleted 
                      ? 'bg-green-100 text-green-600' 
                      : isCurrent 
                      ? 'bg-primary/10 text-primary animate-pulse' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>
                      {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  {isCompleted && (
                    <Badge variant="success">Complete</Badge>
                  )}
                  {isCurrent && (
                    <Badge variant="default">In Progress</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {kycSession.status === 'PENDING' && (
        <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <Clock className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="text-yellow-900 dark:text-yellow-100">Under Review</AlertTitle>
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            Your documents are being reviewed by our team. This usually takes 1-2 business days. 
            We&apos;ll notify you via email once the review is complete.
          </AlertDescription>
        </Alert>
      )}

      {kycSession.status === 'APPROVED' && (
        <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-900 dark:text-green-100">Verification Approved!</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-green-800 dark:text-green-200">
              Congratulations! Your identity has been verified. You can now start buying cryptocurrency.
            </p>
            <Link href="/buy">
              <Button className="bg-green-600 hover:bg-green-700">
                Start Trading Now
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {kycSession.status === 'REJECTED' && (
        <Alert variant="destructive">
          <XCircle className="h-5 w-5" />
          <AlertTitle>Verification Rejected</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {kycSession.rejectionReason || 
                'Your verification was not approved. Please contact support for more information.'}
            </p>
            <Button variant="outline" size="sm">
              Contact Support
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Verification Details */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {kycSession.submittedAt && (
              <div>
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-medium">{formatDateTime(kycSession.submittedAt)}</p>
              </div>
            )}
            {kycSession.reviewedAt && (
              <div>
                <p className="text-muted-foreground">Reviewed</p>
                <p className="font-medium">{formatDateTime(kycSession.reviewedAt)}</p>
              </div>
            )}
            {kycSession.kycaidVerificationId && (
              <div>
                <p className="text-muted-foreground">Verification ID</p>
                <p className="font-mono text-xs">{kycSession.kycaidVerificationId}</p>
              </div>
            )}
          </div>

          {kycSession.status === 'PENDING' && (
            <>
              <Separator />
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please do not submit another verification while this one is being reviewed.
                  Contact support if you have questions.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="faq-1">
              <AccordionTrigger>How long does KYC verification take?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Most verifications are completed within 1-2 business days. You&apos;ll receive 
                an email notification once your verification is reviewed.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2">
              <AccordionTrigger>What documents are accepted?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We accept government-issued IDs including passports, driver&apos;s licenses, 
                and national ID cards. Documents must be valid and clearly readable.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-3">
              <AccordionTrigger>Is my data secure?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! All your personal data is encrypted and stored securely. We comply with 
                GDPR and other data protection regulations.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
