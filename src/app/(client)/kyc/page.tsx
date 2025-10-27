/**
 * KYC Verification Page with Multi-Step Dynamic Form
 * 
 * Loads KYC fields from admin configuration and displays them in steps
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { PhoneInput } from '@/components/ui/phone-input';
import { CountryDropdown } from '@/components/ui/country-dropdown';
import { DatePicker } from '@/components/ui/date-picker';
import type { Value as PhoneValue } from 'react-phone-number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { toast } from 'sonner';
import { 
  Shield, CheckCircle, XCircle, Clock, Loader2, 
  FileText, Camera, User, AlertCircle, ArrowRight, ArrowLeft,
  Check
} from 'lucide-react';
import { KycStatus } from '@prisma/client';
import { formatDateTime } from '@/lib/formatters';

interface KycField {
  id: string;
  fieldName: string;
  label: string;
  fieldType: string;
  category: string;
  isRequired: boolean;
  isEnabled: boolean;
  priority: number;
  validation: any;
  options: any;
}

interface KycSession {
  id: string;
  status: KycStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

// Step configuration
const STEPS = [
  { id: 1, title: 'Personal Info', categories: ['personal'] },
  { id: 2, title: 'Contact & Address', categories: ['contact', 'address'] },
  { id: 3, title: 'Documents & Employment', categories: ['documents', 'employment', 'pep_sanctions'] },
  { id: 4, title: 'Additional Info', categories: ['purpose', 'activity', 'funds', 'consents'] },
];

export default function KycPage(): React.ReactElement {
  const [kycSession, setKycSession] = useState<KycSession | null>(null);
  const [fields, setFields] = useState<KycField[]>([]);
  const [grouped, setGrouped] = useState<Record<string, KycField[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Fetch KYC status and fields
  useEffect(() => {
    Promise.all([
      fetchKycStatus(),
      fetchKycFields()
    ]);
  }, []);

  const fetchKycStatus = async () => {
    try {
      const response = await fetch('/api/kyc/status');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.status !== 'NOT_STARTED') {
          setKycSession({
            id: data.sessionId || '',
            status: data.status,
            submittedAt: null,
            reviewedAt: data.completedAt || null,
            rejectionReason: data.rejectionReason || null,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
    }
  };

  const fetchKycFields = async () => {
    try {
      const response = await fetch('/api/kyc/form-fields');
      if (response.ok) {
        const data = await response.json();
        // Filter only enabled fields
        const enabledFields = data.fields.filter((f: KycField) => f.isEnabled);
        setFields(enabledFields);
        setGrouped(data.grouped);
      } else {
        toast.error('Failed to load KYC form configuration');
      }
    } catch (error) {
      console.error('Failed to fetch KYC fields:', error);
      toast.error('Failed to load KYC form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      // First, save profile data
      const profileResponse = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.first_name,
          lastName: formData.last_name,
          phoneNumber: formData.phone,
          phoneCountry: formData.phone_country,
          country: formData.address_country,
          city: formData.address_city,
          address: formData.address_street,
          postalCode: formData.address_postal,
          dateOfBirth: formData.date_of_birth || null,
          placeOfBirth: formData.place_of_birth || null,
          nationality: formData.nationality || null,
        })
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to save profile data');
      }

      toast.success('Profile data saved!');

      // Then, start KYC session
      const kycResponse = await fetch('/api/kyc/start', {
        method: 'POST'
      });
      
      const kycData = await kycResponse.json();
      
      if (kycData.success && kycData.formUrl) {
        toast.success('KYC session created! Opening verification form...');
        // Open KYCAID form in new window
        window.open(kycData.formUrl, '_blank', 'width=800,height=900');
        // Reload to show status
        setTimeout(() => {
          fetchKycStatus();
        }, 2000);
      } else {
        toast.error(kycData.error || 'Failed to start KYC verification');
      }
    } catch (error: any) {
      console.error('Failed to submit KYC:', error);
      toast.error(error.message || 'Failed to submit KYC data');
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: KycField) => {
    const value = formData[field.fieldName] || '';
    const onChange = (val: any) => setFormData({ ...formData, [field.fieldName]: val });

    const commonProps = {
      id: field.fieldName,
      required: field.isRequired,
    };

    switch (field.fieldType) {
      case 'text':
      case 'email':
        return (
          <Input
            {...commonProps}
            type={field.fieldType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.label}
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.label}
            rows={3}
          />
        );

      case 'phone':
        return (
          <PhoneInput
            value={(value || undefined) as PhoneValue}
            onChange={onChange}
            defaultCountry="PL"
            placeholder="Enter phone number"
          />
        );

      case 'date':
        // For date of birth, set max date to 18 years ago
        const maxYear = field.fieldName === 'date_of_birth' 
          ? new Date().getFullYear() - 18 
          : new Date().getFullYear();
        
        return (
          <DatePicker
            date={value ? new Date(value) : undefined}
            onDateChange={(date) => onChange(date?.toISOString())}
            placeholder={field.fieldName === 'date_of_birth' ? 'Select date of birth' : 'Select date'}
            fromYear={1900}
            toYear={maxYear}
          />
        );

      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            placeholder={field.label}
          />
        );

      case 'select':
        // Parse options if it's a JSON string
        let options = field.options || [];
        if (typeof options === 'string') {
          try {
            options = JSON.parse(options);
          } catch (e) {
            console.error('Failed to parse options:', e);
            options = [];
          }
        }
        if (!Array.isArray(options)) {
          options = [];
        }
        
        if (field.fieldName.includes('country') || field.fieldName === 'nationality') {
          return (
            <CountryDropdown
              defaultValue={value}
              onChange={(country) => onChange(country.alpha2)}
              placeholder={`Select ${field.label}`}
            />
          );
        }
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt.replace(/_/g, ' ').toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              {...commonProps}
              checked={value || false}
              onCheckedChange={onChange}
            />
            <label
              htmlFor={field.fieldName}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.label}
            </label>
          </div>
        );

      case 'file':
        return (
          <div className="space-y-2">
            <Input
              {...commonProps}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onChange(file);
              }}
              accept="image/*,application/pdf"
            />
            <p className="text-xs text-muted-foreground">
              Max size: 10MB. Formats: JPG, PNG, PDF
            </p>
          </div>
        );

      default:
        return (
          <Input
            {...commonProps}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  const renderStep = () => {
    const step = STEPS.find(s => s.id === currentStep);
    if (!step) return null;

    const stepFields = fields.filter(f => 
      step.categories.includes(f.category) && f.isEnabled
    ).sort((a, b) => a.priority - b.priority);

    return (
      <div className="space-y-6">
        {step.categories.map(category => {
          const categoryFields = stepFields.filter(f => f.category === category);
          if (categoryFields.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <h3 className="text-lg font-semibold capitalize">
                {category.replace(/_/g, ' ')}
              </h3>
              <div className="grid gap-4">
                {categoryFields.map(field => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.fieldName}>
                      {field.label}
                      {field.isRequired && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
              {category !== step.categories[step.categories.length - 1] && (
                <Separator className="my-4" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If KYC already submitted
  if (kycSession) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  KYC Verification Status
                </CardTitle>
                <CardDescription className="mt-2">
                  Your KYC verification is currently being processed
                </CardDescription>
              </div>
              <KycStatusBadge status={kycSession.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {kycSession.status === 'PENDING' && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Under Review</AlertTitle>
                <AlertDescription>
                  Your documents are being reviewed by our team. This usually takes 2-4 hours.
                </AlertDescription>
              </Alert>
            )}

            {kycSession.status === 'APPROVED' && (
              <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900 dark:text-green-100">Verified!</AlertTitle>
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Your KYC verification is complete. You can now buy cryptocurrency.
                </AlertDescription>
              </Alert>
            )}

            {kycSession.status === 'REJECTED' && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Verification Failed</AlertTitle>
                <AlertDescription>
                  {kycSession.rejectionReason || 'Please contact support for more information.'}
                </AlertDescription>
              </Alert>
            )}

            <Button variant="outline" onClick={() => fetchKycStatus()} className="w-full">
              <Clock className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Multi-step form
  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          KYC Verification
        </h1>
        <p className="text-muted-foreground">
          Complete your KYC verification to start trading cryptocurrency
        </p>
      </div>

      {/* Progress */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Step {currentStep} of {STEPS.length}</span>
              <span className="text-muted-foreground">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 ${
                    step.id === currentStep
                      ? 'text-primary font-semibold'
                      : step.id < currentStep
                      ? 'text-green-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.id < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs">
                      {step.id}
                    </span>
                  )}
                  <span className="hidden md:inline text-xs">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1]?.title}</CardTitle>
          <CardDescription>
            Please fill in all required fields marked with *
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStep()}

          <Separator className="my-6" />

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep < STEPS.length ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Submit & Start Verification
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>What happens next?</AlertTitle>
        <AlertDescription>
          After submitting, you'll be redirected to complete document verification and liveness check.
          Your data is encrypted and secure.
        </AlertDescription>
      </Alert>
    </div>
  );
}
