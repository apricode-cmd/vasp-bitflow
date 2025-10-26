/**
 * Order Transition Confirmation Dialog
 * Shows when moving orders between Kanban columns that require additional data
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/shared/Combobox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { OrderStatus } from '@prisma/client';

interface Order {
  id: string;
  paymentReference: string;
  totalFiat: number;
  fiatCurrencyCode: string;
  cryptoAmount: number;
  currencyCode: string;
  walletAddress: string;
  blockchainCode?: string;
}

interface OrderTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  onConfirm: (data: any) => Promise<void>;
  paymentMethods?: any[];
  fiatCurrencies?: any[];
  cryptocurrencies?: any[];
  networks?: any[];
}

export function OrderTransitionDialog({
  open,
  onOpenChange,
  order,
  fromStatus,
  toStatus,
  onConfirm,
  paymentMethods = [],
  fiatCurrencies = [],
  cryptocurrencies = [],
  networks = []
}: OrderTransitionDialogProps) {
  const requiresPayIn = fromStatus === 'PENDING' && toStatus === 'PAYMENT_PENDING';
  const requiresPayOut = fromStatus === 'PROCESSING' && toStatus === 'COMPLETED';
  
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // PayIn fields
    payInAmount: 0,
    payInCurrencyType: 'FIAT' as 'FIAT' | 'CRYPTO',
    payInFiatCurrency: '',
    payInCryptoCurrency: '',
    payInPaymentMethod: '',
    payInSenderName: '',
    payInSenderAccount: '',
    payInReference: '',
    
    // PayOut fields
    payOutAmount: 0,
    payOutCurrencyType: 'CRYPTO' as 'FIAT' | 'CRYPTO',
    payOutFiatCurrency: '',
    payOutCryptoCurrency: '',
    payOutPaymentMethod: '',
    payOutNetwork: '',
    payOutDestinationAddress: '',
    payOutTransactionHash: '',
    
    // Common
    adminNotes: ''
  });

  // Auto-fill from order when dialog opens
  useEffect(() => {
    if (order && open) {
      setFormData(prev => ({
        ...prev,
        payInAmount: order.totalFiat,
        payInFiatCurrency: order.fiatCurrencyCode,
        payOutAmount: order.cryptoAmount,
        payOutCryptoCurrency: order.currencyCode,
        payOutNetwork: order.blockchainCode || '',
        payOutDestinationAddress: order.walletAddress
      }));
    }
  }, [order, open]);

  const handleSubmit = async () => {
    if (!order) return;

    setSubmitting(true);
    try {
      const data: any = {
        status: toStatus,
        adminNotes: formData.adminNotes
      };

      if (requiresPayIn) {
        data.payInData = {
          amount: formData.payInAmount,
          currencyType: formData.payInCurrencyType,
          fiatCurrencyCode: formData.payInCurrencyType === 'FIAT' ? formData.payInFiatCurrency : undefined,
          cryptocurrencyCode: formData.payInCurrencyType === 'CRYPTO' ? formData.payInCryptoCurrency : undefined,
          paymentMethodCode: formData.payInPaymentMethod,
          expectedAmount: formData.payInAmount,
          senderName: formData.payInSenderName || undefined,
          senderAccount: formData.payInSenderAccount || undefined,
          reference: formData.payInReference || undefined
        };
      }

      if (requiresPayOut) {
        data.payOutData = {
          amount: formData.payOutAmount,
          currencyType: formData.payOutCurrencyType,
          fiatCurrencyCode: formData.payOutCurrencyType === 'FIAT' ? formData.payOutFiatCurrency : undefined,
          cryptocurrencyCode: formData.payOutCurrencyType === 'CRYPTO' ? formData.payOutCryptoCurrency : undefined,
          networkCode: formData.payOutNetwork || undefined,
          destinationAddress: formData.payOutDestinationAddress || undefined,
          transactionHash: formData.payOutTransactionHash || undefined,
          paymentMethodCode: formData.payOutPaymentMethod
        };
        data.transactionHash = formData.payOutTransactionHash || undefined;
      }

      await onConfirm(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Transition error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  const filteredPayInMethods = paymentMethods.filter(m => 
    m.direction === 'IN' || m.direction === 'BOTH'
  );

  const filteredPayOutMethods = paymentMethods.filter(m => 
    m.direction === 'OUT' || m.direction === 'BOTH'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {requiresPayIn && '💰 Register Payment Receipt'}
            {requiresPayOut && '🚀 Complete Order & Send Crypto'}
            {!requiresPayIn && !requiresPayOut && 'Confirm Status Change'}
          </DialogTitle>
          <DialogDescription>
            Moving order <strong>#{order.paymentReference}</strong> from{' '}
            <Badge variant="outline">{fromStatus}</Badge>{' '}
            <ArrowRight className="inline h-4 w-4 mx-1" />{' '}
            <Badge variant="outline">{toStatus}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Summary */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">Order Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Buying:</span>
                <p className="font-medium">{order.cryptoAmount} {order.currencyCode}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Paying:</span>
                <p className="font-medium">{order.totalFiat} {order.fiatCurrencyCode}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* PayIn Form */}
          {requiresPayIn && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">Payment Received</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    Register that customer has sent payment. This creates a Pay In record.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount Received *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.payInAmount}
                    onChange={(e) => setFormData({ ...formData, payInAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <Label>Currency Type *</Label>
                  <Select 
                    value={formData.payInCurrencyType} 
                    onValueChange={(value: 'FIAT' | 'CRYPTO') => setFormData({ ...formData, payInCurrencyType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIAT">Fiat (EUR, PLN)</SelectItem>
                      <SelectItem value="CRYPTO">Cryptocurrency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Payment Method *</Label>
                <Combobox
                  options={filteredPayInMethods.map(pm => ({
                    value: pm.code,
                    label: pm.name,
                    description: pm.currency
                  }))}
                  value={formData.payInPaymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, payInPaymentMethod: value })}
                  placeholder="Select payment method..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sender Name</Label>
                  <Input
                    value={formData.payInSenderName}
                    onChange={(e) => setFormData({ ...formData, payInSenderName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label>Sender Account/IBAN</Label>
                  <Input
                    value={formData.payInSenderAccount}
                    onChange={(e) => setFormData({ ...formData, payInSenderAccount: e.target.value })}
                    placeholder="PL..."
                  />
                </div>
              </div>

              <div>
                <Label>Payment Reference</Label>
                <Input
                  value={formData.payInReference}
                  onChange={(e) => setFormData({ ...formData, payInReference: e.target.value })}
                  placeholder="Bank reference or transaction ID"
                />
              </div>
            </div>
          )}

          {/* PayOut Form */}
          {requiresPayOut && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-green-900 dark:text-green-100">Send Cryptocurrency</p>
                  <p className="text-green-700 dark:text-green-300">
                    Record that you've sent crypto to customer. This creates a Pay Out record.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount Sent *</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={formData.payOutAmount}
                    onChange={(e) => setFormData({ ...formData, payOutAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <Label>Cryptocurrency *</Label>
                  <Input
                    value={formData.payOutCryptoCurrency}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div>
                <Label>Payment Method *</Label>
                <Combobox
                  options={filteredPayOutMethods.map(pm => ({
                    value: pm.code,
                    label: pm.name,
                    description: pm.currency
                  }))}
                  value={formData.payOutPaymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, payOutPaymentMethod: value })}
                  placeholder="Select payment method..."
                />
              </div>

              <div>
                <Label>Destination Address *</Label>
                <Input
                  value={formData.payOutDestinationAddress}
                  onChange={(e) => setFormData({ ...formData, payOutDestinationAddress: e.target.value })}
                  placeholder="0x... or bc1q..."
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label>Transaction Hash *</Label>
                <Input
                  value={formData.payOutTransactionHash}
                  onChange={(e) => setFormData({ ...formData, payOutTransactionHash: e.target.value })}
                  placeholder="0x..."
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* Admin Notes */}
          <div>
            <Label>Admin Notes (optional)</Label>
            <Textarea
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              placeholder="Internal notes about this status change..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Processing...' : 'Confirm & Move Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

