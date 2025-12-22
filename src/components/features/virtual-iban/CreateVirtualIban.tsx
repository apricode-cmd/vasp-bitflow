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
import { EditableConfirmationDialog } from './EditableConfirmationDialog';
import type { UserData } from './types';

interface CreateVirtualIbanProps {
  userData: UserData | null;
  creating: boolean;
  hasFailedAccount?: boolean;
  onCreateAccount: (editedData?: Partial<UserData>) => Promise<boolean>;
}

export function CreateVirtualIban({ 
  userData, 
  creating, 
  hasFailedAccount = false,
  onCreateAccount 
}: CreateVirtualIbanProps): JSX.Element {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleConfirm = async (editedData?: Partial<UserData>) => {
    const success = await onCreateAccount(editedData);
    if (success) {
      setShowConfirmDialog(false);
    }
  };

  return (
    <div className="space-y-8 animate-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-8 md:p-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex flex-col md:flex-row items-center gap-6">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg">
            <Landmark className="h-10 w-10 text-primary" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
              Virtual IBAN Account
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Get your personal EUR bank account for instant crypto purchases
            </p>
          </div>
        </div>
      </div>

      {/* Previous attempt failed alert */}
      {hasFailedAccount && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Previous attempt failed</span> — There was an issue creating your account. 
            Please try again or contact support if the problem persists.
          </AlertDescription>
        </Alert>
      )}

      {/* KYC Verified Badge */}
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
        <ShieldCheck className="h-5 w-5 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200 flex items-center gap-2">
          <span className="font-semibold text-base">✓ Identity Verified</span>
          <span className="text-sm opacity-90">— You are eligible to open a Virtual IBAN account</span>
        </AlertDescription>
      </Alert>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Instant Top-up */}
        <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
          <CardContent className="p-6 space-y-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <ArrowUpCircle className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Instant Top-up</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Transfer money from any EU bank account. Automatic reconciliation via webhooks.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Instant Purchases */}
        <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
          <CardContent className="p-6 space-y-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Instant Purchases</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Buy crypto instantly using your balance. No waiting for bank transfers to clear.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Secure Banking */}
        <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
          <CardContent className="p-6 space-y-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Secure Banking</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Powered by BCB Group - regulated banking infrastructure.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">How it works:</CardTitle>
          <CardDescription>Simple 4-step process to start using Virtual IBAN</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                step: '1',
                title: 'Review your verified data and confirm account creation',
                color: 'from-blue-500 to-blue-600',
              },
              {
                step: '2',
                title: 'Receive your personal Virtual IBAN (instant)',
                color: 'from-green-500 to-green-600',
              },
              {
                step: '3',
                title: 'Top up balance via bank transfer from your regular bank',
                color: 'from-purple-500 to-purple-600',
              },
              {
                step: '4',
                title: 'Use balance to buy crypto instantly - no waiting!',
                color: 'from-orange-500 to-orange-600',
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <div className={`flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br ${item.color} text-white flex items-center justify-center text-lg font-bold shadow-md`}>
                  {item.step}
                </div>
                <p className="text-sm leading-relaxed pt-1">{item.title}</p>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Create Button */}
          <div className="flex flex-col items-center gap-4 pt-2">
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={creating}
              size="lg"
              className="w-full md:w-auto px-12 h-14 text-lg shadow-lg hover:shadow-xl transition-all"
            >
              {creating ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Creating Virtual IBAN...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  Get My Virtual IBAN
                </>
              )}
            </Button>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Free to create
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                No monthly fees
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Instant activation
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
          <CardDescription>Everything you need to know about Virtual IBAN</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border hover:bg-muted transition-colors">
              <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Is it safe?
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Yes! Virtual IBAN is provided by <strong>BCB Group</strong>, a regulated payment institution. 
                Your funds are segregated and protected under European banking regulations.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border hover:bg-muted transition-colors">
              <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Are there any fees?
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>No!</strong> Creating and maintaining Virtual IBAN is completely free. 
                Using your balance for purchases has 0% fees. Only standard SEPA transfer fees from your bank apply.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border hover:bg-muted transition-colors">
              <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-primary" />
                How long does top-up take?
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                SEPA transfers typically arrive within <strong>1 business day</strong>. 
                Your balance will update automatically when payment is received via webhook.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border hover:bg-muted transition-colors">
              <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Can I use it from any EU country?
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Yes! Virtual IBAN accepts SEPA transfers from any bank in the EU/EEA. 
                The account is denominated in <strong>EUR</strong>.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border hover:bg-muted transition-colors">
              <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                What can I do with the balance?
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use your balance to <strong>buy cryptocurrency instantly</strong> without waiting for bank transfers. 
                You can also withdraw funds back to your personal bank account.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Confirmation Dialog */}
      <EditableConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        userData={userData}
        creating={creating}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

