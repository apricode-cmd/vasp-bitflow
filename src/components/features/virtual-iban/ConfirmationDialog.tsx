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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            Confirm Virtual IBAN Creation
          </DialogTitle>
          <DialogDescription>
            Please review your verified information. Your Virtual IBAN account will be created with this data.
          </DialogDescription>
        </DialogHeader>

        {userData && (
          <div className="space-y-4 py-4">
            {/* Personal Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal Information
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-medium">{userData.firstName} {userData.lastName}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium truncate">{userData.email}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Date of Birth
                  </p>
                  <p className="font-medium">{formatDate(userData.dateOfBirth)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Flag className="h-3 w-3" />
                    Nationality
                  </p>
                  <p className="font-medium">{userData.nationality || '-'}</p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </h4>
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium">{userData.address || '-'}</p>
                <p className="text-muted-foreground">
                  {userData.city}
                  {userData.postalCode && `, ${userData.postalCode}`}
                </p>
                <p className="text-muted-foreground">{userData.country}</p>
              </div>
            </div>

            {/* Account Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Account Details
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <p className="font-medium">EUR (Euro)</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Account Type</p>
                  <p className="font-medium">Virtual IBAN</p>
                </div>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                By confirming, you agree to the terms of service for Virtual IBAN accounts.
                This data is from your verified KYC profile.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={creating}
          >
            {creating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm & Create
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

