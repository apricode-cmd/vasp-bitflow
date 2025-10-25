/**
 * Fee Profiles Management Page
 */

'use client';

import { ResourceManager } from '@/components/crm/ResourceManager';

export default function FeeProfilesPage(): JSX.Element {
  return (
    <ResourceManager
      resource="fee profiles"
      title="Fee Profiles"
      description="Manage commission structures and spreads"
      apiEndpoint="/api/admin/resources/fee-profiles"
      primaryKey="code"
      columns={[
        { key: 'code', label: 'Code', type: 'badge' },
        { key: 'name', label: 'Name' },
        { key: 'spreadBps', label: 'Spread (bps)', type: 'number' },
        { key: 'fixedFeeFiat', label: 'Fixed Fee', type: 'number' },
        { key: 'networkFeePolicy', label: 'Network Fee Policy' },
        { key: 'isActive', label: 'Active', type: 'boolean' }
      ]}
      fields={[
        { name: 'code', label: 'Profile Code', type: 'text', required: true, placeholder: 'standard, vip' },
        { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Standard Fee' },
        { name: 'spreadBps', label: 'Spread (basis points)', type: 'number', required: true, placeholder: '150' },
        { name: 'fixedFeeFiat', label: 'Fixed Fee Amount', type: 'number', placeholder: '0' },
        { name: 'fiatCurrency', label: 'Fiat Currency', type: 'select', options: [
          { value: '', label: 'None' },
          { value: 'EUR', label: 'EUR' },
          { value: 'PLN', label: 'PLN' }
        ]},
        { 
          name: 'networkFeePolicy', 
          label: 'Network Fee Policy', 
          type: 'select',
          options: [
            { value: 'pass-through', label: 'Pass Through' },
            { value: 'fixed', label: 'Fixed' },
            { value: 'markup', label: 'Markup' }
          ]
        },
        { name: 'networkFeeAmount', label: 'Network Fee Amount', type: 'number', placeholder: '0' },
        { name: 'networkFeePercent', label: 'Network Fee Percent', type: 'number', placeholder: '0' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'isActive', label: 'Active', type: 'boolean' },
        { name: 'priority', label: 'Priority', type: 'number', placeholder: '0' }
      ]}
    />
  );
}

