/**
 * KYC Header Component
 * 
 * Displays user info, status, and action buttons
 */

'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { CheckCircle, XCircle, MoreVertical, Users, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { KycStatus } from '@prisma/client';

interface KycHeaderProps {
  session: {
    id: string;
    userId: string;
    status: KycStatus;
    kycaidApplicantId?: string | null;
    user: {
      id: string;
      email: string;
      profile: {
        firstName: string;
        lastName: string;
        country: string;
      } | null;
    };
  };
  onUpdate: () => void;
}

export function KycHeader({ session, onUpdate }: KycHeaderProps): JSX.Element {
  const router = useRouter();
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const initials = `${session.user.profile?.firstName?.charAt(0) || ''}${session.user.profile?.lastName?.charAt(0) || 'U'}`;

  const handleAction = async (): Promise<void> => {
    if (!actionType) return;

    if (actionType === 'reject' && !rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/kyc/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionType === 'approve' ? 'APPROVED' : 'REJECTED',
          rejectionReason: actionType === 'reject' ? rejectionReason : undefined,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`KYC ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`);
        setActionDialogOpen(false);
        setRejectionReason('');
        onUpdate();
      } else {
        toast.error(result.error || 'Failed to update KYC status');
      }
    } catch (error) {
      console.error('Failed to update KYC:', error);
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/kyc/${session.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('KYC session deleted successfully');
        router.push('/admin/kyc');
      } else {
        toast.error(result.error || 'Failed to delete KYC session');
      }
    } catch (error) {
      console.error('Failed to delete KYC:', error);
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleSyncDocuments = async (): Promise<void> => {
    if (!session.kycaidApplicantId) {
      toast.error('No KYCAID applicant ID available');
      return;
    }

    const toastId = toast.loading('Syncing documents...');
    try {
      const response = await fetch(`/api/admin/kyc/${session.id}/download-report`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Documents synced successfully', { id: toastId });
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to sync documents', { id: toastId });
      }
    } catch (error) {
      console.error('Failed to sync documents:', error);
      toast.error('Failed to sync documents', { id: toastId });
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">
                {session.user.profile?.firstName} {session.user.profile?.lastName}
              </h2>
              <p className="text-muted-foreground">{session.user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <KycStatusBadge status={session.status} />
                {session.user.profile?.country && (
                  <Badge variant="outline">{session.user.profile.country}</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Action Buttons for PENDING status */}
            {session.status === 'PENDING' && (
              <>
                <Button
                  variant="default"
                  onClick={() => {
                    setActionType('approve');
                    setActionDialogOpen(true);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setActionType('reject');
                    setActionDialogOpen(true);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}

            {/* More Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/admin/users/${session.userId}`}>
                    <Users className="h-4 w-4 mr-2" />
                    View User Profile
                  </Link>
                </DropdownMenuItem>
                {session.kycaidApplicantId && (
                  <DropdownMenuItem onClick={handleSyncDocuments}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Documents
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Approve KYC?' : 'Reject KYC?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve'
                ? 'This will approve the KYC verification and allow the user to start trading.'
                : 'This will reject the KYC verification. The user will be notified and can submit again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {actionType === 'reject' && (
            <div className="py-4">
              <Label className="text-sm font-medium mb-2 block">Rejection Reason *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why the KYC is being rejected..."
                rows={4}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={processing || (actionType === 'reject' && !rejectionReason.trim())}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete KYC Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the KYC session for{' '}
              <strong>{session.user.email}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={processing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

