/**
 * Bank Accounts Management Page
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Building2, Plus } from 'lucide-react';

interface BankDetails {
  id: string;
  currency: string;
  bankName: string;
  accountHolder: string;
  iban: string;
  swift: string | null;
  bic: string | null;
  isActive: boolean;
  priority: number;
  fiatCurrency: { name: string; symbol: string };
}

export default function BankAccountsPage(): JSX.Element {
  const [banks, setBanks] = useState<BankDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/resources/banks');
      const data = await response.json();

      if (data.success) {
        setBanks(data.data);
      }
    } catch (error) {
      toast.error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bank Accounts</h1>
          <p className="text-muted-foreground">Manage bank accounts for receiving payments</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Bank Account
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : banks.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">No bank accounts</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {banks.map((bank) => (
            <Card key={bank.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    <CardTitle>{bank.bankName}</CardTitle>
                  </div>
                  <Badge variant={bank.isActive ? 'default' : 'secondary'}>
                    {bank.currency} • {bank.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Account Holder</div>
                    <div className="font-medium">{bank.accountHolder}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">IBAN</div>
                    <div className="font-mono text-xs">{bank.iban}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">SWIFT/BIC</div>
                    <div className="font-mono text-xs">{bank.swift || bank.bic || 'N/A'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}





