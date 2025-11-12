/**
 * KycFormWizard - Main wizard component
 * Handles multi-step navigation, validation, and submission
 */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { KycFormStep } from './KycFormStep';
import { KYC_STEPS, getStepsWithFields, getFieldsForStep } from '@/lib/kyc/config';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Loader2, Shield, Check } from 'lucide-react';
import { useKycForm } from './hooks/useKycForm';
import { toast } from 'sonner';

interface Props {
  fields: any[];
  kycSession: any;
  onComplete: () => void;
}

export function KycFormWizard({ fields, kycSession, onComplete }: Props) {
  const { data: session } = useSession();
  
  // Filter steps - only show steps with enabled fields
  const activeSteps = getStepsWithFields(fields);
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  
  const { formData, errors, setFieldValue, validateStep, setFormData } = useKycForm();

  // Auto-fill form data from user profile
  useEffect(() => {
    if (isAutoFilled) return; // Only run once
    if (!session?.user) return;

    const loadProfileAndAutoFill = async () => {
      const autoFillData: Record<string, any> = {};

      // Load existing form data if available
      if (kycSession?.formData) {
        try {
          const existingData = typeof kycSession.formData === 'string'
            ? JSON.parse(kycSession.formData)
            : kycSession.formData;
          Object.assign(autoFillData, existingData);
        } catch (error) {
          console.error('Failed to parse existing form data:', error);
        }
      }

      // Fetch user profile from API
      try {
        const response = await fetch('/api/profile');
        const data = await response.json();

        if (data.success && data.user) {
          const profile = data.user.profile;
          
          console.log('📋 Loaded profile for auto-fill:', profile);

          // Field mapping: KYC field name → User profile field
          const fieldMapping: Record<string, any> = {
            // Email
            'email': data.user.email,
            'contact_email': data.user.email,
            
            // Name fields
            'first_name': profile?.firstName,
            'given_name': profile?.firstName,
            'firstName': profile?.firstName,
            'last_name': profile?.lastName,
            'surname': profile?.lastName,
            'lastName': profile?.lastName,
            'full_name': profile?.firstName && profile?.lastName 
              ? `${profile.firstName} ${profile.lastName}` 
              : undefined,
            
            // Phone
            'phone': profile?.phoneNumber,
            'mobile_phone': profile?.phoneNumber,
            'contact_phone': profile?.phoneNumber,
            'phone_number': profile?.phoneNumber,
            
            // Date of Birth
            'date_of_birth': profile?.dateOfBirth,
            'dateOfBirth': profile?.dateOfBirth,
            'dob': profile?.dateOfBirth,
            'birth_date': profile?.dateOfBirth,
            
            // Place of Birth
            'place_of_birth': profile?.placeOfBirth,
            'placeOfBirth': profile?.placeOfBirth,
            'birth_place': profile?.placeOfBirth,
            
            // Nationality
            'nationality': profile?.nationality,
            'citizenship': profile?.nationality,
            'country_of_citizenship': profile?.nationality,
            
            // Address
            'address': profile?.address,
            'street_address': profile?.address,
            'city': profile?.city,
            'postal_code': profile?.postalCode,
            'zip_code': profile?.postalCode,
            'country': profile?.country,
          };

          // Apply auto-fill for each field
          fields.forEach(field => {
            const fieldName = field.fieldName;
            
            // Skip if field already has data
            if (autoFillData[fieldName]) return;

            // Check if we have a value for this field
            const autoFillValue = fieldMapping[fieldName];
            if (autoFillValue) {
              autoFillData[fieldName] = autoFillValue;
            }
          });

          // Apply auto-filled data
          if (Object.keys(autoFillData).length > 0) {
            setFormData(autoFillData);
            console.log('✅ Auto-filled KYC form with profile data:', Object.keys(autoFillData));
            toast.success(`Pre-filled ${Object.keys(autoFillData).length} fields from your profile`);
          }
        }
      } catch (error) {
        console.error('Failed to load profile for auto-fill:', error);
      }

      setIsAutoFilled(true);
    };

    loadProfileAndAutoFill();
  }, [session, kycSession, fields, isAutoFilled, setFormData]);

  const currentStep = activeSteps[currentStepIndex];
  const isLastStep = currentStepIndex === activeSteps.length - 1;
  const progress = ((currentStepIndex + 1) / activeSteps.length) * 100;

  const handleNext = () => {
    // Validate current step
    const stepFields = getFieldsForStep(currentStep, fields);
    if (!validateStep(stepFields)) {
      return;
    }

    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      console.log('📝 Submitting KYC form...');
      
      // Step 1: Save profile data (basic fields)
      console.log('1️⃣ Saving profile data...');
      const profileData = {
        firstName: formData.first_name || formData.firstName || formData.given_name,
        lastName: formData.last_name || formData.lastName || formData.surname,
        phoneNumber: formData.phone || formData.mobile_phone || formData.phone_number,
        phoneCountry: formData.phone_country,
        country: formData.address_country || formData.country,
        city: formData.address_city || formData.city,
        address: formData.address_street || formData.address,
        postalCode: formData.address_postal || formData.postal_code || formData.zip_code,
        dateOfBirth: formData.date_of_birth || formData.dateOfBirth || formData.dob || null,
        placeOfBirth: formData.place_of_birth || formData.placeOfBirth || formData.birth_place || null,
        nationality: formData.nationality || formData.citizenship || null,
      };

      const profileResponse = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      if (!profileResponse.ok) {
        const profileError = await profileResponse.json();
        throw new Error(profileError.error || 'Failed to save profile data');
      }
      
      console.log('✅ Profile saved');

      // Step 2: Start KYC verification (creates session with provider)
      console.log('2️⃣ Starting KYC verification...');
      const kycStartResponse = await fetch('/api/kyc/start', {
        method: 'POST'
      });

      const kycStartData = await kycStartResponse.json();
      
      if (!kycStartData.success) {
        throw new Error(kycStartData.error || 'Failed to start KYC verification');
      }

      console.log('✅ KYC session created with provider:', kycStartData.kycProviderId || 'N/A');

      // Step 3: Save ALL form data to KycFormData
      console.log('3️⃣ Saving form data...');
      const formDataResponse = await fetch('/api/kyc/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData })
      });

      if (!formDataResponse.ok) {
        const formDataError = await formDataResponse.json();
        throw new Error(formDataError.error || 'Failed to save form data');
      }

      const savedData = await formDataResponse.json();
      console.log('✅ Form data saved:', savedData);

      // Step 4: Sync documents to KYC provider
      console.log('4️⃣ Syncing documents to provider...');
      try {
        const syncResponse = await fetch('/api/kyc/sync-documents', {
          method: 'POST'
        });

        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          console.log('✅ Documents synced:', syncData);
          
          if (syncData.synced > 0) {
            toast.success(`${syncData.synced} document(s) sent to verification provider`);
          }
          
          if (syncData.failed > 0) {
            console.warn('⚠️ Some documents failed to sync:', syncData.errors);
            toast.warning(`${syncData.failed} document(s) failed to sync`);
          }
        } else {
          console.warn('⚠️ Document sync failed (non-critical)');
        }
      } catch (syncError) {
        console.warn('⚠️ Document sync error (non-critical):', syncError);
      }

      toast.success('KYC form submitted successfully! Now complete identity verification.');
      
      // Call onComplete to refresh status and show verification screen
      onComplete();
      
    } catch (error: any) {
      console.error('❌ Failed to submit form:', error);
      toast.error(error.message || 'Failed to submit form');
    } finally {
      setIsSaving(false);
    }
  };

  if (activeSteps.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No KYC Fields Available</h2>
            <p className="text-muted-foreground">
              Please contact support to configure KYC verification fields.
            </p>
          </CardContent>
        </Card>
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

      {/* Progress Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="space-y-3">
            {/* Progress Bar */}
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                Step {currentStepIndex + 1} of {activeSteps.length}
              </span>
              <span className="text-muted-foreground">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />

            {/* Step Pills */}
            <div className="flex justify-between gap-2">
              {activeSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 text-xs ${
                    index === currentStepIndex
                      ? 'text-primary font-semibold'
                      : index < currentStepIndex
                      ? 'text-green-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      index === currentStepIndex ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                    }`}>
                      {step.id}
                    </div>
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step */}
      <KycFormStep
        step={currentStep}
        fields={fields}
        formData={formData}
        errors={errors}
        onChange={setFieldValue}
      />

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0 || isSaving}
              className="min-w-[120px]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={isSaving}
              className="min-w-[120px]"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : isLastStep ? (
                <>
                  Submit
                  <Check className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

