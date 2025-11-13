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
 * Format date for KYC providers
 * Returns: YYYY-MM-DD
 */
export function formatDateForKyc(date: Date | null): string {
  if (!date) return '';
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
