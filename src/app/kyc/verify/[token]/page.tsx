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
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface VerifyPageProps {
  params: {
    token: string;
  };
}

export default function KycVerifyPage({ params }: VerifyPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const token = params.token;

  useEffect(() => {
    if (!token) return;

    // Set full-screen styles IMMEDIATELY (before SDK loads)
    document.documentElement.style.height = '100%';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.width = '100%';

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
            // Check if already loaded
            if ((window as any).snsWebSdk) {
              console.log('✅ Sumsub SDK already loaded');
              resolve(true);
              return;
            }
            
            // Check if script tag exists
            if (document.getElementById('sumsub-websdk-script')) {
              // Wait for SDK to be available on window
              let attempts = 0;
              const checkSdk = setInterval(() => {
                attempts++;
                if ((window as any).snsWebSdk) {
                  clearInterval(checkSdk);
                  console.log('✅ Sumsub SDK found after waiting');
                  resolve(true);
                } else if (attempts > 50) { // 5 seconds timeout
                  clearInterval(checkSdk);
                  reject(new Error('Sumsub SDK timeout'));
                }
              }, 100);
              return;
            }
            
            // Load new script
            const script = document.createElement('script');
            script.id = 'sumsub-websdk-script';
            script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';
            script.async = true;
            script.onload = () => {
              console.log('📦 Sumsub script loaded, waiting for SDK...');
              // Wait for SDK to be available on window
              let attempts = 0;
              const checkSdk = setInterval(() => {
                attempts++;
                if ((window as any).snsWebSdk) {
                  clearInterval(checkSdk);
                  console.log('✅ Sumsub SDK initialized');
                  resolve(true);
                } else if (attempts > 50) { // 5 seconds timeout
                  clearInterval(checkSdk);
                  reject(new Error('Sumsub SDK not initialized after script load'));
                }
              }, 100);
            };
            script.onerror = () => reject(new Error('Failed to load Sumsub SDK script'));
            document.body.appendChild(script);
          });
        };

        await loadScript();

        console.log('✅ Sumsub SDK ready');

        // 3. Wait for container to be in DOM
        setLoading(false); // Show container
        setSdkReady(true);  // Signal to launch SDK
        
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 200));

        // 4. Check if container exists
        const container = document.getElementById('sumsub-websdk-container');
        if (!container) {
          throw new Error('SDK container not found in DOM');
        }

        console.log('✅ Container found, initializing SDK...');

        // 5. Initialize WebSDK
        const snsWebSdk = (window as any).snsWebSdk;
        if (!snsWebSdk) {
          throw new Error('Sumsub SDK object not available on window');
        }

        const instance = snsWebSdk
          .init(
            sdkToken,
            async () => {
              // Token refresh callback - use white-label token to get new SDK token
              console.log('🔄 Refreshing SDK token via white-label...');
              const refreshResponse = await fetch(`/api/kyc/verify/${token}`);
              
              if (!refreshResponse.ok) {
                console.error('❌ Failed to refresh SDK token');
                throw new Error('Failed to refresh verification token');
              }
              
              const refreshData = await refreshResponse.json();
              console.log('✅ SDK token refreshed');
              return refreshData.sdkToken;
            }
          )
          .withConf({
            lang: 'en',
            theme: 'light',
            uiConf: {
              customCssStr: `
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                  height: 100% !important;
                }
                
                #sumsub-websdk-container { 
                  width: 100% !important;
                  min-height: 100vh !important;
                  min-height: -webkit-fill-available !important;
                  overflow-y: auto !important;
                  overflow-x: hidden !important;
                  -webkit-overflow-scrolling: touch !important;
                }
                
                iframe {
                  width: 100% !important;
                  min-height: 100vh !important;
                  border: none !important;
                }
              `
            }
          })
          .on('idCheck.onApplicantSubmitted', () => {
            console.log('✅ Verification submitted');
            toast.success('Verification submitted successfully!');
            setSuccess(true);
          })
          .on('idCheck.onError', (error: any) => {
            console.error('❌ Verification error:', error);
            toast.error('Verification error: ' + (error.message || 'Unknown error'));
          })
          .on('idCheck.onApplicantLoaded', () => {
            console.log('📱 Applicant loaded');
          })
          .build();

        // 6. Launch SDK in full-screen container
        instance.launch('#sumsub-websdk-container');

        console.log('🚀 Sumsub SDK launched successfully');

      } catch (error: any) {
        console.error('❌ Initialization error:', error);
        setError(error.message || 'Failed to load verification');
        setLoading(false);
        setSdkReady(false);
      }
    };

    initializeSumsub();

    // Cleanup function to restore body styles on unmount
    return () => {
      document.documentElement.style.cssText = '';
      document.body.style.cssText = '';
    };
  }, [token, router]);

  // Success state
  if (success) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-background p-4"
      >
        <div className="max-w-md w-full space-y-6 text-center px-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-500/10 p-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold">Verification Submitted!</h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Thank you for completing the verification process.
            </p>
            <p className="text-sm text-muted-foreground">
              Your documents are being reviewed. You will receive an email notification once the review is complete.
            </p>
          </div>
          <div className="pt-4">
            <p className="text-xs text-muted-foreground">
              You can safely close this window now.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-background p-4"
      >
        <div className="max-w-md w-full space-y-4 text-center px-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold">Verification Error</h1>
            <p className="text-sm sm:text-base text-muted-foreground break-words">{error}</p>
          </div>
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              Please contact support if this issue persists.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-background"
      >
        <div className="text-center space-y-4 px-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-semibold">Loading Verification</h2>
            <p className="text-sm text-muted-foreground">
              Please wait while we prepare your verification...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Sumsub SDK container (scrollable)
  return (
    <div 
      id="sumsub-websdk-container" 
      style={{ 
        width: '100%',
        minHeight: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        backgroundColor: '#ffffff'
      }}
    />
  );
}

