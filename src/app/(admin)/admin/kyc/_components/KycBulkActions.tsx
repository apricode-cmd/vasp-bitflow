/**
 * KYC Bulk Actions Component
 * 
 * Provides bulk operations for selected KYC sessions
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Download,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface KycBulkActionsProps {
  selectedIds: string[];
  selectedSessions: Array<{ 
    id: string; 
    status: string; 
    user: { email: string }; 
  }>;
  onClearSelection: () => void;
  onActionComplete: () => void;
}

type BulkActionType = 'approve' | 'reject' | 'delete' | 'export' | null;

export function KycBulkActions({
  selectedIds,
  selectedSessions,
  onClearSelection,
  onActionComplete,
}: KycBulkActionsProps) {
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<BulkActionType>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Count sessions by status
  const pendingCount = selectedSessions.filter(s => s.status === 'PENDING').length;
  const approvedCount = selectedSessions.filter(s => s.status === 'APPROVED').length;
  const rejectedCount = selectedSessions.filter(s => s.status === 'REJECTED').length;

  const openActionDialog = (type: BulkActionType) => {
    setActionType(type);
    setActionDialogOpen(true);
  };

  const handleBulkAction = async () => {
    if (!actionType || selectedIds.length === 0) return;

    setProcessing(true);
    
    try {
      if (actionType === 'export') {
        await handleBulkExport();
        return;
      }

      // Bulk approve/reject/delete
      const response = await fetch('/api/admin/kyc/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          sessionIds: selectedIds,
          rejectionReason: actionType === 'reject' ? rejectionReason : undefined,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(
          `Successfully ${actionType}d ${result.affected || selectedIds.length} sessions`
        );
        setActionDialogOpen(false);
        setRejectionReason('');
        onClearSelection();
        onActionComplete();
      } else {
        toast.error(result.error || `Failed to ${actionType} sessions`);
      }
    } catch (error) {
      console.error(`Bulk ${actionType} error:`, error);
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkExport = async () => {
    try {
      const response = await fetch('/api/admin/kyc/bulk-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionIds: selectedIds,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kyc-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success(`Exported ${selectedIds.length} sessions`);
        setActionDialogOpen(false);
        onClearSelection();
      } else {
        toast.error('Failed to export sessions');
      }
    } catch (error) {
      console.error('Bulk export error:', error);
      toast.error('An error occurred during export');
    }
  };

  const getActionTitle = () => {
    switch (actionType) {
      case 'approve':
        return `Approve ${selectedIds.length} Sessions?`;
      case 'reject':
        return `Reject ${selectedIds.length} Sessions?`;
      case 'delete':
        return `Delete ${selectedIds.length} Sessions?`;
      case 'export':
        return `Export ${selectedIds.length} Sessions?`;
      default:
        return 'Confirm Action';
    }
  };

  const getActionDescription = () => {
    switch (actionType) {
      case 'approve':
        return `This will approve ${selectedIds.length} KYC session(s) and allow users to start trading. Only PENDING sessions will be affected.`;
      case 'reject':
        return `This will reject ${selectedIds.length} KYC session(s). Users will be notified and can submit again.`;
      case 'delete':
        return `This will permanently delete ${selectedIds.length} KYC session(s). This action cannot be undone.`;
      case 'export':
        return `This will export ${selectedIds.length} KYC session(s) to a CSV file for further analysis.`;
      default:
        return '';
    }
  };

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-2 border-primary/50 bg-primary/5">
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Selection Info */}
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-base px-3 py-1">
                    {selectedIds.length}
                  </Badge>
                  <span className="font-semibold">
                    {selectedIds.length === 1 ? 'session' : 'sessions'} selected
                  </span>
                </div>
                <div className="flex gap-2 mt-1 text-sm text-muted-foreground">
                  {pendingCount > 0 && (
                    <span>{pendingCount} pending</span>
                  )}
                  {approvedCount > 0 && (
                    <span>{approvedCount} approved</span>
                  )}
                  {rejectedCount > 0 && (
                    <span>{rejectedCount} rejected</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center gap-2">
              {/* Approve (only if there are PENDING sessions) */}
              {pendingCount > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => openActionDialog('approve')}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={processing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve ({pendingCount})
                </Button>
              )}

              {/* Reject (only if there are PENDING sessions) */}
              {pendingCount > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => openActionDialog('reject')}
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject ({pendingCount})
                </Button>
              )}

              {/* Export */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => openActionDialog('export')}
                disabled={processing}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>

              {/* Delete */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => openActionDialog('delete')}
                disabled={processing}
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>

              {/* Clear Selection */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                disabled={processing}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Warning for mixed status selections */}
          {(approvedCount > 0 || rejectedCount > 0) && pendingCount > 0 && (
            <div className="mt-3 pt-3 border-t flex items-start gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Note: Bulk approve/reject actions will only affect PENDING sessions ({pendingCount} of {selectedIds.length}).
                Already approved or rejected sessions will be skipped.
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {getActionDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Rejection Reason (for reject action) */}
          {actionType === 'reject' && (
            <div className="py-4">
              <Label htmlFor="bulk-rejection-reason" className="text-sm font-medium mb-2 block">
                Rejection Reason (will be sent to all users) *
              </Label>
              <Textarea
                id="bulk-rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why the KYC sessions are being rejected..."
                rows={4}
              />
            </div>
          )}

          {/* Selected sessions preview */}
          {actionType === 'delete' && selectedSessions.length <= 5 && (
            <div className="py-2">
              <p className="text-sm font-medium mb-2">Sessions to be deleted:</p>
              <ul className="text-sm space-y-1">
                {selectedSessions.map((session) => (
                  <li key={session.id} className="text-muted-foreground">
                    • {session.user.email} ({session.status})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setRejectionReason('')}
              disabled={processing}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkAction}
              disabled={
                processing || 
                (actionType === 'reject' && !rejectionReason.trim())
              }
              className={
                actionType === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : actionType === 'delete'
                  ? 'bg-destructive hover:bg-destructive/90'
                  : ''
              }
            >
              {processing ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

