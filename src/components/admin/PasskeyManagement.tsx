/**
 * Passkey Management Component
 * 
 * Allows admins to register, view, and remove passkeys (WebAuthn credentials)
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Fingerprint,
  Smartphone,
  Laptop,
  Plus,
  Trash2,
  Shield,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { startRegistration } from '@simplewebauthn/browser';

interface Passkey {
  id: string;
  deviceName: string;
  deviceType: string;
  transports: string[];
  lastUsed: string | null;
  createdAt: string;
}

export function PasskeyManagement() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [deviceName, setDeviceName] = useState('');

  // Load passkeys
  const loadPasskeys = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/passkeys');
      const data = await response.json();

      if (data.success) {
        setPasskeys(data.passkeys);
      } else {
        toast.error('Failed to load passkeys');
      }
    } catch (error) {
      console.error('Failed to load passkeys:', error);
      toast.error('Failed to load passkeys');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPasskeys();
  }, []);

  // Register new passkey
  const handleRegisterPasskey = async () => {
    if (!deviceName.trim()) {
      toast.error('Please enter a device name');
      return;
    }

    setIsRegistering(true);
    try {
      // 1. Get registration options
      const optionsRes = await fetch('/api/admin/passkey/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!optionsRes.ok) {
        throw new Error('Failed to get registration options');
      }

      const options = await optionsRes.json();

      // 2. Start WebAuthn registration
      const attResp = await startRegistration(options);

      // 3. Verify registration
      const verifyRes = await fetch('/api/admin/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: attResp,
          deviceName: deviceName.trim(),
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        toast.success('Passkey registered successfully!');
        setShowRegisterDialog(false);
        setDeviceName('');
        await loadPasskeys();
      } else {
        throw new Error(verifyData.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Passkey registration error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to register passkey'
      );
    } finally {
      setIsRegistering(false);
    }
  };

  // Remove passkey
  const handleRemovePasskey = async (passkeyId: string) => {
    try {
      const response = await fetch(`/api/admin/passkeys?id=${passkeyId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Passkey removed successfully');
        await loadPasskeys();
      } else {
        toast.error(data.error || 'Failed to remove passkey');
      }
    } catch (error) {
      console.error('Remove passkey error:', error);
      toast.error('Failed to remove passkey');
    }
  };

  // Get device icon
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'platform':
        return <Fingerprint className="w-5 h-5 text-primary" />;
      case 'cross-platform':
        return <Shield className="w-5 h-5 text-primary" />;
      default:
        return <Smartphone className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              Passkeys
            </CardTitle>
            <CardDescription>
              Secure passwordless authentication using Face ID, Touch ID, or security keys
            </CardDescription>
          </div>
          <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Passkey
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Passkey</DialogTitle>
                <DialogDescription>
                  Add a new passkey to your account for passwordless sign-in
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="deviceName">Device Name</Label>
                  <Input
                    id="deviceName"
                    placeholder="e.g., MacBook Pro, iPhone 15"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    disabled={isRegistering}
                  />
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium mb-1">What happens next?</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Your browser will prompt you to authenticate</li>
                      <li>• Use Touch ID, Face ID, or security key</li>
                      <li>• Your passkey stays on this device</li>
                    </ul>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowRegisterDialog(false)}
                  disabled={isRegistering}
                >
                  Cancel
                </Button>
                <Button onClick={handleRegisterPasskey} disabled={isRegistering}>
                  {isRegistering ? 'Registering...' : 'Register Passkey'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading passkeys...
          </div>
        ) : passkeys.length === 0 ? (
          <div className="text-center py-8">
            <Fingerprint className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">No passkeys registered yet</p>
            <Button onClick={() => setShowRegisterDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Passkey
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {getDeviceIcon(passkey.deviceType)}
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      {passkey.deviceName}
                      <Badge variant="outline" className="text-xs">
                        {passkey.deviceType}
                      </Badge>
                    </h4>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-xs text-muted-foreground">
                        Added: {new Date(passkey.createdAt).toLocaleDateString()}
                      </p>
                      {passkey.lastUsed && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Last used: {new Date(passkey.lastUsed).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Passkey</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove "{passkey.deviceName}"? You won't be able to use it to sign in anymore.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemovePasskey(passkey.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

