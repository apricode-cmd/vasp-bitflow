/**
 * Widgets Configuration Page
 */

'use client';

import { ResourceManager } from '@/components/crm/ResourceManager';

export default function WidgetsPage(): JSX.Element {
  return (
    <ResourceManager
      resource="widgets"
      title="Widget Configurations"
      description="Manage white-label widget configs and themes"
      apiEndpoint="/api/admin/resources/widgets"
      primaryKey="code"
      columns={[
        { key: 'code', label: 'Code', type: 'badge' },
        { key: 'name', label: 'Name' },
        { key: 'defaultFiat', label: 'Default Fiat' },
        { key: 'defaultCrypto', label: 'Default Crypto' },
        { key: 'supportedPairs', label: 'Pairs', render: (val) => `${(val || []).length} pairs` },
        { key: 'isActive', label: 'Active', type: 'boolean' }
      ]}
      fields={[
        { name: 'code', label: 'Widget Code', type: 'text', required: true, placeholder: 'main, partner_1' },
        { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Main Widget' },
        { name: 'supportedPairs', label: 'Supported Pairs', type: 'array', required: true, placeholder: 'EUR→BTC, PLN→ETH' },
        { name: 'defaultFiat', label: 'Default Fiat', type: 'text', required: true, placeholder: 'EUR' },
        { name: 'defaultCrypto', label: 'Default Crypto', type: 'text', placeholder: 'BTC' },
        { name: 'theme', label: 'Theme (JSON)', type: 'json', placeholder: '{"logo": "/logo.png", "primaryColor": "#3b82f6"}' },
        { name: 'minKycForMethods', label: 'Min KYC for Methods (JSON)', type: 'json', placeholder: '{"card": "L1", "bank": "L0"}' },
        { name: 'allowedMethods', label: 'Allowed Methods', type: 'array', placeholder: 'sepa_eur, bank_pln' },
        { name: 'feeProfileCode', label: 'Fee Profile', type: 'select', options: [
          { value: '', label: 'Default' },
          { value: 'standard', label: 'Standard' },
          { value: 'vip', label: 'VIP' }
        ]},
        { name: 'domain', label: 'Allowed Domain', type: 'text', placeholder: 'https://example.com' },
        { name: 'webhookUrl', label: 'Webhook URL', type: 'text', placeholder: 'https://...' },
        { name: 'isActive', label: 'Active', type: 'boolean' }
      ]}
    />
  );
}

