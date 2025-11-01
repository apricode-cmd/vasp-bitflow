/**
 * Step-up MFA Dialog Component
 * 
 * Shows WebAuthn verification dialog for critical actions
 */

'use client';

import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Fingerprint, AlertTriangle, Loader2 } from 'lucide-react';

export interface StepUpMfaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: string;
  actionDescription?: string;
  onSuccess: (challengeId: string, response: AuthenticationResponseJSON) => void;
  onCancel?: () => void;
}

export function StepUpMfaDialog({
  open,
  onOpenChange,
  action,
  actionDescription,
  onSuccess,
  onCancel,
}: StepUpMfaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [options, setOptions] = useState<any>(null);

  // Request challenge when dialog opens
  const handleRequestChallenge = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/step-up-mfa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to request challenge');
      }

      setChallengeId(data.challengeId);
      setOptions(data.options);

      // Automatically start WebAuthn flow
      await handleVerify(data.challengeId, data.options);
    } catch (err: any) {
      console.error('Challenge request error:', err);
      setError(err.message || 'Failed to request verification');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify with WebAuthn
  const handleVerify = async (chalId: string, opts: any) => {
    try {
      setIsLoading(true);
      setError(null);

      // Start WebAuthn authentication
      const authResponse = await startAuthentication(opts);

      // Call success callback
      onSuccess(chalId, authResponse);
    } catch (err: any) {
      console.error('WebAuthn verification error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Verification was cancelled. Please try again.');
      } else if (err.name === 'SecurityError') {
        setError('Security error. Please ensure you are using HTTPS.');
      } else {
        setError(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle dialog open change
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && onCancel) {
      onCancel();
    }
    onOpenChange(newOpen);
  };

  // Auto-request challenge when dialog opens
  const handleDialogOpen = () => {
    if (open && !challengeId) {
      handleRequestChallenge();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-md" 
        onOpenAutoFocus={handleDialogOpen}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Security Verification Required
          </DialogTitle>
          <DialogDescription>
            This action requires additional authentication for security.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Description */}
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Action: {action.replace(/_/g, ' ')}</div>
              {actionDescription && (
                <div className="text-sm text-muted-foreground">{actionDescription}</div>
              )}
            </AlertDescription>
          </Alert>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* WebAuthn Instructions */}
          {!error && (
            <div className="text-center py-6">
              <div className="flex justify-center mb-4">
                {isLoading ? (
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                ) : (
                  <Fingerprint className="w-12 h-12 text-primary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? 'Waiting for verification...'
                  : 'Use Touch ID, Face ID, or your security key to confirm'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {error && (
              <Button
                onClick={handleRequestChallenge}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Try Again
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                if (onCancel) onCancel();
                onOpenChange(false);
              }}
              disabled={isLoading}
              className={error ? 'flex-1' : 'w-full'}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for using Step-up MFA in components
 */
export function useStepUpMfa() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [actionDescription, setActionDescription] = useState<string>('');
  const [onSuccessCallback, setOnSuccessCallback] = useState<
    ((challengeId: string, response: AuthenticationResponseJSON) => void) | null
  >(null);

  const requestStepUp = (
    action: string,
    description: string,
    onSuccess: (challengeId: string, response: AuthenticationResponseJSON) => void
  ) => {
    setCurrentAction(action);
    setActionDescription(description);
    setOnSuccessCallback(() => onSuccess);
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setCurrentAction('');
    setActionDescription('');
    setOnSuccessCallback(null);
  };

  return {
    isOpen,
    requestStepUp,
    closeDialog,
    StepUpMfaDialog: () =>
      onSuccessCallback ? (
        <StepUpMfaDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          action={currentAction}
          actionDescription={actionDescription}
          onSuccess={onSuccessCallback}
          onCancel={closeDialog}
        />
      ) : null,
  };
}

