/**
 * StatusBadge Component
 * 
 * Centralized badge variant mapping for Order and KYC statuses
 */

import { Badge } from '@/components/ui/badge';
import type { OrderStatus, KycStatus } from '@prisma/client';

// Order Status Badge Mapping
const ORDER_STATUS_VARIANTS: Record<
  OrderStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'; label: string }
> = {
  PENDING: { variant: 'warning', label: 'Pending Payment' },
  PAYMENT_PENDING: { variant: 'warning', label: 'Payment Pending' },
  PAYMENT_RECEIVED: { variant: 'info', label: 'Payment Received' },
  PROCESSING: { variant: 'info', label: 'Processing' },
  COMPLETED: { variant: 'success', label: 'Completed' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
  EXPIRED: { variant: 'destructive', label: 'Expired' },
  REFUNDED: { variant: 'secondary', label: 'Refunded' },
  FAILED: { variant: 'destructive', label: 'Failed' },
};

// KYC Status Badge Mapping
const KYC_STATUS_VARIANTS: Record<
  KycStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'; label: string }
> = {
  PENDING: { variant: 'warning', label: 'Pending Review' },
  APPROVED: { variant: 'success', label: 'Approved' },
  REJECTED: { variant: 'destructive', label: 'Rejected' },
  EXPIRED: { variant: 'destructive', label: 'Expired' },
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

interface KycStatusBadgeProps {
  status: KycStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps): React.ReactElement {
  const config = ORDER_STATUS_VARIANTS[status];
  
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

export function KycStatusBadge({ status, className }: KycStatusBadgeProps): React.ReactElement {
  const config = KYC_STATUS_VARIANTS[status];
  
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

// Export for backward compatibility with existing components
export { OrderStatusBadge as default };

