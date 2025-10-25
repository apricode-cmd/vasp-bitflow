/**
 * Cryptocurrencies Management Page
 */

'use client';

import { ResourceManager } from '@/components/crm/ResourceManager';
import { Badge } from '@/components/ui/badge';

export default function CurrenciesPage(): JSX.Element {
  return (
    <ResourceManager
      resource="cryptocurrencies"
      title="Cryptocurrencies (Assets)"
      description="Manage crypto assets including native and token-based"
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
              {val ? `Token (${item.chain})` : 'Native'}
            </Badge>
          ) 
        },
        { key: 'precision', label: 'Precision', type: 'number' },
        { key: 'coingeckoId', label: 'CoinGecko ID' },
        { key: 'isActive', label: 'Active', type: 'boolean' },
        { key: 'priority', label: 'Priority', type: 'number' }
      ]}
      fields={[
        { name: 'code', label: 'Currency Code', type: 'text', required: true, placeholder: 'BTC, ETH, USDT' },
        { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Bitcoin' },
        { name: 'symbol', label: 'Symbol', type: 'text', required: true, placeholder: '₿' },
        { name: 'decimals', label: 'Decimals', type: 'number', required: true, placeholder: '8' },
        { name: 'precision', label: 'Precision', type: 'number', required: true, placeholder: '8' },
        { name: 'coingeckoId', label: 'CoinGecko ID', type: 'text', required: true, placeholder: 'bitcoin' },
        { name: 'isToken', label: 'Is Token?', type: 'boolean' },
        { name: 'chain', label: 'Chain (if token)', type: 'select', options: [
          { value: '', label: 'None (native)' },
          { value: 'ETHEREUM', label: 'Ethereum' },
          { value: 'BSC', label: 'Binance Smart Chain' },
          { value: 'POLYGON', label: 'Polygon' },
          { value: 'SOLANA', label: 'Solana' }
        ]},
        { name: 'contractAddress', label: 'Contract Address (if token)', type: 'text', placeholder: '0x...' },
        { name: 'iconUrl', label: 'Icon URL', type: 'text', placeholder: 'https://...' },
        { name: 'isActive', label: 'Active', type: 'boolean' },
        { name: 'priority', label: 'Priority', type: 'number', placeholder: '0' }
      ]}
    />
  );
}

