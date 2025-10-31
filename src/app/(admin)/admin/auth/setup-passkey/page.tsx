/**
 * Setup Passkey Page
 * 
 * First-time setup for new admin - register Passkey
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, Loader2, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

function SetupPasskeyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email || !token) {
      setError('Invalid setup link. Please contact your administrator.');
    }
  }, [email, token]);

  const handleRegisterPasskey = async () => {
    if (!email) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Get registration options
      const optionsResp = await fetch('/api/admin/passkey/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }), // Pass email for first-time setup
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
        console.log('User cancelled registration:', error);
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
          email, // Pass email for first-time setup
        }),
      });

      const result = await verifyResp.json();

      if (!verifyResp.ok || result.error) {
        throw new Error(result.error || 'Registration failed');
      }

      toast.success('Passkey registered successfully!');
      setIsRegistered(true);

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

  if (isRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Card className="max-w-md border-green-500/20 bg-slate-900/80">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-400" />
            </div>
            <CardTitle className="text-green-400">Passkey Registered!</CardTitle>
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
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-blue-600/20 backdrop-blur-sm flex items-center justify-center p-3 border border-blue-500/30">
              <Shield className="h-10 w-10 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Setup Passkey</h1>
            <p className="text-sm text-blue-200/70 mt-1">Passwordless admin access</p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="border-blue-500/30 bg-blue-950/50 backdrop-blur">
          <AlertCircle className="h-4 w-4 text-blue-400" />
          <AlertTitle className="text-blue-100">What is a Passkey?</AlertTitle>
          <AlertDescription className="text-blue-200/70 text-sm">
            A passkey uses Face ID, Touch ID, or a security key to sign in. It's more secure than passwords and protects against phishing.
          </AlertDescription>
        </Alert>

        {/* Setup Card */}
        <Card className="border-blue-500/20 bg-slate-900/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Register Your Device</CardTitle>
            <CardDescription className="text-blue-200/60">
              Email: <span className="font-semibold text-blue-300">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
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
            </div>

            <div className="text-xs text-center text-blue-200/50 space-y-1">
              <p>🔐 Your passkey never leaves this device</p>
              <p>Protected by biometric authentication</p>
            </div>
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

export default function SetupPasskeyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    }>
      <SetupPasskeyContent />
    </Suspense>
  );
}

