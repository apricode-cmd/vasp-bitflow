/**
 * Currencies Management Page
 * 
 * Unified management for Cryptocurrencies and Fiat Currencies
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ResourceManager } from '@/components/crm/ResourceManager';
import { Coins, TrendingUp } from 'lucide-react';

export default function CurrenciesPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState('crypto');

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Currencies Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage cryptocurrencies and fiat currencies
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="crypto" className="gap-2">
            <Coins className="h-4 w-4" />
            Cryptocurrencies
          </TabsTrigger>
          <TabsTrigger value="fiat" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Fiat Currencies
          </TabsTrigger>
        </TabsList>

        {/* Cryptocurrencies Tab */}
        <TabsContent value="crypto" className="mt-6">
          <ResourceManager
            resource="cryptocurrencies"
            title="Cryptocurrencies"
            description="Manage crypto assets including native coins and tokens"
            apiEndpoint="/api/admin/resources/currencies"
            primaryKey="code"
            columns={[
              { key: 'code', label: 'Code', type: 'badge' },
              { key: 'name', label: 'Name' },
              { key: 'symbol', label: 'Symbol' },
              { 
                key: 'isToken', 
                label: 'Type', 
                render: (val, item) => (
                  <Badge variant={val ? 'secondary' : 'default'}>
                    {val ? `Token (${item.chain || 'Unknown'})` : 'Native'}
                  </Badge>
                ) 
              },
              { key: 'decimals', label: 'Decimals', type: 'number' },
              { key: 'coingeckoId', label: 'CoinGecko ID' },
              { key: 'isActive', label: 'Active', type: 'boolean' },
            ]}
            fields={[
              { name: 'code', label: 'Currency Code', type: 'text', required: true, placeholder: 'BTC' },
              { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Bitcoin' },
              { name: 'symbol', label: 'Symbol', type: 'text', required: true, placeholder: '₿' },
              { name: 'decimals', label: 'Decimals', type: 'number', required: true, placeholder: '8' },
              { name: 'precision', label: 'Display Precision', type: 'number', required: true, placeholder: '8' },
              { name: 'coingeckoId', label: 'CoinGecko ID', type: 'text', required: true, placeholder: 'bitcoin' },
              { name: 'isToken', label: 'Is Token (ERC20/BEP20)?', type: 'boolean' },
              { 
                name: 'chain', 
                label: 'Chain (if token)', 
                type: 'select', 
                options: [
                  { value: 'NONE', label: 'None (native coin)' },
                  { value: 'ETHEREUM', label: 'Ethereum (ERC20)' },
                  { value: 'BSC', label: 'Binance Smart Chain (BEP20)' },
                  { value: 'POLYGON', label: 'Polygon' },
                  { value: 'TRON', label: 'Tron (TRC20)' },
                  { value: 'SOLANA', label: 'Solana (SPL)' }
                ]
              },
              { name: 'contractAddress', label: 'Contract Address (if token)', type: 'text', placeholder: '0x...' },
              { name: 'iconUrl', label: 'Icon URL (optional)', type: 'text', placeholder: 'https://...' },
              { name: 'minOrderAmount', label: 'Min Order Amount', type: 'number', placeholder: '0.001' },
              { name: 'maxOrderAmount', label: 'Max Order Amount', type: 'number', placeholder: '100' },
              { name: 'isActive', label: 'Active', type: 'boolean' },
              { name: 'priority', label: 'Display Priority', type: 'number', placeholder: '0' }
            ]}
          />
        </TabsContent>

        {/* Fiat Currencies Tab */}
        <TabsContent value="fiat" className="mt-6">
          <ResourceManager
            resource="fiat currencies"
            title="Fiat Currencies"
            description="Manage fiat currencies for payments"
            apiEndpoint="/api/admin/resources/fiat-currencies"
            primaryKey="code"
            columns={[
              { key: 'code', label: 'Code', type: 'badge' },
              { key: 'name', label: 'Name' },
              { key: 'symbol', label: 'Symbol' },
              { key: 'decimals', label: 'Decimals', type: 'number' },
              { key: 'isActive', label: 'Active', type: 'boolean' },
            ]}
            fields={[
              { name: 'code', label: 'Currency Code', type: 'text', required: true, placeholder: 'EUR' },
              { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Euro' },
              { name: 'symbol', label: 'Symbol', type: 'text', required: true, placeholder: '€' },
              { name: 'decimals', label: 'Decimals', type: 'number', required: true, placeholder: '2' },
              { name: 'isActive', label: 'Active', type: 'boolean' },
              { name: 'priority', label: 'Display Priority', type: 'number', placeholder: '0' }
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

