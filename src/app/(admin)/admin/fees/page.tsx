/**
 * Fee Profiles Management Page
 * 
 * Manage platform fee structures
 */

'use client';

import { ResourceManager } from '@/components/crm/ResourceManager';
import { Badge } from '@/components/ui/badge';

export default function FeesPage(): JSX.Element {
  return (
    <div className="animate-in">
      <ResourceManager
        resource="fee profiles"
        title="Fee Profiles"
        description="Manage platform fee structures and pricing tiers"
        apiEndpoint="/api/admin/resources/fee-profiles"
        primaryKey="code"
        columns={[
          { key: 'code', label: 'Code', type: 'badge' },
          { key: 'name', label: 'Name' },
          { 
            key: 'percentage', 
            label: 'Fee %', 
            render: (val) => (
              <Badge variant="outline" className="font-bold">
                {val}%
              </Badge>
            )
          },
          { key: 'minFee', label: 'Min Fee', type: 'number' },
          { key: 'maxFee', label: 'Max Fee', type: 'number' },
          { key: 'isActive', label: 'Active', type: 'boolean' },
        ]}
        fields={[
          { name: 'code', label: 'Fee Profile Code', type: 'text', required: true, placeholder: 'standard' },
          { name: 'name', label: 'Profile Name', type: 'text', required: true, placeholder: 'Standard Fee' },
          { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Description of this fee profile' },
          { name: 'percentage', label: 'Fee Percentage', type: 'number', required: true, placeholder: '1.5' },
          { name: 'minFee', label: 'Minimum Fee (EUR)', type: 'number', placeholder: '1.00' },
          { name: 'maxFee', label: 'Maximum Fee (EUR)', type: 'number', placeholder: '1000.00' },
          { name: 'isActive', label: 'Active', type: 'boolean' },
          { name: 'priority', label: 'Display Priority', type: 'number', placeholder: '0' }
        ]}
      />
    </div>
  );
}

