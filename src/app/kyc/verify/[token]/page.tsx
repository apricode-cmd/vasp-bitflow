/**
 * White-Label KYC Verification Page
 * 
 * Full-screen Sumsub WebSDK wrapper for mobile verification
 * URL: https://app.bitflow.biz/kyc/verify/{token}
 * 
 * Benefits:
 * - Branded URL (app.bitflow.biz instead of sumsub.com)
 * - Full-screen mobile experience
 * - Same technology as desktop modal
 * - No external redirect needed
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface VerifyPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default function KycVerifyPage({ params }: VerifyPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Unwrap params
    params.then(p => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;

    const initializeSumsub = async () => {
      try {
        console.log('🔐 Initializing white-label KYC verification...');

        // 1. Verify token and get SDK token
        const response = await fetch(`/api/kyc/verify/${token}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Invalid verification link');
        }

        const { sdkToken, userId } = await response.json();

        console.log('✅ Token verified, loading Sumsub SDK...');

        // 2. Load Sumsub SDK script
        const loadScript = () => {
          return new Promise((resolve, reject) => {
            if (document.getElementById('sumsub-websdk-script')) {
              resolve(true);
              return;
            }
            const script = document.createElement('script');
            script.id = 'sumsub-websdk-script';
            script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error('Failed to load Sumsub SDK'));
            document.body.appendChild(script);
          });
        };

        await loadScript();

        // 3. Initialize WebSDK
        const snsWebSdk = (window as any).snsWebSdk;
        if (!snsWebSdk) {
          throw new Error('Sumsub SDK not loaded');
        }

        const instance = snsWebSdk
          .init(
            sdkToken,
            async () => {
              // Token refresh callback
              const refreshResponse = await fetch('/api/kyc/sdk-token');
              const refreshData = await refreshResponse.json();
              return refreshData.token;
            }
          )
          .withConf({
            lang: 'en',
            theme: 'light',
            // Mobile-optimized settings
            uiConf: {
              customCssStr: `
                body { margin: 0; padding: 0; }
                #sumsub-websdk-container { 
                  min-height: 100vh; 
                  width: 100vw;
                }
              `
            }
          })
          .on('idCheck.onApplicantSubmitted', () => {
            console.log('✅ Verification submitted');
            toast.success('Verification submitted! Redirecting...');
            
            // Redirect to success page after 2 seconds
            setTimeout(() => {
              router.push('/kyc?status=submitted');
            }, 2000);
          })
          .on('idCheck.onError', (error: any) => {
            console.error('❌ Verification error:', error);
            toast.error('Verification error: ' + (error.message || 'Unknown error'));
          })
          .on('idCheck.onApplicantLoaded', () => {
            console.log('📱 Applicant loaded');
            setLoading(false);
          })
          .build();

        // 4. Launch SDK in full-screen container
        instance.launch('#sumsub-websdk-container');

        console.log('🚀 Sumsub SDK launched');

      } catch (error: any) {
        console.error('❌ Initialization error:', error);
        setError(error.message || 'Failed to load verification');
        setLoading(false);
      }
    };

    initializeSumsub();
  }, [token, router]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Verification Error</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={() => router.push('/kyc')}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Return to KYC Page
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Loading Verification</h2>
            <p className="text-sm text-muted-foreground">
              Please wait while we prepare your verification...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Sumsub SDK container (full-screen)
  return (
    <div 
      id="sumsub-websdk-container" 
      className="min-h-screen w-full"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        zIndex: 9999 
      }}
    />
  );
}

