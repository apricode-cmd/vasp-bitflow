/**
 * Admin Payment Methods Management Page
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  currency: string;
  isActive: boolean;
  processingTime: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  feeFixed: number;
  feePercent: number;
  priority: number;
  fiatCurrency: {
    name: string;
    symbol: string;
  };
  _count: {
    orders: number;
  };
}

export default function PaymentMethodsPage(): JSX.Element {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PaymentMethod>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] = useState<any>({
    type: 'bank_transfer',
    currency: 'EUR',
    isActive: true,
    feeFixed: 0,
    feePercent: 0,
    priority: 0
  });

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/payment-methods');
      const data = await response.json();

      if (data.success) {
        setMethods(data.data);
      } else {
        toast.error('Failed to fetch payment methods');
      }
    } catch (error) {
      console.error('Fetch methods error:', error);
      toast.error('Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  };

  const createMethod = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createValues)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Payment method created');
        setShowCreateForm(false);
        setCreateValues({
          type: 'bank_transfer',
          currency: 'EUR',
          isActive: true,
          feeFixed: 0,
          feePercent: 0,
          priority: 0
        });
        await fetchMethods();
      } else {
        toast.error(data.error || 'Failed to create payment method');
      }
    } catch (error) {
      console.error('Create method error:', error);
      toast.error('Failed to create payment method');
    }
  };

  const startEdit = (method: PaymentMethod): void => {
    setEditingId(method.id);
    setEditValues({
      name: method.name,
      processingTime: method.processingTime || undefined,
      minAmount: method.minAmount || undefined,
      maxAmount: method.maxAmount || undefined,
      feeFixed: method.feeFixed,
      feePercent: method.feePercent
    });
  };

  const saveEdit = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/payment-methods/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Payment method updated');
        setEditingId(null);
        setEditValues({});
        await fetchMethods();
      } else {
        toast.error(data.error || 'Failed to update payment method');
      }
    } catch (error) {
      console.error('Update method error:', error);
      toast.error('Failed to update payment method');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/payment-methods/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(currentStatus ? 'Payment method deactivated' : 'Payment method activated');
        await fetchMethods();
      } else {
        toast.error(data.error || 'Failed to update payment method');
      }
    } catch (error) {
      console.error('Toggle active error:', error);
      toast.error('Failed to update payment method');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Methods</h1>
          <p className="text-muted-foreground">Manage available payment methods</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Add Payment Method'}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={createValues.type}
                  onChange={(e) => setCreateValues({ ...createValues, type: e.target.value })}
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card_payment">Card Payment</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={createValues.name || ''}
                  onChange={(e) => setCreateValues({ ...createValues, name: e.target.value })}
                  placeholder="e.g., SEPA Transfer EUR"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Currency</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={createValues.currency}
                  onChange={(e) => setCreateValues({ ...createValues, currency: e.target.value })}
                >
                  <option value="EUR">EUR</option>
                  <option value="PLN">PLN</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Processing Time</label>
                <Input
                  value={createValues.processingTime || ''}
                  onChange={(e) => setCreateValues({ ...createValues, processingTime: e.target.value })}
                  placeholder="e.g., 1-2 business days"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Min Amount</label>
                <Input
                  type="number"
                  value={createValues.minAmount || ''}
                  onChange={(e) => setCreateValues({ ...createValues, minAmount: parseFloat(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max Amount</label>
                <Input
                  type="number"
                  value={createValues.maxAmount || ''}
                  onChange={(e) => setCreateValues({ ...createValues, maxAmount: parseFloat(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Fixed Fee</label>
                <Input
                  type="number"
                  step="0.01"
                  value={createValues.feeFixed}
                  onChange={(e) => setCreateValues({ ...createValues, feeFixed: parseFloat(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Fee Percent (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={createValues.feePercent}
                  onChange={(e) => setCreateValues({ ...createValues, feePercent: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <Button onClick={createMethod} className="w-full">
              Create Payment Method
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="text-center py-8">Loading payment methods...</CardContent>
          </Card>
        ) : methods.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No payment methods found
            </CardContent>
          </Card>
        ) : (
          methods.map((method) => (
            <Card key={method.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{method.name}</h3>
                      <Badge variant={method.type === 'bank_transfer' ? 'default' : 'secondary'}>
                        {method.type.replace('_', ' ')}
                      </Badge>
                      <Badge variant={method.isActive ? 'default' : 'secondary'}>
                        {method.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {method.fiatCurrency.name} ({method.fiatCurrency.symbol}) • {method._count.orders} orders
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {editingId === method.id ? (
                      <>
                        <Button size="sm" onClick={() => saveEdit(method.id)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => startEdit(method)}>Edit</Button>
                        <Button
                          size="sm"
                          variant={method.isActive ? 'destructive' : 'default'}
                          onClick={() => toggleActive(method.id, method.isActive)}
                        >
                          {method.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {editingId === method.id ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={editValues.name || ''}
                        onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Min Amount</label>
                      <Input
                        type="number"
                        value={editValues.minAmount || ''}
                        onChange={(e) => setEditValues({ ...editValues, minAmount: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Max Amount</label>
                      <Input
                        type="number"
                        value={editValues.maxAmount || ''}
                        onChange={(e) => setEditValues({ ...editValues, maxAmount: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Fixed Fee</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editValues.feeFixed || ''}
                        onChange={(e) => setEditValues({ ...editValues, feeFixed: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Fee %</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editValues.feePercent || ''}
                        onChange={(e) => setEditValues({ ...editValues, feePercent: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Processing Time</div>
                      <div className="font-medium">{method.processingTime || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Amount Range</div>
                      <div className="font-medium">
                        {method.fiatCurrency.symbol}{method.minAmount || 0} - {method.fiatCurrency.symbol}{method.maxAmount || '∞'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Fees</div>
                      <div className="font-medium">
                        {method.feeFixed > 0 && `${method.fiatCurrency.symbol}${method.feeFixed}`}
                        {method.feeFixed > 0 && method.feePercent > 0 && ' + '}
                        {method.feePercent > 0 && `${method.feePercent}%`}
                        {method.feeFixed === 0 && method.feePercent === 0 && 'Free'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Priority</div>
                      <div className="font-medium">{method.priority}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}


