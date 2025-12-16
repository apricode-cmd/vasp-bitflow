/**
 * Country code conversion utilities
 * Alpha-3 (ISO 3166-1 alpha-3) → Alpha-2 (ISO 3166-1 alpha-2)
 */

export function alpha3ToIso2(alpha3: string): string {
  const mapping: Record<string, string> = {
    'USA': 'US', 'GBR': 'GB', 'POL': 'PL', 'DEU': 'DE', 'FRA': 'FR',
    'ESP': 'ES', 'ITA': 'IT', 'UKR': 'UA', 'NLD': 'NL', 'BEL': 'BE',
    'AUT': 'AT', 'CHE': 'CH', 'SWE': 'SE', 'NOR': 'NO', 'DNK': 'DK',
    'FIN': 'FI', 'IRL': 'IE', 'PRT': 'PT', 'GRC': 'GR', 'CZE': 'CZ',
    'HUN': 'HU', 'ROU': 'RO', 'BGR': 'BG', 'SVK': 'SK', 'SVN': 'SI',
    'HRV': 'HR', 'LTU': 'LT', 'LVA': 'LV', 'EST': 'EE', 'CYP': 'CY',
    'MLT': 'MT', 'LUX': 'LU', 'ISL': 'IS', 'LIE': 'LI', 'MCO': 'MC',
    'AND': 'AD', 'SMR': 'SM', 'VAT': 'VA', 'ALB': 'AL', 'MKD': 'MK',
    'SRB': 'RS', 'MNE': 'ME', 'BIH': 'BA', 'KOS': 'XK', 'MDA': 'MD',
    'BLR': 'BY', 'RUS': 'RU', 'TUR': 'TR', 'GEO': 'GE', 'ARM': 'AM',
    'AZE': 'AZ', 'KAZ': 'KZ', 'UZB': 'UZ', 'TKM': 'TM', 'KGZ': 'KG',
    'TJK': 'TJ', 'AFG': 'AF', 'PAK': 'PK', 'IND': 'IN', 'BGD': 'BD',
    'LKA': 'LK', 'NPL': 'NP', 'BTN': 'BT', 'MDV': 'MV', 'CHN': 'CN',
    'JPN': 'JP', 'KOR': 'KR', 'PRK': 'KP', 'MNG': 'MN', 'TWN': 'TW',
    'HKG': 'HK', 'MAC': 'MO', 'THA': 'TH', 'VNM': 'VN', 'LAO': 'LA',
    'KHM': 'KH', 'MMR': 'MM', 'MYS': 'MY', 'SGP': 'SG', 'IDN': 'ID',
    'PHL': 'PH', 'BRN': 'BN', 'TLS': 'TL', 'AUS': 'AU', 'NZL': 'NZ',
    'PNG': 'PG', 'FJI': 'FJ', 'SLB': 'SB', 'VUT': 'VU', 'NCL': 'NC',
    'PYF': 'PF', 'WLF': 'WF', 'COK': 'CK', 'NIU': 'NU', 'TKL': 'TK',
    'WSM': 'WS', 'KIR': 'KI', 'TUV': 'TV', 'NRU': 'NR', 'PLW': 'PW',
    'MHL': 'MH', 'FSM': 'FM', 'GUM': 'GU', 'MNP': 'MP', 'VIR': 'VI',
    'CAN': 'CA', 'MEX': 'MX', 'GTM': 'GT', 'BLZ': 'BZ', 'SLV': 'SV',
    'HND': 'HN', 'NIC': 'NI', 'CRI': 'CR', 'PAN': 'PA', 'CUB': 'CU',
    'JAM': 'JM', 'HTI': 'HT', 'DOM': 'DO', 'PRI': 'PR', 'BHS': 'BS',
    'TTO': 'TT', 'BRB': 'BB', 'VCT': 'VC', 'GRD': 'GD', 'LCA': 'LC',
    'DMA': 'DM', 'ATG': 'AG', 'KNA': 'KN', 'AIA': 'AI', 'MSR': 'MS',
    'VGB': 'VG', 'CYM': 'KY', 'TCA': 'TC', 'ABW': 'AW', 'CUW': 'CW',
    'SXM': 'SX', 'BRA': 'BR', 'ARG': 'AR', 'CHL': 'CL', 'COL': 'CO',
    'VEN': 'VE', 'PER': 'PE', 'ECU': 'EC', 'BOL': 'BO', 'PRY': 'PY',
    'URY': 'UY', 'GUY': 'GY', 'SUR': 'SR', 'GUF': 'GF', 'EGY': 'EG',
    'ZAF': 'ZA', 'NGA': 'NG', 'KEN': 'KE', 'ETH': 'ET', 'GHA': 'GH',
    'TZA': 'TZ', 'UGA': 'UG', 'DZA': 'DZ', 'MAR': 'MA', 'TUN': 'TN',
    'LBY': 'LY', 'SDN': 'SD', 'SSD': 'SS', 'SOM': 'SO', 'ERI': 'ER',
    'DJI': 'DJ', 'CMR': 'CM', 'CIV': 'CI', 'SEN': 'SN', 'MLI': 'ML',
    'BFA': 'BF', 'NER': 'NE', 'TCD': 'TD', 'MRT': 'MR', 'GMB': 'GM',
    'GNB': 'GW', 'GIN': 'GN', 'SLE': 'SL', 'LBR': 'LR', 'BEN': 'BJ',
    'TGO': 'TG', 'GAB': 'GA', 'GNQ': 'GQ', 'COG': 'CG', 'COD': 'CD',
    'CAF': 'CF', 'AGO': 'AO', 'ZMB': 'ZM', 'ZWE': 'ZW', 'MWI': 'MW',
    'MOZ': 'MZ', 'NAM': 'NA', 'BWA': 'BW', 'LSO': 'LS', 'SWZ': 'SZ',
    'MDG': 'MG', 'COM': 'KM', 'SYC': 'SC', 'MUS': 'MU', 'REU': 'RE',
    'MYT': 'YT', 'SAU': 'SA', 'ARE': 'AE', 'OMN': 'OM', 'YEM': 'YE',
    'IRQ': 'IQ', 'IRN': 'IR', 'SYR': 'SY', 'JOR': 'JO', 'LBN': 'LB',
    'ISR': 'IL', 'PSE': 'PS', 'KWT': 'KW', 'BHR': 'BH', 'QAT': 'QA',
    'ASC': 'AS', // Ascension Island
  };
  
  return mapping[alpha3] || alpha3.substring(0, 2); // Fallback to first 2 chars
}

/**
 * Convert ISO-2 to Alpha-3
 * Inverse of alpha3ToIso2
 */
export function iso2ToAlpha3(iso2: string): string {
  const mapping: Record<string, string> = {
    'US': 'USA', 'GB': 'GBR', 'PL': 'POL', 'DE': 'DEU', 'FR': 'FRA',
    'ES': 'ESP', 'IT': 'ITA', 'UA': 'UKR', 'NL': 'NLD', 'BE': 'BEL',
    'AT': 'AUT', 'CH': 'CHE', 'SE': 'SWE', 'NO': 'NOR', 'DK': 'DNK',
    'FI': 'FIN', 'IE': 'IRL', 'PT': 'PRT', 'GR': 'GRC', 'CZ': 'CZE',
    'HU': 'HUN', 'RO': 'ROU', 'BG': 'BGR', 'SK': 'SVK', 'SI': 'SVN',
    'HR': 'HRV', 'LT': 'LTU', 'LV': 'LVA', 'EE': 'EST', 'CY': 'CYP',
    'MT': 'MLT', 'LU': 'LUX', 'IS': 'ISL', 'LI': 'LIE', 'MC': 'MCO',
    'AD': 'AND', 'SM': 'SMR', 'VA': 'VAT', 'AL': 'ALB', 'MK': 'MKD',
    'RS': 'SRB', 'ME': 'MNE', 'BA': 'BIH', 'XK': 'KOS', 'MD': 'MDA',
    'BY': 'BLR', 'RU': 'RUS', 'TR': 'TUR', 'GE': 'GEO', 'AM': 'ARM',
    'AZ': 'AZE', 'KZ': 'KAZ', 'UZ': 'UZB', 'TM': 'TKM', 'KG': 'KGZ',
    'TJ': 'TJK', 'AF': 'AFG', 'PK': 'PAK', 'IN': 'IND', 'BD': 'BGD',
    'LK': 'LKA', 'NP': 'NPL', 'BT': 'BTN', 'MV': 'MDV', 'CN': 'CHN',
    'JP': 'JPN', 'KR': 'KOR', 'KP': 'PRK', 'MN': 'MNG', 'TW': 'TWN',
    'HK': 'HKG', 'MO': 'MAC', 'TH': 'THA', 'VN': 'VNM', 'LA': 'LAO',
    'KH': 'KHM', 'MM': 'MMR', 'MY': 'MYS', 'SG': 'SGP', 'ID': 'IDN',
    'PH': 'PHL', 'BN': 'BRN', 'TL': 'TLS', 'AU': 'AUS', 'NZ': 'NZL',
    'PG': 'PNG', 'FJ': 'FJI', 'SB': 'SLB', 'VU': 'VUT', 'NC': 'NCL',
    'PF': 'PYF', 'WF': 'WLF', 'CK': 'COK', 'NU': 'NIU', 'TK': 'TKL',
    'WS': 'WSM', 'KI': 'KIR', 'TV': 'TUV', 'NR': 'NRU', 'PW': 'PLW',
    'MH': 'MHL', 'FM': 'FSM', 'GU': 'GUM', 'MP': 'MNP', 'VI': 'VIR',
    'CA': 'CAN', 'MX': 'MEX', 'GT': 'GTM', 'BZ': 'BLZ', 'SV': 'SLV',
    'HN': 'HND', 'NI': 'NIC', 'CR': 'CRI', 'PA': 'PAN', 'CU': 'CUB',
    'JM': 'JAM', 'HT': 'HTI', 'DO': 'DOM', 'PR': 'PRI', 'BS': 'BHS',
    'TT': 'TTO', 'BB': 'BRB', 'VC': 'VCT', 'GD': 'GRD', 'LC': 'LCA',
    'DM': 'DMA', 'AG': 'ATG', 'KN': 'KNA', 'AI': 'AIA', 'MS': 'MSR',
    'VG': 'VGB', 'KY': 'CYM', 'TC': 'TCA', 'AW': 'ABW', 'CW': 'CUW',
    'SX': 'SXM', 'BR': 'BRA', 'AR': 'ARG', 'CL': 'CHL', 'CO': 'COL',
    'VE': 'VEN', 'PE': 'PER', 'EC': 'ECU', 'BO': 'BOL', 'PY': 'PRY',
    'UY': 'URY', 'GY': 'GUY', 'SR': 'SUR', 'GF': 'GUF', 'EG': 'EGY',
    'ZA': 'ZAF', 'NG': 'NGA', 'KE': 'KEN', 'ET': 'ETH', 'GH': 'GHA',
    'TZ': 'TZA', 'UG': 'UGA', 'DZ': 'DZA', 'MA': 'MAR', 'TN': 'TUN',
    'LY': 'LBY', 'SD': 'SDN', 'SS': 'SSD', 'SO': 'SOM', 'ER': 'ERI',
    'DJ': 'DJI', 'CM': 'CMR', 'CI': 'CIV', 'SN': 'SEN', 'ML': 'MLI',
    'BF': 'BFA', 'NE': 'NER', 'TD': 'TCD', 'MR': 'MRT', 'GM': 'GMB',
    'GW': 'GNB', 'GN': 'GIN', 'SL': 'SLE', 'LR': 'LBR', 'BJ': 'BEN',
    'TG': 'TGO', 'GA': 'GAB', 'GQ': 'GNQ', 'CG': 'COG', 'CD': 'COD',
    'CF': 'CAF', 'AO': 'AGO', 'ZM': 'ZMB', 'ZW': 'ZWE', 'MW': 'MWI',
    'MZ': 'MOZ', 'NA': 'NAM', 'BW': 'BWA', 'LS': 'LSO', 'SZ': 'SWZ',
    'MG': 'MDG', 'KM': 'COM', 'SC': 'SYC', 'MU': 'MUS', 'RE': 'REU',
    'YT': 'MYT', 'SA': 'SAU', 'AE': 'ARE', 'OM': 'OMN', 'YE': 'YEM',
    'IQ': 'IRQ', 'IR': 'IRN', 'SY': 'SYR', 'JO': 'JOR', 'LB': 'LBN',
    'IL': 'ISR', 'PS': 'PSE', 'KW': 'KWT', 'BH': 'BHR', 'QA': 'QAT',
    'AS': 'ASC', // Ascension Island
  };
  
  return mapping[iso2] || iso2 + 'X'; // Fallback: append X
}

/**
 * Normalize country code for specific provider
 * Auto-detects format and converts to provider's expected format
 * 
 * @param code - Country code (ISO-2 or Alpha-3)
 * @param provider - Provider name (e.g. 'sumsub')
 * @returns Country code in provider's format
 */
export function normalizeCountryCodeForProvider(code: string, provider: string): string {
  if (!code) return '';
  
  const upperCode = code.toUpperCase();
  
  // Sumsub requires Alpha-3 (ISO 3166-1 alpha-3)
  if (provider === 'sumsub') {
    // If already 3 chars, assume it's Alpha-3
    if (upperCode.length === 3) {
      return upperCode;
    }
    
    // If 2 chars, convert ISO-2 to Alpha-3
    if (upperCode.length === 2) {
      return iso2ToAlpha3(upperCode);
    }
  }
  
  // Default: return as-is
  return upperCode;
}

/**
 * Format date for KYC providers (API format)
 * Returns: YYYY-MM-DD
 * ✅ Uses UTC methods to prevent timezone shift (dates stored in DB as UTC at noon)
 */
export function formatDateForKyc(date: Date | null): string {
  if (!date) return '';
  
  const d = new Date(date);
  // Use UTC methods to extract the date as stored in database
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Format date for European display (DD.MM.YYYY)
 * ✅ Uses UTC methods to prevent timezone shift
 */
export function formatDateEuropean(date: Date | string | null): string {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  
  return `${day}.${month}.${year}`;
}
