/**
 * PayOut Header Component
 * Displays PayOut reference, status, and action buttons
 */

'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Send,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PayOutHeaderProps {
  payOut: {
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
  onMarkAsSent: () => void;
  onConfirm: () => void;
  onFail: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
  PENDING: { label: 'Pending', variant: 'secondary' },
  QUEUED: { label: 'Queued', variant: 'secondary' },
  PROCESSING: { label: 'Processing', variant: 'default' },
  SENT: { label: 'Sent', variant: 'default' },
  CONFIRMING: { label: 'Confirming', variant: 'default' },
  CONFIRMED: { label: 'Confirmed', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'outline' }
};

export function PayOutHeader({ 
  payOut, 
  onMarkAsSent,
  onConfirm,
  onFail,
  onRefresh,
  isLoading = false 
}: PayOutHeaderProps): JSX.Element {
  const router = useRouter();
  const config = statusConfig[payOut.status];
  const userFullName = payOut.user.profile 
    ? `${payOut.user.profile.firstName} ${payOut.user.profile.lastName}`
    : payOut.user.email;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin/pay-out')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">
              {payOut.order.paymentReference}
            </h1>
            <Badge variant={config.variant as any}>
              {config.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            PayOut ID: <span className="font-mono">{payOut.id}</span> • {userFullName}
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

        {/* Action Buttons based on status */}
        {(payOut.status === 'PENDING' || payOut.status === 'QUEUED' || payOut.status === 'PROCESSING') && (
          <Button
            variant="default"
            size="sm"
            onClick={onMarkAsSent}
            disabled={isLoading}
          >
            <Send className="h-4 w-4 mr-2" />
            Mark as Sent
          </Button>
        )}

        {(payOut.status === 'SENT' || payOut.status === 'CONFIRMING') && (
          <Button
            variant="default"
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirm
          </Button>
        )}

        {payOut.status !== 'CONFIRMED' && payOut.status !== 'FAILED' && payOut.status !== 'CANCELLED' && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onFail}
            disabled={isLoading}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Mark as Failed
          </Button>
        )}

        {/* View Order Link */}
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <Link href={`/admin/orders/${payOut.order.id}`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Order
          </Link>
        </Button>

        {/* View User Link */}
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <Link href={`/admin/users/${payOut.user.id}`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View User
          </Link>
        </Button>
      </div>
    </div>
  );
}

