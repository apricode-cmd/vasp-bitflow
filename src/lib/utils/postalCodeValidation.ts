/**
 * Postal Code Validation
 * 
 * Country-specific postal code format validation
 */

interface PostalCodeFormat {
  pattern: RegExp;
  example: string;
  errorMessage: string;
}

/**
 * Postal code formats by country (ISO 3166-1 alpha-3)
 */
const POSTAL_CODE_FORMATS: Record<string, PostalCodeFormat> = {
  // Europe
  POL: { // Poland
    pattern: /^\d{2}-?\d{3}$/,
    example: '00-001 or 00001',
    errorMessage: 'Invalid Polish postal code (format: 00-000)'
  },
  DEU: { // Germany
    pattern: /^\d{5}$/,
    example: '12345',
    errorMessage: 'Invalid German postal code (5 digits)'
  },
  FRA: { // France
    pattern: /^\d{5}$/,
    example: '75001',
    errorMessage: 'Invalid French postal code (5 digits)'
  },
  GBR: { // United Kingdom
    pattern: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
    example: 'SW1A 1AA',
    errorMessage: 'Invalid UK postcode'
  },
  ITA: { // Italy
    pattern: /^\d{5}$/,
    example: '00100',
    errorMessage: 'Invalid Italian postal code (5 digits)'
  },
  ESP: { // Spain
    pattern: /^\d{5}$/,
    example: '28001',
    errorMessage: 'Invalid Spanish postal code (5 digits)'
  },
  NLD: { // Netherlands
    pattern: /^\d{4}\s?[A-Z]{2}$/i,
    example: '1012 AB',
    errorMessage: 'Invalid Dutch postal code (format: 1234 AB)'
  },
  BEL: { // Belgium
    pattern: /^\d{4}$/,
    example: '1000',
    errorMessage: 'Invalid Belgian postal code (4 digits)'
  },
  AUT: { // Austria
    pattern: /^\d{4}$/,
    example: '1010',
    errorMessage: 'Invalid Austrian postal code (4 digits)'
  },
  CHE: { // Switzerland
    pattern: /^\d{4}$/,
    example: '8000',
    errorMessage: 'Invalid Swiss postal code (4 digits)'
  },
  CZE: { // Czech Republic
    pattern: /^\d{3}\s?\d{2}$/,
    example: '110 00',
    errorMessage: 'Invalid Czech postal code (format: 000 00)'
  },
  
  // North America
  USA: { // United States
    pattern: /^\d{5}(-\d{4})?$/,
    example: '12345 or 12345-6789',
    errorMessage: 'Invalid US ZIP code'
  },
  CAN: { // Canada
    pattern: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
    example: 'K1A 0B1',
    errorMessage: 'Invalid Canadian postal code (format: A1A 1A1)'
  },
  
  // Others
  AUS: { // Australia
    pattern: /^\d{4}$/,
    example: '2000',
    errorMessage: 'Invalid Australian postcode (4 digits)'
  },
  JPN: { // Japan
    pattern: /^\d{3}-?\d{4}$/,
    example: '100-0001',
    errorMessage: 'Invalid Japanese postal code (format: 000-0000)'
  },
  CHN: { // China
    pattern: /^\d{6}$/,
    example: '100000',
    errorMessage: 'Invalid Chinese postal code (6 digits)'
  }
};

/**
 * Validate postal code for a specific country
 */
export function validatePostalCode(
  postalCode: string,
  countryCode: string
): { isValid: boolean; error?: string; example?: string } {
  // Empty postal code
  if (!postalCode || postalCode.trim() === '') {
    return { isValid: false, error: 'Postal code is required' };
  }

  // Trim whitespace
  const trimmedCode = postalCode.trim();

  // Get format for country
  const format = POSTAL_CODE_FORMATS[countryCode];

  // No specific format defined - use generic validation
  if (!format) {
    // Generic: 2-10 alphanumeric characters (with optional spaces/hyphens)
    const genericPattern = /^[A-Z0-9\s\-]{2,10}$/i;
    if (!genericPattern.test(trimmedCode)) {
      return {
        isValid: false,
        error: 'Invalid postal code format (2-10 characters)',
        example: 'e.g., 12345 or AB-123'
      };
    }
    return { isValid: true };
  }

  // Validate against country-specific pattern
  if (!format.pattern.test(trimmedCode)) {
    return {
      isValid: false,
      error: format.errorMessage,
      example: format.example
    };
  }

  return { isValid: true };
}

/**
 * Format postal code for display (add separators)
 */
export function formatPostalCode(postalCode: string, countryCode: string): string {
  if (!postalCode) return '';

  const trimmed = postalCode.replace(/[\s\-]/g, ''); // Remove existing separators

  switch (countryCode) {
    case 'POL': // 00-000
      if (trimmed.length === 5) {
        return `${trimmed.slice(0, 2)}-${trimmed.slice(2)}`;
      }
      break;
    
    case 'GBR': // SW1A 1AA
      if (trimmed.length >= 5) {
        const outward = trimmed.slice(0, -3);
        const inward = trimmed.slice(-3);
        return `${outward} ${inward}`;
      }
      break;
    
    case 'NLD': // 1234 AB
      if (trimmed.length === 6) {
        return `${trimmed.slice(0, 4)} ${trimmed.slice(4)}`;
      }
      break;
    
    case 'CAN': // K1A 0B1
      if (trimmed.length === 6) {
        return `${trimmed.slice(0, 3)} ${trimmed.slice(3)}`;
      }
      break;
    
    case 'JPN': // 100-0001
      if (trimmed.length === 7) {
        return `${trimmed.slice(0, 3)}-${trimmed.slice(3)}`;
      }
      break;
    
    case 'CZE': // 110 00
      if (trimmed.length === 5) {
        return `${trimmed.slice(0, 3)} ${trimmed.slice(3)}`;
      }
      break;
  }

  return postalCode; // Return original if no formatting rule
}

/**
 * Get postal code placeholder by country
 */
export function getPostalCodePlaceholder(countryCode: string): string {
  const format = POSTAL_CODE_FORMATS[countryCode];
  return format ? format.example : 'Enter postal code';
}

