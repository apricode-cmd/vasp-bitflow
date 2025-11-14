/**
 * Country Utilities
 * 
 * Helper functions for country codes and flags
 * Supports ALL ISO 3166-1 alpha-2 country codes
 */

// Map country codes to flag emojis (Unicode Regional Indicator Symbols)
export function getCountryFlag(countryCode: string): string {
  if (!countryCode) {
    return '🌍'; // Default globe emoji for empty/null
  }

  // Validate ISO 3166-1 alpha-2 format (2 letters)
  const code = countryCode.toUpperCase().trim();
  
  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) {
    console.warn(`Invalid country code: "${countryCode}". Expected 2-letter ISO code.`);
    return '🌍'; // Default globe emoji for invalid codes
  }

  // Convert country code to flag emoji using Regional Indicator Symbols
  // Each letter maps to: 🇦 = U+1F1E6, 🇧 = U+1F1E7, ..., 🇿 = U+1F1FF
  // Formula: 0x1F1E6 + (letter - 'A')
  const codePoints = code
    .split('')
    .map(char => 0x1F1E6 + char.charCodeAt(0) - 'A'.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
}

// Get country name from code (Complete ISO 3166-1 alpha-2 list)
export function getCountryName(countryCode: string): string {
  if (!countryCode) return '';
  
  const countries: Record<string, string> = {
    // Europe
    'AL': 'Albania', 'AD': 'Andorra', 'AT': 'Austria', 'BY': 'Belarus', 'BE': 'Belgium',
    'BA': 'Bosnia and Herzegovina', 'BG': 'Bulgaria', 'HR': 'Croatia', 'CY': 'Cyprus',
    'CZ': 'Czech Republic', 'DK': 'Denmark', 'EE': 'Estonia', 'FI': 'Finland', 'FR': 'France',
    'DE': 'Germany', 'GR': 'Greece', 'HU': 'Hungary', 'IS': 'Iceland', 'IE': 'Ireland',
    'IT': 'Italy', 'XK': 'Kosovo', 'LV': 'Latvia', 'LI': 'Liechtenstein', 'LT': 'Lithuania',
    'LU': 'Luxembourg', 'MK': 'North Macedonia', 'MT': 'Malta', 'MD': 'Moldova', 'MC': 'Monaco',
    'ME': 'Montenegro', 'NL': 'Netherlands', 'NO': 'Norway', 'PL': 'Poland', 'PT': 'Portugal',
    'RO': 'Romania', 'RU': 'Russia', 'SM': 'San Marino', 'RS': 'Serbia', 'SK': 'Slovakia',
    'SI': 'Slovenia', 'ES': 'Spain', 'SE': 'Sweden', 'CH': 'Switzerland', 'UA': 'Ukraine',
    'GB': 'United Kingdom', 'VA': 'Vatican City',
    
    // Americas
    'AG': 'Antigua and Barbuda', 'AR': 'Argentina', 'BS': 'Bahamas', 'BB': 'Barbados',
    'BZ': 'Belize', 'BO': 'Bolivia', 'BR': 'Brazil', 'CA': 'Canada', 'CL': 'Chile',
    'CO': 'Colombia', 'CR': 'Costa Rica', 'CU': 'Cuba', 'DM': 'Dominica', 'DO': 'Dominican Republic',
    'EC': 'Ecuador', 'SV': 'El Salvador', 'GD': 'Grenada', 'GT': 'Guatemala', 'GY': 'Guyana',
    'HT': 'Haiti', 'HN': 'Honduras', 'JM': 'Jamaica', 'MX': 'Mexico', 'NI': 'Nicaragua',
    'PA': 'Panama', 'PY': 'Paraguay', 'PE': 'Peru', 'KN': 'Saint Kitts and Nevis',
    'LC': 'Saint Lucia', 'VC': 'Saint Vincent and the Grenadines', 'SR': 'Suriname',
    'TT': 'Trinidad and Tobago', 'US': 'United States', 'UY': 'Uruguay', 'VE': 'Venezuela',
    
    // Asia
    'AF': 'Afghanistan', 'AM': 'Armenia', 'AZ': 'Azerbaijan', 'BH': 'Bahrain', 'BD': 'Bangladesh',
    'BT': 'Bhutan', 'BN': 'Brunei', 'KH': 'Cambodia', 'CN': 'China', 'GE': 'Georgia',
    'IN': 'India', 'ID': 'Indonesia', 'IR': 'Iran', 'IQ': 'Iraq', 'IL': 'Israel',
    'JP': 'Japan', 'JO': 'Jordan', 'KZ': 'Kazakhstan', 'KW': 'Kuwait', 'KG': 'Kyrgyzstan',
    'LA': 'Laos', 'LB': 'Lebanon', 'MY': 'Malaysia', 'MV': 'Maldives', 'MN': 'Mongolia',
    'MM': 'Myanmar', 'NP': 'Nepal', 'KP': 'North Korea', 'OM': 'Oman', 'PK': 'Pakistan',
    'PS': 'Palestine', 'PH': 'Philippines', 'QA': 'Qatar', 'SA': 'Saudi Arabia', 'SG': 'Singapore',
    'KR': 'South Korea', 'LK': 'Sri Lanka', 'SY': 'Syria', 'TW': 'Taiwan', 'TJ': 'Tajikistan',
    'TH': 'Thailand', 'TL': 'Timor-Leste', 'TR': 'Turkey', 'TM': 'Turkmenistan', 'AE': 'United Arab Emirates',
    'UZ': 'Uzbekistan', 'VN': 'Vietnam', 'YE': 'Yemen',
    
    // Africa
    'DZ': 'Algeria', 'AO': 'Angola', 'BJ': 'Benin', 'BW': 'Botswana', 'BF': 'Burkina Faso',
    'BI': 'Burundi', 'CM': 'Cameroon', 'CV': 'Cape Verde', 'CF': 'Central African Republic',
    'TD': 'Chad', 'KM': 'Comoros', 'CG': 'Congo', 'CD': 'DR Congo', 'CI': 'Ivory Coast',
    'DJ': 'Djibouti', 'EG': 'Egypt', 'GQ': 'Equatorial Guinea', 'ER': 'Eritrea', 'SZ': 'Eswatini',
    'ET': 'Ethiopia', 'GA': 'Gabon', 'GM': 'Gambia', 'GH': 'Ghana', 'GN': 'Guinea',
    'GW': 'Guinea-Bissau', 'KE': 'Kenya', 'LS': 'Lesotho', 'LR': 'Liberia', 'LY': 'Libya',
    'MG': 'Madagascar', 'MW': 'Malawi', 'ML': 'Mali', 'MR': 'Mauritania', 'MU': 'Mauritius',
    'MA': 'Morocco', 'MZ': 'Mozambique', 'NA': 'Namibia', 'NE': 'Niger', 'NG': 'Nigeria',
    'RW': 'Rwanda', 'ST': 'São Tomé and Príncipe', 'SN': 'Senegal', 'SC': 'Seychelles',
    'SL': 'Sierra Leone', 'SO': 'Somalia', 'ZA': 'South Africa', 'SS': 'South Sudan',
    'SD': 'Sudan', 'TZ': 'Tanzania', 'TG': 'Togo', 'TN': 'Tunisia', 'UG': 'Uganda',
    'ZM': 'Zambia', 'ZW': 'Zimbabwe',
    
    // Oceania
    'AU': 'Australia', 'FJ': 'Fiji', 'KI': 'Kiribati', 'MH': 'Marshall Islands', 'FM': 'Micronesia',
    'NR': 'Nauru', 'NZ': 'New Zealand', 'PW': 'Palau', 'PG': 'Papua New Guinea', 'WS': 'Samoa',
    'SB': 'Solomon Islands', 'TO': 'Tonga', 'TV': 'Tuvalu', 'VU': 'Vanuatu',
    
    // Special territories (commonly used)
    'HK': 'Hong Kong', 'MO': 'Macau', 'PR': 'Puerto Rico', 'GU': 'Guam',
    'VI': 'U.S. Virgin Islands', 'AS': 'American Samoa', 'MP': 'Northern Mariana Islands',
    'UM': 'U.S. Minor Outlying Islands', 'TC': 'Turks and Caicos', 'BM': 'Bermuda',
    'KY': 'Cayman Islands', 'VG': 'British Virgin Islands', 'AI': 'Anguilla', 'MS': 'Montserrat',
    'FK': 'Falkland Islands', 'GI': 'Gibraltar', 'SH': 'Saint Helena', 'PM': 'Saint Pierre and Miquelon',
    'GL': 'Greenland', 'FO': 'Faroe Islands', 'AX': 'Åland Islands', 'SJ': 'Svalbard',
    'BV': 'Bouvet Island', 'HM': 'Heard Island', 'TF': 'French Southern Territories',
    'AQ': 'Antarctica', 'GS': 'South Georgia', 'IO': 'British Indian Ocean Territory',
    'CX': 'Christmas Island', 'CC': 'Cocos Islands', 'NF': 'Norfolk Island', 'NC': 'New Caledonia',
    'PF': 'French Polynesia', 'WF': 'Wallis and Futuna', 'TK': 'Tokelau', 'NU': 'Niue',
    'CK': 'Cook Islands', 'PN': 'Pitcairn Islands',
  };

  const code = countryCode.toUpperCase();
  return countries[code] || code;
}

// Format country for display
export function formatCountry(countryCode: string): string {
  const flag = getCountryFlag(countryCode);
  const name = getCountryName(countryCode);
  return `${flag} ${name}`;
}

// Get all countries as array
export function getAllCountries(): Array<{ code: string; name: string; flag: string }> {
  const countryCodes = [
    // Europe
    'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'XK', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD',
    'MC', 'ME', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE',
    'CH', 'UA', 'GB', 'VA',
    // Americas
    'AG', 'AR', 'BS', 'BB', 'BZ', 'BO', 'BR', 'CA', 'CL', 'CO', 'CR', 'CU', 'DM', 'DO',
    'EC', 'SV', 'GD', 'GT', 'GY', 'HT', 'HN', 'JM', 'MX', 'NI', 'PA', 'PY', 'PE', 'KN',
    'LC', 'VC', 'SR', 'TT', 'US', 'UY', 'VE',
    // Asia
    'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'IN', 'ID', 'IR', 'IQ',
    'IL', 'JP', 'JO', 'KZ', 'KW', 'KG', 'LA', 'LB', 'MY', 'MV', 'MN', 'MM', 'NP', 'KP',
    'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'KR', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL',
    'TR', 'TM', 'AE', 'UZ', 'VN', 'YE',
    // Africa
    'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI',
    'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR',
    'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN',
    'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW',
    // Oceania
    'AU', 'FJ', 'KI', 'MH', 'FM', 'NR', 'NZ', 'PW', 'PG', 'WS', 'SB', 'TO', 'TV', 'VU',
  ];

  return countryCodes.map(code => ({
    code,
    name: getCountryName(code),
    flag: getCountryFlag(code),
  }));
}

// Get popular countries for filters (most commonly used in Europe/Americas)
export const POPULAR_COUNTRIES = [
  // Europe (top)
  { code: 'DE', name: 'Germany' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'PL', name: 'Poland' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GR', name: 'Greece' },
  { code: 'CZ', name: 'Czech Republic' },
  // Americas
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
  // Asia
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'KR', name: 'South Korea' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'IL', name: 'Israel' },
  { code: 'TR', name: 'Turkey' },
  // Oceania
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  // Africa
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
].map(c => ({
  ...c,
  flag: getCountryFlag(c.code),
}));

