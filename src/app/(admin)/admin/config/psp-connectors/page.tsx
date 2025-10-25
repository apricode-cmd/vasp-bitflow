/**
 * PSP Connectors Management Page
 */

'use client';

import { ResourceManager } from '@/components/crm/ResourceManager';
import { Badge } from '@/components/ui/badge';

export default function PspConnectorsPage(): JSX.Element {
  return (
    <ResourceManager
      resource="PSP connectors"
      title="PSP Connectors"
      description="Payment service provider integrations"
      apiEndpoint="/api/admin/resources/psp-connectors"
      primaryKey="code"
      columns={[
        { key: 'code', label: 'Code', type: 'badge' },
        { key: 'name', label: 'Name' },
        { key: 'capabilities', label: 'Capabilities', render: (val) => (val || []).join(', ') },
        { key: 'settlementCurrency', label: 'Currency' },
        {
          key: 'status',
          label: 'Status',
          render: (val) => (
            <Badge variant={val === 'active' ? 'default' : 'secondary'}>{val}</Badge>
          )
        },
        { key: 'isEnabled', label: 'Enabled', type: 'boolean' }
      ]}
      fields={[
        { name: 'code', label: 'PSP Code', type: 'text', required: true, placeholder: 'tpay, stripe' },
        { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'TPay, Stripe' },
        { name: 'capabilities', label: 'Capabilities', type: 'array', required: true, placeholder: 'card, bank, blik' },
        { name: 'settlementCurrency', label: 'Settlement Currency', type: 'select', required: true, options: [
          { value: 'EUR', label: 'EUR' },
          { value: 'PLN', label: 'PLN' },
          { value: 'USD', label: 'USD' }
        ]},
        { name: 'apiConfig', label: 'API Configuration (JSON)', type: 'json', placeholder: '{"apiKey": "..."}' },
        { name: 'isEnabled', label: 'Enabled', type: 'boolean' },
        { 
          name: 'status', 
          label: 'Status', 
          type: 'select',
          options: [
            { value: 'unconfigured', label: 'Unconfigured' },
            { value: 'active', label: 'Active' },
            { value: 'error', label: 'Error' }
          ]
        }
      ]}
    />
  );
}

