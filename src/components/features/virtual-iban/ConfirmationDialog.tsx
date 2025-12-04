/**
 * Confirmation Dialog Component
 * 
 * Shows user data preview before creating Virtual IBAN
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  User,
  MapPin,
  Calendar,
  Flag,
  Landmark,
  Info
} from 'lucide-react';
import type { UserData } from './types';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userData: UserData | null;
  creating: boolean;
  onConfirm: () => void;
}

/**
 * Format date safely
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
}

export function ConfirmationDialog({ 
  open, 
  onOpenChange, 
  userData, 
  creating, 
  onConfirm 
}: ConfirmationDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header with gradient background */}
        <div className="relative -mx-6 -mt-6 mb-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
          <div className="relative px-6 py-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Landmark className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold mb-2">
                  Create Your Virtual IBAN
                </DialogTitle>
                <DialogDescription className="text-base">
                  Review your verified information before account creation
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {userData && (
          <div className="space-y-6">
            {/* KYC Badge */}
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100 text-sm">
                  Identity Verified
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  All information below is from your approved KYC profile
                </p>
              </div>
            </div>

            {/* Personal Info Card */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-primary" />
                Personal Information
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="group p-4 bg-gradient-to-br from-muted/80 to-muted/40 hover:from-muted hover:to-muted/60 rounded-lg border border-border/50 transition-all">
                  <p className="text-xs text-muted-foreground mb-1">Full Name</p>
                  <p className="font-semibold text-foreground">{userData.firstName} {userData.lastName}</p>
                </div>
                <div className="group p-4 bg-gradient-to-br from-muted/80 to-muted/40 hover:from-muted hover:to-muted/60 rounded-lg border border-border/50 transition-all">
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="font-semibold text-foreground truncate">{userData.email}</p>
                </div>
                <div className="group p-4 bg-gradient-to-br from-muted/80 to-muted/40 hover:from-muted hover:to-muted/60 rounded-lg border border-border/50 transition-all">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Date of Birth
                  </p>
                  <p className="font-semibold text-foreground">{formatDate(userData.dateOfBirth)}</p>
                </div>
                <div className="group p-4 bg-gradient-to-br from-muted/80 to-muted/40 hover:from-muted hover:to-muted/60 rounded-lg border border-border/50 transition-all">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Flag className="h-3 w-3" />
                    Nationality
                  </p>
                  <p className="font-semibold text-foreground">{userData.nationality || userData.country}</p>
                </div>
              </div>
            </div>

            {/* Address Card */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                Residential Address
              </h4>
              <div className="group p-4 bg-gradient-to-br from-muted/80 to-muted/40 hover:from-muted hover:to-muted/60 rounded-lg border border-border/50 transition-all">
                <p className="font-semibold text-foreground mb-1">{userData.address || '-'}</p>
                <p className="text-sm text-muted-foreground">
                  {userData.postalCode && `${userData.postalCode}, `}
                  {userData.city}
                </p>
                <p className="text-sm text-muted-foreground font-medium mt-1">{userData.country}</p>
              </div>
            </div>

            {/* Account Features */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Landmark className="h-4 w-4 text-primary" />
                Account Features
              </h4>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Currency</p>
                  <p className="font-bold text-blue-900 dark:text-blue-100">EUR</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Type</p>
                  <p className="font-bold text-purple-900 dark:text-purple-100">Virtual</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Fees</p>
                  <p className="font-bold text-green-900 dark:text-green-100">€0</p>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                What you'll get:
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Personal EUR IBAN for instant deposits</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Instant crypto purchases with balance</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Automatic reconciliation via webhooks</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Regulated by BCB Group banking infrastructure</span>
                </li>
              </ul>
            </div>

            {/* Terms */}
            <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                By confirming, you agree to the{' '}
                <button className="underline hover:no-underline font-medium">
                  Virtual IBAN Terms of Service
                </button>
                {' '}and authorize us to create an account using your verified KYC data.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={creating}
            size="lg"
            className="w-full sm:w-auto"
          >
            {creating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating Your Account...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm & Create Account
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

