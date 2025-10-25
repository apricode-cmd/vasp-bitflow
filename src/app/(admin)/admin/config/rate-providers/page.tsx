/**
 * Rate Providers Management Page
 */

'use client';

import { ResourceManager } from '@/components/crm/ResourceManager';

export default function RateProvidersPage(): JSX.Element {
  return (
    <ResourceManager
      resource="rate providers"
      title="Rate Providers"
      description="Manage exchange rate sources and aggregation"
      apiEndpoint="/api/admin/resources/rate-providers"
      primaryKey="code"
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type', type: 'badge' },
        { key: 'weight', label: 'Weight', type: 'number' },
        { key: 'isActive', label: 'Active', type: 'boolean' },
        { key: 'priority', label: 'Priority', type: 'number' }
      ]}
      fields={[
        { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'coingecko' },
        { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'CoinGecko' },
        { 
          name: 'type', 
          label: 'Type', 
          type: 'select', 
          required: true,
          options: [
            { value: 'market', label: 'Market' },
            { value: 'average', label: 'Average' },
            { value: 'aggregator', label: 'Aggregator' }
          ]
        },
        { name: 'weight', label: 'Weight', type: 'number', required: true, placeholder: '1.0' },
        { name: 'isActive', label: 'Active', type: 'boolean' },
        { name: 'priority', label: 'Priority', type: 'number', placeholder: '0' },
        { name: 'apiConfig', label: 'API Config (JSON)', type: 'json', placeholder: '{}' }
      ]}
    />
  );
}

