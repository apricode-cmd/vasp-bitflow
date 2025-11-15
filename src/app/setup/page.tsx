/**
 * System Setup Wizard
 * 
 * Initial setup for first-time installation.
 * This page is shown only when setup is not complete.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, Database, User, Building, Settings, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

type SetupStep = 'check' | 'welcome' | 'admin' | 'company' | 'complete';

interface SetupStatus {
  isComplete: boolean;
  steps: {
    database: { completed: boolean; message: string };
    admin: { completed: boolean; message: string };
    currencies: { completed: boolean; message: string };
    settings: { completed: boolean; message: string };
  };
  completionPercentage: number;
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>('check');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    adminFirstName: '',
    adminLastName: '',
    companyName: '',
    companyEmail: '',
    companyWebsite: '',
    companyPhone: ''
  });

  // Check setup status on mount
  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/setup/status');
      const data = await response.json();
      
      setSetupStatus(data);
      
      if (data.isComplete) {
        // Setup already complete, redirect to admin login
        router.push('/admin/login');
      } else {
        // Show welcome screen
        setStep('welcome');
      }
    } catch (error) {
      console.error('Failed to check setup status:', error);
      setError('Failed to check system status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (formData.adminPassword !== formData.adminPasswordConfirm) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.adminPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!formData.adminEmail || !formData.adminFirstName || !formData.adminLastName) {
      toast.error('Please fill all admin fields');
      return;
    }

    if (!formData.companyName || !formData.companyEmail) {
      toast.error('Please fill all company fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/setup/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
          adminFirstName: formData.adminFirstName,
          adminLastName: formData.adminLastName,
          companyName: formData.companyName,
          companyEmail: formData.companyEmail,
          companyWebsite: formData.companyWebsite || undefined,
          companyPhone: formData.companyPhone || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Setup failed');
      }

      toast.success('Setup completed successfully!');
      setStep('complete');

    } catch (error) {
      console.error('Setup failed:', error);
      setError(error instanceof Error ? error.message : 'Setup failed');
      toast.error('Setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 'welcome') setStep('admin');
    else if (step === 'admin') setStep('company');
  };

  const prevStep = () => {
    if (step === 'company') setStep('admin');
    else if (step === 'admin') setStep('welcome');
  };

  const getProgress = () => {
    if (step === 'check' || step === 'welcome') return 0;
    if (step === 'admin') return 33;
    if (step === 'company') return 66;
    if (step === 'complete') return 100;
    return 0;
  };

  // Loading check
  if (step === 'check' || isLoading && step !== 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Checking system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">System Setup</CardTitle>
              <CardDescription>Configure your Apricode Exchange platform</CardDescription>
            </div>
            {step !== 'welcome' && step !== 'complete' && (
              <div className="text-sm text-muted-foreground">
                Step {step === 'admin' ? '1' : '2'} of 2
              </div>
            )}
          </div>
          {step !== 'welcome' && step !== 'complete' && (
            <Progress value={getProgress()} className="h-2" />
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Welcome Step */}
          {step === 'welcome' && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <Rocket className="w-20 h-20 text-blue-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">Welcome to Apricode Exchange</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Let's set up your cryptocurrency exchange platform in just a few steps.
                </p>
              </div>

              {setupStatus && (
                <div className="space-y-2">
                  <h3 className="font-semibold mb-3">System Status:</h3>
                  
                  <div className="flex items-center gap-2">
                    {setupStatus.steps.database.completed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="text-sm">{setupStatus.steps.database.message}</span>
                  </div>

                  {!setupStatus.steps.admin.completed && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm">{setupStatus.steps.admin.message}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  What we'll configure:
                </h3>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400 ml-7">
                  <li>• Admin account credentials</li>
                  <li>• Company information</li>
                  <li>• Basic system settings</li>
                </ul>
              </div>

              <Button onClick={nextStep} className="w-full" size="lg">
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Admin Account Step */}
          {step === 'admin' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Admin Account</h3>
                  <p className="text-sm text-muted-foreground">Create your super admin account</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminFirstName">First Name</Label>
                  <Input
                    id="adminFirstName"
                    value={formData.adminFirstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, adminFirstName: e.target.value }))}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminLastName">Last Name</Label>
                  <Input
                    id="adminLastName"
                    value={formData.adminLastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, adminLastName: e.target.value }))}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                  placeholder="admin@yourcompany.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                  placeholder="••••••••"
                  required
                />
                <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPasswordConfirm">Confirm Password</Label>
                <Input
                  id="adminPasswordConfirm"
                  type="password"
                  value={formData.adminPasswordConfirm}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminPasswordConfirm: e.target.value }))}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={prevStep} variant="outline" className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={nextStep} className="flex-1">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Company Info Step */}
          {step === 'company' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Company Information</h3>
                  <p className="text-sm text-muted-foreground">Tell us about your business</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Acme Crypto Exchange"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyEmail">Company Email</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  value={formData.companyEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyEmail: e.target.value }))}
                  placeholder="support@yourcompany.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Website (Optional)</Label>
                <Input
                  id="companyWebsite"
                  type="url"
                  value={formData.companyWebsite}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyWebsite: e.target.value }))}
                  placeholder="https://yourcompany.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyPhone">Phone (Optional)</Label>
                <Input
                  id="companyPhone"
                  type="tel"
                  value={formData.companyPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyPhone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <Alert>
                <Settings className="h-4 w-4" />
                <AlertTitle>Next Steps</AlertTitle>
                <AlertDescription>
                  After setup, you can configure currencies, payment methods, and integrations from the admin panel.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button onClick={prevStep} variant="outline" className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={handleSubmit} className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Complete Setup <CheckCircle className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="space-y-6 text-center py-6">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Your Apricode Exchange platform is ready to use.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left space-y-2">
                <h3 className="font-semibold">What's next?</h3>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>✓ Configure currencies and payment methods</li>
                  <li>✓ Set up KYC provider integration</li>
                  <li>✓ Configure email service</li>
                  <li>✓ Customize branding and settings</li>
                </ul>
              </div>

              <Button onClick={() => router.push('/admin/login')} className="w-full" size="lg">
                Go to Admin Login <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

