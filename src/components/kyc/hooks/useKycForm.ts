/**
 * Hook for managing KYC form state and validation
 */
'use client';

import { useState } from 'react';
import { KycField } from '@/lib/kyc/config';
import { toast } from 'sonner';

interface UseKycFormReturn {
  formData: Record<string, any>;
  errors: Record<string, string>;
  setFieldValue: (fieldName: string, value: any) => void;
  validateField: (field: KycField) => boolean;
  validateStep: (fields: KycField[]) => boolean;
  validateAll: (fields: KycField[]) => boolean;
  resetForm: () => void;
  setFormData: (data: Record<string, any>) => void;
}

export function useKycForm(initialData: Record<string, any> = {}): UseKycFormReturn {
  const [formData, setFormDataState] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    // Custom validation rules from field.validation
    if (field.validation) {
      // TODO: Implement custom validation rules
    }

    return true;
  };

  const validateStep = (fields: KycField[]): boolean => {
    let isValid = true;
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      if (!validateField(field)) {
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
    setFormData
  };
}

