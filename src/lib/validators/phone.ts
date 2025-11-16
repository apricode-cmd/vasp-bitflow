/**
 * Phone Number Validation Utilities
 * 
 * Validates international phone numbers using react-phone-number-input
 */

import { 
  isValidPhoneNumber, 
  isPossiblePhoneNumber,
  parsePhoneNumber,
  type E164Number 
} from 'react-phone-number-input';

export interface PhoneValidationResult {
  isValid: boolean;
  isPossible: boolean;
  error: string | null;
  country?: string;
  nationalNumber?: string;
  internationalFormat?: string;
}

/**
 * Phone validation error messages
 */
export const PHONE_ERRORS = {
  REQUIRED: 'Номер телефона обязателен',
  INVALID_FORMAT: 'Неверный формат номера телефона',
  TOO_SHORT: 'Номер телефона слишком короткий',
  TOO_LONG: 'Номер телефона слишком длинный',
  INVALID_COUNTRY: 'Неверный код страны',
  NOT_POSSIBLE: 'Этот номер телефона выглядит недействительным',
  INVALID_PATTERN: 'Номер содержит недопустимые символы'
} as const;

/**
 * Validate phone number (strict)
 * Use for form submission
 */
export function validatePhone(value: string | undefined): PhoneValidationResult {
  // Empty check
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      isPossible: false,
      error: null // Don't show error for empty (handle with required validation)
    };
  }

  // Check if possible (loose check)
  const possible = isPossiblePhoneNumber(value);
  if (!possible) {
    return {
      isValid: false,
      isPossible: false,
      error: PHONE_ERRORS.NOT_POSSIBLE
    };
  }

  // Check if valid (strict check)
  const valid = isValidPhoneNumber(value);
  if (!valid) {
    return {
      isValid: false,
      isPossible: true,
      error: PHONE_ERRORS.INVALID_FORMAT
    };
  }

  // Parse phone number for additional info
  try {
    const phoneNumber = parsePhoneNumber(value);
    
    if (phoneNumber) {
      return {
        isValid: true,
        isPossible: true,
        error: null,
        country: phoneNumber.country,
        nationalNumber: phoneNumber.nationalNumber,
        internationalFormat: phoneNumber.formatInternational()
      };
    }
  } catch (error) {
    // Parsing failed but isValidPhoneNumber passed
    // This shouldn't happen, but just in case
  }

  // Fallback: valid but couldn't parse
  return {
    isValid: true,
    isPossible: true,
    error: null
  };
}

/**
 * Quick validation check (for real-time feedback)
 * Less strict, just checks if phone looks possible
 */
export function isPhonePossible(value: string | undefined): boolean {
  if (!value || value.trim() === '') return false;
  return isPossiblePhoneNumber(value);
}

/**
 * Strict validation check (for form submission)
 */
export function isPhoneValid(value: string | undefined): boolean {
  if (!value || value.trim() === '') return false;
  return isValidPhoneNumber(value);
}

/**
 * Get phone error message
 */
export function getPhoneError(value: string | undefined, isRequired: boolean = false): string | null {
  if (!value || value.trim() === '') {
    return isRequired ? PHONE_ERRORS.REQUIRED : null;
  }

  const result = validatePhone(value);
  return result.error;
}

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const phoneNumber = parsePhoneNumber(value);
    return phoneNumber?.formatInternational() || value;
  } catch {
    return value;
  }
}

/**
 * Get phone country code
 */
export function getPhoneCountry(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const phoneNumber = parsePhoneNumber(value);
    return phoneNumber?.country || null;
  } catch {
    return null;
  }
}

/**
 * Zod custom validator for phone numbers
 * Use in Zod schemas
 */
export function zodPhoneValidator(value: string | undefined, ctx: any) {
  if (!value || value.trim() === '') {
    // Let required validation handle this
    return true;
  }

  const result = validatePhone(value);
  
  if (!result.isValid) {
    ctx.addIssue({
      code: 'custom',
      message: result.error || PHONE_ERRORS.INVALID_FORMAT,
    });
    return false;
  }

  return true;
}

