/**
 * KYC Required Component
 * 
 * Displayed when user hasn't passed KYC verification
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Landmark, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  User,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface KYCRequiredProps {
  kycStatus: string;
}

export function KYCRequired({ kycStatus }: KYCRequiredProps): JSX.Element {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Landmark className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Virtual IBAN Account</h1>
          <p className="text-muted-foreground">Get your personal bank account for instant crypto purchases</p>
        </div>
      </div>

      {/* KYC Required Alert */}
      <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <p className="font-semibold mb-2">KYC Verification Required</p>
          <p>
            To open a Virtual IBAN account, you must first complete identity verification (KYC). 
            This is required by financial regulations to ensure the security of your funds.
          </p>
        </AlertDescription>
      </Alert>

      {/* KYC Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Identity Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                kycStatus === 'PENDING' 
                  ? 'bg-yellow-100 dark:bg-yellow-900/30' 
                  : kycStatus === 'REJECTED'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-gray-100 dark:bg-gray-900/30'
              }`}>
                {kycStatus === 'PENDING' ? (
                  <RefreshCw className="h-5 w-5 text-yellow-600 animate-spin" />
                ) : kycStatus === 'REJECTED' ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <User className="h-5 w-5 text-gray-600" />
                )}
              </div>
              <div>
                <p className="font-semibold">KYC Status</p>
                <p className="text-sm text-muted-foreground">
                  {kycStatus === 'PENDING' 
                    ? 'Verification in progress...'
                    : kycStatus === 'REJECTED'
                    ? 'Verification was rejected. Please try again.'
                    : 'Verification not started'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={
              kycStatus === 'PENDING' 
                ? 'bg-yellow-100 text-yellow-800' 
                : kycStatus === 'REJECTED'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }>
              {kycStatus || 'NOT_STARTED'}
            </Badge>
          </div>

          <Separator />

          <div className="flex justify-center pt-4">
            <Button size="lg" asChild>
              <Link href="/kyc">
                <ShieldCheck className="h-4 w-4 mr-2" />
                {!kycStatus || kycStatus === 'NOT_STARTED'
                  ? 'Start KYC Verification'
                  : kycStatus === 'REJECTED'
                  ? 'Retry KYC Verification'
                  : 'Check KYC Status'}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Why KYC is needed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Why is KYC required?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
            <span><strong>Regulatory Compliance:</strong> Financial regulations require identity verification for banking services.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
            <span><strong>Account Security:</strong> Protects your funds and prevents unauthorized access.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
            <span><strong>Fraud Prevention:</strong> Helps maintain a safe platform for all users.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

