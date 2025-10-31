/**
 * Admin Login Page
 * 
 * Passwordless authentication for administrators
 * Primary: Passkey (Face ID / Touch ID)
 * Alternative: SSO (Google Workspace / Azure AD)
 * Emergency: Break-glass access (separate page)
 * 
 * Compliant with: PSD2/SCA, DORA, AML best practices
 */

'use client';

import { useState } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasskeyLoginButton } from '@/components/admin/PasskeyLoginButton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function AdminLoginPage(): React.ReactElement {
  const [error, setError] = useState<string | null>(null);

  const handleSSOLogin = async (provider: 'google' | 'microsoft') => {
    // TODO: Implement SSO login
    alert(`SSO login with ${provider} - coming soon`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_50%)]" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo & Brand */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-blue-600/20 backdrop-blur-sm flex items-center justify-center p-3 border border-blue-500/30 shadow-lg shadow-blue-500/20">
              <Shield className="h-10 w-10 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              Admin Login
            </h1>
            <p className="text-sm text-blue-200/70 mt-1">Secure passwordless access</p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="border-blue-500/30 bg-blue-950/50 backdrop-blur">
          <AlertCircle className="h-4 w-4 text-blue-400" />
          <AlertTitle className="text-blue-100">Passwordless Authentication</AlertTitle>
          <AlertDescription className="text-blue-200/70 text-sm">
            Administrators use Face ID, Touch ID, or corporate SSO. No passwords required.
          </AlertDescription>
        </Alert>

        {/* Login Card */}
        <Card className="border-blue-500/20 shadow-2xl shadow-blue-500/10 bg-slate-900/80 backdrop-blur">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl text-white">
              Choose Authentication Method
            </CardTitle>
            <CardDescription className="text-blue-200/60">
              Phishing-resistant authentication (PSD2/SCA compliant)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}

            {/* Passkey Login - PRIMARY */}
            <div className="space-y-2">
              <div className="text-xs text-blue-300/70 uppercase font-semibold tracking-wider text-center">
                Recommended
              </div>
              <PasskeyLoginButton
                onSuccess={() => {
                  window.location.href = '/admin';
                }}
                onError={(err) => {
                  setError(err);
                }}
              />
              <p className="text-xs text-center text-blue-200/50">
                Face ID • Touch ID • Security Key
              </p>
            </div>

            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full bg-blue-500/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-blue-300/50">Or</span>
              </div>
            </div>

            {/* SSO Options */}
            <div className="space-y-2">
              <div className="text-xs text-blue-300/70 uppercase font-semibold tracking-wider text-center">
                Corporate SSO
              </div>
              
              {/* Google Workspace */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 font-semibold border-blue-400/30 hover:bg-blue-500/10 hover:border-blue-400"
                onClick={() => handleSSOLogin('google')}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google Workspace
              </Button>

              {/* Azure AD / Microsoft */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 font-semibold border-blue-400/30 hover:bg-blue-500/10 hover:border-blue-400"
                onClick={() => handleSSOLogin('microsoft')}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#f25022" d="M1 1h10v10H1z"/>
                  <path fill="#00a4ef" d="M13 1h10v10H13z"/>
                  <path fill="#7fba00" d="M1 13h10v10H1z"/>
                  <path fill="#ffb900" d="M13 13h10v10H13z"/>
                </svg>
                Microsoft / Azure AD
              </Button>
            </div>

            {/* Info */}
            <div className="text-center text-xs text-blue-200/50 mt-4 space-y-1">
              <p>🔐 Passwordless authentication</p>
              <p>Protected against phishing attacks</p>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Access */}
        <div className="text-center space-y-2">
          <p className="text-xs text-blue-300/50">
            Lost access to all authentication methods?
          </p>
          <a 
            href="/admin/auth/emergency" 
            className="text-xs text-red-400/80 hover:text-red-400 transition-colors font-semibold"
          >
            🚨 Emergency Break-glass Access
          </a>
        </div>
      </div>
    </div>
  );
}
