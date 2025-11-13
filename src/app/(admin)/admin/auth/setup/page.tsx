/**
 * Admin Setup Page
 * 
 * First-time setup for new admin - choose authentication method:
 * - Passkey (biometric/security key) - recommended
 * - Password + TOTP (2FA app) - alternative
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';
import { 
  Fingerprint, 
  Loader2, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Key,
  Smartphone,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import Image from 'next/image';

type AuthMethod = 'passkey' | 'password-totp';
type SetupStep = 'choose' | 'passkey-setup' | 'password-setup' | 'totp-verify' | 'complete';

interface AvailableMethods {
  passkeyAvailable: boolean;
  passwordTotpAvailable: boolean;
  defaultMethod: AuthMethod;
}

function SetupAuthContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  const [step, setStep] = useState<SetupStep>('choose');
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod>('password-totp');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [availableMethods, setAvailableMethods] = useState<AvailableMethods | null>(null);

  // Password + TOTP state
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpQr, setTotpQr] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Validate token and check available methods on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!email || !token) {
        setError('Invalid setup link. Please contact your administrator.');
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/auth/validate-setup-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token })
        });

        const result = await response.json();

        if (!response.ok) {
          if (result.alreadySetup || result.expired) {
            // Redirect to login if already setup or expired
            toast.error(result.error);
            setTimeout(() => {
              window.location.href = '/admin/auth/login';
            }, 2000);
            return;
          }
          setError(result.error || 'Invalid setup link');
        } else {
          // Set expiration time
          if (result.expiresAt) {
            setExpiresAt(result.expiresAt);
          }

          // Check available methods based on feature flags
          setAvailableMethods(result.availableMethods || {
            passkeyAvailable: true,
            passwordTotpAvailable: true,
            defaultMethod: 'password-totp'
          });

          // Set default method
          setSelectedMethod(result.availableMethods?.defaultMethod || 'password-totp');
        }

        setIsValidating(false);
      } catch (error) {
        console.error('Token validation error:', error);
        setError('Failed to validate setup link');
        setIsValidating(false);
      }
    };

    validateToken();
  }, [email, token]);

  // Update time remaining every second
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        setError('Setup link has expired. Please request a new invitation.');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Handle method choice
  const handleContinueWithMethod = () => {
    if (selectedMethod === 'passkey') {
      setStep('passkey-setup');
    } else {
      setStep('password-setup');
    }
  };

  // Passkey registration
  const handleRegisterPasskey = async () => {
    if (!email) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Get registration options
      const optionsResp = await fetch('/api/admin/passkey/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!optionsResp.ok) {
        const error = await optionsResp.json();
        throw new Error(error.error || 'Failed to get registration options');
      }

      const options = await optionsResp.json();

      // 2. Start WebAuthn registration
      let registrationResponse;
      try {
        registrationResponse = await startRegistration(options);
      } catch (error) {
        setIsLoading(false);
        return;
      }

      // 3. Get device name
      const deviceName = `${navigator.platform} - ${new Date().toLocaleDateString()}`;

      // 4. Verify registration
      const verifyResp = await fetch('/api/admin/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: registrationResponse,
          deviceName,
          email,
        }),
      });

      const result = await verifyResp.json();

      if (!verifyResp.ok || result.error) {
        throw new Error(result.error || 'Registration failed');
      }

      toast.success('Passkey registered successfully!');
      setStep('complete');

      // Wait 2 seconds then redirect to login
      setTimeout(() => {
        window.location.href = '/admin/auth/login';
      }, 2000);

    } catch (error) {
      console.error('Passkey registration error:', error);
      setError(error instanceof Error ? error.message : 'Failed to register passkey');
      setIsLoading(false);
    }
  };

  // Password + TOTP setup
  const handlePasswordSetup = async () => {
    if (!password || !passwordConfirm) {
      setError('Please fill in all password fields');
      return;
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to set password');
      }

      // Move to TOTP setup
      setTotpSecret(result.totpSecret);
      setTotpQr(result.totpQrCode);
      setStep('totp-verify');
      setIsLoading(false);

    } catch (error) {
      console.error('Password setup error:', error);
      setError(error instanceof Error ? error.message : 'Failed to set password');
      setIsLoading(false);
    }
  };

  // Verify TOTP code
  const handleVerifyTotp = async () => {
    if (!totpCode || totpCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/auth/verify-totp-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, totpCode }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Invalid code');
      }

      toast.success('TOTP verified successfully!');
      setStep('complete');

      // Wait 2 seconds then redirect to login
      setTimeout(() => {
        window.location.href = '/admin/auth/login';
      }, 2000);

    } catch (error) {
      console.error('TOTP verification error:', error);
      setError(error instanceof Error ? error.message : 'Failed to verify code');
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Card className="max-w-md border-blue-500/20 bg-slate-900/80">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-400 mb-4" />
            <p className="text-blue-200/70">Validating setup link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !email) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Card className="max-w-md border-red-500/20 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-red-400">Invalid Link</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Complete state
  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Card className="max-w-md border-green-500/20 bg-slate-900/80">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-400" />
            </div>
            <CardTitle className="text-green-400">Setup Complete!</CardTitle>
            <CardDescription className="text-blue-200/70">
              Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_50%)]" />
      
      <div className="w-full max-w-2xl space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-blue-600/20 backdrop-blur-sm flex items-center justify-center p-3 border border-blue-500/30">
              <Shield className="h-10 w-10 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Account Setup</h1>
            <p className="text-sm text-blue-200/70 mt-1">Choose your authentication method</p>
          </div>
        </div>

        {/* Main Card */}
        <Card className="border-blue-500/20 bg-slate-900/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {step !== 'choose' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('choose')}
                  className="mr-auto p-1 h-auto text-blue-300 hover:text-blue-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              {step === 'choose' && 'Choose Authentication Method'}
              {step === 'passkey-setup' && 'Setup Passkey'}
              {step === 'password-setup' && 'Create Password'}
              {step === 'totp-verify' && 'Setup 2FA Authenticator'}
            </CardTitle>
            <CardDescription className="text-blue-200/60 space-y-1">
              <div>Email: <span className="font-semibold text-blue-300">{email}</span></div>
              {timeRemaining && (
                <div className="text-xs">
                  Link expires in: <span className={`font-mono font-semibold ${timeRemaining === 'Expired' ? 'text-red-400' : 'text-amber-400'}`}>{timeRemaining}</span>
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Choose Method */}
            {step === 'choose' && availableMethods && (
              <div className="space-y-4">
                <RadioGroup value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as AuthMethod)}>
                  {availableMethods.passwordTotpAvailable && (
                    <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedMethod === 'password-totp' 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-slate-700 hover:border-slate-600'
                    }`} onClick={() => setSelectedMethod('password-totp')}>
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="password-totp" id="password-totp" className="mt-1" />
                        <Label htmlFor="password-totp" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 mb-2">
                            <Smartphone className="w-5 h-5 text-blue-400" />
                            <span className="font-semibold text-white">Password + Authenticator App</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">Recommended</span>
                          </div>
                          <p className="text-sm text-blue-200/70">
                            Use a strong password and a 2FA app (Google Authenticator, Microsoft Authenticator).
                            Works on any device, no need for biometric hardware.
                          </p>
                        </Label>
                      </div>
                    </div>
                  )}

                  {availableMethods.passkeyAvailable && (
                    <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedMethod === 'passkey' 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-slate-700 hover:border-slate-600'
                    }`} onClick={() => setSelectedMethod('passkey')}>
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="passkey" id="passkey" className="mt-1" />
                        <Label htmlFor="passkey" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 mb-2">
                            <Fingerprint className="w-5 h-5 text-green-400" />
                            <span className="font-semibold text-white">Passkey (Biometric / Security Key)</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-300">Most Secure</span>
                          </div>
                          <p className="text-sm text-blue-200/70">
                            Use Face ID, Touch ID, Windows Hello, or a hardware security key (YubiKey).
                            Recommended for SUPER_ADMIN role. Device-specific.
                          </p>
                        </Label>
                      </div>
                    </div>
                  )}
                </RadioGroup>

                <Button
                  onClick={handleContinueWithMethod}
                  className="w-full h-12 font-semibold bg-blue-600 hover:bg-blue-700"
                >
                  Continue
                </Button>

                <Alert className="border-blue-500/30 bg-blue-950/30">
                  <AlertCircle className="h-4 w-4 text-blue-400" />
                  <AlertTitle className="text-blue-100 text-sm">You can add more methods later</AlertTitle>
                  <AlertDescription className="text-blue-200/70 text-xs">
                    After setup, you can configure additional authentication methods in your security settings.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Step 2a: Passkey Setup */}
            {step === 'passkey-setup' && (
              <div className="space-y-4">
                <Alert className="border-blue-500/30 bg-blue-950/50">
                  <AlertCircle className="h-4 w-4 text-blue-400" />
                  <AlertTitle className="text-blue-100">What is a Passkey?</AlertTitle>
                  <AlertDescription className="text-blue-200/70 text-sm">
                    A passkey uses Face ID, Touch ID, or a security key to sign in. It's more secure than passwords and protects against phishing.
                  </AlertDescription>
                </Alert>

                <div className="text-sm text-blue-200/80 space-y-2">
                  <p className="font-semibold">Steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-200/60">
                    <li>Click "Register Passkey" below</li>
                    <li>Follow your device's prompt (Face ID / Touch ID)</li>
                    <li>Your passkey will be saved to this device</li>
                  </ol>
                </div>

                <Button
                  onClick={handleRegisterPasskey}
                  disabled={isLoading}
                  className="w-full h-12 font-semibold bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-5 h-5 mr-2" />
                      Register Passkey
                    </>
                  )}
                </Button>

                <div className="text-xs text-center text-blue-200/50 space-y-1">
                  <p>🔐 Your passkey never leaves this device</p>
                  <p>Protected by biometric authentication</p>
                </div>
              </div>
            )}

            {/* Step 2b: Password Setup */}
            {step === 'password-setup' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-blue-100">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 12 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 bg-slate-800/50 border-blue-500/30 text-white"
                      autoFocus
                    />
                    <p className="text-xs text-blue-300/60">
                      Recommended: Use a passphrase with 3+ words, numbers, and symbols
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password-confirm" className="text-blue-100">Confirm Password</Label>
                    <Input
                      id="password-confirm"
                      type="password"
                      placeholder="Re-enter password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="h-11 bg-slate-800/50 border-blue-500/30 text-white"
                    />
                  </div>
                </div>

                <Button
                  onClick={handlePasswordSetup}
                  disabled={isLoading}
                  className="w-full h-12 font-semibold bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Key className="w-5 h-5 mr-2" />
                      Continue to 2FA Setup
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step 3: TOTP Verify */}
            {step === 'totp-verify' && (
              <div className="space-y-4">
                <Alert className="border-blue-500/30 bg-blue-950/50">
                  <AlertCircle className="h-4 w-4 text-blue-400" />
                  <AlertTitle className="text-blue-100">Setup Authenticator App</AlertTitle>
                  <AlertDescription className="text-blue-200/70 text-sm">
                    Scan this QR code with Google Authenticator, Microsoft Authenticator, or any TOTP app.
                  </AlertDescription>
                </Alert>

                {totpQr && (
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg">
                      <Image src={totpQr} alt="TOTP QR Code" width={200} height={200} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="totp-code" className="text-blue-100">Enter 6-digit code from your app</Label>
                  <Input
                    id="totp-code"
                    type="text"
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-11 bg-slate-800/50 border-blue-500/30 text-white text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <Button
                  onClick={handleVerifyTotp}
                  disabled={isLoading || totpCode.length !== 6}
                  className="w-full h-12 font-semibold bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help */}
        <div className="text-center text-xs text-blue-300/50">
          <p>Having trouble? Contact your administrator</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    }>
      <SetupAuthContent />
    </Suspense>
  );
}
