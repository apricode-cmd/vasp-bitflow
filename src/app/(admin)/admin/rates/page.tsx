/**
 * Manual Rates Management Page
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TrendingUp, Plus } from 'lucide-react';

interface RateComparison {
  manualRate: number | null;
  marketRate: number;
  difference: number | null;
  differencePercent: number | null;
}

export default function ManualRatesPage(): JSX.Element {
  const [rates, setRates] = useState<Record<string, RateComparison>>({});
  const [manualRates, setManualRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRate, setNewRate] = useState({
    cryptoCode: 'BTC',
    fiatCode: 'EUR',
    rate: '',
    reason: ''
  });

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/rates');
      const data = await response.json();

      if (data.success) {
        setRates(data.data.comparisons || {});
        setManualRates(data.data.manualRates || []);
      }
    } catch (error) {
      toast.error('Failed to load rates');
    } finally {
      setLoading(false);
    }
  };

  const setManualRate = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cryptoCode: newRate.cryptoCode,
          fiatCode: newRate.fiatCode,
          rate: parseFloat(newRate.rate),
          reason: newRate.reason
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Manual rate set');
        setShowCreateForm(false);
        setNewRate({ cryptoCode: 'BTC', fiatCode: 'EUR', rate: '', reason: '' });
        await fetchRates();
      } else {
        toast.error(data.error || 'Failed to set rate');
      }
    } catch (error) {
      toast.error('Failed to set rate');
    }
  };

  const removeManualRate = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/rates/manual/${id}`, { method: 'DELETE' });

      if (response.ok) {
        toast.success('Manual rate removed');
        await fetchRates();
      }
    } catch (error) {
      toast.error('Failed to remove rate');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exchange Rates Management</h1>
          <p className="text-muted-foreground">Set manual rate overrides</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Set Manual Rate
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader><CardTitle>Set Manual Rate Override</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Crypto</label>
                <select
                  value={newRate.cryptoCode}
                  onChange={(e) => setNewRate({ ...newRate, cryptoCode: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                  <option value="USDT">USDT</option>
                  <option value="SOL">SOL</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Fiat</label>
                <select
                  value={newRate.fiatCode}
                  onChange={(e) => setNewRate({ ...newRate, fiatCode: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="EUR">EUR</option>
                  <option value="PLN">PLN</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Rate</label>
              <Input
                type="number"
                step="0.01"
                value={newRate.rate}
                onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
                placeholder="50000"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input
                value={newRate.reason}
                onChange={(e) => setNewRate({ ...newRate, reason: e.target.value })}
                placeholder="Market volatility protection"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={setManualRate}>Set Rate</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Rates Comparison */}
      <Card>
        <CardHeader><CardTitle>Current Rates vs Market</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(rates).map(([pair, comparison]) => (
              <div key={pair} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">{pair}</div>
                  {comparison.manualRate && <Badge>Manual Override</Badge>}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market Rate:</span>
                    <span className="font-mono">{comparison.marketRate.toFixed(2)}</span>
                  </div>
                  {comparison.manualRate && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Manual Rate:</span>
                        <span className="font-mono font-bold">{comparison.manualRate.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Difference:</span>
                        <span className={comparison.differencePercent! > 0 ? 'text-green-600' : 'text-red-600'}>
                          {comparison.differencePercent?.toFixed(2)}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Manual Rates */}
      {manualRates.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Active Manual Rates ({manualRates.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {manualRates.map((rate) => (
                <div key={rate.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{rate.cryptoCode}/{rate.fiatCode}</div>
                    <div className="text-sm text-muted-foreground">Rate: {rate.rate}</div>
                    {rate.reason && <div className="text-xs text-muted-foreground">{rate.reason}</div>}
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => removeManualRate(rate.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



