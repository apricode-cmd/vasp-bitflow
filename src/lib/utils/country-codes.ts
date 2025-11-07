/**
 * Country code conversion utilities
 * Converts between ISO 3166-1 alpha-2 (2-letter) and alpha-3 (3-letter) codes
 */

/**
 * Map of ISO 3166-1 alpha-2 to alpha-3 country codes
 * Source: https://en.wikipedia.org/wiki/ISO_3166-1
 */
export const COUNTRY_CODE_MAP: Record<string, string> = {
  // Europe
  'AD': 'AND', // Andorra
  'AL': 'ALB', // Albania
  'AT': 'AUT', // Austria
  'BA': 'BIH', // Bosnia and Herzegovina
  'BE': 'BEL', // Belgium
  'BG': 'BGR', // Bulgaria
  'BY': 'BLR', // Belarus
  'CH': 'CHE', // Switzerland
  'CY': 'CYP', // Cyprus
  'CZ': 'CZE', // Czech Republic
  'DE': 'DEU', // Germany
  'DK': 'DNK', // Denmark
  'EE': 'EST', // Estonia
  'ES': 'ESP', // Spain
  'FI': 'FIN', // Finland
  'FR': 'FRA', // France
  'GB': 'GBR', // United Kingdom
  'GR': 'GRC', // Greece
  'HR': 'HRV', // Croatia
  'HU': 'HUN', // Hungary
  'IE': 'IRL', // Ireland
  'IS': 'ISL', // Iceland
  'IT': 'ITA', // Italy
  'LI': 'LIE', // Liechtenstein
  'LT': 'LTU', // Lithuania
  'LU': 'LUX', // Luxembourg
  'LV': 'LVA', // Latvia
  'MC': 'MCO', // Monaco
  'MD': 'MDA', // Moldova
  'ME': 'MNE', // Montenegro
  'MK': 'MKD', // North Macedonia
  'MT': 'MLT', // Malta
  'NL': 'NLD', // Netherlands
  'NO': 'NOR', // Norway
  'PL': 'POL', // Poland
  'PT': 'PRT', // Portugal
  'RO': 'ROU', // Romania
  'RS': 'SRB', // Serbia
  'RU': 'RUS', // Russia
  'SE': 'SWE', // Sweden
  'SI': 'SVN', // Slovenia
  'SK': 'SVK', // Slovakia
  'SM': 'SMR', // San Marino
  'UA': 'UKR', // Ukraine
  'VA': 'VAT', // Vatican City
  'XK': 'XKX', // Kosovo (user-assigned)

  // Americas
  'AG': 'ATG', // Antigua and Barbuda
  'AR': 'ARG', // Argentina
  'AW': 'ABW', // Aruba
  'BB': 'BRB', // Barbados
  'BM': 'BMU', // Bermuda
  'BO': 'BOL', // Bolivia
  'BR': 'BRA', // Brazil
  'BS': 'BHS', // Bahamas
  'BZ': 'BLZ', // Belize
  'CA': 'CAN', // Canada
  'CL': 'CHL', // Chile
  'CO': 'COL', // Colombia
  'CR': 'CRI', // Costa Rica
  'CU': 'CUB', // Cuba
  'DM': 'DMA', // Dominica
  'DO': 'DOM', // Dominican Republic
  'EC': 'ECU', // Ecuador
  'GD': 'GRD', // Grenada
  'GT': 'GTM', // Guatemala
  'GY': 'GUY', // Guyana
  'HN': 'HND', // Honduras
  'HT': 'HTI', // Haiti
  'JM': 'JAM', // Jamaica
  'KN': 'KNA', // Saint Kitts and Nevis
  'KY': 'CYM', // Cayman Islands
  'LC': 'LCA', // Saint Lucia
  'MX': 'MEX', // Mexico
  'NI': 'NIC', // Nicaragua
  'PA': 'PAN', // Panama
  'PE': 'PER', // Peru
  'PR': 'PRI', // Puerto Rico
  'PY': 'PRY', // Paraguay
  'SR': 'SUR', // Suriname
  'SV': 'SLV', // El Salvador
  'TT': 'TTO', // Trinidad and Tobago
  'US': 'USA', // United States
  'UY': 'URY', // Uruguay
  'VC': 'VCT', // Saint Vincent and the Grenadines
  'VE': 'VEN', // Venezuela
  'VG': 'VGB', // British Virgin Islands
  'VI': 'VIR', // U.S. Virgin Islands

  // Asia
  'AE': 'ARE', // United Arab Emirates
  'AF': 'AFG', // Afghanistan
  'AM': 'ARM', // Armenia
  'AZ': 'AZE', // Azerbaijan
  'BD': 'BGD', // Bangladesh
  'BH': 'BHR', // Bahrain
  'BN': 'BRN', // Brunei
  'BT': 'BTN', // Bhutan
  'CN': 'CHN', // China
  'GE': 'GEO', // Georgia
  'HK': 'HKG', // Hong Kong
  'ID': 'IDN', // Indonesia
  'IL': 'ISR', // Israel
  'IN': 'IND', // India
  'IQ': 'IRQ', // Iraq
  'IR': 'IRN', // Iran
  'JO': 'JOR', // Jordan
  'JP': 'JPN', // Japan
  'KG': 'KGZ', // Kyrgyzstan
  'KH': 'KHM', // Cambodia
  'KP': 'PRK', // North Korea
  'KR': 'KOR', // South Korea
  'KW': 'KWT', // Kuwait
  'KZ': 'KAZ', // Kazakhstan
  'LA': 'LAO', // Laos
  'LB': 'LBN', // Lebanon
  'LK': 'LKA', // Sri Lanka
  'MM': 'MMR', // Myanmar
  'MN': 'MNG', // Mongolia
  'MO': 'MAC', // Macau
  'MV': 'MDV', // Maldives
  'MY': 'MYS', // Malaysia
  'NP': 'NPL', // Nepal
  'OM': 'OMN', // Oman
  'PH': 'PHL', // Philippines
  'PK': 'PAK', // Pakistan
  'PS': 'PSE', // Palestine
  'QA': 'QAT', // Qatar
  'SA': 'SAU', // Saudi Arabia
  'SG': 'SGP', // Singapore
  'SY': 'SYR', // Syria
  'TH': 'THA', // Thailand
  'TJ': 'TJK', // Tajikistan
  'TL': 'TLS', // Timor-Leste
  'TM': 'TKM', // Turkmenistan
  'TR': 'TUR', // Turkey
  'TW': 'TWN', // Taiwan
  'UZ': 'UZB', // Uzbekistan
  'VN': 'VNM', // Vietnam
  'YE': 'YEM', // Yemen

  // Africa
  'AO': 'AGO', // Angola
  'BF': 'BFA', // Burkina Faso
  'BI': 'BDI', // Burundi
  'BJ': 'BEN', // Benin
  'BW': 'BWA', // Botswana
  'CD': 'COD', // Democratic Republic of the Congo
  'CF': 'CAF', // Central African Republic
  'CG': 'COG', // Republic of the Congo
  'CI': 'CIV', // Ivory Coast
  'CM': 'CMR', // Cameroon
  'CV': 'CPV', // Cape Verde
  'DJ': 'DJI', // Djibouti
  'DZ': 'DZA', // Algeria
  'EG': 'EGY', // Egypt
  'EH': 'ESH', // Western Sahara
  'ER': 'ERI', // Eritrea
  'ET': 'ETH', // Ethiopia
  'GA': 'GAB', // Gabon
  'GH': 'GHA', // Ghana
  'GM': 'GMB', // Gambia
  'GN': 'GIN', // Guinea
  'GQ': 'GNQ', // Equatorial Guinea
  'GW': 'GNB', // Guinea-Bissau
  'KE': 'KEN', // Kenya
  'KM': 'COM', // Comoros
  'LR': 'LBR', // Liberia
  'LS': 'LSO', // Lesotho
  'LY': 'LBY', // Libya
  'MA': 'MAR', // Morocco
  'MG': 'MDG', // Madagascar
  'ML': 'MLI', // Mali
  'MR': 'MRT', // Mauritania
  'MU': 'MUS', // Mauritius
  'MW': 'MWI', // Malawi
  'MZ': 'MOZ', // Mozambique
  'NA': 'NAM', // Namibia
  'NE': 'NER', // Niger
  'NG': 'NGA', // Nigeria
  'RE': 'REU', // Réunion
  'RW': 'RWA', // Rwanda
  'SC': 'SYC', // Seychelles
  'SD': 'SDN', // Sudan
  'SL': 'SLE', // Sierra Leone
  'SN': 'SEN', // Senegal
  'SO': 'SOM', // Somalia
  'SS': 'SSD', // South Sudan
  'ST': 'STP', // São Tomé and Príncipe
  'SZ': 'SWZ', // Eswatini
  'TD': 'TCD', // Chad
  'TG': 'TGO', // Togo
  'TN': 'TUN', // Tunisia
  'TZ': 'TZA', // Tanzania
  'UG': 'UGA', // Uganda
  'ZA': 'ZAF', // South Africa
  'ZM': 'ZMB', // Zambia
  'ZW': 'ZWE', // Zimbabwe

  // Oceania
  'AS': 'ASM', // American Samoa
  'AU': 'AUS', // Australia
  'CK': 'COK', // Cook Islands
  'FJ': 'FJI', // Fiji
  'FM': 'FSM', // Micronesia
  'GU': 'GUM', // Guam
  'KI': 'KIR', // Kiribati
  'MH': 'MHL', // Marshall Islands
  'MP': 'MNP', // Northern Mariana Islands
  'NC': 'NCL', // New Caledonia
  'NR': 'NRU', // Nauru
  'NU': 'NIU', // Niue
  'NZ': 'NZL', // New Zealand
  'PF': 'PYF', // French Polynesia
  'PG': 'PNG', // Papua New Guinea
  'PN': 'PCN', // Pitcairn Islands
  'PW': 'PLW', // Palau
  'SB': 'SLB', // Solomon Islands
  'TK': 'TKL', // Tokelau
  'TO': 'TON', // Tonga
  'TV': 'TUV', // Tuvalu
  'VU': 'VUT', // Vanuatu
  'WF': 'WLF', // Wallis and Futuna
  'WS': 'WSM', // Samoa
};

/**
 * Convert ISO 3166-1 alpha-2 (2-letter) country code to alpha-3 (3-letter)
 * @param alpha2 - 2-letter country code (e.g., 'US', 'GB', 'PL')
 * @returns 3-letter country code (e.g., 'USA', 'GBR', 'POL') or null if not found
 */
export function convertAlpha2ToAlpha3(alpha2: string | null | undefined): string | null {
  if (!alpha2) return null;
  
  const normalized = alpha2.toUpperCase().trim();
  
  // If already 3 letters, return as-is
  if (normalized.length === 3) {
    return normalized;
  }
  
  // If not 2 letters, return null
  if (normalized.length !== 2) {
    console.warn(`Invalid country code length: ${alpha2}`);
    return null;
  }
  
  const alpha3 = COUNTRY_CODE_MAP[normalized];
  
  if (!alpha3) {
    console.warn(`Unknown country code: ${alpha2}`);
    return null;
  }
  
  return alpha3;
}

/**
 * Normalize country code for KYC provider
 * - KYCAID: uses alpha-2 (2-letter)
 * - Sumsub: uses alpha-3 (3-letter)
 * 
 * @param countryCode - Country code (2 or 3 letters)
 * @param provider - KYC provider ('kycaid' or 'sumsub')
 * @returns Normalized country code for the provider
 */
export function normalizeCountryCodeForProvider(
  countryCode: string | null | undefined,
  provider: 'kycaid' | 'sumsub'
): string | null {
  if (!countryCode) return null;
  
  const normalized = countryCode.toUpperCase().trim();
  
  if (provider === 'sumsub') {
    // Sumsub requires alpha-3 (3-letter)
    return convertAlpha2ToAlpha3(normalized);
  } else {
    // KYCAID uses alpha-2 (2-letter)
    // If already 2 letters, return as-is
    if (normalized.length === 2) {
      return normalized;
    }
    
    // If 3 letters, try to reverse lookup (not implemented, just return as-is)
    console.warn(`KYCAID expects alpha-2, but got: ${countryCode}`);
    return normalized;
  }
}

