/**
 * PayIn Header Component
 * Displays PayIn reference, status, and action buttons
 */

'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  FileCheck,
  RefreshCw,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PayInHeaderProps {
  payIn: {
    id: string;
    status: string;
    order: {
      id: string;
      paymentReference: string;
    };
    user: {
      id: string;
      email: string;
      profile: {
        firstName: string;
        lastName: string;
      } | null;
    };
  };
  onVerify: () => void;
  onReconcile: () => void;
  onFail: () => void;
  onRefund: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'Pending', variant: 'secondary' },
  RECEIVED: { label: 'Received', variant: 'default' },
  VERIFIED: { label: 'Verified', variant: 'default' },
  PARTIAL: { label: 'Partial', variant: 'outline' },
  MISMATCH: { label: 'Mismatch', variant: 'destructive' },
  RECONCILED: { label: 'Reconciled', variant: 'default' },
  FAILED: { label: 'Failed', variant: 'destructive' },
  REFUNDED: { label: 'Refunded', variant: 'outline' },
  EXPIRED: { label: 'Expired', variant: 'secondary' }
};

export function PayInHeader({ 
  payIn, 
  onVerify, 
  onReconcile,
  onFail,
  onRefund,
  onRefresh,
  isLoading = false 
}: PayInHeaderProps): JSX.Element {
  const router = useRouter();
  const config = statusConfig[payIn.status];
  const userFullName = payIn.user.profile 
    ? `${payIn.user.profile.firstName} ${payIn.user.profile.lastName}`
    : payIn.user.email;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin/pay-in')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">
              {payIn.order.paymentReference}
            </h1>
            <Badge variant={config.variant}>
              {config.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            PayIn ID: <span className="font-mono">{payIn.id}</span> • {userFullName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Refresh */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        {/* View Order */}
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <Link href={`/admin/orders?id=${payIn.order.id}`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Order
          </Link>
        </Button>

        {/* View User */}
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <Link href={`/admin/users/${payIn.user.id}`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View User
          </Link>
        </Button>

        {/* Action buttons based on status */}
        {payIn.status === 'RECEIVED' && (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={onVerify}
              disabled={isLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Verify
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onFail}
              disabled={isLoading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Mark Failed
            </Button>
          </>
        )}

        {payIn.status === 'VERIFIED' && (
          <Button
            variant="default"
            size="sm"
            onClick={onReconcile}
            disabled={isLoading}
          >
            <FileCheck className="h-4 w-4 mr-2" />
            Reconcile
          </Button>
        )}
      </div>
    </div>
  );
}

