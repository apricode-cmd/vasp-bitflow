/**
 * Order Documents Tab
 * Payment proofs and related documents
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/formatters';
import { 
  FileText,
  Image,
  Download,
  Eye,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

interface OrderDocumentsTabProps {
  order: {
    id: string;
    paymentReference: string;
    paymentProofs?: Array<{
      id: string;
      proofUrl: string;
      status: string;
      createdAt: string;
    }>;
  };
}

const PROOF_STATUS_CONFIG = {
  PENDING: { icon: Clock, label: 'Pending Review', color: 'bg-yellow-500' },
  APPROVED: { icon: CheckCircle, label: 'Approved', color: 'bg-green-500' },
  REJECTED: { icon: XCircle, label: 'Rejected', color: 'bg-red-500' },
};

export function OrderDocumentsTab({ order }: OrderDocumentsTabProps): JSX.Element {
  const handleViewDocument = (url: string) => {
    window.open(url, '_blank');
  };

  if (!order.paymentProofs || order.paymentProofs.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">No Documents</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No payment proofs or documents have been uploaded for this order yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payment Proofs & Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {order.paymentProofs.length} document(s) uploaded for order {order.paymentReference}
          </p>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {order.paymentProofs.map((proof) => {
          const statusConfig = PROOF_STATUS_CONFIG[proof.status as keyof typeof PROOF_STATUS_CONFIG] || PROOF_STATUS_CONFIG.PENDING;
          const StatusIcon = statusConfig.icon;

          return (
            <Card key={proof.id}>
              <CardContent className="p-6 space-y-4">
                {/* Document Preview */}
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  <Image className="h-12 w-12 text-muted-foreground" />
                </div>

                {/* Document Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Payment Proof</span>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${statusConfig.color}`} />
                      <span className="text-xs text-muted-foreground">{statusConfig.label}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Uploaded {formatDateTime(proof.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewDocument(proof.proofUrl)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={proof.proofUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Document Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{order.paymentProofs.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {order.paymentProofs.filter(p => p.status === 'APPROVED').length}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {order.paymentProofs.filter(p => p.status === 'PENDING').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

