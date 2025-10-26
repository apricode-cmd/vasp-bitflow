/**
 * Order Statuses Configuration Page
 */

'use client';

import { ResourceManager } from '@/components/crm/ResourceManager';

export default function OrderStatusesPage(): JSX.Element {
  return (
    <ResourceManager
      resource="order statuses"
      title="Order Status Configurations"
      description="Manage order lifecycle statuses"
      apiEndpoint="/api/admin/resources/order-statuses"
      primaryKey="code"
      columns={[
        { key: 'code', label: 'Code', type: 'badge' },
        { key: 'name', label: 'Name' },
        { key: 'color', label: 'Color', type: 'color' },
        { key: 'isTerminal', label: 'Terminal', type: 'boolean' },
        { key: 'priority', label: 'Priority', type: 'number' }
      ]}
    />
  );
}


