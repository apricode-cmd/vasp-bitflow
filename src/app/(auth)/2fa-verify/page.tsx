/**
 * 2FA Verification Page
 * 
 * Shown after successful password login if user has 2FA enabled
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, KeyRound, AlertCircle } from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { toast } from 'sonner';
import Link from 'next/link';

export default function TwoFactorVerifyPage(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackupCode, setIsBackupCode] = useState(false);

  if (!email) {
    router.push('/login');
    return <div>Redirecting...</div>;
  }

  const handleVerify = async (value: string) => {
    if (value.length !== 6 && value.length !== 9) return;

    setIsVerifying(true);
    setError(null);

    try {
      // Get password from sessionStorage (saved during login)
      const password = sessionStorage.getItem('2fa_password');
      
      if (!password) {
        setError('Session expired. Please login again.');
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      // Sign in with email, password, and 2FA code
      const result = await signIn('credentials', {
        email,
        password,
        twoFactorCode: value,
        redirect: false
      });

      if (result?.error) {
        setError('Invalid code. Please try again.');
        setCode('');
        setIsVerifying(false);
        return;
      }
      
      if (result?.ok) {
        // Clear sessionStorage after successful login
        sessionStorage.removeItem('2fa_email');
        sessionStorage.removeItem('2fa_password');
        
        toast.success('Login successful! Redirecting...');
        
        // Log the login to SystemLog
        try {
          await fetch('/api/auth/log-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          console.log('✅ Login logged to SystemLog');
        } catch (logError) {
          console.error('❌ Failed to log login:', logError);
          // Don't block login if logging fails
        }
        
        // Wait a bit for session to be fully established
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Get session to determine redirect
        const sessionResponse = await fetch('/api/auth/session');
        const session = await sessionResponse.json();
        
        console.log('✅ Session retrieved:', session?.user?.role);
        
        // Redirect based on role using window.location for hard redirect
        if (session?.user?.role === 'ADMIN') {
          console.log('🔄 Redirecting to /admin');
          window.location.href = '/admin';
        } else {
          console.log('🔄 Redirecting to /dashboard');
          window.location.href = '/dashboard';
        }
      }
    } catch (error) {
      console.error('❌ 2FA verification error:', error);
      setError('An error occurred. Please try again.');
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>
              {isBackupCode 
                ? 'Enter your 8-character backup code'
                : 'Enter the 6-digit code from your authenticator app'
              }
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isBackupCode ? (
            // TOTP Code Input (6 digits)
            <div className="flex flex-col items-center space-y-4">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  if (value.length === 6) {
                    handleVerify(value);
                  }
                }}
                disabled={isVerifying}
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

              {isVerifying && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </div>
              )}
            </div>
          ) : (
            // Backup Code Input (8 characters with dash)
            <div className="flex flex-col items-center space-y-4">
              <InputOTP
                maxLength={9}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  if (value.length === 9) {
                    handleVerify(value);
                  }
                }}
                disabled={isVerifying}
                pattern="[A-Z0-9-]+"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                  <InputOTPSlot index={6} />
                  <InputOTPSlot index={7} />
                  <InputOTPSlot index={8} />
                </InputOTPGroup>
              </InputOTP>

              {isVerifying && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </div>
              )}
            </div>
          )}

          <div className="text-center space-y-3">
            <button
              type="button"
              onClick={() => {
                setIsBackupCode(!isBackupCode);
                setCode('');
                setError(null);
              }}
              className="text-sm text-muted-foreground hover:text-primary transition flex items-center gap-2 mx-auto"
              disabled={isVerifying}
            >
              <KeyRound className="h-3 w-3" />
              {isBackupCode ? 'Use authenticator code' : 'Use backup code instead'}
            </button>

            <div className="pt-2 border-t">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-primary transition"
              >
                ← Back to login
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

