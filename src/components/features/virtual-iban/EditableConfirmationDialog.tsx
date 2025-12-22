/**
 * Editable Confirmation Dialog Component
 * 
 * Shows user data preview with editing capability
 * Displays ASCII sanitization preview for BCB compatibility
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Info,
  Edit2,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import type { UserData } from './types';
import { sanitizeName, sanitizeAddress, sanitizeCity, sanitizePostcode, isValidForBCB } from '@/lib/utils/bcb-sanitize';

interface EditableConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userData: UserData | null;
  creating: boolean;
  onConfirm: (editedData?: Partial<UserData>) => void;
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

export function EditableConfirmationDialog({ 
  open, 
  onOpenChange, 
  userData, 
  creating, 
  onConfirm 
}: EditableConfirmationDialogProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<UserData>>({});
  const [showSanitizationWarning, setShowSanitizationWarning] = useState(false);

  // Reset edited data when dialog opens or userData changes
  useEffect(() => {
    if (userData) {
      setEditedData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        address: userData.address,
        city: userData.city,
        postalCode: userData.postalCode,
      });
      
      // Check if sanitization will occur
      const needsSanitization = 
        !isValidForBCB(`${userData.firstName} ${userData.lastName}`, false) ||
        !isValidForBCB(userData.address || '', true) ||
        !isValidForBCB(userData.city || '', false) ||
        !isValidForBCB(userData.postalCode || '', false);
      
      setShowSanitizationWarning(needsSanitization);
    }
  }, [userData, open]);

  const handleConfirm = () => {
    onConfirm(isEditing ? editedData : undefined);
  };

  const getCurrentData = () => ({
    firstName: editedData.firstName || userData?.firstName || '',
    lastName: editedData.lastName || userData?.lastName || '',
    address: editedData.address || userData?.address || '',
    city: editedData.city || userData?.city || '',
    postalCode: editedData.postalCode || userData?.postalCode || '',
  });

  const currentData = getCurrentData();
  const fullName = `${currentData.firstName} ${currentData.lastName}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header with gradient background */}
        <div className="relative -mx-6 -mt-6 mb-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
          <div className="relative px-6 py-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Landmark className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold mb-2">
                  Create Your Virtual IBAN
                </DialogTitle>
                <DialogDescription className="text-base">
                  {isEditing 
                    ? 'Edit your information if needed before submission to BCB'
                    : 'Review your verified information before account creation'}
                </DialogDescription>
              </div>
              {!isEditing && !creating && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
              )}
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
                  {isEditing 
                    ? 'You can adjust your name and address before sending to BCB'
                    : 'All information below will be sent to BCB Group for account creation'}
                </p>
              </div>
            </div>

            {/* Info about editable fields */}
            {!isEditing && (
              <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold mb-1">Fields sent to BCB Group:</p>
                  <p className="text-xs">
                    • Name (First & Last) • Address • City • Postal Code • Date of Birth • Nationality
                  </p>
                  <p className="text-xs mt-1 opacity-80">
                    Click <button onClick={() => setIsEditing(true)} className="underline font-semibold">Edit</button> to adjust name or address before submission.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Sanitization Warning */}
            {showSanitizationWarning && !isEditing && (
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 dark:text-amber-200 text-sm">
                  <p className="font-semibold mb-2">Special Characters Detected</p>
                  <p className="mb-2">
                    BCB requires ASCII-only characters. Special characters (ø, å, ü, é, etc.) will be automatically converted:
                  </p>
                  <div className="space-y-1 text-xs bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg font-mono">
                    {!isValidForBCB(fullName, false) && (
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 dark:text-amber-400">Name:</span>
                        <span className="text-amber-600 dark:text-amber-300">{fullName}</span>
                        <ArrowRight className="h-3 w-3 text-amber-600" />
                        <span className="text-green-700 dark:text-green-400 font-semibold">{sanitizeName(fullName)}</span>
                      </div>
                    )}
                    {!isValidForBCB(currentData.address, true) && (
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 dark:text-amber-400">Address:</span>
                        <span className="text-amber-600 dark:text-amber-300">{currentData.address}</span>
                        <ArrowRight className="h-3 w-3 text-amber-600" />
                        <span className="text-green-700 dark:text-green-400 font-semibold">{sanitizeAddress(currentData.address)}</span>
                      </div>
                    )}
                    {!isValidForBCB(currentData.city, false) && (
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 dark:text-amber-400">City:</span>
                        <span className="text-amber-600 dark:text-amber-300">{currentData.city}</span>
                        <ArrowRight className="h-3 w-3 text-amber-600" />
                        <span className="text-green-700 dark:text-green-400 font-semibold">{sanitizeCity(currentData.city)}</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs">
                    This is automatic and safe. Click <button onClick={() => setIsEditing(true)} className="underline font-semibold">Edit</button> if you want to change anything.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Personal Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-primary" />
                Personal Information {isEditing && <span className="text-xs font-normal text-muted-foreground">(sent to BCB)</span>}
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {/* First Name - EDITABLE (sent to BCB) */}
                <div className="space-y-2">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-xs text-muted-foreground">
                        First Name *
                      </Label>
                      <Input
                        id="firstName"
                        value={editedData.firstName || ''}
                        onChange={(e) => setEditedData({ ...editedData, firstName: e.target.value })}
                        className="h-12 font-semibold"
                        placeholder="First name"
                      />
                    </div>
                  ) : (
                    <div className="group p-4 bg-gradient-to-br from-muted/80 to-muted/40 hover:from-muted hover:to-muted/60 rounded-lg border border-border/50 transition-all h-full">
                      <p className="text-xs text-muted-foreground mb-1">First Name</p>
                      <p className="font-semibold text-foreground">{currentData.firstName}</p>
                    </div>
                  )}
                </div>

                {/* Last Name - EDITABLE (sent to BCB) */}
                <div className="space-y-2">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-xs text-muted-foreground">
                        Last Name *
                      </Label>
                      <Input
                        id="lastName"
                        value={editedData.lastName || ''}
                        onChange={(e) => setEditedData({ ...editedData, lastName: e.target.value })}
                        className="h-12 font-semibold"
                        placeholder="Last name"
                      />
                    </div>
                  ) : (
                    <div className="group p-4 bg-gradient-to-br from-muted/80 to-muted/40 hover:from-muted hover:to-muted/60 rounded-lg border border-border/50 transition-all h-full">
                      <p className="text-xs text-muted-foreground mb-1">Last Name</p>
                      <p className="font-semibold text-foreground">{currentData.lastName}</p>
                    </div>
                  )}
                </div>

                {/* Date of Birth - NOT EDITABLE (verified by KYC) */}
                <div className="group p-4 bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Date of Birth
                  </p>
                  <p className="font-semibold text-foreground">{formatDate(userData.dateOfBirth)}</p>
                  {isEditing && <p className="text-xs text-muted-foreground mt-1">KYC verified - cannot edit</p>}
                </div>

                {/* Nationality - NOT EDITABLE (verified by KYC) */}
                <div className="group p-4 bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Flag className="h-3 w-3" />
                    Nationality
                  </p>
                  <p className="font-semibold text-foreground">{userData.nationality || userData.country}</p>
                  {isEditing && <p className="text-xs text-muted-foreground mt-1">KYC verified - cannot edit</p>}
                </div>
              </div>
            </div>

            {/* Address Card */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                Residential Address {isEditing && <span className="text-xs font-normal text-muted-foreground">(sent to BCB)</span>}
              </h4>
              
              {isEditing ? (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-xs text-muted-foreground">
                      Street Address *
                    </Label>
                    <Input
                      id="address"
                      value={editedData.address || ''}
                      onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
                      className="h-12 font-semibold"
                      placeholder="Street address"
                    />
                    <p className="text-xs text-muted-foreground">Enter your full street address</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="postalCode" className="text-xs text-muted-foreground">
                        Postal Code
                      </Label>
                      <Input
                        id="postalCode"
                        value={editedData.postalCode || ''}
                        onChange={(e) => setEditedData({ ...editedData, postalCode: e.target.value })}
                        className="h-12 font-semibold"
                        placeholder="Postal code"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-xs text-muted-foreground">
                        City *
                      </Label>
                      <Input
                        id="city"
                        value={editedData.city || ''}
                        onChange={(e) => setEditedData({ ...editedData, city: e.target.value })}
                        className="h-12 font-semibold"
                        placeholder="City"
                      />
                    </div>
                  </div>
                  
                  {/* Country - read-only even in edit mode */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Flag className="h-3 w-3" />
                      Country
                    </Label>
                    <div className="h-12 px-3 py-2 bg-muted/50 rounded-md border border-border flex items-center">
                      <p className="font-semibold text-muted-foreground">{userData.country}</p>
                      <span className="ml-auto text-xs text-muted-foreground">KYC verified</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="group p-4 bg-gradient-to-br from-muted/80 to-muted/40 hover:from-muted hover:to-muted/60 rounded-lg border border-border/50 transition-all">
                  <p className="font-semibold text-foreground mb-1">{currentData.address}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentData.postalCode && `${currentData.postalCode}, `}
                    {currentData.city}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium mt-1 flex items-center gap-1">
                    <Flag className="h-3 w-3" />
                    {userData.country}
                  </p>
                </div>
              )}
            </div>

            {/* Account Features */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Landmark className="h-4 w-4 text-primary" />
                Account Features
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Currency</p>
                  <p className="font-bold text-blue-900 dark:text-blue-100">EUR</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Type</p>
                  <p className="font-bold text-purple-900 dark:text-purple-100">Virtual IBAN</p>
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
                  <span>Personal EUR IBAN for receiving payments</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Instant crypto purchases without waiting for bank transfers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Free account with no monthly fees</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Secure banking by BCB Group (regulated financial institution)</span>
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
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  // Reset to original data
                  if (userData) {
                    setEditedData({
                      firstName: userData.firstName,
                      lastName: userData.lastName,
                      address: userData.address,
                      city: userData.city,
                      postalCode: userData.postalCode,
                    });
                  }
                }}
                disabled={creating}
                className="w-full sm:w-auto"
              >
                Cancel Edit
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                disabled={creating}
                size="lg"
                className="w-full sm:w-auto"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={creating}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

