/**
 * Two-Factor Authentication Management Component
 * 
 * Allows users to enable/disable TOTP 2FA, view QR code, and manage backup codes
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { 
  Shield, Smartphone, Key, QrCode, Copy, CheckCircle, 
  Loader2, AlertCircle, Lock, Fingerprint 
} from 'lucide-react';
import { toast } from 'sonner';

interface TwoFactorStatus {
  totpEnabled: boolean;
  totpVerifiedAt: Date | null;
  remainingBackupCodes: number;
}

export function TwoFactorAuth(): React.ReactElement {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Setup states
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<'qr' | 'verify'>('qr');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [base32Secret, setBase32Secret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  
  // Disable states
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  
  // Backup codes states
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState('');
  
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/2fa/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus({
          totpEnabled: data.totpEnabled,
          totpVerifiedAt: data.totpVerifiedAt,
          remainingBackupCodes: data.remainingBackupCodes
        });
      }
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupStart = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/2fa/setup', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setBase32Secret(data.base32);
        setShowSetup(true);
        setSetupStep('qr');
      } else {
        toast.error(data.error || 'Failed to setup 2FA');
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerify = async (code: string) => {
    if (code.length !== 6) return;
    
    setProcessing(true);
    try {
      const response = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, code })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBackupCodes(data.backupCodes);
        setSetupStep('verify');
        toast.success('2FA enabled successfully!');
        await fetchStatus();
      } else {
        toast.error(data.error || 'Invalid code');
        setVerifyCode('');
      }
    } catch (error) {
      console.error('Verify error:', error);
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword) {
      toast.error('Please enter your password');
      return;
    }
    
    setProcessing(true);
    try {
      const response = await fetch('/api/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('2FA disabled');
        setShowDisable(false);
        setDisablePassword('');
        await fetchStatus();
      } else {
        toast.error(data.error || 'Failed to disable 2FA');
      }
    } catch (error) {
      console.error('Disable error:', error);
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!regeneratePassword) {
      toast.error('Please enter your password');
      return;
    }
    
    setProcessing(true);
    try {
      const response = await fetch('/api/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: regeneratePassword })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBackupCodes(data.backupCodes);
        toast.success('New backup codes generated');
        setRegeneratePassword('');
        await fetchStatus();
      } else {
        toast.error(data.error || 'Failed to regenerate codes');
      }
    } catch (error) {
      console.error('Regenerate error:', error);
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* TOTP 2FA */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Authenticator App (TOTP)</CardTitle>
                <CardDescription>
                  Use Google Authenticator, Authy, or similar apps
                </CardDescription>
              </div>
            </div>
            {status?.totpEnabled ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.totpEnabled ? (
            <>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Two-factor authentication is protecting your account. You have{' '}
                  <strong>{status.remainingBackupCodes}</strong> backup codes remaining.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowBackupCodes(true)}
                  className="flex-1"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Regenerate Backup Codes
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDisable(true)}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Disable 2FA
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  Add an extra layer of security to your account by requiring a code from your
                  authenticator app in addition to your password.
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Download Google Authenticator or Authy</li>
                  <li>Scan QR code to link your account</li>
                  <li>Enter verification code to enable</li>
                </ul>
              </div>

              <Button
                onClick={handleSetupStart}
                disabled={processing}
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Enable 2FA
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Passkeys - Coming Soon */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Coming Soon
          </Badge>
        </div>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-muted-foreground">Passkeys (WebAuthn)</CardTitle>
              <CardDescription>
                Sign in with Face ID, Touch ID, or security keys
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Passwordless authentication using biometrics or hardware security keys.
            This feature will be available soon.
          </p>
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-md">
          {setupStep === 'qr' ? (
            <>
              <DialogHeader>
                <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
                <DialogDescription>
                  Scan this QR code with your authenticator app
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* QR Code */}
                {qrCode && (
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}

                {/* Manual Entry */}
                <div className="space-y-2">
                  <Label className="text-xs">Or enter this code manually:</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                      {base32Secret}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(base32Secret)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Verify Code */}
                <div className="space-y-4">
                  <Label>Enter 6-digit code from your app:</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={verifyCode}
                      onChange={(value) => {
                        setVerifyCode(value);
                        if (value.length === 6) {
                          handleVerify(value);
                        }
                      }}
                      disabled={processing}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {processing && (
                    <p className="text-center text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin inline mr-2" />
                      Verifying...
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-green-600">
                  <CheckCircle className="h-5 w-5 inline mr-2" />
                  2FA Enabled Successfully!
                </DialogTitle>
                <DialogDescription>
                  Save these backup codes in a secure place
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    These codes can be used to access your account if you lose your device.
                    Each code can only be used once.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <code>{code}</code>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => copyToClipboard(backupCodes.join('\n'))}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All Codes
                </Button>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setShowSetup(false);
                    setSetupStep('qr');
                    setVerifyCode('');
                    setBackupCodes([]);
                  }}
                  className="w-full"
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisable} onOpenChange={setShowDisable}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your password to confirm
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Disabling 2FA will make your account less secure.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="disable-password">Password</Label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisable(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={processing || !disablePassword}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disabling...
                </>
              ) : (
                'Disable 2FA'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Backup Codes</DialogTitle>
            <DialogDescription>
              Enter your password to generate new backup codes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {backupCodes.length === 0 ? (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This will invalidate all your old backup codes.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="regenerate-password">Password</Label>
                  <Input
                    id="regenerate-password"
                    type="password"
                    value={regeneratePassword}
                    onChange={(e) => setRegeneratePassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
              </>
            ) : (
              <>
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    New backup codes generated successfully!
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <code>{code}</code>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => copyToClipboard(backupCodes.join('\n'))}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All Codes
                </Button>
              </>
            )}
          </div>

          <DialogFooter>
            {backupCodes.length === 0 ? (
              <>
                <Button variant="outline" onClick={() => setShowBackupCodes(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerateBackupCodes}
                  disabled={processing || !regeneratePassword}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate New Codes'
                  )}
                </Button>
              </>
            ) : (
              <Button
                className="w-full"
                onClick={() => {
                  setShowBackupCodes(false);
                  setBackupCodes([]);
                  setRegeneratePassword('');
                }}
              >
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

