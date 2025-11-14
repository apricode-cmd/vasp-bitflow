/**
 * UserHeader Component
 * 
 * Header section for user details page with:
 * - Avatar, Name, Email
 * - Country, Join date
 * - Status badges (Active, KYC, Role)
 * - Actions dropdown
 */

'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { getCountryFlag, getCountryName } from '@/lib/utils/country-utils';
import { formatDateTime } from '@/lib/formatters';
import { toast } from 'sonner';
import {
  ArrowLeft,
  MoreVertical,
  Mail,
  UserX,
  UserCheck,
  Download,
  Eye,
  Ban,
  Edit,
} from 'lucide-react';
import Link from 'next/link';
import type { KycStatus } from '@prisma/client';

interface UserHeaderProps {
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    lastLogin: Date | null;
    profile: {
      firstName: string;
      lastName: string;
      country: string;
      phoneNumber: string | null;
    } | null;
    kycSession: {
      status: KycStatus;
    } | null;
  };
  onToggleStatus: () => void;
  onDelete: () => void;
}

export function UserHeader({ user, onToggleStatus, onDelete }: UserHeaderProps): JSX.Element {
  const initials = `${user.profile?.firstName?.charAt(0) || ''}${user.profile?.lastName?.charAt(0) || 'U'}`;
  const fullName = user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : 'Unknown User';

  const handleSendEmail = () => {
    window.location.href = `mailto:${user.email}`;
  };

  const handleExportData = async () => {
    const toastId = toast.loading('Generating PDF report...');
    
    try {
      const response = await fetch(`/api/admin/users/${user.id}/export-report`);
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Download PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-report-${user.email.split('@')[0]}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to generate report', { id: toastId });
    }
  };

  const handleViewAsUser = () => {
    // TODO: Implement impersonation
    toast.info('View as user functionality coming soon');
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Link href="/admin/users">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
      </Link>

      {/* Header content */}
      <div className="flex items-start justify-between">
        {/* Left: Avatar + Info */}
        <div className="flex items-start gap-6">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
              <p className="text-lg text-muted-foreground">{user.email}</p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {user.profile?.country && (
                <span className="flex items-center gap-1">
                  <span className="text-lg">{getCountryFlag(user.profile.country)}</span>
                  {getCountryName(user.profile.country)}
                </span>
              )}
              <span>•</span>
              <span>Joined {formatDateTime(user.createdAt)}</span>
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={user.isActive ? 'success' : 'destructive'} className="text-xs">
                {user.isActive ? '🟢 Active' : '🔴 Inactive'}
              </Badge>

              <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
                {user.role}
              </Badge>

              {user.kycSession ? (
                <KycStatusBadge status={user.kycSession.status} />
              ) : (
                <Badge variant="outline" className="text-xs">
                  KYC Not Started
                </Badge>
              )}

              {user.lastLogin ? (
                <Badge variant="outline" className="text-xs">
                  Last seen {formatDateTime(user.lastLogin)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Never logged in
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleSendEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleViewAsUser}>
              <Eye className="h-4 w-4 mr-2" />
              View as User
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onToggleStatus}>
              {user.isActive ? (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Block User
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Unblock User
                </>
              )}
            </DropdownMenuItem>

            {user.role !== 'ADMIN' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Ban className="h-4 w-4 mr-2" />
                  Delete User
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

