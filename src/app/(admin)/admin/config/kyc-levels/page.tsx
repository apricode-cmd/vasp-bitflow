/**
 * KYC Levels Management Page
 */

'use client';

import { ResourceManager } from '@/components/crm/ResourceManager';

export default function KycLevelsPage(): JSX.Element {
  return (
    <ResourceManager
      resource="KYC levels"
      title="KYC Levels"
      description="Manage verification tiers and limits"
      apiEndpoint="/api/admin/resources/kyc-levels"
      primaryKey="code"
      columns={[
        { key: 'code', label: 'Code', type: 'badge' },
        { key: 'name', label: 'Name' },
        { key: 'dailyLimit', label: 'Daily Limit', type: 'number' },
        { key: 'monthlyLimit', label: 'Monthly Limit', type: 'number' },
        { key: 'allowMethods', label: 'Payment Methods', render: (val) => (val || []).join(', ') },
        { key: 'isActive', label: 'Active', type: 'boolean' }
      ]}
      fields={[
        { name: 'code', label: 'Level Code', type: 'text', required: true, placeholder: 'L0, L1, L2' },
        { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Basic, Advanced' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Level description' },
        { name: 'allowMethods', label: 'Allowed Methods', type: 'array', placeholder: 'card, bank, blik' },
        { name: 'dailyLimit', label: 'Daily Limit (EUR)', type: 'number', placeholder: '1000' },
        { name: 'monthlyLimit', label: 'Monthly Limit (EUR)', type: 'number', placeholder: '10000' },
        { name: 'isActive', label: 'Active', type: 'boolean' },
        { name: 'priority', label: 'Priority', type: 'number', placeholder: '0' }
      ]}
    />
  );
}

