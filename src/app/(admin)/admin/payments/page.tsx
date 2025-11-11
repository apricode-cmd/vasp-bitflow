/**
 * Payment Accounts Management
 * 
 * Unified interface for managing:
 * - Bank Accounts (Fiat)
 * - Crypto Wallets
 * - PSP Providers
 * - Payment Methods
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  Building2, 
  CreditCard,
  Globe,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Edit,
  Trash2,
  RefreshCw,
  Bitcoin,
  DollarSign,
  Coins
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/admin/DataTable';
import { BankAccountDialog } from '@/components/admin/BankAccountDialog';
import { CryptoWalletDialog } from '@/components/admin/CryptoWalletDialog';
import { PaymentMethodDialog } from '@/components/admin/PaymentMethodDialog';
import { PSPProviderDialog } from '@/components/admin/PSPProviderDialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { ColumnDef } from '@tanstack/react-table';

interface PaymentAccount {
  id: string;
  code: string;
  name: string;
  type: 'BANK_ACCOUNT' | 'CRYPTO_WALLET';
  description?: string;
  fiatCurrency?: { code: string; name: string; symbol: string };
  cryptocurrency?: { code: string; name: string; symbol: string };
  blockchain?: { code: string; name: string };
  // Bank details
  accountHolder?: string;
  bankName?: string;
  iban?: string;
  swift?: string;
  // Crypto details
  address?: string;
  balance?: number;
  minBalance?: number;
  lastChecked?: string;
  // Common
  isActive: boolean;
  isDefault: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface PaymentMethod {
  code: string;
  name: string;
  type: string;
  direction: 'IN' | 'OUT' | 'BOTH';
  providerType: 'MANUAL' | 'BANK_ACCOUNT' | 'PSP' | 'CRYPTO_WALLET';
  automationLevel: 'MANUAL' | 'SEMI_AUTO' | 'FULLY_AUTO';
  currency: string;
  paymentAccount?: { code: string; name: string };
  minAmount?: number;
  maxAmount?: number;
  isActive: boolean;
  isAvailableForClients: boolean;
}

interface PSPConnector {
  code: string;
  name: string;
  capabilities: string[];
  settlementCurrency: string;
  isEnabled: boolean;
  status: 'active' | 'inactive' | 'testing' | 'unconfigured';
}

export default function PaymentsPage(): JSX.Element {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') || 'bank-accounts';
  const [activeTab, setActiveTab] = useState(tabParam);
  const [bankAccounts, setBankAccounts] = useState<PaymentAccount[]>([]);
  const [cryptoWallets, setCryptoWallets] = useState<PaymentAccount[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pspConnectors, setPspConnectors] = useState<PSPConnector[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [cryptoDialogOpen, setCryptoDialogOpen] = useState(false);
  const [methodDialogOpen, setMethodDialogOpen] = useState(false);
  const [pspDialogOpen, setPspDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [selectedAccount, setSelectedAccount] = useState<PaymentAccount | undefined>();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | undefined>();
  const [selectedPSP, setSelectedPSP] = useState<PSPConnector | undefined>();
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string; name: string } | null>(null);
  
  // Reference data
  const [fiatCurrencies, setFiatCurrencies] = useState<any[]>([]);
  const [cryptocurrencies, setCryptocurrencies] = useState<any[]>([]);
  const [blockchains, setBlockchains] = useState<any[]>([]);

  // Update activeTab when URL parameter changes
  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch payment accounts
      const accountsRes = await fetch('/api/admin/payment-accounts');
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        const banks = data.accounts.filter((a: PaymentAccount) => a.type === 'BANK_ACCOUNT');
        const wallets = data.accounts.filter((a: PaymentAccount) => a.type === 'CRYPTO_WALLET');
        setBankAccounts(banks);
        setCryptoWallets(wallets);
      } else {
        console.error('❌ Payment Accounts API failed:', accountsRes.status);
      }

      // Fetch payment methods
      const methodsRes = await fetch('/api/admin/payment-methods');
      if (methodsRes.ok) {
        const data = await methodsRes.json();
        setPaymentMethods(data.methods || []);
      } else {
        console.error('❌ Payment Methods API failed:', methodsRes.status);
      }

      // Fetch PSP connectors
      const pspRes = await fetch('/api/admin/resources/psp-connectors');
      if (pspRes.ok) {
        const data = await pspRes.json();
        setPspConnectors(data.data || []);
      } else {
        console.error('❌ PSP Connectors API failed:', pspRes.status);
      }

      // Fetch reference data
      const [fiatRes, cryptoRes, blockchainsRes] = await Promise.all([
        fetch('/api/admin/resources/fiat-currencies'),
        fetch('/api/admin/resources/currencies?active=true&includeBlockchains=true'), // Cryptocurrencies with blockchains
        fetch('/api/admin/blockchains?active=true')
      ]);

      if (fiatRes.ok) {
        const data = await fiatRes.json();
        setFiatCurrencies(data.data || []);
      }

      if (cryptoRes.ok) {
        const data = await cryptoRes.json();
        setCryptocurrencies(data.data || []);
      }

      if (blockchainsRes.ok) {
        const data = await blockchainsRes.json();
        setBlockchains(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  // Sync all wallet balances using Tatum
  const handleSyncAllBalances = async () => {
    setSyncing(true);
    toast.loading('Syncing wallet balances...', { id: 'sync-balances' });
    
    try {
      const response = await fetch('/api/admin/wallets/sync-all', {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync balances');
      }

      const result = await response.json();
      
      toast.success(result.message, { id: 'sync-balances' });
      
      // Show details
      if (result.failed > 0) {
        toast.warning(`${result.failed} wallets failed to sync`, {
          description: 'Check blockchain provider configuration'
        });
      }

      // Refresh wallets data
      await fetchData();
    } catch (error: any) {
      console.error('❌ Sync balances error:', error);
      toast.error(error.message || 'Failed to sync balances', { id: 'sync-balances' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      let endpoint = '';
      
      switch (itemToDelete.type) {
        case 'bank-account':
        case 'crypto-wallet':
          endpoint = `/api/admin/payment-accounts/${itemToDelete.id}`;
          break;
        case 'payment-method':
          endpoint = `/api/admin/payment-methods/${itemToDelete.id}`;
          break;
        case 'psp-provider':
          endpoint = `/api/admin/resources/psp-connectors/${itemToDelete.id}`;
          break;
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${itemToDelete.name} deleted successfully`);
        fetchData();
      } else {
        toast.error(result.error || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('An error occurred while deleting');
    }
  };

  // Bank Accounts Columns
  const bankColumns: ColumnDef<PaymentAccount>[] = [
    {
      accessorKey: 'name',
      header: 'Account Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.code}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'bankName',
      header: 'Bank',
    },
    {
      accessorKey: 'accountHolder',
      header: 'Account Holder',
    },
    {
      accessorKey: 'iban',
      header: 'IBAN',
      cell: ({ row }) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {row.original.iban || 'N/A'}
        </code>
      ),
    },
    {
      accessorKey: 'fiatCurrency',
      header: 'Currency',
      cell: ({ row }) => row.original.fiatCurrency ? (
        <Badge variant="outline">
          {row.original.fiatCurrency.symbol} {row.original.fiatCurrency.code}
        </Badge>
      ) : 'N/A',
    },
    {
      accessorKey: 'isDefault',
      header: 'Default',
      cell: ({ row }) => row.original.isDefault ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : null,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedAccount(row.original);
              setBankDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setItemToDelete({
                type: 'bank-account',
                id: row.original.id,
                name: row.original.name
              });
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  // Crypto Wallets Columns
  const cryptoColumns: ColumnDef<PaymentAccount>[] = [
    {
      accessorKey: 'name',
      header: 'Wallet Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.code}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'cryptocurrency',
      header: 'Asset',
      cell: ({ row }) => {
        if (!row.original.cryptocurrency) return 'N/A';
        
        const { code, symbol } = row.original.cryptocurrency;
        
        // Get icon for crypto
        const getCryptoIcon = (cryptoCode: string) => {
          const iconMap: Record<string, JSX.Element> = {
            'BTC': <Bitcoin className="h-4 w-4 text-orange-500" />,
            'ETH': <Coins className="h-4 w-4 text-blue-500" />,
            'USDT': <DollarSign className="h-4 w-4 text-green-600" />,
            'USDC': <DollarSign className="h-4 w-4 text-blue-600" />,
            'SOL': <Coins className="h-4 w-4 text-purple-500" />,
            'TRX': <Coins className="h-4 w-4 text-red-500" />,
          };
          return iconMap[cryptoCode] || <Wallet className="h-4 w-4 text-muted-foreground" />;
        };

        return (
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              {getCryptoIcon(code)}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{symbol} {code}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'blockchain',
      header: 'Network',
      cell: ({ row }) => row.original.blockchain ? (
        <Badge variant="secondary">
          {row.original.blockchain.name}
        </Badge>
      ) : 'N/A',
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate">
            {row.original.address || 'N/A'}
          </code>
          {row.original.address && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => {
                navigator.clipboard.writeText(row.original.address!);
                toast.success('Address copied');
              }}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ row }) => {
        const balance = row.original.balance;
        const minBalance = row.original.minBalance;
        const lastChecked = row.original.updatedAt;
        const isLow = balance && minBalance && balance < minBalance;
        const hasBalance = balance && balance > 0;
        
        if (balance === undefined || balance === null) {
          return (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm">—</span>
            </div>
          );
        }

        // Format balance with appropriate decimals
        const formatBalance = (val: number) => {
          if (val === 0) return '0';
          if (val >= 1) {
            return val.toLocaleString('en-US', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 8 
            });
          }
          return val.toLocaleString('en-US', { 
            minimumFractionDigits: 8, 
            maximumFractionDigits: 8 
          });
        };

        // Calculate time since last update
        const getTimeSince = (date: string) => {
          const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
          if (seconds < 60) return 'just now';
          if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
          if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
          return `${Math.floor(seconds / 86400)}d ago`;
        };

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-sm font-medium ${
                hasBalance 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-muted-foreground'
              }`}>
                {formatBalance(balance)}
              </span>
              {row.original.cryptocurrency && (
                <span className="text-xs font-medium text-muted-foreground">
                  {row.original.cryptocurrency.code}
                </span>
              )}
              {isLow && (
                <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
              )}
            </div>
            {lastChecked && (
              <span className="text-[10px] text-muted-foreground">
                Updated {getTimeSince(lastChecked)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedAccount(row.original);
              setCryptoDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setItemToDelete({
                type: 'crypto-wallet',
                id: row.original.id,
                name: row.original.name
              });
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  // Payment Methods Columns
  const methodColumns: ColumnDef<PaymentMethod>[] = [
    {
      accessorKey: 'name',
      header: 'Method Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.code}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'direction',
      header: 'Direction',
      cell: ({ row }) => {
        const colors = {
          IN: 'bg-green-500/10 text-green-700',
          OUT: 'bg-blue-500/10 text-blue-700',
          BOTH: 'bg-purple-500/10 text-purple-700',
        };
        return (
          <Badge variant="outline" className={colors[row.original.direction]}>
            {row.original.direction}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'providerType',
      header: 'Provider',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.providerType}</Badge>
      ),
    },
    {
      accessorKey: 'automationLevel',
      header: 'Automation',
      cell: ({ row }) => {
        const colors = {
          MANUAL: 'bg-gray-500/10 text-gray-700',
          SEMI_AUTO: 'bg-yellow-500/10 text-yellow-700',
          FULLY_AUTO: 'bg-green-500/10 text-green-700',
        };
        return (
          <Badge variant="outline" className={colors[row.original.automationLevel]}>
            {row.original.automationLevel}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'currency',
      header: 'Currency',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.currency}</Badge>
      ),
    },
    {
      accessorKey: 'limits',
      header: 'Limits',
      cell: ({ row }) => {
        if (!row.original.minAmount && !row.original.maxAmount) return 'N/A';
        return (
          <div className="text-xs">
            {row.original.minAmount && `Min: ${row.original.minAmount}`}
            {row.original.minAmount && row.original.maxAmount && ' | '}
            {row.original.maxAmount && `Max: ${row.original.maxAmount}`}
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Badge variant={row.original.isActive ? 'success' : 'secondary'} className="text-xs">
            {row.original.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {row.original.isAvailableForClients && (
            <Badge variant="outline" className="text-xs">
              Public
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedMethod(row.original);
              setMethodDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setItemToDelete({
                type: 'payment-method',
                id: row.original.code,
                name: row.original.name
              });
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  // PSP Connectors Columns
  const pspColumns: ColumnDef<PSPConnector>[] = [
    {
      accessorKey: 'name',
      header: 'Provider Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.code}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'capabilities',
      header: 'Capabilities',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.capabilities.map((cap) => (
            <Badge key={cap} variant="outline" className="text-xs">
              {cap}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'settlementCurrency',
      header: 'Settlement',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.settlementCurrency}</Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const colors = {
          active: 'bg-green-500/10 text-green-700',
          inactive: 'bg-gray-500/10 text-gray-700',
          testing: 'bg-yellow-500/10 text-yellow-700',
          unconfigured: 'bg-red-500/10 text-red-700',
        };
        return (
          <Badge variant="outline" className={colors[row.original.status]}>
            {row.original.status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'isEnabled',
      header: 'Enabled',
      cell: ({ row }) => (
        <Badge variant={row.original.isEnabled ? 'success' : 'secondary'}>
          {row.original.isEnabled ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedPSP(row.original);
              setPspDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setItemToDelete({
                type: 'psp-provider',
                id: row.original.code,
                name: row.original.name
              });
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage bank accounts, crypto wallets, PSP providers, and payment methods
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6 glass-panel">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bank Accounts</p>
              <p className="text-2xl font-bold">{bankAccounts.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {bankAccounts.filter(a => a.isActive).length} active
          </p>
        </Card>

        <Card className="p-6 glass-panel">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Crypto Wallets</p>
              <p className="text-2xl font-bold">{cryptoWallets.length}</p>
            </div>
            <Wallet className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {cryptoWallets.filter(w => w.isActive).length} active
          </p>
        </Card>

        <Card className="p-6 glass-panel">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">PSP Providers</p>
              <p className="text-2xl font-bold">{pspConnectors.length}</p>
            </div>
            <Globe className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {pspConnectors.filter(p => p.isEnabled).length} enabled
          </p>
        </Card>

        <Card className="p-6 glass-panel">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Payment Methods</p>
              <p className="text-2xl font-bold">{paymentMethods.length}</p>
            </div>
            <CreditCard className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {paymentMethods.filter(m => m.isActive).length} active
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-panel">
          <TabsTrigger value="bank-accounts" className="gap-2">
            <Building2 className="h-4 w-4" />
            Bank Accounts
          </TabsTrigger>
          <TabsTrigger value="crypto-wallets" className="gap-2">
            <Wallet className="h-4 w-4" />
            Crypto Wallets
          </TabsTrigger>
          <TabsTrigger value="psp-providers" className="gap-2">
            <Globe className="h-4 w-4" />
            PSP Providers
          </TabsTrigger>
          <TabsTrigger value="payment-methods" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Methods
          </TabsTrigger>
        </TabsList>

        {/* Bank Accounts Tab */}
        <TabsContent value="bank-accounts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Bank Accounts</h2>
              <p className="text-sm text-muted-foreground">
                Fiat currency bank accounts for receiving deposits
              </p>
            </div>
            <Button className="gap-2" onClick={() => {
              setSelectedAccount(undefined);
              setBankDialogOpen(true);
            }}>
              <Plus className="h-4 w-4" />
              Add Bank Account
            </Button>
          </div>
          <DataTable
            columns={bankColumns}
            data={bankAccounts}
            searchKey="name"
            searchPlaceholder="Search bank accounts..."
            isLoading={loading}
            pageSize={10}
          />
        </TabsContent>

        {/* Crypto Wallets Tab */}
        <TabsContent value="crypto-wallets" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Crypto Wallets</h2>
              <p className="text-sm text-muted-foreground">
                Platform wallets for sending cryptocurrency payouts
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="gap-2" 
                onClick={handleSyncAllBalances}
                disabled={syncing || cryptoWallets.length === 0}
              >
                {syncing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync All Balances
              </Button>
              <Button className="gap-2" onClick={() => {
                setSelectedAccount(undefined);
                setCryptoDialogOpen(true);
              }}>
                <Plus className="h-4 w-4" />
                Add Crypto Wallet
              </Button>
            </div>
          </div>
          <DataTable
            columns={cryptoColumns}
            data={cryptoWallets}
            searchKey="name"
            searchPlaceholder="Search crypto wallets..."
            isLoading={loading}
            pageSize={10}
          />
        </TabsContent>

        {/* PSP Providers Tab */}
        <TabsContent value="psp-providers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">PSP Providers</h2>
              <p className="text-sm text-muted-foreground">
                Payment Service Provider integrations (Stripe, PayPal, etc.)
              </p>
            </div>
            <Button className="gap-2" onClick={() => {
              setSelectedPSP(undefined);
              setPspDialogOpen(true);
            }}>
              <Plus className="h-4 w-4" />
              Add PSP Provider
            </Button>
          </div>
          <DataTable
            columns={pspColumns}
            data={pspConnectors}
            searchKey="name"
            searchPlaceholder="Search PSP providers..."
            isLoading={loading}
            pageSize={10}
          />
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Payment Methods</h2>
              <p className="text-sm text-muted-foreground">
                Configure how payments are processed (linked to accounts above)
              </p>
            </div>
            <Button className="gap-2" onClick={() => {
              setSelectedMethod(undefined);
              setMethodDialogOpen(true);
            }}>
              <Plus className="h-4 w-4" />
              Add Payment Method
            </Button>
          </div>
          <DataTable
            columns={methodColumns}
            data={paymentMethods}
            searchKey="name"
            searchPlaceholder="Search payment methods..."
            isLoading={loading}
            pageSize={10}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <BankAccountDialog
        open={bankDialogOpen}
        onOpenChange={setBankDialogOpen}
        account={selectedAccount}
        onSuccess={fetchData}
        currencies={fiatCurrencies}
      />

      <CryptoWalletDialog
        open={cryptoDialogOpen}
        onOpenChange={setCryptoDialogOpen}
        wallet={selectedAccount}
        onSuccess={fetchData}
        cryptocurrencies={cryptocurrencies}
        blockchains={blockchains}
      />

      <PaymentMethodDialog
        open={methodDialogOpen}
        onOpenChange={setMethodDialogOpen}
        method={selectedMethod}
        onSuccess={fetchData}
        fiatCurrencies={fiatCurrencies}
        paymentAccounts={[...bankAccounts, ...cryptoWallets]}
        pspConnectors={pspConnectors}
      />

      <PSPProviderDialog
        open={pspDialogOpen}
        onOpenChange={setPspDialogOpen}
        provider={selectedPSP}
        onSuccess={fetchData}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Confirmation"
        description={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
