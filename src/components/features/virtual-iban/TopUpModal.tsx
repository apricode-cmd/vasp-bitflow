/**
 * Top Up Modal Component
 * 
 * Modal for creating top-up request with unique reference for payment matching.
 * 
 * Flow:
 * 1. User enters amount
 * 2. TopUpRequest is created with unique reference (TU-XXXX-XXXXXX)
 * 3. User downloads invoice PDF with payment instructions
 * 4. User makes bank transfer with reference
 * 5. BCB webhook matches payment → balance updated
 */

'use client';

import { useState } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  ArrowLeft,
  Loader2,
  Copy,
  Landmark,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import type { VirtualIbanAccount } from './types';

interface TopUpRequest {
  id: string;
  reference: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  expiresAt: string;
}

interface ExistingRequestError {
  code: 'EXISTING_PENDING_REQUEST';
  existingRequest: TopUpRequest;
  message: string;
}

interface TopUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: VirtualIbanAccount;
}

type Step = 'amount' | 'confirm' | 'success';

export function TopUpModal({ open, onOpenChange, account }: TopUpModalProps): JSX.Element {
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [topUpRequest, setTopUpRequest] = useState<TopUpRequest | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const isValidAmount = parsedAmount >= 10000;

  const handleCopy = (text: string, label: string): void => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  /**
   * Create TopUp Request via API
   */
  const handleCreateRequest = async (): Promise<void> => {
    setLoading(true);
    try {
      console.log('[TopUpModal] Creating request with amount:', parsedAmount);
      
      const response = await fetch(`/api/client/virtual-iban/${account.id}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsedAmount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create top-up request');
      }

      console.log('[TopUpModal] Request created:', data.data);
      setTopUpRequest(data.data);
      setStep('confirm');
      toast.success('Top-up request created!');
    } catch (error) {
      console.error('Create request error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create top-up request');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Download Invoice PDF for the created request
   */
  const handleDownloadInvoice = async (): Promise<void> => {
    if (!topUpRequest) return;

    setDownloadingInvoice(true);
    try {
      const response = await fetch(
        `/api/client/virtual-iban/${account.id}/topup/${topUpRequest.id}/invoice`
      );

      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      // Download PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topup-invoice-${topUpRequest.reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Invoice downloaded!');
      setStep('success');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download invoice');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const resetModal = (): void => {
    setStep('amount');
    setAmount('');
    setTopUpRequest(null);
  };

  const handleClose = (): void => {
    onOpenChange(false);
    setTimeout(resetModal, 200);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: account.currency || 'EUR',
    }).format(value);
  };

  const formatExpiryTime = (expiresAt: string): string => {
    const expiry = new Date(expiresAt);
    return expiry.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {/* STEP 1: Enter Amount */}
        {step === 'amount' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                Top Up Balance
              </DialogTitle>
              <DialogDescription>
                Enter the amount you want to transfer to your Virtual IBAN
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({account.currency})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                    €
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      console.log('[TopUpModal] Input changed:', newValue);
                      setAmount(newValue);
                    }}
                    className="pl-8 text-2xl h-14 font-mono"
                    min={10000}
                    step={0.01}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Minimum: €10,000
                  </p>
                  {parsedAmount > 0 && (
                    <p className="text-sm font-medium text-primary">
                      You will deposit: {formatCurrency(parsedAmount)}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2">
                <p className="w-full text-xs text-muted-foreground mb-1">Quick amounts:</p>
                {[10000, 25000, 50000, 100000].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('[TopUpModal] Quick amount clicked:', preset);
                      setAmount(preset.toString());
                    }}
                    className={amount === preset.toString() ? 'border-primary bg-primary/10' : ''}
                  >
                    €{preset.toLocaleString()}
                  </Button>
                ))}
              </div>

              {/* Current Balance */}
              <Alert>
                <AlertDescription className="flex justify-between items-center">
                  <span>Current Balance:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(account.balance || 0)}
                  </span>
                </AlertDescription>
              </Alert>
              
              {/* Preview after deposit */}
              {parsedAmount > 0 && (
                <Alert className="border-green-300 bg-green-50 dark:bg-green-950">
                  <AlertDescription className="flex justify-between items-center">
                    <span className="text-green-700 dark:text-green-400">Balance after deposit:</span>
                    <span className="font-bold text-lg text-green-700 dark:text-green-400">
                      {formatCurrency((account.balance || 0) + parsedAmount)}
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateRequest} 
                disabled={!isValidAmount || loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP 2: Confirm & Download Invoice */}
        {step === 'confirm' && topUpRequest && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Top-Up Request Created
              </DialogTitle>
              <DialogDescription>
                Download your invoice and make the bank transfer
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Amount to transfer */}
              <div className="text-center p-6 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-muted-foreground mb-1">Amount to Transfer</p>
                <p className="text-4xl font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(topUpRequest.amount)}
                </p>
              </div>

              {/* Unique Reference - IMPORTANT */}
              <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800 dark:text-blue-200">
                  Payment Reference (Required!)
                </AlertTitle>
                <AlertDescription className="mt-2">
                  <div className="flex items-center justify-between mt-2">
                    <code className="text-lg font-bold font-mono text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded">
                      {topUpRequest.reference}
                    </code>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCopy(topUpRequest.reference, 'Reference')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs mt-2 text-blue-600 dark:text-blue-400">
                    Include this reference in your bank transfer for automatic matching
                  </p>
                </AlertDescription>
              </Alert>

              {/* Transfer Details */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-sm mb-3">Transfer to:</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Account Holder</p>
                    <p className="font-medium">{account.accountHolder}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">IBAN</p>
                    <p className="font-mono font-bold text-primary">{account.iban}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleCopy(account.iban, 'IBAN')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">BIC/SWIFT</p>
                    <p className="font-mono font-medium">{account.bic}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleCopy(account.bic || '', 'BIC')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Bank Name</p>
                  <p className="font-medium">{account.bankName}</p>
                </div>
              </div>

              {/* Expiry warning */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Request expires: {formatExpiryTime(topUpRequest.expiresAt)}</span>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('amount')}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleDownloadInvoice} 
                disabled={downloadingInvoice}
                className="w-full sm:w-auto"
              >
                {downloadingInvoice ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download Invoice
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP 3: Success */}
        {step === 'success' && topUpRequest && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                All Set!
              </DialogTitle>
              <DialogDescription>
                Your top-up request is ready. Make the transfer to complete.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                
                <div>
                  <p className="font-medium">Invoice Downloaded</p>
                  <p className="text-sm text-muted-foreground">
                    Reference: <code className="font-bold">{topUpRequest.reference}</code>
                  </p>
                </div>

                <Alert>
                  <AlertDescription className="text-left">
                    <p className="font-medium mb-2">Next steps:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Open your bank app or online banking</li>
                      <li>Create a new transfer to the IBAN shown</li>
                      <li>Enter the exact amount: <strong>{formatCurrency(topUpRequest.amount)}</strong></li>
                      <li>Add reference: <strong>{topUpRequest.reference}</strong></li>
                      <li>Your balance will update automatically (1-2 business days)</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  SEPA: 1 day • SWIFT: 2-5 days
                </Badge>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
