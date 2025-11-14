/**
 * Admin Users Management Page - REDESIGNED
 * 
 * Enhanced user management with:
 * - Advanced data table with sorting & filtering
 * - Quick stats dashboard
 * - Bulk actions
 * - Export functionality
 * - Extended columns (Total Spent, Last Login, Country)
 * 
 * Reference design for all data pages
 */

'use client';

import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
// Sheet removed - using full page instead
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Tabs removed - using full page instead
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableAdvanced } from '@/components/admin/DataTableAdvanced';
import { QuickStats, QuickStat } from '@/components/admin/QuickStats';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { formatDateTime, formatCurrency } from '@/lib/formatters';
import { getCountryFlag, getCountryName } from '@/lib/utils/country-utils';
import { exportToCSV, formatDateTimeForExport, formatCurrencyForExport } from '@/lib/utils/export-utils';
import { toast } from 'sonner';
import type { Role, KycStatus } from '@prisma/client';
import { 
  MoreHorizontal, Eye, UserX, UserCheck, Shield,
  ShoppingCart, RefreshCw, Users, UserPlus, Ban,
  CheckCircle, Clock, XCircle, TrendingUp, Mail, Download,
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

interface User {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  lastLogin: Date | null;
  totalSpent: number;
  profile: {
    firstName: string;
    lastName: string;
    country: string;
    phoneNumber: string | null;
  } | null;
  kycSession: {
    status: KycStatus;
  } | null;
  _count: {
    orders: number;
  };
}

export default function UsersPage(): JSX.Element {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [kycFilter, setKycFilter] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [statusFilter, kycFilter]);

  const fetchUsers = async (): Promise<void> => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      
      // Only show CLIENT users (not admins)
      params.append('role', 'CLIENT');
      
      if (statusFilter === 'active') {
        params.append('isActive', 'true');
      } else if (statusFilter === 'inactive') {
        params.append('isActive', 'false');
      }
      if (kycFilter && kycFilter !== 'all') {
        params.append('kycStatus', kycFilter);
      }

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.data.map((u: any) => ({
          ...u,
          createdAt: new Date(u.createdAt),
          lastLogin: u.lastLogin ? new Date(u.lastLogin) : null
        })));
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/users/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(currentStatus ? 'User deactivated' : 'User activated');
        await fetchUsers();
        await fetchStats();
        setSheetOpen(false);
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Toggle user status error:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (): Promise<void> => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/admin/users/${userToDelete}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('User deleted successfully');
        await fetchUsers();
        await fetchStats();
      } else {
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('An error occurred');
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleBulkActivate = async (selectedUsers: User[]): Promise<void> => {
    toast.promise(
      Promise.all(
        selectedUsers.map(user => 
          fetch(`/api/admin/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: true })
          })
        )
      ),
      {
        loading: 'Activating users...',
        success: () => {
          fetchUsers();
          fetchStats();
          return `Activated ${selectedUsers.length} users`;
        },
        error: 'Failed to activate users'
      }
    );
  };

  const handleBulkDeactivate = async (selectedUsers: User[]): Promise<void> => {
    toast.promise(
      Promise.all(
        selectedUsers.map(user => 
          fetch(`/api/admin/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: false })
          })
        )
      ),
      {
        loading: 'Deactivating users...',
        success: () => {
          fetchUsers();
          fetchStats();
          return `Deactivated ${selectedUsers.length} users`;
        },
        error: 'Failed to deactivate users'
      }
    );
  };

  const openDeleteDialog = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  // Navigate to user details page
  const viewUserDetails = (user: User) => {
    window.location.href = `/admin/users/${user.id}`;
  };

  // Export columns definition (reusable)
  const getExportColumns = () => [
    { key: 'name', header: 'Name', formatter: (_: any, row: User) => 
      `${row.profile?.firstName || ''} ${row.profile?.lastName || ''}`.trim() 
    },
    { key: 'email', header: 'Email' },
    { key: 'phoneNumber', header: 'Phone', formatter: (_: any, row: User) => 
      row.profile?.phoneNumber || '' 
    },
    { key: 'country', header: 'Country', formatter: (_: any, row: User) => 
      getCountryName(row.profile?.country || '') 
    },
    { key: 'ordersCount', header: 'Orders', formatter: (_: any, row: User) => 
      row._count.orders.toString() 
    },
    { key: 'totalSpent', header: 'Total Spent (EUR)', formatter: (_: any, row: User) => 
      formatCurrencyForExport(row.totalSpent)
    },
    { key: 'kycStatus', header: 'KYC Status', formatter: (_: any, row: User) => 
      row.kycSession?.status || 'Not Started' 
    },
    { key: 'status', header: 'Status', formatter: (_: any, row: User) => 
      row.isActive ? 'Active' : 'Inactive' 
    },
    { key: 'lastLogin', header: 'Last Login', formatter: (_: any, row: User) => 
      row.lastLogin ? formatDateTimeForExport(row.lastLogin) : 'Never' 
    },
    { key: 'createdAt', header: 'Joined', formatter: (_: any, row: User) => 
      formatDateTimeForExport(row.createdAt) 
    },
  ];

  // Export all users
  const handleExportAll = () => {
    exportToCSV(users, getExportColumns(), 'users-all');
    toast.success(`Exported ${users.length} users`);
  };

  // Export selected users (bulk action)
  const handleExportSelected = (selectedUsers: User[]) => {
    if (selectedUsers.length === 0) {
      toast.error('No users selected');
      return;
    }
    
    exportToCSV(selectedUsers, getExportColumns(), 'users-selected');
    toast.success(`Exported ${selectedUsers.length} selected users`);
  };

  // Quick stats
  const quickStats: QuickStat[] = [
    {
      label: 'Total Users',
      value: stats?.totalUsers?.toLocaleString() || '0',
      icon: <Users className="h-4 w-4" />,
      color: 'default',
    },
    {
      label: 'Active Users',
      value: stats?.activeUsers?.toLocaleString() || '0',
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'success',
    },
    {
      label: 'New (7 days)',
      value: stats?.newUsersThisWeek?.toLocaleString() || '0',
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'info',
    },
    {
      label: 'Pending KYC',
      value: stats?.pendingKyc?.toLocaleString() || '0',
      icon: <Clock className="h-4 w-4" />,
      color: 'warning',
    },
  ];

  // Define table columns
  const columns: ColumnDef<User>[] = [
    // Row selection checkbox
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'email',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original;
        const initials = `${user.profile?.firstName?.charAt(0) || ''}${user.profile?.lastName?.charAt(0) || 'U'}`;
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium truncate">
                {user.profile?.firstName} {user.profile?.lastName}
              </div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'profile.phoneNumber',
      header: 'Phone',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.profile?.phoneNumber || '-'}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'profile.country',
      header: 'Country',
      cell: ({ row }) => {
        const country = row.original.profile?.country;
        if (!country) return '-';
        return (
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCountryFlag(country)}</span>
            <span className="text-sm">{getCountryName(country)}</span>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: '_count.orders',
      header: 'Orders',
      cell: ({ row }) => (
        <Link href={`/admin/orders?userId=${row.original.id}`}>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent font-medium">
            <ShoppingCart className="h-3 w-3 mr-1" />
            {row.original._count.orders}
          </Badge>
        </Link>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'totalSpent',
      header: 'Total Spent',
      cell: ({ row }) => {
        const amount = row.original.totalSpent;
        return (
          <span className={`font-semibold ${
            amount > 10000 ? 'text-green-600 dark:text-green-400' : 
            amount > 1000 ? 'text-blue-600 dark:text-blue-400' : 
            'text-muted-foreground'
          }`}>
            {formatCurrency(amount, 'EUR')}
          </span>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'kycSession.status',
      header: 'KYC',
      cell: ({ row }) => {
        const user = row.original;
        return user.kycSession ? (
          <KycStatusBadge status={user.kycSession.status} />
        ) : (
          <Badge variant="outline" className="text-xs">Not Started</Badge>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'destructive'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {row.original.lastLogin ? formatDateTime(row.original.lastLogin) : 'Never'}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
      enableSorting: true,
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  viewUserDetails(user);
                }}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/orders?userId=${user.id}`}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    View Orders
                  </Link>
                </DropdownMenuItem>
                {user.kycSession && (
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/kyc?userId=${user.id}`}>
                      <Shield className="h-4 w-4 mr-2" />
                      View KYC
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  toggleUserStatus(user.id, user.isActive);
                }}>
                  {user.isActive ? (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                {user.role !== 'ADMIN' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(user.id);
                      }}
                      className="text-destructive"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Delete User
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all client users (customers)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              fetchUsers();
              fetchStats();
            }}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats stats={quickStats} isLoading={statsLoading} />

      {/* Data Table with Advanced Features */}
      <DataTableAdvanced
        columns={columns}
        data={users}
        searchKey="email"
        searchPlaceholder="Search by name or email..."
        isLoading={loading}
        onRowClick={viewUserDetails}
        pageSize={20}
        enableRowSelection={true}
        enableExport={true}
        exportFileName="users"
        onExport={handleExportAll}
        bulkActions={[
          {
            label: 'Export Selected',
            icon: <Download className="h-4 w-4 mr-2" />,
            onClick: handleExportSelected,
            variant: 'outline',
          },
          {
            label: 'Activate',
            icon: <UserCheck className="h-4 w-4 mr-2" />,
            onClick: handleBulkActivate,
            variant: 'default',
          },
          {
            label: 'Deactivate',
            icon: <UserX className="h-4 w-4 mr-2" />,
            onClick: handleBulkDeactivate,
            variant: 'outline',
          },
        ]}
        filters={
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="KYC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account, 
              including all related data (profile, KYC session, orders history).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
