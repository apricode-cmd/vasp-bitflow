/**
 * Registration Page
 * 
 * Enhanced user registration form with modern UI components
 */

'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import { toast } from 'sonner';
import { BrandLoaderInline } from '@/components/ui/brand-loader';
import { Loader2, CheckCircle2, Info, UserPlus, AlertCircle, XCircle } from 'lucide-react';
import { isValidPhoneNumber, isPossiblePhoneNumber, getCountryCallingCode, type CountryCode } from 'react-phone-number-input';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BrandLogo } from '@/components/features/BrandLogo';
import { PhoneInput } from '@/components/ui/phone-input';
import { CountryDropdown } from '@/components/ui/country-dropdown';
import type { Value as PhoneValue } from 'react-phone-number-input';

export default function RegisterPage(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationDisabled, setRegistrationDisabled] = useState(false);
  const [checkingSettings, setCheckingSettings] = useState(true);

  // Check if registration is enabled
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await fetch('/api/settings/public');
        if (response.ok) {
          const data = await response.json();
          const isEnabled = data.settings?.registrationEnabled !== false; // Default true
          setRegistrationDisabled(!isEnabled);
        }
      } catch (error) {
        console.error('Failed to check registration status:', error);
      } finally {
        setCheckingSettings(false);
      }
    };

    checkRegistrationStatus();
  }, []);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      country: '', // Will be auto-filled from geo
      password: '',
      confirmPassword: '',
    },
  });

  // Auto-detect user's country on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('/api/geo/detect');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.country && !form.getValues('country')) {
            form.setValue('country', data.country);
            if (data.detected) {
              console.log('✅ Auto-detected country:', data.country, data.city || '');
            } else {
              console.log('ℹ️ Using default country:', data.country);
            }
          }
        }
      } catch (error) {
        console.error('Failed to auto-detect country:', error);
        // Silently fail - user can select manually
        // Set default country as fallback
        if (!form.getValues('country')) {
          form.setValue('country', 'PL');
        }
      }
    };

    detectCountry();
  }, [form]);

  // Calculate form completion progress
  const watchedFields = form.watch();
  const totalFields = 7;
  const filledFields = Object.values(watchedFields).filter(value => value && value.length > 0).length;
  const progressPercentage = (filledFields / totalFields) * 100;

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    setError(null);

    try {
      // Register user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Registration failed. Please try again.');
        setIsLoading(false);
        return;
      }

      toast.success('Registration successful! Signing you in...');

      // Auto-login after registration
      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false
      });

      if (signInResult?.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        toast.error('Please login manually');
        router.push('/login');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Branded Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.4)_0%,hsl(var(--primary)/0.25)_20%,hsl(var(--background))_60%,hsl(var(--background))_100%)] dark:bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.6)_0%,hsl(var(--primary)/0.35)_20%,hsl(var(--background))_60%,hsl(var(--background))_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.15)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.25)_0%,transparent_50%)]" />

      <div className="w-full max-w-2xl space-y-8 relative z-10">
        {/* Logo & Brand */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 backdrop-blur-sm flex items-center justify-center p-3 border border-primary/20 shadow-lg shadow-primary/10">
              <BrandLogo size={64} priority />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              Create Your Account
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Join us today and start trading cryptocurrency</p>
          </div>
        </div>

        {/* Check if registration is disabled */}
        {checkingSettings ? (
          <Card className="shadow-2xl border-primary/10 bg-card/95 backdrop-blur-sm">
            <CardContent className="p-8">
              <BrandLoaderInline text="Loading..." size="sm" />
            </CardContent>
          </Card>
        ) : registrationDisabled ? (
          <Card className="shadow-2xl border-destructive/20 bg-card/95 backdrop-blur-sm">
            <CardContent className="p-12 text-center space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-2">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold">Registration Temporarily Disabled</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                New user registrations are currently disabled. Please contact support for assistance.
              </p>
              <div className="pt-4">
                <Link href="/login">
                  <Button variant="outline" size="lg">
                    Go to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
        {/* Registration Form Card */}
        <Card className="border-primary/10 shadow-xl shadow-primary/5">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Create Account
            </CardTitle>
            <CardDescription>
              Fill in your details below to create your account
            </CardDescription>
            
            {/* Progress Bar */}
            <div className="pt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-semibold text-primary">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary">Personal Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John"
                              disabled={isLoading}
                              className="h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Doe"
                              disabled={isLoading}
                              className="h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary">Contact Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
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

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => {
                        // Check phone validation status
                        const phoneValue = field.value;
                        const hasPhone = phoneValue && phoneValue.trim() !== '';
                        const selectedCountry = form.watch('country');
                        
                        let validStatus: 'idle' | 'valid' | 'invalid' | 'warning' = 'idle';
                        if (hasPhone) {
                          const isValid = isValidPhoneNumber(phoneValue);
                          const isPossible = isPossiblePhoneNumber(phoneValue);
                          
                          if (isValid) {
                            validStatus = 'valid';
                          } else if (isPossible) {
                            validStatus = 'warning';
                          } else {
                            validStatus = 'invalid';
                          }
                        }

                        return (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <PhoneInput
                                  value={field.value as PhoneValue}
                                  onChange={field.onChange}
                                  country={(selectedCountry as CountryCode) || "PL"}
                                  placeholder="Enter phone number"
                                  disabled={isLoading}
                                />
                                {/* Validation icon */}
                                {hasPhone && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {validStatus === 'valid' && (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    )}
                                    {validStatus === 'invalid' && (
                                      <XCircle className="h-4 w-4 text-destructive" />
                                    )}
                                    {validStatus === 'warning' && (
                                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            {hasPhone && validStatus === 'warning' && (
                              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                                Phone number looks incomplete
                              </p>
                            )}
                            {hasPhone && validStatus === 'valid' && (
                              <p className="text-sm text-green-600 dark:text-green-500">
                                ✓ Valid phone number
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country *</FormLabel>
                          <FormControl>
                            <CountryDropdown
                              defaultValue={field.value}
                              onChange={(country) => {
                                field.onChange(country.alpha2);
                                
                                // Auto-set phone country code when country changes
                                const currentPhone = form.getValues('phoneNumber');
                                // Only auto-fill if phone is empty or just a '+'
                                if (!currentPhone || currentPhone.trim() === '' || currentPhone === '+') {
                                  try {
                                    const callingCode = getCountryCallingCode(country.alpha2 as CountryCode);
                                    form.setValue('phoneNumber', `+${callingCode}`);
                                  } catch (error) {
                                    // Country code not found, ignore
                                    console.warn('Country code not found for:', country.alpha2);
                                  }
                                }
                              }}
                              placeholder="Select your country"
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Security */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary">Security</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password *</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              autoComplete="new-password"
                              disabled={isLoading}
                              className="h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password *</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              autoComplete="new-password"
                              disabled={isLoading}
                              className="h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Password Requirements Alert */}
                  <Alert className="border-primary/20 bg-primary/5">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertTitle>Password Requirements</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                        <li>At least 8 characters</li>
                        <li>One uppercase letter</li>
                        <li>One lowercase letter</li>
                        <li>One number</li>
                        <li>One special character</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 font-semibold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <Separator className="my-6" />

            {/* Login Link */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account?</span>{' '}
              <Link
                href="/login"
                className="text-primary hover:underline font-semibold inline-flex items-center gap-1 transition-colors"
              >
                Sign in here
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
        </>
        )}
      </div>
    </div>
  );
}
