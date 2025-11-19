/**
 * Hook for managing KYC form state and validation
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { KycField } from '@/lib/kyc/config';
import { shouldShowField, isFieldConditionallyRequired } from '@/lib/kyc/conditionalLogic';
import { validatePostalCode } from '@/lib/utils/postalCodeValidation';
import { toast } from 'sonner';

const KYC_FORM_STORAGE_KEY = 'kyc-form-draft';

interface UseKycFormReturn {
  formData: Record<string, any>;
  errors: Record<string, string>;
  setFieldValue: (fieldName: string, value: any) => void;
  validateField: (field: KycField) => boolean;
  validateStep: (fields: KycField[]) => boolean;
  validateAll: (fields: KycField[]) => boolean;
  resetForm: () => void;
  setFormData: (data: Record<string, any>) => void;
  clearDraft: () => void;
  saveDraft: () => void;
}

export function useKycForm(initialData: Record<string, any> = {}): UseKycFormReturn {
  const [formData, setFormDataState] = useState<Record<string, any>>(() => {
    // Try to load saved draft from localStorage on mount
    if (typeof window !== 'undefined') {
      try {
        const savedDraft = localStorage.getItem(KYC_FORM_STORAGE_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          console.log('📋 [RESTORE] Form draft restored from localStorage:', Object.keys(parsed).length, 'fields');
          return { ...initialData, ...parsed }; // Merge with initialData
        }
      } catch (error) {
        console.error('Failed to load form draft:', error);
      }
    }
    return initialData;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Manually save draft to localStorage (called on step navigation)
  const saveDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      if (Object.keys(formData).length > 0) {
        localStorage.setItem(KYC_FORM_STORAGE_KEY, JSON.stringify(formData));
        console.log('💾 [SAVE] Form data saved to localStorage:', Object.keys(formData).length, 'fields');
      }
    } catch (error) {
      console.error('Failed to save form draft:', error);
    }
  }, [formData]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(KYC_FORM_STORAGE_KEY);
      console.log('🗑️ [SAVE] Cleared form draft from localStorage');
    }
  }, []);

  const setFieldValue = (fieldName: string, value: any) => {
    setFormDataState(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateField = (field: KycField): boolean => {
    const value = formData[field.fieldName];

    // Required field validation
    if (field.isRequired) {
      if (value === undefined || value === null || value === '') {
        setErrors(prev => ({
          ...prev,
          [field.fieldName]: `${field.label} is required`
        }));
        return false;
      }
    }

    // Type-specific validation
    if (value) {
      switch (field.fieldType) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            setErrors(prev => ({
              ...prev,
              [field.fieldName]: 'Invalid email format'
            }));
            return false;
          }
          break;

        case 'phone':
          // Basic phone validation
          if (value.length < 10) {
            setErrors(prev => ({
              ...prev,
              [field.fieldName]: 'Invalid phone number'
            }));
            return false;
          }
          break;

        case 'date':
          // Check if date is valid
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            setErrors(prev => ({
              ...prev,
              [field.fieldName]: 'Invalid date'
            }));
            return false;
          }

          // Special validation for date of birth (minimum 18 years old)
          const isDateOfBirth = field.fieldName.toLowerCase().includes('birth') || 
                                field.fieldName.toLowerCase().includes('dob');
          
          if (isDateOfBirth) {
            const today = new Date();
            const birthDate = new Date(value);
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            const dayDiff = today.getDate() - birthDate.getDate();
            
            // Calculate exact age
            const exactAge = age - (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? 1 : 0);
            
            if (exactAge < 18) {
              setErrors(prev => ({
                ...prev,
                [field.fieldName]: 'You must be at least 18 years old'
              }));
              return false;
            }
          }
          break;
      }
    }

    // Postal Code validation (special case - not in fieldType)
    const isPostalCode = field.fieldName.toLowerCase().includes('postal') ||
                         field.fieldName.toLowerCase().includes('postcode') ||
                         field.fieldName.toLowerCase().includes('zip');
    
    if (isPostalCode && value) {
      // Get country from form data
      const country = formData?.country || 
                      formData?.address_country || 
                      formData?.residence_country || 
                      formData?.country_of_residence;
      
      if (!country) {
        setErrors(prev => ({
          ...prev,
          [field.fieldName]: 'Please select country first'
        }));
        return false;
      }
      
      // Validate postal code format
      const validation = validatePostalCode(value, country);
      if (!validation.isValid) {
        setErrors(prev => ({
          ...prev,
          [field.fieldName]: validation.error || 'Invalid postal code format'
        }));
        return false;
      }
    }

    // Custom validation rules from field.validation
    if (field.validation) {
      // TODO: Implement custom validation rules
    }

    return true;
  };

  const validateStep = (fields: KycField[]): boolean => {
    let isValid = true;
    const newErrors: Record<string, string> = {};

    // Only validate visible fields
    const visibleFields = fields.filter(field => shouldShowField(field, formData));

    visibleFields.forEach(field => {
      const isRequired = isFieldConditionallyRequired(field, formData);
      if (isRequired && !validateField(field)) {
        isValid = false;
      }
    });

    if (!isValid) {
      toast.error('Please fill in all required fields');
    }

    return isValid;
  };

  const validateAll = (fields: KycField[]): boolean => {
    return validateStep(fields);
  };

  const resetForm = () => {
    setFormDataState({});
    setErrors({});
  };

  const setFormData = (data: Record<string, any>) => {
    setFormDataState(data);
  };

  return {
    formData,
    errors,
    setFieldValue,
    validateField,
    validateStep,
    validateAll,
    resetForm,
    setFormData,
    clearDraft,
    saveDraft
  };
}

