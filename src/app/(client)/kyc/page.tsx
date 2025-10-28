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
  Check, Scale, FolderArchive, RefreshCw
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
  formUrl?: string | null;
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
  const [consents, setConsents] = useState({
    biometrics: false,
    termsAndPrivacy: false,
    attestation: false,
  });
  const [showConsentsScreen, setShowConsentsScreen] = useState(true);

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
        console.log('📊 KYC Status Response:', data); // Debug log
        if (data.success && data.status !== 'NOT_STARTED') {
          setKycSession({
            id: data.sessionId || '',
            status: data.status,
            submittedAt: null,
            reviewedAt: data.completedAt || null,
            rejectionReason: data.rejectionReason || null,
            formUrl: data.formUrl || null,
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

  const handleConsentsSubmit = () => {
    if (!consents.biometrics) {
      toast.error('Please give explicit consent to process your biometric data');
      return;
    }
    if (!consents.termsAndPrivacy) {
      toast.error('Please accept the Terms of Service and Privacy Policy');
      return;
    }
    if (!consents.attestation) {
      toast.error('Please confirm that the information is accurate');
      return;
    }
    
    setShowConsentsScreen(false);
    toast.success('Consents accepted. You can now proceed with KYC verification.');
  };

  const handleNext = () => {
    // Validate current step fields before moving forward
    const currentStepConfig = STEPS.find(s => s.id === currentStep);
    if (!currentStepConfig) return;

    const stepFields = fields.filter(f => 
      currentStepConfig.categories.includes(f.category) && f.isEnabled && f.isRequired
    );

    const missingFields: string[] = [];
    stepFields.forEach(field => {
      if (!formData[field.fieldName]) {
        missingFields.push(field.label);
      }
    });

    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Move to next step
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
      // Validate required fields
      const requiredFields = {
        first_name: 'First Name',
        last_name: 'Last Name',
        date_of_birth: 'Date of Birth',
        nationality: 'Nationality',
        phone: 'Phone Number',
        address_street: 'Street Address',
        address_city: 'City',
        address_country: 'Country',
        address_postal: 'Postal Code',
      };

      const missingFields: string[] = [];
      Object.entries(requiredFields).forEach(([field, label]) => {
        if (!formData[field]) {
          missingFields.push(label);
        }
      });

      if (missingFields.length > 0) {
        toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
        setIsSaving(false);
        return;
      }

      // Prepare profile data
      const profileData = {
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
      };

      console.log('Form data:', formData);
      console.log('Submitting profile data:', profileData);

      // First, save profile data
      const profileResponse = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        console.error('Profile save error:', errorData);
        throw new Error(errorData.error || 'Failed to save profile data');
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
            onChange={(newValue) => {
              console.log('📞 Phone changed:', newValue);
              onChange(newValue);
            }}
            defaultCountry="PL"
            placeholder="Enter phone number"
            international
            withCountryCallingCode
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
              onChange={(country) => onChange(country.alpha3)}
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
        {/* Form Fields */}
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
                  {kycSession.formUrl ? (
                    <>
                      Please complete the verification form to upload your documents and take a selfie.
                      <Button 
                        className="mt-3 w-full"
                        onClick={() => window.open(kycSession.formUrl!, '_blank', 'width=800,height=900')}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Complete Verification Form
                      </Button>
                    </>
                  ) : (
                    'Your documents are being reviewed by our team. This usually takes 2-4 hours.'
                  )}
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

  // Show consents screen before form
  if (showConsentsScreen) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in p-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">KYC Verification</h1>
          <p className="text-muted-foreground text-lg">
            Before we begin, please review and accept the following consents and legal information
          </p>
        </div>

        {/* Consents Card */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Required Consents
            </CardTitle>
            <CardDescription>
              All consents are required to proceed with KYC verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Biometrics Consent */}
            <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
              <Checkbox
                id="biometrics"
                checked={consents.biometrics}
                onCheckedChange={(checked) => 
                  setConsents(prev => ({ ...prev, biometrics: checked as boolean }))
                }
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="biometrics" className="cursor-pointer font-semibold text-base">
                  Biometric Data Processing Consent
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  I give explicit consent to process my biometric data (selfie/liveness) solely for AML/KYC identity verification.
                </p>
                <Badge variant="outline" className="mt-2">
                  Art. 9(2)(a) GDPR
                </Badge>
              </div>
            </div>

            {/* Terms and Privacy */}
            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/30">
              <Checkbox
                id="terms"
                checked={consents.termsAndPrivacy}
                onCheckedChange={(checked) => 
                  setConsents(prev => ({ ...prev, termsAndPrivacy: checked as boolean }))
                }
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="terms" className="cursor-pointer font-semibold text-base">
                  Terms and Privacy Policy
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  I accept the{' '}
                  <a href="/terms" target="_blank" className="text-primary hover:underline font-medium">
                    Terms of Service
                  </a>
                  {' '}and have read the{' '}
                  <a href="/privacy" target="_blank" className="text-primary hover:underline font-medium">
                    Privacy Policy
                  </a>.
                </p>
              </div>
            </div>

            {/* Attestation */}
            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/30">
              <Checkbox
                id="attestation"
                checked={consents.attestation}
                onCheckedChange={(checked) => 
                  setConsents(prev => ({ ...prev, attestation: checked as boolean }))
                }
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="attestation" className="cursor-pointer font-semibold text-base">
                  Information Accuracy Attestation
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  I confirm the information is accurate and I'm not a resident/citizen of restricted or sanctioned jurisdictions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal Information */}
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <AlertCircle className="h-5 w-5" />
              Legal Information
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              Important information about data processing and retention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-blue-800 dark:text-blue-200">
            <div className="flex gap-3">
              <Scale className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <strong>AML Legal Basis:</strong> We process KYC data to comply with AML/CFT laws (Art. 6(1)(c) GDPR).
              </div>
            </div>
            <div className="flex gap-3">
              <FolderArchive className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <strong>Record Retention:</strong> KYC and transaction records are retained at least 5 years per AMLD.
              </div>
            </div>
            <div className="flex gap-3">
              <RefreshCw className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <strong>Travel Rule (EU 2023/1113):</strong> For crypto transfers, sender/beneficiary data accompany the transfer; self-hosted addresses may require ownership checks over €1,000.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleConsentsSubmit}
            size="lg"
          >
            Accept & Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

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
