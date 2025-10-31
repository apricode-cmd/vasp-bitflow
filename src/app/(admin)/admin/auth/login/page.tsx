/**
 * Admin Login Page
 * 
 * Separate login for administrators
 * Supports: Passkeys (primary) + Password + TOTP (fallback)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { toast } from 'sonner';
import { Loader2, Shield, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PasskeyLoginButton } from '@/components/admin/PasskeyLoginButton';

export default function AdminLoginPage(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);

    try {
      // Manually call admin auth endpoint (not using next-auth/react signIn)
      const response = await fetch('/api/admin/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          callbackUrl: '/admin',
          json: true
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setError('Invalid credentials. Please try again.');
        setIsLoading(false);
        return;
      }

      toast.success('Login successful!');
      
      // Wait for session
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Redirect to admin dashboard
      window.location.href = '/admin';
    } catch (error) {
      console.error('❌ Admin login error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
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
            <p className="text-sm text-blue-200/70 mt-1">Secure access for administrators</p>
          </div>
        </div>

        {/* Login Form Card */}
        <Card className="border-blue-500/20 shadow-2xl shadow-blue-500/10 bg-slate-900/80 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2 text-white">
              <KeyRound className="h-5 w-5 text-blue-400" />
              Authenticate
            </CardTitle>
            <CardDescription className="text-blue-200/60">
              Enter your administrator credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
                    <AlertDescription className="text-red-200">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-100">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@apricode.io"
                          autoComplete="email"
                          disabled={isLoading}
                          className="h-11 bg-slate-800/50 border-blue-500/30 text-white placeholder:text-slate-400"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password Field */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-100">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          disabled={isLoading}
                          className="h-11 bg-slate-800/50 border-blue-500/30 text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-11 font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Sign In with Password
                    </>
                  )}
                </Button>

                {/* Separator */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full bg-blue-500/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900 px-2 text-blue-300/50">Or</span>
                  </div>
                </div>

                {/* Passkey Login Button */}
                <PasskeyLoginButton
                  onSuccess={() => {
                    window.location.href = '/admin';
                  }}
                  onError={(err) => {
                    setError(err);
                  }}
                />

                {/* Info */}
                <div className="text-center text-xs text-blue-200/50 mt-4">
                  <p>🔐 This is a secure admin area</p>
                  <p className="mt-1">Passkey = Face ID / Touch ID (recommended)</p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Emergency Access */}
        <div className="text-center">
          <a 
            href="/admin/auth/emergency" 
            className="text-xs text-blue-300/60 hover:text-blue-300 transition-colors"
          >
            Emergency Break-glass Access →
          </a>
        </div>
      </div>
    </div>
  );
}

