/**
 * Admin Management Client Component
 * 
 * Features:
 * - List all administrators
 * - Invite new admins (generate setup link)
 * - Edit admin details
 * - Suspend/Terminate admins
 * - View team hierarchy
 * - Manage roles and permissions
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { RolePermissionsEditor } from './role-editor';
import { 
  Users, 
  UserPlus, 
  Search, 
  Shield, 
  Mail,
  MoreVertical,
  Edit,
  Ban,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Send,
  Scale
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Invite admin schema
const inviteAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  jobTitle: z.string().min(2, 'Job title must be at least 2 characters'),
  role: z.enum(['ADMIN', 'COMPLIANCE', 'TREASURY_APPROVER', 'FINANCE', 'SUPPORT', 'READ_ONLY']),
  department: z.string().optional(),
});

type InviteAdminFormData = z.infer<typeof inviteAdminSchema>;

interface Admin {
  id: string;
  email: string;
  workEmail: string | null;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  department: string | null;
  employeeId: string | null;
  role: string;
  status: string;
  isActive: boolean;
  isSuspended: boolean;
  lastLogin: string | null;
  createdAt: string;
  authMethod: string;
}

interface AdminManagementClientProps {
  currentAdminId: string;
  currentAdminRole: string;
}

export function AdminManagementClient({ 
  currentAdminId, 
  currentAdminRole 
}: AdminManagementClientProps) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Get admin permissions
  const { hasPermission } = useAdminPermissions();
  
  // Check permissions for actions
  const canCreate = hasPermission('admins', 'create');
  const canUpdate = hasPermission('admins', 'update');
  const canSuspend = hasPermission('admins', 'suspend');
  const canDelete = hasPermission('admins', 'delete');
  const canChangeRole = hasPermission('admins', 'change_role');
  
  // Dialogs
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteLinkDialogOpen, setInviteLinkDialogOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Alert dialogs
  const [suspendAlertOpen, setSuspendAlertOpen] = useState(false);
  const [terminateAlertOpen, setTerminateAlertOpen] = useState(false);

  // Invite form
  const inviteForm = useForm<InviteAdminFormData>({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      jobTitle: '',
      role: 'ADMIN',
      department: '',
    },
  });

  // Load admins
  useEffect(() => {
    loadAdmins();
  }, []);

  // Filter admins
  useEffect(() => {
    if (!searchQuery) {
      setFilteredAdmins(admins);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = admins.filter(admin => 
      admin.email.toLowerCase().includes(query) ||
      admin.firstName.toLowerCase().includes(query) ||
      admin.lastName.toLowerCase().includes(query) ||
      admin.jobTitle?.toLowerCase().includes(query) ||
      admin.department?.toLowerCase().includes(query) ||
      admin.role.toLowerCase().includes(query)
    );
    setFilteredAdmins(filtered);
  }, [searchQuery, admins]);

  const loadAdmins = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/admins');
      const data = await response.json();
      
      if (data.success) {
        setAdmins(data.admins);
      } else {
        toast.error('Failed to load admins');
      }
    } catch (error) {
      console.error('Failed to load admins:', error);
      toast.error('Failed to load admins');
    } finally {
      setIsLoading(false);
    }
  };

  // Invite new admin
  const onInviteSubmit = async (data: InviteAdminFormData) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/admins/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Admin invited successfully!');
        setInviteLink(result.inviteLink);
        setInviteDialogOpen(false);
        setInviteLinkDialogOpen(true);
        inviteForm.reset();
        loadAdmins();
      } else {
        toast.error(result.error || 'Failed to invite admin');
      }
    } catch (error) {
      console.error('Invite error:', error);
      toast.error('Failed to invite admin');
    } finally {
      setActionLoading(false);
    }
  };

  // Copy invite link
  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied to clipboard!');
  };

  // Suspend admin
  const handleSuspend = async () => {
    if (!selectedAdmin) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/admins/${selectedAdmin.id}/suspend`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Admin suspended successfully');
        setSuspendAlertOpen(false);
        loadAdmins();
      } else {
        toast.error(result.error || 'Failed to suspend admin');
      }
    } catch (error) {
      console.error('Suspend error:', error);
      toast.error('Failed to suspend admin');
    } finally {
      setActionLoading(false);
    }
  };

  // Terminate admin
  const handleTerminate = async () => {
    if (!selectedAdmin) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/admins/${selectedAdmin.id}/terminate`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Admin terminated successfully');
        setTerminateAlertOpen(false);
        loadAdmins();
      } else {
        toast.error(result.error || 'Failed to terminate admin');
      }
    } catch (error) {
      console.error('Terminate error:', error);
      toast.error('Failed to terminate admin');
    } finally {
      setActionLoading(false);
    }
  };

  // Reactivate admin
  const handleReactivate = async (admin: Admin) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/admins/${admin.id}/reactivate`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Admin reactivated successfully');
        loadAdmins();
      } else {
        toast.error(result.error || 'Failed to reactivate admin');
      }
    } catch (error) {
      console.error('Reactivate error:', error);
      toast.error('Failed to reactivate admin');
    } finally {
      setActionLoading(false);
    }
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    const roleConfig = {
      SUPER_ADMIN: { label: 'Super Admin', variant: 'destructive' as const },
      ADMIN: { label: 'Admin', variant: 'default' as const },
      COMPLIANCE: { label: 'Compliance', variant: 'secondary' as const },
      TREASURY_APPROVER: { label: 'Treasury', variant: 'outline' as const },
      FINANCE: { label: 'Finance', variant: 'outline' as const },
      SUPPORT: { label: 'Support', variant: 'outline' as const },
      READ_ONLY: { label: 'Read Only', variant: 'outline' as const },
    };

    const config = roleConfig[role as keyof typeof roleConfig] || { label: role, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Get status badge
  const getStatusBadge = (admin: Admin) => {
    if (admin.status === 'TERMINATED' || !admin.isActive) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="w-3 h-3" />
          Terminated
        </Badge>
      );
    }
    if (admin.status === 'SUSPENDED' || admin.isSuspended) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Ban className="w-3 h-3" />
          Suspended
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200 gap-1">
        <CheckCircle className="w-3 h-3" />
        Active
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Administrator Management
          </h1>
          <p className="text-muted-foreground">
            Manage admin accounts, roles, and permissions
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Admin
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="admins" className="space-y-6">
        <TabsList>
          <TabsTrigger value="admins" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Administrators
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Roles & Permissions
          </TabsTrigger>
        </TabsList>

        {/* Administrators Tab */}
        <TabsContent value="admins" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {admins.filter(a => a.status === 'ACTIVE' && a.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {admins.filter(a => a.status === 'SUSPENDED' || a.isSuspended).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Terminated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {admins.filter(a => a.status === 'TERMINATED' || !a.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Administrators</CardTitle>
          <CardDescription>View and manage all admin accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, role, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading admins...
                    </TableCell>
                  </TableRow>
                ) : filteredAdmins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No admins found matching your search' : 'No admins found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {admin.role === 'SUPER_ADMIN' && <Shield className="w-4 h-4 text-destructive" />}
                          {admin.firstName} {admin.lastName}
                          {admin.id === currentAdminId && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{admin.workEmail || admin.email}</TableCell>
                      <TableCell>{admin.jobTitle || '—'}</TableCell>
                      <TableCell>{getRoleBadge(admin.role)}</TableCell>
                      <TableCell>{getStatusBadge(admin)}</TableCell>
                      <TableCell>
                        {admin.lastLogin ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3" />
                            {new Date(admin.lastLogin).toLocaleDateString()}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {canUpdate && (
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                            )}
                            {canCreate && (
                              <DropdownMenuItem>
                                <Mail className="w-4 h-4 mr-2" />
                                Resend Invite
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {(admin.status === 'ACTIVE' && admin.isActive) && admin.id !== currentAdminId && (
                              <>
                                {canSuspend && (
                                  <DropdownMenuItem
                                    className="text-amber-600"
                                    onClick={() => {
                                      setSelectedAdmin(admin);
                                      setSuspendAlertOpen(true);
                                    }}
                                  >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Suspend
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setSelectedAdmin(admin);
                                      setTerminateAlertOpen(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Terminate
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            {(admin.status === 'SUSPENDED' || admin.isSuspended) && canUpdate && (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() => handleReactivate(admin)}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invite Admin Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite New Administrator</DialogTitle>
            <DialogDescription>
              Send an invitation to create a new admin account
            </DialogDescription>
          </DialogHeader>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={inviteForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="John" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={inviteForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Doe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="john.doe@company.com" />
                    </FormControl>
                    <FormDescription>
                      Corporate email address for the new admin
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={inviteForm.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Compliance Officer" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={inviteForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrator</SelectItem>
                        <SelectItem value="COMPLIANCE">Compliance Officer</SelectItem>
                        <SelectItem value="TREASURY_APPROVER">Treasury Approver</SelectItem>
                        <SelectItem value="FINANCE">Finance Manager</SelectItem>
                        <SelectItem value="SUPPORT">Support Specialist</SelectItem>
                        <SelectItem value="READ_ONLY">Read Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={inviteForm.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Compliance" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Generating...' : 'Generate Invite Link'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog open={inviteLinkDialogOpen} onOpenChange={setInviteLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitation Link Generated</DialogTitle>
            <DialogDescription>
              Share this link with the new admin to complete their registration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input value={inviteLink} readOnly className="font-mono text-sm" />
              <Button size="icon" variant="outline" onClick={copyInviteLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              ⚠️ This link expires in 7 days and can only be used once.
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setInviteLinkDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Alert */}
      <AlertDialog open={suspendAlertOpen} onOpenChange={setSuspendAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Administrator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend <strong>{selectedAdmin?.firstName} {selectedAdmin?.lastName}</strong>?
              They will be unable to access the admin panel until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspend} disabled={actionLoading}>
              {actionLoading ? 'Suspending...' : 'Suspend'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terminate Alert */}
      <AlertDialog open={terminateAlertOpen} onOpenChange={setTerminateAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Administrator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to terminate <strong>{selectedAdmin?.firstName} {selectedAdmin?.lastName}</strong>?
              This action will permanently revoke all access and cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleTerminate} 
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? 'Terminating...' : 'Terminate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles" className="space-y-6">
          <RolesPermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Roles & Permissions Tab Component
 */
function RolesPermissionsTab() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      setIsLoading(true);

      // Fetch roles
      const rolesResponse = await fetch('/api/admin/roles');
      const rolesData = await rolesResponse.json();

      // Fetch permissions  
      const permsResponse = await fetch('/api/admin/permissions/all');
      const permsData = await permsResponse.json();

      if (rolesData.success) {
        setRoles(rolesData.roles || []);
      }

      if (permsData.success) {
        setPermissions(permsData.permissions || []);
      }
    } catch (error) {
      console.error('Failed to fetch roles/permissions:', error);
      toast.error('Failed to load roles and permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRole = async (role: any) => {
    try {
      // Fetch role details with permissions
      const response = await fetch(`/api/admin/roles/${role.code}`);
      const data = await response.json();
      
      if (data.success && data.role) {
        setSelectedRole(data.role);
        setEditingPermissions(
          data.role.permissions?.map((rp: any) => rp.permission.code) || []
        );
        setIsEditDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch role details:', error);
      toast.error('Failed to load role details');
    }
  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    setEditingPermissions([]);
    setIsCreateDialogOpen(true);
  };

  const handleSaveRole = async (roleData: any) => {
    try {
      const url = selectedRole 
        ? `/api/admin/roles/${selectedRole.code}`
        : '/api/admin/roles';
      
      const method = selectedRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...roleData,
          permissions: editingPermissions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(selectedRole ? 'Role updated successfully' : 'Role created successfully');
        setIsEditDialogOpen(false);
        setIsCreateDialogOpen(false);
        fetchRolesAndPermissions();
      } else {
        toast.error(data.error || 'Failed to save role');
      }
    } catch (error) {
      console.error('Failed to save role:', error);
      toast.error('Failed to save role');
    }
  };

  const handleDeleteRole = async (roleCode: string) => {
    if (!confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/roles/${roleCode}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Role deleted successfully');
        fetchRolesAndPermissions();
      } else {
        toast.error(data.error || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Failed to delete role:', error);
      toast.error('Failed to delete role');
    }
  };

  const togglePermission = (permCode: string) => {
    setEditingPermissions(prev => 
      prev.includes(permCode)
        ? prev.filter(p => p !== permCode)
        : [...prev, permCode]
    );
  };

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc: any, perm: any) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Roles & Permissions</h2>
          <p className="text-muted-foreground">Manage system roles and their permissions</p>
        </div>
        <Button onClick={handleCreateRole}>
          <UserPlus className="w-4 h-4 mr-2" />
          Create Custom Role
        </Button>
      </div>

      {/* Roles Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        ) : (
          roles.map((role) => (
            <Card key={role.code} className="relative">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{role.name}</span>
                  {role.isSystem && (
                    <Badge variant="secondary">System</Badge>
                  )}
                </CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Permissions:</span>
                    <Badge variant="outline">{role._count?.permissions || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Admins:</span>
                    <Badge variant="outline">{role._count?.admins || 0}</Badge>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleEditRole(role)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    {!role.isSystem && (
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleDeleteRole(role.code)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Permissions by Category */}
      <Card>
        <CardHeader>
          <CardTitle>All Permissions ({permissions.length})</CardTitle>
          <CardDescription>
            System permissions organized by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading permissions...</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(permissionsByCategory).map(([category, perms]: [string, any]) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg capitalize">{category}</h3>
                    <Badge variant="outline">{perms.length} permissions</Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {perms.map((perm: any) => (
                      <div 
                        key={perm.code}
                        className="flex items-start gap-2 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{perm.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {perm.code}
                          </div>
                          {perm.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {perm.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Role: {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              {selectedRole?.isSystem 
                ? 'System roles cannot be renamed or deleted, but you can modify their permissions'
                : 'Modify role permissions and settings'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <RolePermissionsEditor
              role={selectedRole}
              permissions={permissions}
              selectedPermissions={editingPermissions}
              onTogglePermission={togglePermission}
              onSave={handleSaveRole}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>
              Create a new role with custom permissions
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <RolePermissionsEditor
              role={null}
              permissions={permissions}
              selectedPermissions={editingPermissions}
              onTogglePermission={togglePermission}
              onSave={handleSaveRole}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
