/**
 * Admin KYC Reviews Page
 * 
 * Modern KYC management with tabs, DataTable, and detailed review Sheet
 */

'use client';

import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/admin/DataTable';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { formatDateTime } from '@/lib/formatters';
import { toast } from 'sonner';
import type { KycStatus } from '@prisma/client';
import { 
  Shield, Eye, CheckCircle, XCircle, RefreshCw, 
  ExternalLink, FileText, Users, Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

interface KycSession {
  id: string;
  status: KycStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  kycaidVerificationId: string | null;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      country: string;
    } | null;
  };
  documents?: Array<{
    id: string;
    documentType: string;
    fileUrl: string;
    fileName: string;
  }>;
}

export default function AdminKycPage(): JSX.Element {
  const [kycSessions, setKycSessions] = useState<KycSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [selectedSession, setSelectedSession] = useState<KycSession | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchKycSessions();
  }, [selectedStatus]);

  const fetchKycSessions = async (): Promise<void> => {
    setRefreshing(true);
    try {
      const url = new URL('/api/admin/kyc', window.location.origin);
      if (selectedStatus && selectedStatus !== 'all') {
        url.searchParams.set('status', selectedStatus);
      }

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setKycSessions(data.kycSessions.map((s: any) => ({
          ...s,
          submittedAt: s.submittedAt ? new Date(s.submittedAt) : null,
          reviewedAt: s.reviewedAt ? new Date(s.reviewedAt) : null,
        })));
      } else {
        toast.error('Failed to load KYC sessions');
      }
    } catch (error) {
      console.error('Failed to fetch KYC sessions:', error);
      toast.error('Failed to load KYC sessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const viewKycDetails = (session: KycSession) => {
    setSelectedSession(session);
    setSheetOpen(true);
  };

  const openActionDialog = (type: 'approve' | 'reject') => {
    setActionType(type);
    setActionDialogOpen(true);
  };

  const handleKycAction = async (): Promise<void> => {
    if (!selectedSession || !actionType) return;

    try {
      const response = await fetch(`/api/admin/kyc/${selectedSession.id}/${actionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectionReason: actionType === 'reject' ? rejectionReason : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`KYC ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`);
        await fetchKycSessions();
        setSheetOpen(false);
        setActionDialogOpen(false);
        setRejectionReason('');
      } else {
        toast.error(data.error || 'Failed to update KYC status');
      }
    } catch (error) {
      console.error('KYC action error:', error);
      toast.error('An error occurred');
    }
  };

  // Define table columns
  const columns: ColumnDef<KycSession>[] = [
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => {
        const session = row.original;
        const initials = `${session.user.profile?.firstName?.charAt(0) || ''}${session.user.profile?.lastName?.charAt(0) || 'U'}`;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">
                {session.user.profile?.firstName} {session.user.profile?.lastName}
              </div>
              <div className="text-sm text-muted-foreground">{session.user.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'user.profile.country',
      header: 'Country',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.user.profile?.country || 'N/A'}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <KycStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'submittedAt',
      header: 'Submitted',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.submittedAt ? formatDateTime(row.original.submittedAt) : 'Not submitted'}
        </span>
      ),
    },
    {
      accessorKey: 'kycaidVerificationId',
      header: 'KYCAID',
      cell: ({ row }) => (
        row.original.kycaidVerificationId ? (
          <Badge variant="outline" className="font-mono text-xs">
            {row.original.kycaidVerificationId.slice(0, 8)}...
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const session = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => viewKycDetails(session)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/users/${session.user.id}`}>
                    <Users className="h-4 w-4 mr-2" />
                    View User
                  </Link>
                </DropdownMenuItem>
                {session.kycaidVerificationId && (
                  <DropdownMenuItem
                    onClick={() => window.open(`https://kycaid.com/verifications/${session.kycaidVerificationId}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in KYCAID
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">KYC Reviews</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage user identity verifications
          </p>
        </div>
        <Button 
          variant="outline" 
          size="icon"
          onClick={fetchKycSessions}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Status Tabs */}
      <Card>
        <div className="p-6">
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
            <TabsList>
              <TabsTrigger value="PENDING">
                Pending
                <Badge variant="secondary" className="ml-2">
                  {kycSessions.filter(s => s.status === 'PENDING').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="APPROVED">
                Approved
              </TabsTrigger>
              <TabsTrigger value="REJECTED">
                Rejected
              </TabsTrigger>
              <TabsTrigger value="all">
                All
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* KYC Sessions Table */}
      <DataTable
        columns={columns}
        data={kycSessions}
        searchKey="user.email"
        searchPlaceholder="Search by name or email..."
        isLoading={loading}
        onRowClick={viewKycDetails}
        pageSize={20}
      />

      {/* KYC Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>KYC Review</SheetTitle>
            <SheetDescription>
              Review identity verification details
            </SheetDescription>
          </SheetHeader>
          
          {selectedSession && (
            <div className="mt-6 space-y-6">
              {/* User Info */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  User Information
                </h3>
                <Card>
                  <div className="p-4">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-primary/10 text-primary text-xl">
                          {selectedSession.user.profile?.firstName?.charAt(0)}
                          {selectedSession.user.profile?.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">
                          {selectedSession.user.profile?.firstName} {selectedSession.user.profile?.lastName}
                        </h4>
                        <p className="text-sm text-muted-foreground">{selectedSession.user.email}</p>
                      </div>
                      <Link href={`/admin/users/${selectedSession.user.id}`}>
                        <Button variant="outline" size="sm">
                          <Users className="h-4 w-4 mr-2" />
                          View Profile
                        </Button>
                      </Link>
                    </div>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Country</p>
                        <p className="font-medium">{selectedSession.user.profile?.country || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <div className="mt-1">
                          <KycStatusBadge status={selectedSession.status} />
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Submitted</p>
                        <p className="font-medium">
                          {selectedSession.submittedAt ? formatDateTime(selectedSession.submittedAt) : 'Not submitted'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reviewed</p>
                        <p className="font-medium">
                          {selectedSession.reviewedAt ? formatDateTime(selectedSession.reviewedAt) : 'Pending'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Documents */}
              {selectedSession.documents && selectedSession.documents.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Uploaded Documents ({selectedSession.documents.length})
                  </h3>
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {selectedSession.documents.map((doc) => (
                        <Card key={doc.id} className="overflow-hidden">
                          <AspectRatio ratio={16 / 9}>
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <ImageIcon className="h-12 w-12 text-muted-foreground" />
                            </div>
                          </AspectRatio>
                          <div className="p-3">
                            <p className="text-sm font-medium truncate">{doc.fileName}</p>
                            <p className="text-xs text-muted-foreground capitalize">{doc.documentType}</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full mt-2"
                              onClick={() => window.open(doc.fileUrl, '_blank')}
                            >
                              <Eye className="h-3 w-3 mr-2" />
                              View
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* KYCAID Integration */}
              {selectedSession.kycaidVerificationId && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">KYCAID Integration</h3>
                  <Card>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Verification ID</p>
                          <p className="font-mono text-sm">{selectedSession.kycaidVerificationId}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://kycaid.com/verifications/${selectedSession.kycaidVerificationId}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in KYCAID
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedSession.rejectionReason && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Rejection Reason</h3>
                  <Card className="border-destructive/50 bg-destructive/5">
                    <div className="p-4">
                      <p className="text-sm">{selectedSession.rejectionReason}</p>
                    </div>
                  </Card>
                </div>
              )}

              {/* Actions */}
              {selectedSession.status === 'PENDING' && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Review Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="default"
                      onClick={() => openActionDialog('approve')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve KYC
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => openActionDialog('reject')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject KYC
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Approve KYC?' : 'Reject KYC?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve' ? (
                'This will approve the KYC verification and allow the user to start trading.'
              ) : (
                'This will reject the KYC verification. The user will be notified and can submit again.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {actionType === 'reject' && (
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">
                Rejection Reason *
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why the KYC is being rejected..."
                rows={4}
              />
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleKycAction}
              disabled={actionType === 'reject' && !rejectionReason.trim()}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
