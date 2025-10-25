/**
 * Fiat Currencies Management Page
 */

'use client';

import { ResourceManager } from '@/components/crm/ResourceManager';

export default function FiatCurrenciesPage(): JSX.Element {
  return (
    <ResourceManager
      resource="fiat currencies"
      title="Fiat Currencies"
      description="Manage fiat currencies (EUR, PLN, USD, etc.)"
      apiEndpoint="/api/admin/resources/fiat-currencies"
      primaryKey="code"
      columns={[
        { key: 'code', label: 'Code', type: 'badge' },
        { key: 'name', label: 'Name' },
        { key: 'symbol', label: 'Symbol' },
        { key: 'precision', label: 'Precision', type: 'number' },
        { key: 'isActive', label: 'Active', type: 'boolean' },
        { key: 'priority', label: 'Priority', type: 'number' }
      ]}
      fields={[
        { name: 'code', label: 'Currency Code', type: 'text', required: true, placeholder: 'EUR, PLN, USD' },
        { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Euro' },
        { name: 'symbol', label: 'Symbol', type: 'text', required: true, placeholder: '€' },
        { name: 'precision', label: 'Decimal Precision', type: 'number', required: true, placeholder: '2' },
        { name: 'isActive', label: 'Active', type: 'boolean' },
        { name: 'priority', label: 'Priority', type: 'number', placeholder: '0' }
      ]}
    />
  );
}

