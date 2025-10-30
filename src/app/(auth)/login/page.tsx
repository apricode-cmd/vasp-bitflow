/**
 * Login Page
 * 
 * User login form with email and password.
 */

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { toast } from 'sonner';
import { Loader2, LogIn } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLogo } from '@/components/features/BrandLogo';

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    // Prevent multiple submissions
    if (isLoading || isRedirecting) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, check if user has 2FA enabled
      // We need to verify password first, then check 2FA status
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false
      });

      // If login failed, check if it might be due to 2FA
      if (result?.error) {
        // Try to check 2FA status for this user
        try {
          const checkResponse = await fetch('/api/auth/check-2fa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: data.email, password: data.password })
          });
          
          const checkData = await checkResponse.json();
          
          if (checkData.requires2FA) {
            // User has 2FA enabled, redirect to 2FA page
            router.push(`/2fa-verify?email=${encodeURIComponent(data.email)}`);
            return;
          }
        } catch (e) {
          // Ignore check error, show original error
        }
        
        setError('Invalid email or password. Please try again.');
        setIsLoading(false);
        return;
      }

      // Mark as redirecting to prevent further submissions
      setIsRedirecting(true);

      // Success - get session to determine redirect
      const sessionResponse = await fetch('/api/auth/session');
      const session = await sessionResponse.json();

      // Log the login to SystemLog (MUST complete before redirect)
      try {
        await fetch('/api/auth/log-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        console.log('Login logged to SystemLog');
      } catch (logError) {
        console.error('Failed to log login:', logError);
        // Don't block login if logging fails
      }

      // Show success message
      toast.success('Login successful! Redirecting...');
      
      // Wait for session to be fully established
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect based on role (ADMIN → /admin, CLIENT → /dashboard)
      if (session?.user?.role === 'ADMIN') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
      setIsRedirecting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Branded Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.4)_0%,hsl(var(--primary)/0.25)_20%,hsl(var(--background))_60%,hsl(var(--background))_100%)] dark:bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.6)_0%,hsl(var(--primary)/0.35)_20%,hsl(var(--background))_60%,hsl(var(--background))_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.15)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.25)_0%,transparent_50%)]" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo & Brand */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 backdrop-blur-sm flex items-center justify-center p-3 border border-primary/20 shadow-lg shadow-primary/10">
              <BrandLogo size={64} priority />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              Sign In to Your Account
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back! Enter your credentials to continue</p>
          </div>
        </div>

        {/* Login Form Card */}
        <Card className="border-primary/10 shadow-xl shadow-primary/5">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              <LogIn className="h-5 w-5 text-primary" />
              Sign In
            </CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          disabled={isLoading}
                          className="h-11"
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          disabled={isLoading}
                          className="h-11"
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
                  className="w-full h-11 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" 
                  disabled={isLoading || isRedirecting}
                >
                  {isRedirecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Redirecting...
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <Separator className="my-6" />

            {/* Register Link */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don&apos;t have an account?</span>{' '}
              <Link
                href="/register"
                className="text-primary hover:underline font-semibold inline-flex items-center gap-1 transition-colors"
              >
                Register here
                <span className="text-xs">→</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center">
          <Link 
            href="/" 
            className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
          >
            <span className="text-xs">←</span>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

