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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { KycFormDataDisplay } from '@/components/admin/KycFormDataDisplay';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { Combobox } from '@/components/shared/Combobox';
import type { ComboboxOption } from '@/components/shared/Combobox';
import { DynamicKycForm } from '@/components/forms/DynamicKycForm';
import { formatDateTime } from '@/lib/formatters';
import { toast } from 'sonner';
import type { KycStatus } from '@prisma/client';
import { 
  Shield, Eye, CheckCircle, XCircle, RefreshCw, 
  ExternalLink, FileText, Users, Image as ImageIcon,
  MapPin, Briefcase, Scale, TrendingUp, Target, Activity,
  Phone, Mail, User, Home, Building2, Wallet, CreditCard
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
      phoneNumber?: string;
      phoneCountry?: string;
      dateOfBirth?: Date;
      placeOfBirth?: string;
      nationality?: string;
    } | null;
  };
  profile?: {
    // Personal
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    placeOfBirth?: string;
    nationality: string;
    // Contact
    email: string;
    phone: string;
    phoneCountry?: string;
    // Address
    addressStreet?: string;
    addressCity?: string;
    addressRegion?: string;
    addressCountry?: string;
    addressPostal?: string;
    // Document
    idType?: string;
    idNumber?: string;
    idIssuingCountry?: string;
    idIssueDate?: Date;
    idExpiryDate?: Date;
    idScanFront?: string;
    idScanBack?: string;
    livenessSelfie?: string;
    // PEP & Sanctions
    pepStatus: boolean;
    pepCategory?: string;
    sanctionsScreeningDone: boolean;
    sanctionsResult?: string;
    // Employment
    employmentStatus?: string;
    occupation?: string;
    employerName?: string;
    // Purpose
    purposeOfAccount?: string;
    intendedUse?: string;
    // Funds
    sourceOfFunds?: string;
    sourceOfWealth?: string;
    // Risk
    riskScore?: number;
    riskFactors?: any;
    // Consents
    consentKyc: boolean;
    consentAml: boolean;
    consentTfr: boolean;
    consentPrivacy: boolean;
  } | null;
  formData?: Array<{
    id: string;
    fieldName: string;
    fieldValue: string;
  }>;
  documents?: Array<{
    id: string;
    documentType: string;
    fileUrl: string;
    fileName: string;
  }>;
  provider?: {
    name: string;
    code: string;
  } | null;
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editKycDialogOpen, setEditKycDialogOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<KycSession | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; email: string; name: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchKycSessions();
  }, [selectedStatus]);

  useEffect(() => {
    if (createDialogOpen) {
      fetchUsers();
    }
  }, [createDialogOpen]);

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
      const response = await fetch(`/api/admin/kyc/${selectedSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionType === 'approve' ? 'APPROVED' : 'REJECTED',
          rejectionReason: actionType === 'reject' ? rejectionReason : undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
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

  const handleDeleteKyc = async (): Promise<void> => {
    if (!selectedSession) return;

    try {
      const response = await fetch(`/api/admin/kyc/${selectedSession.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('KYC session deleted successfully');
        await fetchKycSessions();
        setDeleteDialogOpen(false);
        setSelectedSession(null);
      } else {
        toast.error(data.error || 'Failed to delete KYC session');
      }
    } catch (error) {
      console.error('Delete KYC error:', error);
      toast.error('An error occurred');
    }
  };

  const handleCreateKyc = async (): Promise<void> => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    try {
      const response = await fetch('/api/admin/kyc/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('KYC session created successfully');
        await fetchKycSessions();
        setCreateDialogOpen(false);
        // State will be cleared by onOpenChange
      } else {
        toast.error(data.error || 'Failed to create KYC session');
      }
    } catch (error) {
      console.error('Create KYC error:', error);
      toast.error('An error occurred');
    }
  };

  const handleSaveKycData = async (formData: Record<string, any>): Promise<void> => {
    if (!sessionToEdit) return;

    try {
      const response = await fetch('/api/kyc/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          formData,
          sessionId: sessionToEdit.id // Admin submits on behalf of user
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('KYC data saved successfully');
        await fetchKycSessions();
        setEditKycDialogOpen(false);
        setSessionToEdit(null);
      } else {
        toast.error(data.error || 'Failed to save KYC data');
      }
    } catch (error) {
      console.error('Save KYC data error:', error);
      toast.error('An error occurred');
    }
  };

  const fetchUsers = async (): Promise<void> => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/users?limit=100&role=CLIENT');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setUsers(result.data.map((u: any) => ({
            id: u.id,
            email: u.email,
            name: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.email
          })));
        } else {
          toast.error('Failed to load users');
        }
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Helper: Group formData by category
  const groupFormDataByCategory = (formData: Array<{ fieldName: string; fieldValue: string }>) => {
    const categories: Record<string, Array<{ fieldName: string; fieldValue: string; label: string }>> = {
      personal: [],
      contact: [],
      address: [],
      documents: [],
      employment: [],
      pep_sanctions: [],
      purpose: [],
      funds: [],
      activity: [],
      consents: [],
      other: []
    };

    formData.forEach(item => {
      // Map field names to categories
      const fieldName = item.fieldName.toLowerCase();
      let category = 'other';

      if (['first_name', 'last_name', 'date_of_birth', 'place_of_birth', 'nationality'].includes(fieldName)) {
        category = 'personal';
      } else if (['phone', 'phone_country', 'email'].includes(fieldName)) {
        category = 'contact';
      } else if (fieldName.startsWith('address_')) {
        category = 'address';
      } else if (fieldName.startsWith('id_') || fieldName.includes('document')) {
        category = 'documents';
      } else if (fieldName.startsWith('employment') || fieldName.includes('employer') || fieldName.includes('occupation') || fieldName.includes('income') || fieldName.includes('biz_') || fieldName.includes('student') || fieldName.includes('industry') || fieldName === 'job_title' || fieldName === 'tax_or_reg_number' || fieldName === 'institution_name' || fieldName === 'revenue_band_annual' || fieldName === 'other_employment_note') {
        category = 'employment';
      } else if (fieldName.startsWith('pep_') || fieldName.includes('sanction') || fieldName === 'relationship_to_pep') {
        category = 'pep_sanctions';
      } else if (fieldName.startsWith('purpose')) {
        category = 'purpose';
      } else if (fieldName.includes('source') || fieldName.includes('funds') || fieldName.includes('wealth') || fieldName === 'additional_sources') {
        category = 'funds';
      } else if (fieldName.startsWith('expected_') || fieldName.startsWith('dest_')) {
        category = 'activity';
      } else if (fieldName.startsWith('consent_')) {
        category = 'consents';
      }

      // Create readable label
      const label = item.fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      categories[category].push({
        ...item,
        label
      });
    });

    // Remove empty categories
    Object.keys(categories).forEach(key => {
      if (categories[key].length === 0) {
        delete categories[key];
      }
    });

    return categories;
  };

  // Helper: Get category icon and name
  const getCategoryInfo = (category: string) => {
    const categoryMap: Record<string, { icon: any; name: string; description: string }> = {
      personal: { icon: User, name: 'Personal Information', description: 'Basic identity details' },
      contact: { icon: Phone, name: 'Contact Information', description: 'Email and phone' },
      address: { icon: MapPin, name: 'Residential Address', description: 'Physical address details' },
      documents: { icon: FileText, name: 'Identity Documents', description: 'ID, passport, etc.' },
      employment: { icon: Briefcase, name: 'Employment & Income', description: 'Work status and income' },
      pep_sanctions: { icon: Scale, name: 'PEP & Sanctions', description: 'Political exposure and screening' },
      purpose: { icon: Target, name: 'Purpose of Account', description: 'Intended use' },
      funds: { icon: TrendingUp, name: 'Source of Funds', description: 'Origin of money' },
      activity: { icon: Activity, name: 'Expected Activity', description: 'Transaction patterns' },
      consents: { icon: CheckCircle, name: 'Consents & Compliance', description: 'User agreements' },
      other: { icon: FileText, name: 'Other Information', description: 'Additional data' }
    };

    return categoryMap[category] || categoryMap.other;
  };

  // Define table columns
  const columns: ColumnDef<KycSession>[] = [
    {
      id: 'user',
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
      id: 'country',
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
      accessorKey: 'provider',
      header: 'KYC Provider',
      cell: ({ row }) => {
        const provider = row.original.provider;
        if (!provider) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        
        return (
          <div className="flex items-center gap-2">
            <Badge 
              variant={provider.isEnabled ? 'default' : 'secondary'}
              className="font-mono text-xs"
            >
              {provider.name}
            </Badge>
            {provider.status === 'active' && (
              <CheckCircle className="h-3 w-3 text-green-600" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'kycaidVerificationId',
      header: 'Verification ID',
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
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  viewKycDetails(session);
                }}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setSessionToEdit(session);
                  setEditKycDialogOpen(true);
                }}>
                  <FileText className="h-4 w-4 mr-2" />
                  Fill KYC Data
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/users/${session.user.id}`} onClick={(e) => e.stopPropagation()}>
                    <Users className="h-4 w-4 mr-2" />
                    View User
                  </Link>
                </DropdownMenuItem>
                {session.kycaidVerificationId && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://kycaid.com/verifications/${session.kycaidVerificationId}`, '_blank');
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in KYCAID
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSession(session);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
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
        <div className="flex gap-2">
          <Button 
            variant="default"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Shield className="h-4 w-4 mr-2" />
            Create KYC Session
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchKycSessions}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
        </div>
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

              {/* Provider Info */}
              {selectedSession.provider && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    KYC Provider
                  </h3>
                  <Card>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-3">
                            <Shield className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{selectedSession.provider.name}</span>
                              {selectedSession.provider.status === 'active' && (
                                <Badge variant="default" className="text-xs">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              Service: {selectedSession.provider.service}
                            </p>
                          </div>
                        </div>
                        {selectedSession.kycaidVerificationId && selectedSession.provider.service === 'kycaid' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://kycaid.com/verifications/${selectedSession.kycaidVerificationId}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open in KYCAID
                          </Button>
                        )}
                      </div>
                      {selectedSession.kycaidVerificationId && (
                        <>
                          <Separator className="my-4" />
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Verification ID</p>
                              <p className="font-mono text-sm">{selectedSession.kycaidVerificationId}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Applicant ID</p>
                              <p className="font-mono text-sm">{selectedSession.kycaidApplicantId || 'N/A'}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* Extended KYC Profile Data */}
              {selectedSession.profile && (
                <>
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Personal Information
                    </h3>
                    <Card>
                      <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Date of Birth</p>
                          <p className="font-medium">
                            {selectedSession.profile.dateOfBirth 
                              ? new Date(selectedSession.profile.dateOfBirth).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Place of Birth</p>
                          <p className="font-medium">{selectedSession.profile.placeOfBirth || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Nationality</p>
                          <p className="font-medium">{selectedSession.profile.nationality || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Phone</p>
                          <p className="font-medium">
                            {selectedSession.profile.phoneCountry && `+${selectedSession.profile.phoneCountry} `}
                            {selectedSession.profile.phone}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Address Information */}
                  {(selectedSession.profile.addressStreet || selectedSession.profile.addressCity) && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Residential Address
                      </h3>
                      <Card>
                        <div className="p-4 space-y-2 text-sm">
                          {selectedSession.profile.addressStreet && (
                            <p><span className="text-muted-foreground">Street:</span> {selectedSession.profile.addressStreet}</p>
                          )}
                          <div className="grid grid-cols-2 gap-4">
                            {selectedSession.profile.addressCity && (
                              <div>
                                <p className="text-muted-foreground">City</p>
                                <p className="font-medium">{selectedSession.profile.addressCity}</p>
                              </div>
                            )}
                            {selectedSession.profile.addressRegion && (
                              <div>
                                <p className="text-muted-foreground">Region/State</p>
                                <p className="font-medium">{selectedSession.profile.addressRegion}</p>
                              </div>
                            )}
                            {selectedSession.profile.addressCountry && (
                              <div>
                                <p className="text-muted-foreground">Country</p>
                                <p className="font-medium">{selectedSession.profile.addressCountry}</p>
                              </div>
                            )}
                            {selectedSession.profile.addressPostal && (
                              <div>
                                <p className="text-muted-foreground">Postal Code</p>
                                <p className="font-medium">{selectedSession.profile.addressPostal}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Identity Document */}
                  {selectedSession.profile.idType && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Identity Document
                      </h3>
                      <Card>
                        <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Document Type</p>
                            <p className="font-medium capitalize">{selectedSession.profile.idType.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Document Number</p>
                            <p className="font-medium font-mono">{selectedSession.profile.idNumber || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Issuing Country</p>
                            <p className="font-medium">{selectedSession.profile.idIssuingCountry || 'N/A'}</p>
                          </div>
                          {selectedSession.profile.idIssueDate && (
                            <div>
                              <p className="text-muted-foreground">Issue Date</p>
                              <p className="font-medium">
                                {new Date(selectedSession.profile.idIssueDate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                          {selectedSession.profile.idExpiryDate && (
                            <div>
                              <p className="text-muted-foreground">Expiry Date</p>
                              <p className="font-medium">
                                {new Date(selectedSession.profile.idExpiryDate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* PEP & Sanctions */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      PEP & Sanctions Screening
                    </h3>
                    <Card>
                      <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">PEP Status</p>
                          <Badge variant={selectedSession.profile.pepStatus ? 'destructive' : 'secondary'}>
                            {selectedSession.profile.pepStatus ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        {selectedSession.profile.pepCategory && (
                          <div>
                            <p className="text-muted-foreground">PEP Category</p>
                            <p className="font-medium">{selectedSession.profile.pepCategory}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground">Sanctions Screening</p>
                          <Badge variant={selectedSession.profile.sanctionsScreeningDone ? 'default' : 'secondary'}>
                            {selectedSession.profile.sanctionsScreeningDone ? 'Completed' : 'Pending'}
                          </Badge>
                        </div>
                        {selectedSession.profile.sanctionsResult && (
                          <div>
                            <p className="text-muted-foreground">Screening Result</p>
                            <Badge variant={selectedSession.profile.sanctionsResult === 'clean' ? 'default' : 'destructive'}>
                              {selectedSession.profile.sanctionsResult}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Employment & Purpose */}
                  {(selectedSession.profile.employmentStatus || selectedSession.profile.purposeOfAccount) && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Employment & Purpose
                      </h3>
                      <Card>
                        <div className="p-4 space-y-4 text-sm">
                          {selectedSession.profile.employmentStatus && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-muted-foreground">Employment Status</p>
                                <p className="font-medium capitalize">{selectedSession.profile.employmentStatus.replace('_', ' ')}</p>
                              </div>
                              {selectedSession.profile.occupation && (
                                <div>
                                  <p className="text-muted-foreground">Occupation</p>
                                  <p className="font-medium">{selectedSession.profile.occupation}</p>
                                </div>
                              )}
                              {selectedSession.profile.employerName && (
                                <div className="col-span-2">
                                  <p className="text-muted-foreground">Employer</p>
                                  <p className="font-medium">{selectedSession.profile.employerName}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {selectedSession.profile.purposeOfAccount && (
                            <div>
                              <p className="text-muted-foreground mb-1">Purpose of Account</p>
                              <p className="text-sm bg-muted p-3 rounded-md">{selectedSession.profile.purposeOfAccount}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Source of Funds */}
                  {selectedSession.profile.sourceOfFunds && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Source of Funds & Wealth
                      </h3>
                      <Card>
                        <div className="p-4 space-y-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Source of Funds</p>
                            <p className="font-medium capitalize">{selectedSession.profile.sourceOfFunds.replace('_', ' ')}</p>
                          </div>
                          {selectedSession.profile.sourceOfWealth && (
                            <div>
                              <p className="text-muted-foreground mb-1">Source of Wealth (EDD)</p>
                              <p className="text-sm bg-muted p-3 rounded-md">{selectedSession.profile.sourceOfWealth}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Risk Assessment */}
                  {selectedSession.profile.riskScore !== null && selectedSession.profile.riskScore !== undefined && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Risk Assessment
                      </h3>
                      <Card>
                        <div className="p-4 text-sm">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-muted-foreground">Risk Score</p>
                            <Badge variant={
                              selectedSession.profile.riskScore <= 30 ? 'default' :
                              selectedSession.profile.riskScore <= 60 ? 'secondary' : 'destructive'
                            }>
                              {selectedSession.profile.riskScore} / 100
                            </Badge>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                selectedSession.profile.riskScore <= 30 ? 'bg-green-500' :
                                selectedSession.profile.riskScore <= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${selectedSession.profile.riskScore}%` }}
                            />
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Consents */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Consents & Compliance
                    </h3>
                    <Card>
                      <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">KYC Consent</span>
                          {selectedSession.profile.consentKyc ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">AML Consent</span>
                          {selectedSession.profile.consentAml ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">TFR Consent</span>
                          {selectedSession.profile.consentTfr ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Privacy Policy</span>
                          {selectedSession.profile.consentPrivacy ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                </>
              )}

              {/* Dynamic Form Data */}
              {selectedSession.formData && selectedSession.formData.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    KYC Form Data
                  </h3>
                  <KycFormDataDisplay formData={selectedSession.formData} />
                </div>
              )}

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete KYC Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the KYC session for{' '}
              <strong>{selectedSession?.user.email}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKyc} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create KYC Session Dialog */}
      <AlertDialog 
        open={createDialogOpen} 
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setSelectedUserId('');
            setUsers([]);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create KYC Session</AlertDialogTitle>
            <AlertDialogDescription>
              Select a user to create a new KYC verification session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="user-select" className="text-sm font-medium">
              Select User *
            </Label>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading users...
              </div>
            ) : (
              <Combobox
                options={users.map((user): ComboboxOption => ({
                  value: user.id,
                  label: user.name,
                  description: user.email
                }))}
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                placeholder="Choose a user..."
                searchPlaceholder="Search users..."
                emptyText="No users found."
                disabled={loadingUsers}
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateKyc}
              disabled={!selectedUserId || loadingUsers}
            >
              Create Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fill KYC Data Dialog */}
      <Dialog 
        open={editKycDialogOpen} 
        onOpenChange={(open) => {
          setEditKycDialogOpen(open);
          if (!open) {
            setSessionToEdit(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Fill KYC Data for {sessionToEdit?.user.profile?.firstName} {sessionToEdit?.user.profile?.lastName}
            </DialogTitle>
            <DialogDescription>
              Fill out the KYC form on behalf of the user: {sessionToEdit?.user.email}
            </DialogDescription>
          </DialogHeader>
          
          {sessionToEdit && (
            <div className="pt-4">
              <DynamicKycForm 
                onSubmit={handleSaveKycData}
                initialData={{}}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
