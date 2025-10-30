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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, KeyRound, AlertCircle } from 'lucide-react';
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('Please enter the code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Sign in with 2FA code
      const result = await signIn('credentials', {
        email,
        twoFactorCode: code,
        redirect: false
      });

      if (result?.error) {
        setError(result.error);
        setCode('');
      } else if (result?.ok) {
        toast.success('Login successful!');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      setError('An error occurred. Please try again.');
    } finally {
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
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">
                {isBackupCode ? 'Backup Code' : 'Authentication Code'}
              </Label>
              <Input
                id="code"
                type="text"
                inputMode={isBackupCode ? 'text' : 'numeric'}
                maxLength={isBackupCode ? 9 : 6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9A-Z-]/gi, '').toUpperCase())}
                placeholder={isBackupCode ? 'XXXX-XXXX' : '000000'}
                className="text-center text-2xl tracking-widest font-mono"
                autoFocus
                disabled={isVerifying}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isVerifying || !code.trim()}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Verify & Continue
                </>
              )}
            </Button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => setIsBackupCode(!isBackupCode)}
                className="text-sm text-muted-foreground hover:text-primary transition"
              >
                <KeyRound className="inline h-3 w-3 mr-1" />
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

