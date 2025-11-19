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
  // ============================================
  // WESTERN EUROPE
  // ============================================
  
  POL: { // Poland 🇵🇱
    pattern: /^\d{2}-?\d{3}$/,
    example: '00-001 or 00001',
    errorMessage: 'Invalid Polish postal code (format: 00-000)'
  },
  DEU: { // Germany 🇩🇪
    pattern: /^\d{5}$/,
    example: '12345',
    errorMessage: 'Invalid German postal code (5 digits)'
  },
  FRA: { // France 🇫🇷
    pattern: /^\d{5}$/,
    example: '75001',
    errorMessage: 'Invalid French postal code (5 digits)'
  },
  GBR: { // United Kingdom 🇬🇧
    pattern: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
    example: 'SW1A 1AA',
    errorMessage: 'Invalid UK postcode'
  },
  IRL: { // Ireland 🇮🇪
    pattern: /^[A-Z]\d{2}\s?[A-Z\d]{4}$/i,
    example: 'D02 AF30',
    errorMessage: 'Invalid Irish Eircode'
  },
  ITA: { // Italy 🇮🇹
    pattern: /^\d{5}$/,
    example: '00100',
    errorMessage: 'Invalid Italian postal code (5 digits)'
  },
  ESP: { // Spain 🇪🇸
    pattern: /^\d{5}$/,
    example: '28001',
    errorMessage: 'Invalid Spanish postal code (5 digits)'
  },
  PRT: { // Portugal 🇵🇹
    pattern: /^\d{4}-?\d{3}$/,
    example: '1000-001',
    errorMessage: 'Invalid Portuguese postal code (format: 0000-000)'
  },
  NLD: { // Netherlands 🇳🇱
    pattern: /^\d{4}\s?[A-Z]{2}$/i,
    example: '1012 AB',
    errorMessage: 'Invalid Dutch postal code (format: 1234 AB)'
  },
  BEL: { // Belgium 🇧🇪
    pattern: /^\d{4}$/,
    example: '1000',
    errorMessage: 'Invalid Belgian postal code (4 digits)'
  },
  LUX: { // Luxembourg 🇱🇺
    pattern: /^\d{4}$/,
    example: '1009',
    errorMessage: 'Invalid Luxembourg postal code (4 digits)'
  },
  AUT: { // Austria 🇦🇹
    pattern: /^\d{4}$/,
    example: '1010',
    errorMessage: 'Invalid Austrian postal code (4 digits)'
  },
  CHE: { // Switzerland 🇨🇭
    pattern: /^\d{4}$/,
    example: '8000',
    errorMessage: 'Invalid Swiss postal code (4 digits)'
  },
  LIE: { // Liechtenstein 🇱🇮
    pattern: /^\d{4}$/,
    example: '9490',
    errorMessage: 'Invalid Liechtenstein postal code (4 digits)'
  },
  
  // ============================================
  // NORTHERN EUROPE (Scandinavia + Baltic)
  // ============================================
  
  SWE: { // Sweden 🇸🇪
    pattern: /^\d{3}\s?\d{2}$/,
    example: '123 45',
    errorMessage: 'Invalid Swedish postal code (format: 000 00)'
  },
  NOR: { // Norway 🇳🇴
    pattern: /^\d{4}$/,
    example: '0010',
    errorMessage: 'Invalid Norwegian postal code (4 digits)'
  },
  DNK: { // Denmark 🇩🇰
    pattern: /^\d{4}$/,
    example: '1050',
    errorMessage: 'Invalid Danish postal code (4 digits)'
  },
  FIN: { // Finland 🇫🇮
    pattern: /^\d{5}$/,
    example: '00100',
    errorMessage: 'Invalid Finnish postal code (5 digits)'
  },
  ISL: { // Iceland 🇮🇸
    pattern: /^\d{3}$/,
    example: '101',
    errorMessage: 'Invalid Icelandic postal code (3 digits)'
  },
  EST: { // Estonia 🇪🇪
    pattern: /^\d{5}$/,
    example: '10111',
    errorMessage: 'Invalid Estonian postal code (5 digits)'
  },
  LVA: { // Latvia 🇱🇻
    pattern: /^LV-?\d{4}$/i,
    example: 'LV-1010',
    errorMessage: 'Invalid Latvian postal code (format: LV-0000)'
  },
  LTU: { // Lithuania 🇱🇹
    pattern: /^LT-?\d{5}$/i,
    example: 'LT-01001',
    errorMessage: 'Invalid Lithuanian postal code (format: LT-00000)'
  },
  
  // ============================================
  // EASTERN EUROPE
  // ============================================
  
  CZE: { // Czech Republic 🇨🇿
    pattern: /^\d{3}\s?\d{2}$/,
    example: '110 00',
    errorMessage: 'Invalid Czech postal code (format: 000 00)'
  },
  SVK: { // Slovakia 🇸🇰
    pattern: /^\d{3}\s?\d{2}$/,
    example: '811 01',
    errorMessage: 'Invalid Slovak postal code (format: 000 00)'
  },
  HUN: { // Hungary 🇭🇺
    pattern: /^\d{4}$/,
    example: '1011',
    errorMessage: 'Invalid Hungarian postal code (4 digits)'
  },
  ROU: { // Romania 🇷🇴
    pattern: /^\d{6}$/,
    example: '010101',
    errorMessage: 'Invalid Romanian postal code (6 digits)'
  },
  BGR: { // Bulgaria 🇧🇬
    pattern: /^\d{4}$/,
    example: '1000',
    errorMessage: 'Invalid Bulgarian postal code (4 digits)'
  },
  RUS: { // Russia 🇷🇺
    pattern: /^\d{6}$/,
    example: '101000',
    errorMessage: 'Invalid Russian postal code (6 digits)'
  },
  UKR: { // Ukraine 🇺🇦
    pattern: /^\d{5}$/,
    example: '01001',
    errorMessage: 'Invalid Ukrainian postal code (5 digits)'
  },
  BLR: { // Belarus 🇧🇾
    pattern: /^\d{6}$/,
    example: '220050',
    errorMessage: 'Invalid Belarusian postal code (6 digits)'
  },
  MDA: { // Moldova 🇲🇩
    pattern: /^MD-?\d{4}$/i,
    example: 'MD-2001',
    errorMessage: 'Invalid Moldovan postal code (format: MD-0000)'
  },
  
  // ============================================
  // SOUTHERN EUROPE
  // ============================================
  
  GRC: { // Greece 🇬🇷
    pattern: /^\d{3}\s?\d{2}$/,
    example: '104 31',
    errorMessage: 'Invalid Greek postal code (format: 000 00)'
  },
  CYP: { // Cyprus 🇨🇾
    pattern: /^\d{4}$/,
    example: '1010',
    errorMessage: 'Invalid Cypriot postal code (4 digits)'
  },
  MLT: { // Malta 🇲🇹
    pattern: /^[A-Z]{3}\s?\d{4}$/i,
    example: 'VLT 1117',
    errorMessage: 'Invalid Maltese postal code (format: AAA 0000)'
  },
  HRV: { // Croatia 🇭🇷
    pattern: /^\d{5}$/,
    example: '10000',
    errorMessage: 'Invalid Croatian postal code (5 digits)'
  },
  SVN: { // Slovenia 🇸🇮
    pattern: /^\d{4}$/,
    example: '1000',
    errorMessage: 'Invalid Slovenian postal code (4 digits)'
  },
  BIH: { // Bosnia and Herzegovina 🇧🇦
    pattern: /^\d{5}$/,
    example: '71000',
    errorMessage: 'Invalid Bosnian postal code (5 digits)'
  },
  SRB: { // Serbia 🇷🇸
    pattern: /^\d{5}$/,
    example: '11000',
    errorMessage: 'Invalid Serbian postal code (5 digits)'
  },
  MNE: { // Montenegro 🇲🇪
    pattern: /^\d{5}$/,
    example: '81000',
    errorMessage: 'Invalid Montenegrin postal code (5 digits)'
  },
  MKD: { // North Macedonia 🇲🇰
    pattern: /^\d{4}$/,
    example: '1000',
    errorMessage: 'Invalid Macedonian postal code (4 digits)'
  },
  ALB: { // Albania 🇦🇱
    pattern: /^\d{4}$/,
    example: '1001',
    errorMessage: 'Invalid Albanian postal code (4 digits)'
  },
  XKX: { // Kosovo 🇽🇰
    pattern: /^\d{5}$/,
    example: '10000',
    errorMessage: 'Invalid Kosovo postal code (5 digits)'
  },
  
  // ============================================
  // MICRO-STATES
  // ============================================
  
  MCO: { // Monaco 🇲🇨
    pattern: /^980\d{2}$/,
    example: '98000',
    errorMessage: 'Invalid Monaco postal code (format: 980XX)'
  },
  AND: { // Andorra 🇦🇩
    pattern: /^AD\d{3}$/i,
    example: 'AD500',
    errorMessage: 'Invalid Andorran postal code (format: AD000)'
  },
  SMR: { // San Marino 🇸🇲
    pattern: /^4789\d$/,
    example: '47890',
    errorMessage: 'Invalid San Marino postal code (format: 4789X)'
  },
  VAT: { // Vatican City 🇻🇦
    pattern: /^00120$/,
    example: '00120',
    errorMessage: 'Invalid Vatican postal code (00120)'
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

