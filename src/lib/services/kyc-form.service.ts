/**
 * KYC Form Service
 * 
 * Manages dynamic KYC forms and field configuration
 */

import prisma from '@/lib/prisma';
import { z } from 'zod';

export interface KycFormFieldConfig {
  id: string;
  fieldName: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  isEnabled: boolean;
  category: string;
  validation: any;
  options: any;
  priority: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

class KycFormService {
  /**
   * Get all enabled KYC fields
   */
  async getEnabledFields(): Promise<KycFormFieldConfig[]> {
    return await prisma.kycFormField.findMany({
      where: { isEnabled: true },
      orderBy: { priority: 'asc' }
    });
  }

  /**
   * Get all KYC fields (admin)
   */
  async getAllFields(): Promise<KycFormFieldConfig[]> {
    return await prisma.kycFormField.findMany({
      orderBy: { priority: 'asc' }
    });
  }

  /**
   * Update field status (enable/disable)
   */
  async updateFieldStatus(fieldId: string, isEnabled: boolean): Promise<any> {
    return await prisma.kycFormField.update({
      where: { id: fieldId },
      data: { isEnabled }
    });
  }

  /**
   * Update field configuration
   */
  async updateField(
    fieldId: string,
    data: {
      label?: string;
      isRequired?: boolean;
      isEnabled?: boolean;
      validation?: any;
      options?: any;
      priority?: number;
    }
  ): Promise<any> {
    return await prisma.kycFormField.update({
      where: { id: fieldId },
      data
    });
  }

  /**
   * Validate form data against field configuration
   */
  async validateFormData(data: Record<string, any>): Promise<ValidationResult> {
    const fields = await this.getEnabledFields();
    const errors: Array<{ field: string; message: string }> = [];

    for (const field of fields) {
      const value = data[field.fieldName];

      // Check required fields
      if (field.isRequired && (!value || value === '')) {
        errors.push({
          field: field.fieldName,
          message: `${field.label} is required`
        });
        continue;
      }

      // Skip validation if field is empty and not required
      if (!value && !field.isRequired) {
        continue;
      }

      // Type-specific validation
      if (field.fieldType === 'text' || field.fieldType === 'select') {
        if (typeof value !== 'string') {
          errors.push({
            field: field.fieldName,
            message: `${field.label} must be a string`
          });
        }
      }

      if (field.fieldType === 'number') {
        if (typeof value !== 'number' && isNaN(Number(value))) {
          errors.push({
            field: field.fieldName,
            message: `${field.label} must be a number`
          });
        }
      }

      if (field.fieldType === 'date') {
        if (isNaN(Date.parse(value))) {
          errors.push({
            field: field.fieldName,
            message: `${field.label} must be a valid date`
          });
        }
      }

      // Custom validation rules from field.validation JSON
      if (field.validation) {
        const validationErrors = this.applyCustomValidation(
          value,
          field.validation,
          field.label
        );
        errors.push(...validationErrors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Apply custom validation rules
   */
  private applyCustomValidation(
    value: any,
    rules: any,
    fieldLabel: string
  ): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];

    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      errors.push({
        field: fieldLabel,
        message: `Must be at least ${rules.minLength} characters`
      });
    }

    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      errors.push({
        field: fieldLabel,
        message: `Must be no more than ${rules.maxLength} characters`
      });
    }

    if (rules.pattern && typeof value === 'string') {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        errors.push({
          field: fieldLabel,
          message: rules.patternMessage || 'Invalid format'
        });
      }
    }

    if (rules.min && typeof value === 'number' && value < rules.min) {
      errors.push({
        field: fieldLabel,
        message: `Must be at least ${rules.min}`
      });
    }

    if (rules.max && typeof value === 'number' && value > rules.max) {
      errors.push({
        field: fieldLabel,
        message: `Must be no more than ${rules.max}`
      });
    }

    return errors;
  }

  /**
   * Save form data to database
   */
  async saveFormData(
    sessionId: string,
    data: Record<string, any>
  ): Promise<void> {
    // Validate first
    const validation = await this.validateFormData(data);
    
    if (!validation.valid) {
      throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
    }

    // Save each field
    const savePromises = Object.entries(data).map(([fieldName, fieldValue]) => {
      return prisma.kycFormData.upsert({
        where: {
          kycSessionId_fieldName: {
            kycSessionId: sessionId,
            fieldName
          }
        },
        update: {
          fieldValue: String(fieldValue)
        },
        create: {
          kycSessionId: sessionId,
          fieldName,
          fieldValue: String(fieldValue)
        }
      });
    });

    await Promise.all(savePromises);
  }

  /**
   * Get saved form data
   */
  async getFormData(sessionId: string): Promise<Record<string, any>> {
    const formData = await prisma.kycFormData.findMany({
      where: { kycSessionId: sessionId }
    });

    const result: Record<string, any> = {};

    for (const item of formData) {
      result[item.fieldName] = item.fieldValue;
    }

    return result;
  }

  /**
   * Get fields grouped by category
   */
  async getFieldsByCategory(): Promise<Record<string, KycFormFieldConfig[]>> {
    const fields = await this.getEnabledFields();
    
    const grouped: Record<string, KycFormFieldConfig[]> = {
      personal: [],
      address: [],
      documents: []
    };

    for (const field of fields) {
      if (!grouped[field.category]) {
        grouped[field.category] = [];
      }
      grouped[field.category].push(field);
    }

    return grouped;
  }
}

// Export singleton instance
export const kycFormService = new KycFormService();




