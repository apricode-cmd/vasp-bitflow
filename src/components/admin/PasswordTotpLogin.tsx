/**
 * Password + TOTP Login Component for Admins
 * 
 * Allows admins to login using password + authenticator app code
 * Only available if feature flag is enabled
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, AlertCircle, Smartphone } from 'lucide-react';

interface PasswordTotpLoginProps {
  email: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PasswordTotpLogin({ email, onSuccess, onError }: PasswordTotpLoginProps) {
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Get CSRF token from Admin NextAuth
  const getCsrfToken = async () => {
    try {
      const response = await fetch('/api/admin/auth/csrf');
      const data = await response.json();
      return data.csrfToken || '';
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLocalError(null);
    setIsLoading(true);

    try {
      console.log('🔐 Attempting Admin Password + TOTP login for:', email);

      // Get CSRF token
      const csrfToken = await getCsrfToken();

      // Call ADMIN NextAuth callback endpoint with password-totp provider
      const response = await fetch('/api/admin/auth/callback/password-totp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email,
          password,
          totpCode,
          csrfToken,
          callbackUrl: '/admin',
          json: 'true',
        }).toString(),
        credentials: 'include', // Critical: ensure cookies are sent and received
        redirect: 'manual', // Handle redirect manually to control timing
      });

      console.log('📊 Admin SignIn response:', { 
        status: response.status, 
        type: response.type,
        redirected: response.redirected 
      });

      // NextAuth returns 302 redirect on success (with Set-Cookie header)
      // Status 0 or 302 or type 'opaqueredirect' indicates success
      if (response.status === 0 || response.status === 302 || response.type === 'opaqueredirect') {
        console.log('✅ Admin login successful (302 redirect detected)');
        
        // Critical: Wait for cookie to be set and propagate
        console.log('⏳ Waiting for session cookie to be set...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create session record in database for tracking
        try {
          const trackingRes = await fetch('/api/admin/session/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: crypto.randomUUID(), // Generate unique session ID
              mfaMethod: 'TOTP',
            }),
          });

          if (trackingRes.ok) {
            console.log('✅ Session record created in database');
          } else {
            console.warn('⚠️ Failed to create session record (non-critical)');
          }
        } catch (error) {
          console.warn('⚠️ Session tracking error (non-critical):', error);
        }
        
        // Hard redirect to force full page reload with new session
        console.log('🔄 Redirecting to /admin...');
        window.location.href = '/admin';
        onSuccess();
        return;
      }

      // If not a redirect, check for errors
      if (!response.ok) {
        try {
          const result = await response.json();
          console.error('❌ Admin login error:', result);
          const errorMessage = result.error === 'CredentialsSignin' 
            ? 'Invalid password or TOTP code. Please try again.'
            : (result.error || 'Authentication failed');
          setLocalError(errorMessage);
          onError(errorMessage);
        } catch {
          setLocalError('Authentication failed. Please try again.');
          onError('Authentication failed');
        }
        return;
      }

      // If we got here with 200 OK, something unexpected happened
      console.warn('⚠️ Unexpected response (200 OK without redirect)');
      setLocalError('Unexpected authentication response. Please try again.');
      onError('Unexpected response');
    } catch (error) {
      console.error('❌ Admin login exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setLocalError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info */}
      <div className="text-sm text-blue-200/80 bg-blue-950/30 border border-blue-500/20 rounded-lg p-3">
        <p className="font-semibold mb-1">Password + Authenticator App</p>
        <p className="text-xs text-blue-200/60">
          Enter your password and 6-digit code from your authenticator app
        </p>
      </div>

      {/* Error Alert */}
      {localError && (
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-200">{localError}</AlertDescription>
        </Alert>
      )}

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-blue-100">
          Password
        </Label>
        <div className="relative">
          <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="current-password"
            className="h-11 pl-10 bg-slate-800/50 border-blue-500/30 text-white"
          />
        </div>
      </div>

      {/* TOTP Code Field */}
      <div className="space-y-2">
        <Label htmlFor="totpCode" className="text-blue-100">
          6-Digit Code
        </Label>
        <div className="relative">
          <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
          <Input
            id="totpCode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            value={totpCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ''); // Only digits
              setTotpCode(value);
            }}
            disabled={isLoading}
            required
            autoComplete="one-time-code"
            className="h-11 pl-10 bg-slate-800/50 border-blue-500/30 text-white text-center text-2xl tracking-widest"
          />
        </div>
        <p className="text-xs text-blue-200/50">
          Open your authenticator app to get the code
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-11 font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25"
        disabled={isLoading || !password || totpCode.length !== 6}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </Button>

      {/* Help Text */}
      <div className="text-center text-xs text-blue-200/50 mt-2">
        <p>Don't have authenticator app configured?</p>
        <p className="mt-1">Contact your administrator to set it up</p>
      </div>
    </form>
  );
}
