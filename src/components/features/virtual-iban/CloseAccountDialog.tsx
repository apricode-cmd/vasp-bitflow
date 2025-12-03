'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CloseAccountDialogProps {
  accountId: string;
  iban: string;
  balance: number;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

export function CloseAccountDialog({
  accountId,
  iban,
  balance,
  currency,
  open,
  onOpenChange,
  onSuccess,
  isAdmin = false,
}: CloseAccountDialogProps): JSX.Element {
  const [reason, setReason] = useState('');
  const [forceClose, setForceClose] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = async (): Promise<void> => {
    if (!isAdmin && !reason.trim()) {
      toast.error('Please provide a reason for closing the account');
      return;
    }

    if (!isAdmin && balance > 0 && !forceClose) {
      toast.error('Cannot close account with non-zero balance');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isAdmin
        ? `/api/admin/virtual-iban/${accountId}/close`
        : `/api/client/virtual-iban/${accountId}/close`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim(), forceClose }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to close account');
      }

      toast.success('Virtual IBAN account closed successfully');
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Close account error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to close account');
    } finally {
      setLoading(false);
    }
  };

  const hasBalance = balance > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Close Virtual IBAN Account
          </DialogTitle>
          <DialogDescription>
            This action will permanently close your Virtual IBAN account. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Account Info */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IBAN:</span>
              <span className="font-mono font-medium">{iban}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance:</span>
              <span className={`font-semibold ${hasBalance ? 'text-yellow-600' : 'text-green-600'}`}>
                {currency} {balance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Warnings */}
          {hasBalance && !isAdmin && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You must withdraw all funds before closing this account. Current balance: {currency} {balance.toFixed(2)}
              </AlertDescription>
            </Alert>
          )}

          {hasBalance && isAdmin && !forceClose && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This account has a non-zero balance. Check the "Force Close" option to proceed.
              </AlertDescription>
            </Alert>
          )}

          {/* Admin Force Close Option */}
          {isAdmin && hasBalance && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <input
                type="checkbox"
                id="force-close"
                checked={forceClose}
                onChange={(e) => setForceClose(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="force-close" className="text-sm font-medium text-yellow-900">
                Force close (admin override for non-zero balance)
              </label>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for closure {!isAdmin && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you want to close this account..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required={!isAdmin}
            />
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> After closing:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>You will not be able to receive payments to this IBAN</li>
                <li>You will not be able to reopen this account</li>
                <li>All transaction history will remain visible for records</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleClose}
            disabled={loading || (!isAdmin && hasBalance) || (!isAdmin && !reason.trim())}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Closing...' : 'Close Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

