/**
 * Emergency Break-glass Access Page
 * 
 * Special emergency login for critical situations
 * Uses BreakGlassUser credentials stored in secure vault
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AlertTriangle, Shield, KeyRound, Loader2 } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const emergencyLoginSchema = z.object({
  username: z.string().min(3, 'Username required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  totpCode: z.string().length(6, 'TOTP code must be 6 digits'),
});

type EmergencyLoginInput = z.infer<typeof emergencyLoginSchema>;

export default function EmergencyAccessPage(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<EmergencyLoginInput>({
    resolver: zodResolver(emergencyLoginSchema),
    defaultValues: {
      username: '',
      password: '',
      totpCode: '',
    },
  });

  const onSubmit = async (data: EmergencyLoginInput) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement break-glass authentication
      const response = await fetch('/api/admin/auth/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error || 'Invalid emergency credentials');
        setIsLoading(false);
        return;
      }

      toast.success('Emergency access granted');
      
      // Wait for session
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Redirect to admin dashboard
      window.location.href = '/admin';
    } catch (error) {
      console.error('❌ Emergency access error:', error);
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 bg-gradient-to-br from-red-950 via-orange-950 to-red-950">
      {/* Warning overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.15)_0%,transparent_50%)]" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Emergency Warning */}
        <Alert variant="destructive" className="border-red-600 bg-red-950/80 backdrop-blur">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-red-200 font-bold text-lg">⚠️ EMERGENCY ACCESS ONLY</AlertTitle>
          <AlertDescription className="text-red-300">
            This is a break-glass emergency access point. All attempts are logged and monitored.
            Use only in critical situations when primary access is unavailable.
          </AlertDescription>
        </Alert>

        {/* Logo & Brand */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-red-600/20 backdrop-blur-sm flex items-center justify-center p-3 border border-red-500/30 shadow-lg shadow-red-500/20">
              <Shield className="h-10 w-10 text-red-400" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-red-100">
              Emergency Access
            </h1>
            <p className="text-sm text-red-300/70 mt-1">Break-glass authentication</p>
          </div>
        </div>

        {/* Login Form Card */}
        <Card className="border-red-500/20 shadow-2xl shadow-red-500/10 bg-red-950/80 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2 text-red-100">
              <KeyRound className="h-5 w-5 text-red-400" />
              Break-glass Credentials
            </CardTitle>
            <CardDescription className="text-red-300/60">
              Enter emergency credentials from secure vault
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

                {/* Username Field */}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-red-100">Emergency Username</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="break-glass-admin"
                          autoComplete="username"
                          disabled={isLoading}
                          className="h-11 bg-red-900/50 border-red-500/30 text-white placeholder:text-red-400/50"
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
                      <FormLabel className="text-red-100">Emergency Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••••••••••"
                          autoComplete="current-password"
                          disabled={isLoading}
                          className="h-11 bg-red-900/50 border-red-500/30 text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* TOTP Code Field */}
                <FormField
                  control={form.control}
                  name="totpCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-red-100">TOTP Code</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="000000"
                          maxLength={6}
                          autoComplete="one-time-code"
                          disabled={isLoading}
                          className="h-11 bg-red-900/50 border-red-500/30 text-white font-mono text-center text-lg tracking-widest"
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
                  className="w-full h-11 font-semibold bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/25" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Grant Emergency Access
                    </>
                  )}
                </Button>

                {/* Warning */}
                <div className="text-center text-xs text-red-300/50 mt-4 space-y-1">
                  <p>⚠️ This action is logged and monitored</p>
                  <p>Emergency access automatically expires after 24 hours</p>
                  <p>Break-glass user will be disabled after use</p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center">
          <a 
            href="/admin/auth/login" 
            className="text-xs text-red-300/60 hover:text-red-300 transition-colors"
          >
            ← Back to normal admin login
          </a>
        </div>
      </div>
    </div>
  );
}

