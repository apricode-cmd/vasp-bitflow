'use client';

/**
 * Active Sessions Client Component
 * 
 * Displays all active admin sessions with ability to terminate them
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Laptop, Monitor, Smartphone, Tablet, MapPin, Chrome, LogOut, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  admin?: {
    email: string | null;
    workEmail: string | null;
    firstName: string;
    lastName: string;
    role: string;
  };
}

function DeviceIcon({ type }: { type: string | null }) {
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
}

export function ActiveSessionsClient() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // Refresh every minute
    const interval = setInterval(fetchSessions, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleTerminateSession = async (sessionId: string) => {
    setTerminating(sessionId);
    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to terminate session');
      }

      toast.success('Session terminated successfully');
      // Refresh list
      fetchSessions();
    } catch (error) {
      console.error('Failed to terminate session:', error);
      toast.error('Failed to terminate session');
    } finally {
      setTerminating(null);
    }
  };

  const handleTerminateAllSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to terminate all sessions');
      }

      const data = await response.json();
      toast.success(data.message || 'All sessions terminated');
      
      // Redirect to login after terminating all sessions
      window.location.href = '/admin/auth/login';
    } catch (error) {
      console.error('Failed to terminate all sessions:', error);
      toast.error('Failed to terminate all sessions');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => new Date(s.expiresAt) > new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Sessions</h1>
          <p className="text-muted-foreground">
            Manage your active login sessions across devices
          </p>
        </div>

        {activeSessions.length > 1 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Logout All Devices
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

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions ({activeSessions.length})</CardTitle>
          <CardDescription>
            Sessions automatically expire after {sessions[0]?.expiresAt ? '8 hours' : 'configured time'} or {sessions[0]?.idleTimeout || 15} minutes of inactivity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No active sessions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  {sessions[0]?.admin && <TableHead>Admin</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <DeviceIcon type={session.deviceType} />
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {session.browser || 'Unknown'} on {session.os || 'Unknown'}
                          </span>
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
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(session.expiresAt), { addSuffix: true })}
                    </TableCell>
                    {session.admin && (
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {session.admin.firstName} {session.admin.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {session.admin.email || session.admin.workEmail}
                          </span>
                          <Badge variant="outline" className="w-fit mt-1">
                            {session.admin.role}
                          </Badge>
                        </div>
                      </TableCell>
                    )}
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
                            <AlertDialogTitle>Terminate this session?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will logout this device. If this is your current session, you will be redirected to the login page.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleTerminateSession(session.id)}>
                              Terminate
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Security Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Security Information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Sessions are automatically terminated after the maximum duration or idle timeout</p>
          <p>• Idle timeout is triggered if there is no activity for the configured period</p>
          <p>• Terminating a session will force logout from that device</p>
          <p>• For security, terminate sessions on devices you don't recognize</p>
        </CardContent>
      </Card>
    </div>
  );
}

