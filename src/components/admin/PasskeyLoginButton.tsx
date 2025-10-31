/**
 * Passkey Login Button Component
 * 
 * Handles passkey authentication flow
 */

'use client';

import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PasskeyLoginButtonProps {
  email: string; // Email is REQUIRED for production security
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PasskeyLoginButton({ email, onSuccess, onError }: PasskeyLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePasskeyLogin = async () => {
    setIsLoading(true);

    try {
      // 1. Get authentication challenge with email
      const challengeResp = await fetch('/api/admin/passkey/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }), // Pass email to get admin-specific challenge
      });

      if (!challengeResp.ok) {
        throw new Error('Failed to get challenge');
      }

      const challengeOptions = await challengeResp.json();

      // 2. Start WebAuthn authentication
      let authResponse;
      try {
        authResponse = await startAuthentication(challengeOptions);
      } catch (error) {
        // User cancelled or no passkey available
        console.log('WebAuthn cancelled:', error);
        setIsLoading(false);
        return;
      }

      // 3. Verify authentication
      const verifyResp = await fetch('/api/admin/passkey/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: authResponse,
        }),
      });

      const result = await verifyResp.json();

      if (!verifyResp.ok || result.error) {
        onError(result.error || 'Passkey authentication failed');
        setIsLoading(false);
        return;
      }

      toast.success('Passkey authentication successful!');
      
      // Wait for session
      await new Promise(resolve => setTimeout(resolve, 300));
      
      onSuccess();
    } catch (error) {
      console.error('Passkey login error:', error);
      onError('Failed to authenticate with passkey');
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-11 font-semibold border-blue-400/50 hover:bg-blue-500/10 hover:border-blue-400"
      onClick={handlePasskeyLogin}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Authenticating...
        </>
      ) : (
        <>
          <Fingerprint className="w-4 h-4 mr-2" />
          Sign in with Passkey
        </>
      )}
    </Button>
  );
}

