/**
 * Admin Profile Page - Client Component
 * 
 * Administrator profile management and security settings
 * Passwordless authentication only - using Passkeys
 */

'use client';

import { useState, useEffect } from 'react';
import { signOutAdmin } from '@/lib/actions/admin-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  User,
  Shield,
  LogOut,
  Save,
  Clock,
  Bell,
  Activity,
  AlertCircle,
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { PasskeyManagement } from '@/components/admin/PasskeyManagement';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';

// Profile update schema
const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  workEmail: z.string().email('Invalid work email address').optional(),
  jobTitle: z.string().min(2, 'Job title must be at least 2 characters'),
  department: z.string().optional(),
  // employeeId is auto-generated and readonly
  locale: z.enum(['en', 'ru', 'uk', 'pl']).default('en'),
  timezone: z.string().default('UTC'),
});

// Security settings schema
const securitySchema = z.object({
  idleTimeout: z.number().min(5).max(120),
  maxSessionDuration: z.number().min(1).max(24),
  loginNotifications: z.boolean(),
  securityAlerts: z.boolean(),
  activityDigest: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type SecurityFormData = z.infer<typeof securitySchema>;

interface AdminProfileClientProps {
  adminId: string;
  adminEmail: string;
  adminRole: string;
}

interface Activity {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

interface AdminSession {
  id: string;
  sessionId: string;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string;
  country: string | null;
  city: string | null;
  lastActivity: string;
  createdAt: string;
  expiresAt: string;
}

export function AdminProfileClient({ 
  adminId, 
  adminEmail, 
  adminRole 
}: AdminProfileClientProps): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityStats, setActivityStats] = useState<any>(null);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [terminating, setTerminating] = useState<string | null>(null);

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: adminEmail,
      workEmail: '',
      jobTitle: '',
      department: '',
      locale: 'en',
      timezone: 'UTC',
    },
  });

  // Security form
  const securityForm = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      idleTimeout: 15,
      maxSessionDuration: 8,
      loginNotifications: true,
      securityAlerts: true,
      activityDigest: false,
    },
  });

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/admin/profile');
        const data = await response.json();
        
        if (data.success) {
          setProfileData(data.profile);
          profileForm.reset({
            firstName: data.profile.firstName || '',
            lastName: data.profile.lastName || '',
            email: data.profile.email || '',
            workEmail: data.profile.workEmail || '',
            jobTitle: data.profile.jobTitle || '',
            department: data.profile.department || '',
            locale: data.profile.locale || 'en',
            timezone: data.profile.timezone || 'UTC',
          });
          
          // Load security settings
          const settingsRes = await fetch('/api/admin/security-settings');
          const settingsData = await settingsRes.json();
          
          if (settingsData.success) {
            securityForm.reset({
              idleTimeout: settingsData.data.idleTimeout || 15,
              maxSessionDuration: settingsData.data.maxSessionDuration || 8,
              loginNotifications: settingsData.data.loginNotifications ?? true,
              securityAlerts: settingsData.data.securityAlerts ?? true,
              activityDigest: settingsData.data.activityDigest ?? false,
            });
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        toast.error('Failed to load profile');
      }
    };

      loadProfile();
  }, [adminEmail, profileForm, securityForm]);

  // Load activities
  const loadActivities = async () => {
    setLoadingActivities(true);
      try {
      const response = await fetch('/api/admin/activity?limit=20');
        const data = await response.json();
        
        if (data.success) {
        setActivities(data.activities);
        setActivityStats(data.stats);
        }
      } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoadingActivities(false);
      }
    };

  // Load sessions
  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await fetch('/api/admin/sessions');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  // Terminate session
  const handleTerminateSession = async (sessionId: string, isCurrent: boolean) => {
    setTerminating(sessionId);
    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to terminate session');

      toast.success('Session terminated successfully');
      
      // If terminating current session, redirect to login
      if (isCurrent) {
        toast.info('Redirecting to login...');
        setTimeout(() => {
          window.location.href = '/admin/auth/login';
        }, 1000);
      } else {
        loadSessions();
      }
    } catch (error) {
      console.error('Failed to terminate session:', error);
      toast.error('Failed to terminate session');
      setTerminating(null);
    }
  };

  // Terminate all sessions
  const handleTerminateAllSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to terminate all sessions');

      const data = await response.json();
      toast.success(data.message || 'All sessions terminated');
      
      // Redirect to login
      window.location.href = '/admin/auth/login';
    } catch (error) {
      console.error('Failed to terminate all sessions:', error);
      toast.error('Failed to terminate all sessions');
    }
  };

  // Update profile
  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Profile updated successfully');
        setProfileData({ ...profileData, ...data });
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Update security settings
  const onSecuritySubmit = async (data: SecurityFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/security-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Security settings updated successfully');
      } else {
        toast.error(result.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Security settings error:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await signOutAdmin();
  };

  // Get role badge color
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge variant="destructive">Super Admin</Badge>;
      case 'ADMIN':
        return <Badge variant="default">Administrator</Badge>;
      case 'COMPLIANCE':
        return <Badge variant="secondary">Compliance</Badge>;
      case 'FINANCE':
        return <Badge variant="outline">Finance</Badge>;
      case 'SUPPORT':
        return <Badge variant="outline">Support</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN')) return <LogOut className="w-5 h-5 text-green-600" />;
    if (action.includes('PROFILE')) return <User className="w-5 h-5 text-blue-600" />;
    if (action.includes('SETTINGS')) return <Shield className="w-5 h-5 text-purple-600" />;
    if (action.includes('PASSKEY')) return <Shield className="w-5 h-5 text-amber-600" />;
    if (action.includes('SESSION')) return <Activity className="w-5 h-5 text-red-600" />;
    return <Activity className="w-5 h-5 text-gray-600" />;
  };

  // Format action name
  const formatAction = (action: string): string => {
    return action
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Format activity details
  const formatActivityDetails = (action: string, newValue: string): string => {
    try {
      const data = JSON.parse(newValue);
      if (action.includes('PROFILE')) {
        return `Updated: ${data.firstName || ''} ${data.lastName || ''}`.trim();
    }
      if (action.includes('SETTINGS')) {
        const changes = Object.keys(data).slice(0, 2).join(', ');
        return `Modified: ${changes}${Object.keys(data).length > 2 ? '...' : ''}`;
      }
      if (action.includes('PASSKEY')) {
        return data.deviceName ? `Device: ${data.deviceName}` : 'Passkey updated';
      }
      return 'Action completed';
    } catch {
      return 'Action completed';
    }
  };

  // Device icon helper
  const DeviceIcon = ({ type }: { type: string | null }) => {
    switch (type?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Laptop className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Profile</h1>
          <p className="text-muted-foreground">
            Manage your account and security settings
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign Out</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to sign out? You will need to authenticate with your Passkey again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout}>
                Sign Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Passwordless Authentication
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Your admin account uses <strong>Passkeys (WebAuthn)</strong> for secure, passwordless authentication. 
                Manage your Passkeys in the Security tab.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Monitor className="w-4 h-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="w-4 h-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" disabled />
                        </FormControl>
                        <FormDescription>
                          Email cannot be changed for security reasons
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator className="my-6" />

                  {/* Professional Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Professional Information</h3>
                    
                    <FormField
                      control={profileForm.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Compliance Officer, Treasury Approver" disabled={isLoading} />
                          </FormControl>
                          <FormDescription>
                            Your role in the organization
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Compliance, Finance" disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormItem>
                        <FormLabel>Employee ID</FormLabel>
                        <FormControl>
                          <Input value={profileData?.employeeId || 'Generating...'} disabled className="bg-muted" />
                        </FormControl>
                        <FormDescription>
                          Auto-generated unique identifier
                        </FormDescription>
                      </FormItem>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Localization Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Localization</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="locale"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Language</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="ru">Русский</SelectItem>
                                <SelectItem value="uk">Українська</SelectItem>
                                <SelectItem value="pl">Polski</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timezone</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="UTC">UTC</SelectItem>
                                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                                <SelectItem value="Europe/Kiev">Europe/Kiev (EET)</SelectItem>
                                <SelectItem value="Europe/Warsaw">Europe/Warsaw (CET)</SelectItem>
                                <SelectItem value="Europe/Moscow">Europe/Moscow (MSK)</SelectItem>
                                <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-2 pt-4">
                    {getRoleBadge(adminRole)}
                    {profileData?.isActive && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
                        Active
                      </Badge>
                    )}
                  </div>

                  {profileData?.lastLogin && (
                    <div className="text-sm text-muted-foreground">
                      Last login: {new Date(profileData.lastLogin).toLocaleString()}
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Passkey Management */}
          <PasskeyManagement />

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure session timeouts and security notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...securityForm}>
                <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                  {/* Session Management */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Session Management
                    </h4>

                  <FormField
                    control={securityForm.control}
                      name="idleTimeout"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>Idle Timeout (minutes)</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            defaultValue={field.value.toString()}
                          >
                          <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select idle timeout" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="5">5 minutes</SelectItem>
                              <SelectItem value="10">10 minutes</SelectItem>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Automatically log out after this period of inactivity
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                    <FormField
                      control={securityForm.control}
                      name="maxSessionDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Session Duration (hours)</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            defaultValue={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select max duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 hour</SelectItem>
                              <SelectItem value="2">2 hours</SelectItem>
                              <SelectItem value="4">4 hours</SelectItem>
                              <SelectItem value="8">8 hours</SelectItem>
                              <SelectItem value="12">12 hours</SelectItem>
                              <SelectItem value="24">24 hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Force re-authentication after this time, regardless of activity
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Notifications */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Notifications
                    </h4>

                  <FormField
                    control={securityForm.control}
                    name="loginNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base">
                            Login Notifications
                          </FormLabel>
                          <FormDescription>
                            Receive email notifications for new login attempts
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                    <FormField
                      control={securityForm.control}
                      name="securityAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Security Alerts
                            </FormLabel>
                            <FormDescription>
                              Get notified about suspicious activities or security events
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={securityForm.control}
                      name="activityDigest"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Weekly Activity Digest
                            </FormLabel>
                            <FormDescription>
                              Receive weekly summary of your admin activities
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                    Emergency Access
                  </h4>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    If you lose access to all your Passkeys, contact your system administrator. 
                    A break-glass emergency access procedure will be initiated.
                  </p>
                          </div>
                  </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6" onFocus={loadSessions}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active Sessions</h3>
              <p className="text-sm text-muted-foreground">
                Manage your active login sessions across devices
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSessions}
                disabled={loadingSessions}
              >
                {loadingSessions ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
              </Button>
              {sessions.length > 1 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Logout from all devices?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will terminate all active sessions including this one. You will be redirected to the login page.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleTerminateAllSessions}>
                        Logout All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Devices ({sessions.length})</CardTitle>
              <CardDescription>
                Sessions expire after 8 hours or 15 minutes of inactivity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
                  <p>Loading sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active sessions found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session, index) => {
                      // First session is likely current (most recent activity)
                      const isCurrent = index === 0;
                      
                      return (
                        <TableRow key={session.id} className={isCurrent ? 'bg-primary/5' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <DeviceIcon type={session.deviceType} />
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {session.browser || 'Unknown'} on {session.os || 'Unknown'}
                                  </span>
                                  {isCurrent && (
                                    <Badge variant="default" className="text-xs">
                                      Current
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {session.deviceType || 'desktop'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {session.city && session.country
                                  ? `${session.city}, ${session.country}`
                                  : session.country || session.ipAddress}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={terminating === session.id}
                                >
                                  {terminating === session.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <LogOut className="mr-2 h-3 w-3" />
                                      Logout
                                    </>
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {isCurrent ? 'Logout from current session?' : 'Terminate this session?'}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {isCurrent 
                                      ? 'This is your current session. You will be logged out and redirected to the login page.'
                                      : 'This will logout this device immediately.'}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleTerminateSession(session.id, isCurrent)}>
                                    {isCurrent ? 'Logout' : 'Terminate'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Security Info */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="text-blue-900 dark:text-blue-100">
                    <strong>Security Tips:</strong>
                  </p>
                  <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• Sessions are automatically terminated after 8 hours or 15 minutes of inactivity</li>
                    <li>• Review your active sessions regularly and terminate unknown devices</li>
                    <li>• Configure session timeouts in the Security tab</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6" onFocus={loadActivities}>
          {/* Activity Stats */}
          {activityStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Last 24 Hours</CardDescription>
                  <CardTitle className="text-3xl">{activityStats.last24Hours}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Last 7 Days</CardDescription>
                  <CardTitle className="text-3xl">{activityStats.last7Days}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Actions</CardDescription>
                  <CardTitle className="text-3xl">{activityStats.total}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                    Recent Activity
              </CardTitle>
              <CardDescription>
                    Your recent admin actions and security events
              </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadActivities}
                  disabled={loadingActivities}
                >
                  {loadingActivities ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingActivities ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
                  <p>Loading activities...</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No activities yet</p>
                  <p className="text-sm mt-2">
                    Your actions will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {getActionIcon(activity.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{formatAction(activity.action)}</h4>
                          <Badge variant="outline" className="text-xs">
                            {activity.entity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.newValue && formatActivityDetails(activity.action, activity.newValue)}
                          </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{new Date(activity.createdAt).toLocaleString()}</span>
                          <span>•</span>
                          <span>{activity.ipAddress}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
