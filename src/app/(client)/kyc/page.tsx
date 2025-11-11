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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { QRCode } from '@/components/ui/shadcn-io/qr-code';
import type { Value as PhoneValue } from 'react-phone-number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { SumsubWebSDK } from '@/components/kyc/SumsubWebSDK';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { 
  Shield, CheckCircle, XCircle, Clock, Loader2, 
  FileText, Camera, User, AlertCircle, ArrowRight, ArrowLeft,
  Check, Scale, FolderArchive, RefreshCw, Info, Upload, HelpCircle,
  Smartphone, ExternalLink, QrCode
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
  kycProviderId?: string | null;
}

// Step configuration
const STEPS = [
  { id: 1, title: 'Personal Info', categories: ['personal'] },
  { id: 2, title: 'Contact & Address', categories: ['contact', 'address'] },
  { id: 3, title: 'Compliance Profile', categories: ['documents', 'employment', 'pep_sanctions'] },
  { id: 4, title: 'Intended Use & Funds', categories: ['purpose', 'funds', 'activity'] },
];

export default function KycPage(): React.ReactElement {
  const { data: session } = useSession();
  const [kycSession, setKycSession] = useState<KycSession | null>(null);
  const [fields, setFields] = useState<KycField[]>([]);
  const [grouped, setGrouped] = useState<Record<string, KycField[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [sumsubMobileUrl, setSumsubMobileUrl] = useState<string | null>(null);
  const [consents, setConsents] = useState({
    biometrics: false,
    termsAndPrivacy: false,
    attestation: false,
  });
  const [showConsentsScreen, setShowConsentsScreen] = useState(true);
  const [pepSubForm, setPepSubForm] = useState<any>({
    pep_role_title: '',
    pep_institution: '',
    pep_country: '',
    pep_since: '',
    pep_until: '',
    relationship_to_pep: '',
    pep_additional_info: '',
  });

  // Fetch user profile and auto-fill email and phone
  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          console.log('👤 User profile loaded:', data.user);
          
          // Auto-fill email and phone from profile
          setFormData(prev => ({
            ...prev,
            email: data.user.email || prev.email || '',
            phone: data.user.profile?.phoneNumber || prev.phone || '',
            phone_country: data.user.profile?.phoneCountry || prev.phone_country || '',
            // Also pre-fill other profile fields if they exist
            first_name: data.user.profile?.firstName || prev.first_name || '',
            last_name: data.user.profile?.lastName || prev.last_name || '',
            date_of_birth: data.user.profile?.dateOfBirth || prev.date_of_birth || '',
            nationality: data.user.profile?.nationality || prev.nationality || '',
            address_country: data.user.profile?.country || prev.address_country || '',
            address_city: data.user.profile?.city || prev.address_city || '',
            address_street: data.user.profile?.address || prev.address_street || '',
            address_postal: data.user.profile?.postalCode || prev.address_postal || '',
            place_of_birth: data.user.profile?.placeOfBirth || prev.place_of_birth || '',
          }));
          
          console.log('✅ Form auto-filled from profile');
        }
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Don't show error toast - this is optional enhancement
    }
  };

  // Fetch KYC status and fields
  // Fetch Sumsub mobile URL for QR code
  const fetchSumsubMobileUrl = async () => {
    try {
      console.log('📱 Fetching Sumsub mobile link...');
      const response = await fetch('/api/kyc/mobile-link');
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Sumsub mobile link received:', data);
        
        if (data.mobileUrl) {
          setSumsubMobileUrl(data.mobileUrl);
          console.log('🔗 Mobile URL set:', data.mobileUrl);
        } else {
          console.error('❌ No mobile URL in response');
          toast.error('Failed to generate mobile link');
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch mobile link:', errorData);
        toast.error('Failed to generate QR code');
      }
    } catch (error) {
      console.error('❌ Error fetching Sumsub mobile URL:', error);
      toast.error('Failed to generate QR code');
    }
  };

  useEffect(() => {
    Promise.all([
      fetchKycStatus(),
      fetchKycFields(),
      fetchUserProfile() // ✅ Загружаем профиль для автозаполнения
    ]);
  }, []);
  
  // Fetch mobile URL when Sumsub is active
  useEffect(() => {
    if (kycSession?.kycProviderId === 'sumsub' && session?.user?.id) {
      fetchSumsubMobileUrl();
    }
  }, [kycSession?.kycProviderId, session?.user?.id]);

  const fetchKycStatus = async (showToast = false) => {
    try {
      if (showToast) {
        setIsRefreshing(true);
        toast.loading('Checking verification status...', { id: 'kyc-refresh' });
      }
      
      const response = await fetch('/api/kyc/status');
      if (response.ok) {
        const data = await response.json();
        console.log('📊 KYC Status Response:', data); // Debug log
        
        if (data.success && data.status !== 'NOT_STARTED') {
          console.log('🔍 Setting kycSession with kycProviderId:', data.kycProviderId);
          setKycSession({
            id: data.sessionId || '',
            status: data.status,
            submittedAt: null,
            reviewedAt: data.completedAt || null,
            rejectionReason: data.rejectionReason || null,
            formUrl: data.formUrl || null,
            kycProviderId: data.kycProviderId || null,
          });
          
          if (showToast) {
            toast.success(`Status updated: ${data.status}`, { id: 'kyc-refresh' });
          }
        } else if (showToast) {
          toast.info('No active verification found', { id: 'kyc-refresh' });
        }
      } else {
        const errorData = await response.json();
        console.error('❌ KYC status error:', errorData);
        if (showToast) {
          toast.error(errorData.error || 'Failed to check status', { id: 'kyc-refresh' });
        }
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
      if (showToast) {
        toast.error('Network error - please try again', { id: 'kyc-refresh' });
      }
    } finally {
      if (showToast) {
        setIsRefreshing(false);
      }
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

    // Special validation for PEP fields (conditionally required)
    const pepStatus = formData['pep_status'];
    if (pepStatus && pepStatus !== 'NO') {
      // Required fields for all PEP statuses
      if (!formData['pep_role_title']) missingFields.push('PEP Role / Title');
      if (!formData['pep_institution']) missingFields.push('Institution / Body');
      if (!formData['pep_country']) missingFields.push('Country / Jurisdiction');
      if (!formData['pep_since']) missingFields.push('Since (YYYY-MM)');

      // Validate date format for pep_since
      if (formData['pep_since'] && !/^\d{4}-\d{2}$/.test(formData['pep_since'])) {
        toast.error('Start month must be in YYYY-MM format');
        return;
      }

      // Required for FORMER statuses
      if (pepStatus.includes('FORMER')) {
        if (!formData['pep_until']) missingFields.push('Until (YYYY-MM)');
        
        // Validate date format for pep_until
        if (formData['pep_until'] && !/^\d{4}-\d{2}$/.test(formData['pep_until'])) {
          toast.error('End month must be in YYYY-MM format');
          return;
        }

        // Validate that until >= since
        if (formData['pep_since'] && formData['pep_until']) {
          if (formData['pep_until'] < formData['pep_since']) {
            toast.error('End month cannot be earlier than start month');
            return;
          }
        }
      }

      // Required for FAMILY/ASSOCIATE statuses
      if (pepStatus.includes('FAMILY') || pepStatus.includes('ASSOCIATE')) {
        if (!formData['relationship_to_pep']) missingFields.push('Relationship to PEP');
      }
    }

    // Special validation for Employment fields (conditionally required)
    const employmentStatus = formData['employment_status'];
    if (employmentStatus) {
      if (['EMPLOYED_FT', 'EMPLOYED_PT'].includes(employmentStatus)) {
        if (!formData['employer_name']) missingFields.push('Employer Name');
        if (!formData['job_title']) missingFields.push('Job Title / Role');
        if (!formData['industry']) missingFields.push('Industry / Sector');
        if (!formData['employment_country']) missingFields.push('Country of Employment');
        if (!formData['employment_years']) missingFields.push('Length of Employment');
        if (!formData['income_band_monthly']) missingFields.push('Monthly Net Income Band');
      } else if (employmentStatus === 'SELF_EMPLOYED') {
        if (!formData['biz_name']) missingFields.push('Business / Trade Name');
        if (!formData['biz_activity']) missingFields.push('Business Activity / Industry');
        if (!formData['biz_country']) missingFields.push('Business Country');
        if (!formData['biz_years']) missingFields.push('Years in Business');
        if (!formData['revenue_band_annual']) missingFields.push('Annual Revenue Band');
      } else if (employmentStatus === 'STUDENT') {
        if (!formData['institution_name']) missingFields.push('Institution Name');
        if (!formData['student_funding_source']) missingFields.push('Funding Source');
      } else if (employmentStatus === 'OTHER') {
        if (!formData['other_employment_note'] || formData['other_employment_note'].length < 3) {
          toast.error('Please describe your situation (min 3 characters)');
          return;
        }
      }
    }

    // Special validation for Purpose note (conditionally required)
    const purpose = formData['purpose'];
    if (purpose === 'other' || purpose === 'business_payments') {
      if (!formData['purpose_note'] || formData['purpose_note'].length < 10) {
        toast.error('Please provide additional details (min 10 characters) for your purpose');
        return;
      }
    }

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
      // Validate ALL required fields from all steps
      const missingFields: string[] = [];
      
      // Get all enabled required fields
      const requiredFieldsList = fields.filter(f => f.isEnabled && f.isRequired);
      
      requiredFieldsList.forEach(field => {
        if (!formData[field.fieldName]) {
          missingFields.push(field.label);
        }
      });

      // Add conditional validations
      // PEP validations
      const pepStatus = formData['pep_status'];
      if (pepStatus && pepStatus !== 'NO') {
        if (!formData['pep_role_title']) missingFields.push('PEP Role / Title');
        if (!formData['pep_institution']) missingFields.push('Institution / Body');
        if (!formData['pep_country']) missingFields.push('Country / Jurisdiction');
        if (!formData['pep_since']) missingFields.push('Since (YYYY-MM)');
        
        if (pepStatus.includes('FORMER') && !formData['pep_until']) {
          missingFields.push('Until (YYYY-MM)');
        }
        
        if ((pepStatus.includes('FAMILY') || pepStatus.includes('ASSOCIATE')) && !formData['relationship_to_pep']) {
          missingFields.push('Relationship to PEP');
        }
      }

      // Employment validations
      const employmentStatus = formData['employment_status'];
      if (employmentStatus) {
        if (['EMPLOYED_FT', 'EMPLOYED_PT'].includes(employmentStatus)) {
          if (!formData['employer_name']) missingFields.push('Employer Name');
          if (!formData['job_title']) missingFields.push('Job Title / Role');
          if (!formData['industry']) missingFields.push('Industry / Sector');
          if (!formData['employment_country']) missingFields.push('Country of Employment');
          if (!formData['employment_years']) missingFields.push('Length of Employment');
          if (!formData['income_band_monthly']) missingFields.push('Monthly Net Income Band');
        } else if (employmentStatus === 'SELF_EMPLOYED') {
          if (!formData['biz_name']) missingFields.push('Business / Trade Name');
          if (!formData['biz_activity']) missingFields.push('Business Activity / Industry');
          if (!formData['biz_country']) missingFields.push('Business Country');
          if (!formData['biz_years']) missingFields.push('Years in Business');
          if (!formData['revenue_band_annual']) missingFields.push('Annual Revenue Band');
        } else if (employmentStatus === 'STUDENT') {
          if (!formData['institution_name']) missingFields.push('Institution Name');
          if (!formData['student_funding_source']) missingFields.push('Funding Source');
        } else if (employmentStatus === 'OTHER') {
          if (!formData['other_employment_note'] || formData['other_employment_note'].length < 3) {
            missingFields.push('Employment situation description (min 3 chars)');
          }
        }
      }

      // Purpose validations
      const purpose = formData['purpose'];
      if (purpose === 'other' || purpose === 'business_payments') {
        if (!formData['purpose_note'] || formData['purpose_note'].length < 10) {
          missingFields.push('Purpose additional details (min 10 chars)');
        }
      }

      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.slice(0, 5).join(', ')}${missingFields.length > 5 ? ` and ${missingFields.length - 5} more` : ''}`);
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

      console.log('✅ Profile data saved!');

      // Then, start KYC session (if not exists)
      console.log('🔐 Creating/getting KYC session...');
      const kycResponse = await fetch('/api/kyc/start', {
        method: 'POST'
      });
      
      const kycData = await kycResponse.json();
      
      if (!kycData.success) {
        toast.error(kycData.error || 'Failed to start KYC verification');
        throw new Error(kycData.error || 'Failed to start KYC verification');
      }

      console.log('✅ KYC session created!');

      // Now save ALL form data to KycFormData
      console.log('💾 Saving form data to database...');
      const formDataResponse = await fetch('/api/kyc/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData })
      });

      if (!formDataResponse.ok) {
        const errorData = await formDataResponse.json();
        console.error('Form data save error:', errorData);
        throw new Error(errorData.error || 'Failed to save form data');
      }

      const formDataResult = await formDataResponse.json();
      console.log('✅ Form data saved!', formDataResult.fieldsSaved, 'fields');
      toast.success(`All data saved successfully! (${formDataResult.fieldsSaved} fields)`);

      // Finally, open KYCAID form if available
      if (kycData.formUrl) {
        toast.success('Opening verification form...');
        // Open KYCAID form in new window
        window.open(kycData.formUrl, '_blank', 'width=800,height=900');
        // Reload to show status
        setTimeout(() => {
          fetchKycStatus();
        }, 2000);
      } else {
        // Just reload status
        setTimeout(() => {
          fetchKycStatus();
        }, 1000);
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
        // Special placeholder for PEP date fields
        let placeholder = field.label;
        if (field.fieldName === 'pep_since' || field.fieldName === 'pep_until') {
          placeholder = 'YYYY-MM (e.g., 2020-05)';
        } else if (field.fieldName === 'employer_name') {
          placeholder = 'e.g., ACME Sp. z o.o.';
        }
        
    return (
          <Input
            {...commonProps}
            type={field.fieldType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
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
            onDateChange={(date) => {
              if (!date) {
                onChange(null);
                return;
              }
              
              // Format date as YYYY-MM-DD in local timezone to avoid timezone shifts
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const localDateString = `${year}-${month}-${day}`;
              
              console.log('📅 DatePicker selected:', {
                original: date,
                formatted: localDateString,
                fieldName: field.fieldName
              });
              
              onChange(localDateString);
            }}
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
        
        // Special handling for pep_country
        if (field.fieldName === 'pep_country') {
          return (
            <CountryDropdown
              defaultValue={value}
              onChange={(country) => onChange(country.alpha3)}
              placeholder={`Select ${field.label}`}
            />
          );
        }

        // Special handling for employment_country and biz_country
        if (field.fieldName === 'employment_country' || field.fieldName === 'biz_country') {
          return (
            <CountryDropdown
              defaultValue={value}
              onChange={(country) => onChange(country.alpha3)}
              placeholder={`Select ${field.label}`}
            />
          );
        }

        // Special handling for employment_status with labels
        if (field.fieldName === 'employment_status') {
          const employmentLabels: Record<string, string> = {
            EMPLOYED_FT: 'Employed (Full-time)',
            EMPLOYED_PT: 'Employed (Part-time)',
            SELF_EMPLOYED: 'Self-employed / Sole trader',
            UNEMPLOYED: 'Unemployed',
            STUDENT: 'Student',
            RETIRED: 'Retired',
            HOMEMAKER: 'Homemaker / Caregiver',
            OTHER: 'Other',
          };

          return (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Employment Status" />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {employmentLabels[opt] || opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        // Special handling for student_funding_source with labels
        if (field.fieldName === 'student_funding_source') {
          const fundingLabels: Record<string, string> = {
            family: 'Family support',
            scholarship: 'Scholarship/Grant',
            part_time: 'Part-time work',
            savings: 'Savings',
            other: 'Other',
          };

          return (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select funding source" />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {fundingLabels[opt] || opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        // Special handling for primary_source_of_funds with labels
        if (field.fieldName === 'primary_source_of_funds') {
          const sofLabels: Record<string, string> = {
            salary: 'Salary/wages',
            business: 'Business income (self-employed)',
            investments: 'Investments (stocks/bonds/funds)',
            savings: 'Savings',
            pension: 'Pension',
            gift_inheritance: 'Gift/Inheritance',
            benefits: 'State benefits',
            other: 'Other',
          };

          return (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select primary source of funds" />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {sofLabels[opt] || opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        // Special handling for purpose with labels
        if (field.fieldName === 'purpose') {
          const purposeLabels: Record<string, string> = {
            personal_buy: 'Buy crypto for personal use',
            investment: 'Long-term investment',
            remittance: 'Remittance to family/friends',
            business_payments: 'Business payments (own company)',
            trading: 'Trading/speculation',
            other: 'Other',
          };

          return (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {purposeLabels[opt] || opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        // Special handling for dest_wallet_type with labels
        if (field.fieldName === 'dest_wallet_type') {
          const walletLabels: Record<string, string> = {
            self_custody: 'Self-custody',
            custodial: 'Custodial (exchange/wallet provider)',
          };

          return (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select wallet type" />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {walletLabels[opt] || opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        // Special handling for expected_payment_methods with labels
        if (field.fieldName === 'expected_payment_methods') {
          const methodLabels: Record<string, string> = {
            card: 'Card',
            bank: 'Bank transfer',
          };

          return (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment methods" />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {methodLabels[opt] || opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        // Special handling for pep_status with labels
        if (field.fieldName === 'pep_status') {
          const pepLabels: Record<string, string> = {
            NO: 'No (Not a PEP)',
            SELF_CURRENT: 'Yes — Self (Current)',
            SELF_FORMER: 'Yes — Self (Former)',
            FAMILY_CURRENT: 'Yes — Family Member (Current)',
            FAMILY_FORMER: 'Yes — Family Member (Former)',
            ASSOCIATE_CURRENT: 'Yes — Close Associate (Current)',
            ASSOCIATE_FORMER: 'Yes — Close Associate (Former)',
          };

          return (
            <Select value={value} onValueChange={(val) => {
              onChange(val);
              // Clear PEP subform if user selects NO
              if (val === 'NO') {
                setPepSubForm({
                  pep_role_title: '',
                  pep_institution: '',
                  pep_country: '',
                  pep_since: '',
                  pep_until: '',
                  relationship_to_pep: '',
                  pep_additional_info: '',
                });
                // Also clear these from formData
                setFormData({
                  ...formData,
                  pep_status: val,
                  pep_role_title: '',
                  pep_institution: '',
                  pep_country: '',
                  pep_since: '',
                  pep_until: '',
                  relationship_to_pep: '',
                  pep_additional_info: '',
                });
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select PEP Status" />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {pepLabels[opt] || opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        // Special handling for relationship_to_pep with labels
        if (field.fieldName === 'relationship_to_pep') {
          const relationLabels: Record<string, string> = {
            spouse_partner: 'Spouse/Partner',
            parent: 'Parent',
            child: 'Child',
            sibling: 'Sibling',
            other: 'Other',
          };

          return (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {relationLabels[opt] || opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        
        // Default country dropdown for other country fields
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

      case 'multiselect':
        // Parse options
        let multiselectOptions = field.options || [];
        if (typeof multiselectOptions === 'string') {
          try {
            multiselectOptions = JSON.parse(multiselectOptions);
          } catch (e) {
            multiselectOptions = [];
          }
        }

        // Get labels for specific fields
        const getMultiselectLabels = (fieldName: string): Record<string, string> => {
          if (fieldName === 'additional_sources') {
            return {
              salary: 'Salary/wages',
              business: 'Business income',
              savings: 'Savings',
              investments: 'Investments',
              pension: 'Pension',
              gift_inheritance: 'Gift/Inheritance',
              benefits: 'State benefits',
              other: 'Other',
            };
          }
          if (fieldName === 'expected_assets') {
            return {
              BTC: 'BTC',
              ETH: 'ETH',
              USDT: 'USDT',
              USDC: 'USDC',
              SOL: 'SOL',
              other: 'Other',
            };
          }
          if (fieldName === 'expected_payment_methods') {
            return {
              card: 'Card',
              bank: 'Bank transfer',
            };
          }
          return {};
        };

        const multiselectLabels = getMultiselectLabels(field.fieldName);
        const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);

    return (
          <div className="space-y-2">
            {multiselectOptions.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.fieldName}-${option}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, option]
                      : selectedValues.filter((v) => v !== option);
                    onChange(newValues);
                  }}
                />
                <label
                  htmlFor={`${field.fieldName}-${option}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {multiselectLabels[option] || option}
                </label>
              </div>
            ))}
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
              {/* Category Header */}
              {category === 'pep_sanctions' ? (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    PEP & Sanctions
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    PEP information is required for AML risk assessment. Sanctions screening is performed automatically.
                  </p>
                </div>
              ) : category === 'employment' ? (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Employment & Source of Funds
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Used for AML risk assessment. We only ask for ranges.
                  </p>
                </div>
              ) : category === 'purpose' ? (
                <h3 className="text-lg font-semibold">Purpose of Account</h3>
              ) : category === 'funds' ? (
                <h3 className="text-lg font-semibold">Source of Funds</h3>
              ) : category === 'activity' ? (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Expected Activity</h3>
                  <p className="text-sm text-muted-foreground">
                    Help us understand your planned usage patterns
                  </p>
                </div>
              ) : (
                <h3 className="text-lg font-semibold capitalize">
                  {category.replace(/_/g, ' ')}
                </h3>
              )}

              <div className="grid gap-4">
                {categoryFields.map(field => {
                  // Get tooltip for all fields
                  const getFieldTooltip = (fieldName: string): string | null => {
                    const tooltips: Record<string, string> = {
                      // PEP tooltips
                      pep_status: 'PEP (Politically Exposed Person) — an individual who is or has been entrusted with a prominent public function (e.g., heads of state, ministers, MPs, judges, senior military, state-owned enterprise executives). Family members include spouse/partner, parents, children and their spouses/partners. Close associates are people known to have close business or personal ties with a PEP.',
                      pep_role_title: 'The public function or position held by the PEP.',
                      pep_institution: 'Name of the public institution, state body or state-owned enterprise.',
                      pep_country: 'Country where the public function is/was held.',
                      pep_since: 'Month and year when the PEP role started.',
                      pep_until: 'Month and year when the PEP role ended.',
                      relationship_to_pep: 'Your relationship to the PEP. Choose \'other\' if none of the above apply.',
                      pep_additional_info: 'Provide clarifications that help our compliance team evaluate the exposure.',
                      pep_evidence_file: 'Optional proof (e.g., public registry entry, official letter, news reference).',
                      // Employment tooltips
                      employment_status: 'Your current work situation. Choose \'Other\' if none apply.',
                      income_band_monthly: 'Pick a range, not the exact amount.',
                      revenue_band_annual: 'Pick a range, not the exact amount.',
                      industry: 'Your employer\'s (or your) business sector.',
                      // Step 4 tooltips
                      purpose: 'Main intended use of the service.',
                      primary_source_of_funds: 'Main origin of the money you will use with us.',
                      additional_sources: 'Any additional funding sources (optional).',
                      expected_avg_monthly: 'Pick a range, not the exact amount.',
                      expected_max_ticket: 'Pick a range, not the exact amount.',
                      expected_frequency_per_month: 'How often you plan to make transactions.',
                      expected_payment_methods: 'Payment methods you intend to use.',
                      expected_assets: 'Which cryptocurrencies you plan to buy.',
                      dest_wallet_type: 'If you use a self-custody wallet, ownership checks may apply for transfers over €1,000 (EU Travel Rule).',
                    };
                    return tooltips[fieldName] || null;
                  };

                  // Determine if PEP subfield should be shown
                  const pepStatus = formData['pep_status'];
                  const isPepSubField = ['pep_role_title', 'pep_institution', 'pep_country', 'pep_since', 'pep_until', 'relationship_to_pep', 'pep_additional_info', 'pep_evidence_file'].includes(field.fieldName);
                  
                  // Hide ALL PEP subfields if status is NO or not selected
                  if (isPepSubField && (!pepStatus || pepStatus === 'NO')) {
                    return null;
                  }

                  // Hide 'Until' field for ALL CURRENT statuses (not needed for current positions)
                  if (field.fieldName === 'pep_until' && pepStatus && pepStatus.includes('CURRENT')) {
                    return null;
                  }

                  // Hide 'Relationship' field for SELF statuses (only for FAMILY/ASSOCIATE)
                  if (field.fieldName === 'relationship_to_pep' && pepStatus && pepStatus.startsWith('SELF_')) {
                    return null;
                  }

                  // Determine if Employment subfield should be shown
                  const employmentStatus = formData['employment_status'];
                  const isEmployedField = ['employer_name', 'job_title', 'industry', 'employment_country', 'employment_years', 'income_band_monthly'].includes(field.fieldName);
                  const isSelfEmployedField = ['biz_name', 'biz_activity', 'biz_country', 'biz_years', 'revenue_band_annual', 'tax_or_reg_number'].includes(field.fieldName);
                  const isStudentField = ['institution_name', 'student_funding_source'].includes(field.fieldName);
                  const isOtherEmploymentField = field.fieldName === 'other_employment_note';

                  // Determine if Purpose note should be shown
                  const purpose = formData['purpose'];
                  const isPurposeNote = field.fieldName === 'purpose_note';
                  if (isPurposeNote && purpose !== 'other' && purpose !== 'business_payments') {
                    return null;
                  }

                  // Hide employment subfields based on status
                  if (isEmployedField && (!employmentStatus || !['EMPLOYED_FT', 'EMPLOYED_PT'].includes(employmentStatus))) {
                    return null;
                  }
                  if (isSelfEmployedField && employmentStatus !== 'SELF_EMPLOYED') {
                    return null;
                  }
                  if (isStudentField && employmentStatus !== 'STUDENT') {
                    return null;
                  }
                  if (isOtherEmploymentField && employmentStatus !== 'OTHER') {
                    return null;
                  }

                  const tooltip = getFieldTooltip(field.fieldName);
                  const isConditionallyRequired = (isPepSubField && pepStatus && pepStatus !== 'NO') || 
                                                   (isEmployedField && employmentStatus && ['EMPLOYED_FT', 'EMPLOYED_PT'].includes(employmentStatus)) ||
                                                   (isSelfEmployedField && employmentStatus === 'SELF_EMPLOYED' && field.fieldName !== 'tax_or_reg_number') ||
                                                   (isStudentField && employmentStatus === 'STUDENT') ||
                                                   (isOtherEmploymentField && employmentStatus === 'OTHER');

                  return (
                    <div key={field.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={field.fieldName}>
                          {field.label}
                          {(field.isRequired || isConditionallyRequired) && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {tooltip && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                type="button" 
                                className="inline-flex shrink-0"
                                aria-label="Help"
                              >
                                <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-sm">{tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      {renderField(field)}
                    </div>
                  );
                })}
              </div>

              {/* Sanctions Note for PEP category */}
              {category === 'pep_sanctions' && (
                <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                    Sanctions and adverse media screening is performed automatically. You do not need to provide this information manually.
                  </AlertDescription>
                </Alert>
              )}

              {/* Self-custody wallet notice */}
              {category === 'activity' && formData['dest_wallet_type'] === 'self_custody' && (
                <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                    For transfers over €1,000 you may be asked to confirm ownership (e.g., message signature) in accordance with EU Travel Rule.
                  </AlertDescription>
                </Alert>
              )}

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
          <CardContent className="space-y-6">
            {kycSession.status === 'PENDING' && (
              <div className="space-y-6">
                {/* Header with icon */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Camera className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Complete Your Verification</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Upload documents and take a selfie • Takes 5-7 minutes
                    </p>
                  </div>
                </div>

                {/* Sumsub - Choice between Desktop WebSDK or Mobile QR */}
                {kycSession.kycProviderId === 'sumsub' && session?.user?.id ? (
                  <>
                    {/* Main action area - similar to KYCAID */}
                    <div className="grid md:grid-cols-[2fr,1fr] gap-8 items-center">
                      {/* Left: Desktop WebSDK option */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <ExternalLink className="h-4 w-4" />
                          Continue on this device
                        </div>
                        <Button 
                          className="w-full"
                          size="lg"
                          onClick={async () => {
                            try {
                              toast.info('Loading verification interface...');
                              
                              // 1. Fetch SDK token
                              const response = await fetch('/api/kyc/sdk-token');
                              if (!response.ok) {
                                throw new Error('Failed to get SDK token');
                              }
                              const { token } = await response.json();
                              
                              // 2. Create modal
                              const modal = document.createElement('div');
                              modal.id = 'sumsub-modal';
                              modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
                              modal.innerHTML = `
                                <div class="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto relative">
                                  <button id="close-modal" class="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                  </button>
                                  <div id="sumsub-websdk-container" class="p-6 min-h-[600px]"></div>
                                </div>
                              `;
                              document.body.appendChild(modal);
                              
                              // 3. Close button handler
                              const closeBtn = document.getElementById('close-modal');
                              closeBtn?.addEventListener('click', () => {
                                modal.remove();
                              });
                              
                              // 4. Load Sumsub SDK script
                              const loadScript = () => {
                                return new Promise((resolve, reject) => {
                                  if (document.getElementById('sumsub-websdk-script')) {
                                    resolve(true);
                                    return;
                                  }
                                  const script = document.createElement('script');
                                  script.id = 'sumsub-websdk-script';
                                  script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';
                                  script.async = true;
                                  script.onload = () => resolve(true);
                                  script.onerror = () => reject(new Error('Failed to load SDK'));
                                  document.body.appendChild(script);
                                });
                              };
                              
                              await loadScript();
                              
                              // 5. Initialize WebSDK
                              const snsWebSdk = (window as any).snsWebSdk;
                              if (!snsWebSdk) {
                                throw new Error('Sumsub SDK not loaded');
                              }
                              
                              const instance = snsWebSdk
                                .init(
                                  token,
                                  async () => {
                                    // Token refresh callback
                                    const refreshResponse = await fetch('/api/kyc/sdk-token');
                                    const refreshData = await refreshResponse.json();
                                    return refreshData.token;
                                  }
                                )
                                .withConf({
                                  lang: 'en',
                                  theme: 'light'
                                })
                                .on('idCheck.onApplicantSubmitted', () => {
                                  toast.success('Verification submitted! Please wait for review.');
                                  modal.remove();
                                  fetchKycStatus(true);
                                })
                                .on('idCheck.onError', (error: any) => {
                                  toast.error('Verification error: ' + (error.message || 'Unknown error'));
                                })
                                .build();
                              
                              // 6. Launch SDK
                              instance.launch('#sumsub-websdk-container');
                              
                            } catch (error: any) {
                              toast.error('Failed to load verification: ' + error.message);
                              console.error('Sumsub modal error:', error);
                            }
                          }}
                        >
                          <Camera className="h-5 w-5 mr-2" />
                          Start Verification
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Opens verification interface in a modal window
                        </p>
                      </div>

                      {/* Right: Mobile QR */}
                      <div className="flex flex-col items-center justify-center gap-3 md:border-l md:pl-8 py-2">
                        <div className="text-xs font-medium text-muted-foreground text-center">
                          Or scan with phone
                        </div>
                        {sumsubMobileUrl ? (
                          <QRCode
                            className="size-32 rounded-lg border bg-background p-2.5 shadow-sm hover:shadow-md transition-all"
                            data={sumsubMobileUrl}
                          />
                        ) : (
                          <div className="size-32 rounded-lg border bg-muted flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground text-center">
                          Complete on mobile
                        </p>
                      </div>
                    </div>

                    {/* What to prepare - compact */}
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-md bg-background p-2 mt-0.5">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <p className="text-sm font-medium">What you'll need</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li className="flex items-start gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                              <span>Government-issued ID (passport or ID card)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                              <span>Good lighting for selfie and document photos</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                              <span>5-7 minutes of your time</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Info alert */}
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        Your documents are being reviewed by our team. This usually takes 2-4 hours.
                      </AlertDescription>
                    </Alert>
                  </>
                ) : kycSession.kycProviderId === 'sumsub' ? (
                  <Alert>
                    <AlertDescription>
                      Debug: Sumsub provider detected but session user ID is missing. 
                      Provider: {kycSession.kycProviderId}, Session: {session?.user?.id || 'undefined'}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {/* KYCAID QR Code (if KYCAID is active provider) */}
                {kycSession.kycProviderId === 'kycaid' && kycSession.formUrl ? (
                  <>
                    {/* Main action area */}
                    <div className="grid md:grid-cols-[2fr,1fr] gap-8 items-center">
                      {/* Left: Desktop option */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <ExternalLink className="h-4 w-4" />
                          Continue on this device
                        </div>
                        <Button 
                          className="w-full"
                          size="lg"
                          onClick={() => window.open(kycSession.formUrl!, '_blank', 'width=800,height=900')}
                        >
                          <FileText className="h-5 w-5 mr-2" />
                          Open Verification Form
                        </Button>
                      </div>

                      {/* Right: Mobile QR */}
                      <div className="flex flex-col items-center justify-center gap-3 md:border-l md:pl-8 py-2">
                        <div className="text-xs font-medium text-muted-foreground text-center">
                          Or scan with phone
                        </div>
                        <QRCode
                          className="size-32 rounded-lg border bg-background p-2.5 shadow-sm hover:shadow-md transition-all"
                          data={kycSession.formUrl}
                        />
                      </div>
                    </div>

                    {/* What to prepare - compact */}
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-md bg-background p-2 mt-0.5">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <p className="text-sm font-medium">What you'll need</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                              <span>Government-issued ID (passport or ID card)</span>
                </li>
                <li className="flex items-start gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                              <span>Well-lit environment for selfie</span>
                </li>
              </ul>
            </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Your documents are being reviewed by our team. This usually takes 2-4 hours.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {kycSession.status === 'APPROVED' && (
              <div className="space-y-6">
                {/* Success header */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Verification Complete!</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      You now have full access to all features
                    </p>
                  </div>
            </div>

                {/* CTA */}
                <Button 
                  className="w-full"
                  size="lg"
                  onClick={() => window.location.href = '/buy'}
                >
                  Start Trading
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {kycSession.status === 'REJECTED' && (
              <div className="space-y-6">
                {/* Error header */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="rounded-lg bg-destructive/10 p-3">
                    <XCircle className="h-7 w-7 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Verification Not Approved</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Please review the information below
                    </p>
                  </div>
                </div>

                {/* Reason */}
                {kycSession.rejectionReason && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {kycSession.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Next steps - compact */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-background p-2 mt-0.5">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <p className="text-sm font-medium">What to do next</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                          <span>Contact our support team for details</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                          <span>Ensure your documents are clear and valid</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                          <span>You may reapply after addressing issues</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <Button 
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={() => window.location.href = '/profile'}
                >
                  Contact Support
            </Button>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => fetchKycStatus(true)}
                disabled={isRefreshing}
                className="w-full hover:bg-primary/5 hover:border-primary/30 transition-all"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </>
                )}
              </Button>
            </div>
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
    <TooltipProvider>
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
            {currentStep === 3 
              ? 'Employment, Source of Funds & PEP details — used for AML/CFT risk assessment'
              : currentStep === 4
              ? 'Used for AML risk assessment. We only ask for ranges.'
              : 'Please fill in all required fields marked with *'
            }
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
    </TooltipProvider>
  );
}
