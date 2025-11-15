/**
 * Sumsub WebSDK Component
 * 
 * Embeds Sumsub identity verification SDK in client UI
 * Handles token fetching, SDK initialization, and event handling
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { BrandLoaderInline } from '@/components/ui/brand-loader';
import { Loader2, RefreshCw } from 'lucide-react';

interface SumsubWebSDKProps {
  userId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

// Extend Window interface for Sumsub SDK
declare global {
  interface Window {
    snsWebSdk?: any;
  }
}

export function SumsubWebSDK({ userId, onComplete, onError }: SumsubWebSDKProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdkInstance, setSdkInstance] = useState<any>(null);

  useEffect(() => {
    loadSumsubSDK();
    
    // Cleanup on unmount
    return () => {
      if (sdkInstance) {
        try {
          sdkInstance.destroy?.();
        } catch (e) {
          console.error('Error destroying SDK:', e);
        }
      }
    };
  }, [userId]);

  const loadSumsubSDK = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🎫 Fetching Sumsub SDK token...');

      // 1. Fetch access token from backend
      const response = await fetch('/api/kyc/sdk-token');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get SDK token');
      }

      const { token, applicantId } = await response.json();

      console.log('✅ SDK token received');

      // 2. Load Sumsub WebSDK script
      await loadSDKScript();

      // 3. Initialize WebSDK
      if (!window.snsWebSdk) {
        throw new Error('Sumsub SDK not loaded');
      }

      console.log('🚀 Initializing Sumsub WebSDK...');

      const instance = window.snsWebSdk
        .init(
          token,
          // Token refresh callback (called when token expires)
          async () => {
            console.log('🔄 Refreshing SDK token...');
            const refreshResponse = await fetch('/api/kyc/sdk-token');
            const refreshData = await refreshResponse.json();
            return refreshData.token;
          }
        )
        .withConf({
          lang: 'en', // Language
          theme: 'light', // Theme: 'light' or 'dark'
          
          // Event callbacks
          onMessage: (type: string, payload: any) => {
            console.log('📨 Sumsub message:', type, payload);
          },
          
          onError: (error: any) => {
            console.error('❌ Sumsub error:', error);
            const errorMessage = error.message || error.description || 'Verification error';
            setError(errorMessage);
            onError?.(errorMessage);
          }
        })
        .on('idCheck.onStepCompleted', (payload: any) => {
          console.log('✅ Step completed:', payload);
        })
        .on('idCheck.onApplicantSubmitted', (payload: any) => {
          console.log('🎉 Applicant submitted:', payload);
          setLoading(false);
          onComplete?.();
        })
        .on('idCheck.onApplicantLoaded', (payload: any) => {
          console.log('👤 Applicant loaded:', payload);
          setLoading(false);
        })
        .on('idCheck.applicantStatus', (payload: any) => {
          console.log('📊 Applicant status:', payload);
        })
        .build();

      // 4. Launch SDK in container
      if (containerRef.current) {
        instance.launch(containerRef.current);
        setSdkInstance(instance);
        console.log('✅ Sumsub WebSDK launched');
      }
    } catch (err: any) {
      console.error('❌ Sumsub SDK error:', err);
      const errorMessage = err.message || 'Failed to load verification';
      setError(errorMessage);
      setLoading(false);
      onError?.(errorMessage);
    }
  };

  const loadSDKScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if script already loaded
      if (document.getElementById('sumsub-websdk-script')) {
        resolve();
        return;
      }

      // Load script
      const script = document.createElement('script');
      script.id = 'sumsub-websdk-script';
      script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';
      script.async = true;
      
      script.onload = () => {
        console.log('✅ Sumsub SDK script loaded');
        resolve();
      };
      
      script.onerror = () => {
        console.error('❌ Failed to load Sumsub SDK script');
        reject(new Error('Failed to load Sumsub SDK script'));
      };
      
      document.body.appendChild(script);
    });
  };

  const handleRetry = () => {
    setError(null);
    loadSumsubSDK();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Identity Verification</CardTitle>
        <CardDescription>
          Complete your identity verification using Sumsub. 
          You'll need to provide a valid ID document and take a selfie.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !error && (
          <BrandLoaderInline text="Loading verification interface..." size="md" />
        )}

        {error && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={handleRetry} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* SDK Container */}
        <div 
          ref={containerRef} 
          className="min-h-[600px] w-full"
          style={{ display: error ? 'none' : 'block' }}
        />
      </CardContent>
    </Card>
  );
}

