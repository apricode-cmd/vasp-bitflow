/**
 * Create Virtual IBAN Component
 * 
 * Shows benefits and creation form for new Virtual IBAN
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Landmark, 
  CheckCircle2, 
  ArrowUpCircle,
  Plus,
  RefreshCw,
  Building2,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { ConfirmationDialog } from './ConfirmationDialog';
import type { UserData } from './types';

interface CreateVirtualIbanProps {
  userData: UserData | null;
  creating: boolean;
  hasFailedAccount?: boolean;
  onCreateAccount: () => Promise<boolean>;
}

export function CreateVirtualIban({ 
  userData, 
  creating, 
  hasFailedAccount = false,
  onCreateAccount 
}: CreateVirtualIbanProps): JSX.Element {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleConfirm = async () => {
    const success = await onCreateAccount();
    if (success) {
      setShowConfirmDialog(false);
    }
  };

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

      {/* Previous attempt failed alert */}
      {hasFailedAccount && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Previous attempt failed</span> — There was an issue creating your account. 
            Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* KYC Verified Badge */}
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
        <ShieldCheck className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <span className="font-semibold">✓ Identity Verified</span> — You are eligible to open a Virtual IBAN account.
        </AlertDescription>
      </Alert>

      {/* Benefits Card */}
      <Card>
        <CardHeader>
          <CardTitle>Why Get a Virtual IBAN?</CardTitle>
          <CardDescription>Fast, secure, and convenient</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ArrowUpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold">Instant Top-up</h3>
              <p className="text-sm text-muted-foreground">
                Transfer money from any EU bank account. Automatic reconciliation via webhooks.
              </p>
            </div>

            <div className="space-y-2">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold">Instant Purchases</h3>
              <p className="text-sm text-muted-foreground">
                Buy crypto instantly using your balance. No waiting for bank transfers to clear.
              </p>
            </div>

            <div className="space-y-2">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold">Secure Banking</h3>
              <p className="text-sm text-muted-foreground">
                Powered by BCB Group - regulated banking infrastructure.
              </p>
            </div>
          </div>

          <Separator />

          {/* How it works */}
          <div className="space-y-3">
            <h3 className="font-semibold">How it works:</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                <span>Review your verified data and confirm account creation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                <span>Receive your personal Virtual IBAN (instant)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
                <span>Top up balance via bank transfer from your regular bank</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">4</span>
                <span>Use balance to buy crypto instantly - no waiting!</span>
              </li>
            </ol>
          </div>

          <Separator />

          {/* Create Button */}
          <div className="flex items-center justify-center pt-4">
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={creating}
              size="lg"
              className="w-full md:w-auto px-8"
            >
              {creating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating Virtual IBAN...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Get My Virtual IBAN
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Free to create • No monthly fees • Instant activation
          </p>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Is it safe?</h4>
            <p className="text-sm text-muted-foreground">
              Yes! Virtual IBAN is provided by BCB Group, a regulated payment institution. 
              Your funds are segregated and protected.
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Are there any fees?</h4>
            <p className="text-sm text-muted-foreground">
              No! Creating and maintaining Virtual IBAN is completely free. 
              Using your balance for purchases has 0% fees.
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">How long does top-up take?</h4>
            <p className="text-sm text-muted-foreground">
              SEPA transfers typically arrive within 1 business day. 
              Your balance will update automatically when payment is received.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        userData={userData}
        creating={creating}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

