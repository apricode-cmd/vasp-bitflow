/**
 * Admin Users Management Page
 * 
 * Full CRUD operations for user management with DataTable and Sheet
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { DataTable } from '@/components/admin/DataTable';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { Combobox, type ComboboxOption } from '@/components/shared/Combobox';
import { formatDateTime } from '@/lib/formatters';
import { toast } from 'sonner';
import type { Role, KycStatus } from '@prisma/client';
import { 
  MoreHorizontal, Eye, Edit, UserX, UserCheck, Shield,
  ShoppingCart, Mail, RefreshCw, UserPlus, Ban
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [kycFilter, setKycFilter] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, kycFilter]);

  const fetchUsers = async (): Promise<void> => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter && roleFilter !== 'all') {
        params.append('role', roleFilter);
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

  const openDeleteDialog = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const viewUserDetails = (user: User) => {
    setSelectedUser(user);
    setSheetOpen(true);
  };

  // Role filter options
  const roleOptions: ComboboxOption[] = [
    { value: 'all', label: 'All Roles' },
    { value: 'CLIENT', label: 'Clients' },
    { value: 'ADMIN', label: 'Admins' },
  ];

  // KYC filter options
  const kycOptions: ComboboxOption[] = [
    { value: 'all', label: 'All KYC Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  // Define table columns
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'email',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original;
        const initials = `${user.profile?.firstName?.charAt(0) || ''}${user.profile?.lastName?.charAt(0) || 'U'}`;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">
                {user.profile?.firstName} {user.profile?.lastName}
              </div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant={row.original.role === 'ADMIN' ? 'default' : 'secondary'}>
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: 'kycSession.status',
      header: 'KYC Status',
      cell: ({ row }) => {
        const user = row.original;
        return user.kycSession ? (
          <KycStatusBadge status={user.kycSession.status} />
        ) : (
          <Badge variant="outline">Not Started</Badge>
        );
      },
    },
    {
      accessorKey: '_count.orders',
      header: 'Orders',
      cell: ({ row }) => (
        <Link href={`/admin/orders?userId=${row.original.id}`}>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">
            <ShoppingCart className="h-3 w-3 mr-1" />
            {row.original._count.orders}
          </Badge>
        </Link>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'destructive'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
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
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => viewUserDetails(user)}>
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
                <DropdownMenuItem onClick={() => toggleUserStatus(user.id, user.isActive)}>
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
                      onClick={() => openDeleteDialog(user.id)}
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
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all platform users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchUsers}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Role</label>
              <Combobox
                options={roleOptions}
                value={roleFilter}
                onValueChange={setRoleFilter}
                placeholder="Filter by role..."
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">KYC Status</label>
              <Combobox
                options={kycOptions}
                value={kycFilter}
                onValueChange={setKycFilter}
                placeholder="Filter by KYC status..."
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <DataTable
        columns={columns}
        data={users}
        searchKey="email"
        searchPlaceholder="Search by email or name..."
        isLoading={loading}
        onRowClick={viewUserDetails}
        pageSize={20}
      />

      {/* User Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>User Details</SheetTitle>
            <SheetDescription>
              View and manage user information
            </SheetDescription>
          </SheetHeader>
          
          {selectedUser && (
            <div className="mt-6">
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="orders">
                    Orders
                    <Badge variant="secondary" className="ml-2">
                      {selectedUser._count.orders}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="kyc">KYC</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6 mt-6">
                  {/* User Info */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                        {selectedUser.profile?.firstName?.charAt(0)}
                        {selectedUser.profile?.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">
                        {selectedUser.profile?.firstName} {selectedUser.profile?.lastName}
                      </h3>
                      <p className="text-muted-foreground">{selectedUser.email}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={selectedUser.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {selectedUser.role}
                        </Badge>
                        <Badge variant={selectedUser.isActive ? 'success' : 'destructive'}>
                          {selectedUser.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Profile Details */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Contact Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">
                          {selectedUser.profile?.phoneNumber || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Country</p>
                        <p className="font-medium">{selectedUser.profile?.country}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Joined</p>
                        <p className="font-medium">{formatDateTime(selectedUser.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Login</p>
                        <p className="font-medium">
                          {selectedUser.lastLogin ? formatDateTime(selectedUser.lastLogin) : 'Never'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <h4 className="font-semibold">Actions</h4>
                    <Button 
                      variant={selectedUser.isActive ? 'destructive' : 'default'}
                      className="w-full"
                      onClick={() => toggleUserStatus(selectedUser.id, selectedUser.isActive)}
                    >
                      {selectedUser.isActive ? (
                        <>
                          <UserX className="h-4 w-4 mr-2" />
                          Deactivate User
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Activate User
                        </>
                      )}
                    </Button>
                    {selectedUser.role !== 'ADMIN' && (
                      <Button 
                        variant="outline"
                        className="w-full text-destructive hover:text-destructive"
                        onClick={() => {
                          openDeleteDialog(selectedUser.id);
                          setSheetOpen(false);
                        }}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Delete User
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="orders" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Total orders: {selectedUser._count.orders}
                      </p>
                      <Link href={`/admin/orders?userId=${selectedUser.id}`}>
                        <Button size="sm" variant="outline">
                          View All Orders
                        </Button>
                      </Link>
                    </div>
                    {selectedUser._count.orders === 0 ? (
                      <div className="text-center py-12">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground">No orders yet</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Click "View All Orders" to see detailed order history
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="kyc" className="mt-6">
                  <div className="space-y-4">
                    {selectedUser.kycSession ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">KYC Status</span>
                          <KycStatusBadge status={selectedUser.kycSession.status} />
                        </div>
                        <Link href={`/admin/kyc?userId=${selectedUser.id}`}>
                          <Button variant="outline" className="w-full">
                            <Shield className="h-4 w-4 mr-2" />
                            View KYC Details
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground">KYC not started</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
