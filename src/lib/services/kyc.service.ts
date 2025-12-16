/**
 * KYC Service
 * 
 * Universal KYC service that works with any active provider
 * Handles: applicant creation, verification, form generation, status checking
 */

import { prisma } from '@/lib/prisma';
import { integrationRegistry } from '@/lib/integrations';
import { getIntegrationWithSecrets } from './integration-management.service';
import { IKycProvider, KycUserData } from '@/lib/integrations/categories/IKycProvider';

/**
 * Format date for KYC without timezone conversion
 * Prevents the "day before" bug when converting to UTC
 * ✅ Uses UTC methods as dates are stored in DB as UTC at noon
 */
function formatDateForKyc(date: Date): string {
  // Validate that date is valid
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error('❌ Invalid date provided to formatDateForKyc:', date);
    throw new Error('Invalid date provided for KYC');
  }
  
  // Use UTC methods to extract the date as stored in database
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Universal helper: Get applicant ID from session (supports both new and legacy fields)
 */
function getApplicantId(session: any): string | null {
  return session.applicantId || session.kycaidApplicantId || null;
}

/**
 * Universal helper: Get verification ID from session (supports both new and legacy fields)
 */
function getVerificationId(session: any): string | null {
  return session.verificationId || session.kycaidVerificationId || null;
}

/**
 * Universal helper: Get form ID from session (supports both new and legacy fields)
 */
function getFormId(session: any, secrets: any): string | null {
  return session.kycaidFormId || (secrets?.config as any)?.formId || null;
}

/**
 * Universal helper: Format KYC status response
 * Ensures all responses include kycProviderId for frontend routing
 */
function formatStatusResponse(session: any, message?: string) {
  const response = {
    status: session.status,
    sessionId: session.id,
    completedAt: session.completedAt || null,
    rejectionReason: session.rejectionReason || null,
    formUrl: (session.metadata as any)?.formUrl || null,
    kycProviderId: session.kycProviderId || (session.metadata as any)?.provider || 'kycaid',
    message: message || getStatusMessage(session.status),
    // Resubmission fields (for REJECTED status)
    canResubmit: session.canResubmit || false,
    reviewRejectType: session.reviewRejectType || null,
    moderationComment: session.moderationComment || null,
    clientComment: session.clientComment || null,
    rejectLabels: session.rejectLabels || [],
    attempts: session.attempts || 0
  };
  
  // Debug log for REJECTED status
  if (session.status === 'REJECTED') {
    console.log('📊 [KYC STATUS] formatStatusResponse for REJECTED:', {
      canResubmit: response.canResubmit,
      reviewRejectType: response.reviewRejectType,
      rejectLabelsCount: response.rejectLabels?.length || 0,
      rejectLabels: response.rejectLabels,
      fromDB: {
        canResubmit: session.canResubmit,
        reviewRejectType: session.reviewRejectType
      }
    });
  }
  
  return response;
}

/**
 * Get active KYC provider
 */
async function getActiveKycProvider(): Promise<IKycProvider | null> {
  try {
    console.log('🔍 Looking for active KYC provider...');
    
    // Find any active KYC integration (KYCAID or Sumsub)
    const integration = await prisma.integration.findFirst({
      where: {
        service: { in: ['kycaid', 'sumsub'] }, // Support both providers
        isEnabled: true,
        status: 'active'
      }
    });

    if (!integration) {
      console.warn('⚠️ No active KYC integration found');
      console.log('Check: /admin/integrations - KYCAID or Sumsub should be enabled with credentials');
      return null;
    }

    console.log('✅ Found KYC integration:', integration.service);

    // Get provider from registry
    const provider = integrationRegistry.getProvider(integration.service) as IKycProvider;
    
    if (!provider) {
      console.error(`❌ KYC provider "${integration.service}" not found in registry`);
      return null;
    }

    console.log('✅ Provider found in registry');

    // Initialize with secrets
    const secrets = await getIntegrationWithSecrets(integration.service);
    if (secrets?.apiKey || (secrets?.config as any)?.appToken) {
      console.log(`✅ Initializing ${integration.service} provider with credentials`);
      
      // Debug: log what we're passing to initialize
      const initConfig = {
        apiKey: secrets.apiKey,
        apiEndpoint: secrets.apiEndpoint || undefined,
        ...(secrets.config as Record<string, any> || {})
      };
      console.log('🔍 Init config keys:', Object.keys(initConfig));
      console.log('🔍 Init config:', JSON.stringify(initConfig, null, 2));
      
      await provider.initialize(initConfig);
    } else {
      console.warn(`⚠️ No credentials found for ${integration.service}`);
      return null;
    }

    return provider;
  } catch (error) {
    console.error('❌ Failed to get active KYC provider:', error);
    return null;
  }
}

/**
 * Start KYC verification for user
 * Creates applicant, session in DB, and returns form URL
 */
export async function startKycVerification(userId: string) {
  try {
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user || !user.profile) {
      throw new Error('User or profile not found');
    }

    // Validate required fields with detailed error message
    const missingFields: string[] = [];
    if (!user.profile.firstName) missingFields.push('First Name');
    if (!user.profile.lastName) missingFields.push('Last Name');
    if (!user.profile.dateOfBirth) missingFields.push('Date of Birth');
    if (!user.profile.nationality) missingFields.push('Nationality');
    if (!user.profile.country) missingFields.push('Country');
    if (!user.profile.phoneNumber) missingFields.push('Phone Number');
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required profile fields:', missingFields);
      throw new Error(`Please complete your profile before starting KYC. Missing fields: ${missingFields.join(', ')}`);
    }

    // Get active provider
    const provider = await getActiveKycProvider();
    if (!provider) {
      throw new Error('KYC provider not configured. Please contact support.');
    }

    console.log(`📝 Starting KYC verification for user ${userId} with provider ${provider.providerId}`);

    // Get integration secrets
    const secrets = await getIntegrationWithSecrets(provider.providerId);
    
    // For KYCAID, formId is required. For Sumsub, it's not needed (uses levelName instead)
    const formId = (secrets?.config as any)?.formId;
    
    if (provider.providerId === 'kycaid' && !formId) {
      throw new Error('KYC Form ID not configured for KYCAID. Please set it in admin panel: /admin/integrations');
    }

    if (formId) {
      console.log(`📋 Using form ID: ${formId}`);
    } else {
      console.log(`📋 No form ID needed for ${provider.providerId}`);
    }

    // Prepare user data
    // Note: KYCAID expects ISO2 (2-letter) country codes, but we store Alpha3 (3-letter)
    // We need to convert Alpha3 -> ISO2
    const alpha3ToIso2 = (alpha3: string): string => {
      // For now, use a simple mapping. In production, consider using a library like 'i18n-iso-countries'
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
      };
      return mapping[alpha3] || alpha3.substring(0, 2); // Fallback to first 2 chars
    };

    const userData: KycUserData = {
      email: user.email,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      dateOfBirth: formatDateForKyc(user.profile.dateOfBirth), // Use local date, not UTC
      nationality: alpha3ToIso2(user.profile.nationality),
      residenceCountry: alpha3ToIso2(user.profile.country),
      phone: user.profile.phoneNumber,
      city: user.profile.city || undefined,
      postalCode: user.profile.postalCode || undefined,
      address: user.profile.address || undefined,
      placeOfBirth: (user.profile as any).placeOfBirth || undefined,
      gender: (user.profile as any).gender || undefined, // M/F/O
      externalId: userId
    };

    console.log('👤 Creating applicant with data:');
    console.log('  Email:', userData.email);
    console.log('  Name:', userData.firstName, userData.lastName);
    console.log('  dateOfBirth (from DB):', user.profile.dateOfBirth);
    console.log('  dateOfBirth (typeof):', typeof user.profile.dateOfBirth);
    console.log('  dateOfBirth (formatted):', userData.dateOfBirth);
    console.log('  nationality:', user.profile.nationality, '→', userData.nationality);
    console.log('  residenceCountry:', user.profile.country, '→', userData.residenceCountry);
    
    // Step 1: Create applicant (or update existing if already created)
    let applicant: any;
    try {
      applicant = await provider.createApplicant(userData);
      console.log(`✅ Applicant created: ${applicant.applicantId}`);
    } catch (error: any) {
      // Check if error is 409 Conflict (applicant already exists)
      if (error.message && error.message.includes('already exists')) {
        console.log('ℹ️ Applicant already exists, extracting ID from error...');
        
        // Extract applicant ID from error message
        // Example: "Applicant with external user id 'xxx' already exists: 690e681e56f45eb45a8636b5"
        const match = error.message.match(/already exists[:\s]+([a-f0-9]+)/i);
        
        if (match && match[1]) {
          const existingApplicantId = match[1];
          console.log(`🔄 Found existing applicant: ${existingApplicantId}`);
          
          // UPDATE applicant with current data
          if (provider.updateApplicant) {
            console.log('📝 Updating applicant with current profile data...');
            const updateResult = await provider.updateApplicant(existingApplicantId, userData);
            
            if (updateResult.success) {
              console.log('✅ Applicant updated successfully in provider');
            } else {
              console.warn('⚠️ Failed to update applicant in provider:', updateResult.error);
              // Continue anyway - use existing applicant
            }
          } else {
            console.warn('⚠️ Provider does not support updateApplicant, using stale data');
          }
          
          applicant = {
            applicantId: existingApplicantId,
            status: 'existing',
            externalId: userData.externalId
          };
        } else {
          console.error('❌ Could not extract applicant ID from error:', error.message);
          throw new Error('Applicant already exists but could not retrieve ID. Please contact support.');
        }
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    // Step 2: Get form URL (for KYCAID) or prepare for WebSDK (for Sumsub)
    let formUrlResult: { url?: string; sessionId?: string } = {};
    
    if (provider.providerId === 'sumsub') {
      // Sumsub uses WebSDK, no form URL needed
      console.log('📝 Sumsub uses WebSDK - no form URL needed');
      formUrlResult = {
        sessionId: applicant.applicantId // Use applicantId as session identifier
      };
    } else {
      // KYCAID and other providers use form URLs
      console.log('📝 Getting form URL...');
      formUrlResult = await provider.getFormUrl(applicant.applicantId, formId);
      console.log(`✅ Form URL generated: ${formUrlResult.url}`);
      
      // Check if provider returned verificationId in the form URL response
      if (formUrlResult.sessionId) {
        console.log(`✅ Verification ID received: ${formUrlResult.sessionId}`);
      }
    }

    // Step 3: Save session in database (verification will be created via webhook after form submission)
    // Create or update KYC session in database
    // First, get existing session to preserve metadata
    const existingSession = await prisma.kycSession.findUnique({
      where: { userId: userId }
    });

    const kycSession = await prisma.kycSession.upsert({
      where: { userId: userId },
      create: {
        userId: userId,
        kycProviderId: provider.providerId,
        applicantId: applicant.applicantId,
        verificationId: formUrlResult.sessionId || null, // Save if available
        status: 'PENDING',
        metadata: {
          applicant: applicant.metadata || {}, // ✅ Save full applicant metadata (including externalUserId)
          applicantStatus: applicant.status,
          formUrl: formUrlResult.url || null, // Optional for Sumsub (uses WebSDK)
          formId: formId || null, // Optional for Sumsub (uses levelName)
          provider: provider.providerId,
          verificationIdFromFormUrl: !!formUrlResult.sessionId, // Track if we got it
          lastFormUpdate: new Date()
        },
        // Legacy fields for backward compatibility with KYCAID
        kycaidApplicantId: provider.providerId === 'kycaid' ? applicant.applicantId : null,
        kycaidVerificationId: provider.providerId === 'kycaid' ? (formUrlResult.sessionId || null) : null,
        kycaidFormId: provider.providerId === 'kycaid' ? formId : null,
        attempts: 1,
        lastAttemptAt: new Date()
      },
      update: {
        kycProviderId: provider.providerId,
        applicantId: applicant.applicantId,
        verificationId: formUrlResult.sessionId || null, // Save if available
        status: 'PENDING',
        metadata: {
          ...(existingSession?.metadata || {}), // ✅ Сохраняем ВСЕ старые данные
          applicant: {
            ...(existingSession?.metadata?.applicant || {}), // ✅ Сохраняем старый applicant
            ...(applicant.metadata || {}) // ✅ Добавляем новые поля
          },
          applicantStatus: applicant.status,
          formUrl: formUrlResult.url || null,
          formId: formId || null,
          provider: provider.providerId,
          verificationIdFromFormUrl: !!formUrlResult.sessionId,
          lastFormUpdate: new Date()
        },
        // Legacy fields for backward compatibility with KYCAID
        kycaidApplicantId: provider.providerId === 'kycaid' ? applicant.applicantId : null,
        kycaidVerificationId: provider.providerId === 'kycaid' ? (formUrlResult.sessionId || null) : null,
        kycaidFormId: provider.providerId === 'kycaid' ? formId : null,
        attempts: { increment: 1 },
        lastAttemptAt: new Date()
      }
    });

    console.log(`✅ KYC session ${kycSession.id} (attempts: ${kycSession.attempts})`);
    if (kycSession.kycaidVerificationId) {
      console.log(`✅ Verification ID saved: ${kycSession.kycaidVerificationId}`);
    } else {
      console.log(`ℹ️ No verification ID yet - will be created when user submits form`);
    }

    return {
      success: true,
      sessionId: kycSession.id,
      formUrl: formUrlResult.url || null, // Null for Sumsub (uses WebSDK)
      applicantId: applicant.applicantId,
      provider: provider.providerId,
      usesWebSDK: provider.providerId === 'sumsub' // Flag to indicate WebSDK usage
    };
  } catch (error: any) {
    console.error('❌ Failed to start KYC verification:', error);
    throw new Error(error.message || 'Failed to start KYC verification');
  }
}

/**
 * Helper: Merge metadata safely
 * Preserves existing metadata while adding/updating new fields
 * Critical for maintaining applicant data across updates
 */
function mergeMetadata(
  existingMetadata: any,
  newMetadata: any
): any {
  // If no existing metadata, return new metadata
  if (!existingMetadata || Object.keys(existingMetadata).length === 0) {
    return newMetadata;
  }

  // Deep merge: preserve existing, add new, update changed
  return {
    ...existingMetadata,
    ...newMetadata,
    // Special handling for nested 'applicant' object - preserve it!
    applicant: {
      ...(existingMetadata.applicant || {}),
      ...(newMetadata.applicant || {})
    }
  };
}

/**
 * Check KYC status (polling)
 * Enterprise-level status checking with proper error handling
 */
export async function checkKycStatus(userId: string) {
  // Declare session outside try block for access in catch
  let session: any = null;
  
  try {
    // Get user's KYC session
    session = await prisma.kycSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      return {
        status: 'NOT_STARTED',
        message: 'KYC verification not started'
      };
    }

    // If already completed, return cached status
    // Note: REJECTED status is NOT cached - we always poll Sumsub to get fresh rejectLabels and reviewRejectType
    if (session.status === 'APPROVED' || session.status === 'EXPIRED') {
      return formatStatusResponse(session);
    }

    // Get provider and check status
    const providerId = session.kycProviderId || (session.metadata as any)?.provider || 'kycaid';
    
    // Must have at least applicantId to check status
    if (!providerId || (!session.applicantId && !session.kycaidApplicantId)) {
      return formatStatusResponse(session, 'KYC session created, please complete the form');
    }
    
    const provider = integrationRegistry.getProvider(providerId) as IKycProvider;
    if (!provider) {
      return formatStatusResponse(session, 'Unable to check status - provider not found');
    }

    // Initialize provider
    const secrets = await getIntegrationWithSecrets(providerId);
    if (!secrets?.apiKey && !(secrets?.config as any)?.appToken) {
      console.warn('⚠️ No API key found for KYC provider');
      return formatStatusResponse(session, 'Unable to check status - provider not configured');
    }
    
    await provider.initialize({
      apiKey: secrets.apiKey,
      apiEndpoint: secrets.apiEndpoint || undefined,
      ...(secrets.config as Record<string, any> || {})
    });

    const applicantId = getApplicantId(session);
    const verificationId = getVerificationId(session);
    
    console.log(`🔍 Polling KYC status for applicant: ${applicantId}`);

    // Check if we have verificationId (form was submitted)
    if (verificationId) {
      // Poll provider for verification status
      console.log(`📊 Checking verification: ${verificationId}`);
      
      try {
        const result = await provider.getVerificationStatus(verificationId);

        // Update session if status changed OR if it's rejected (to update resubmission fields)
        if (result.status !== session.status.toLowerCase() || result.status === 'rejected') {
          const updatedSession = await prisma.kycSession.update({
            where: { id: session.id },
            data: {
              status: result.status.toUpperCase() as any,
              completedAt: result.completedAt || new Date(),
              rejectionReason: result.rejectionReason || undefined,
              // Resubmission fields
              rejectLabels: result.rejectLabels || [],
              reviewRejectType: result.reviewRejectType || null,
              canResubmit: result.canResubmit || false,
              moderationComment: result.moderationComment || null,
              clientComment: result.clientComment || null,
              metadata: mergeMetadata(session.metadata, {
                lastChecked: new Date(),
                providerResponse: result.metadata
              })
            }
          });

          console.log(`✅ KYC status updated from ${session.status} to ${result.status.toUpperCase()}`);

          return formatStatusResponse(updatedSession);
        }

        // Even if status unchanged, update lastChecked timestamp
        await prisma.kycSession.update({
          where: { id: session.id },
          data: {
            metadata: mergeMetadata(session.metadata, {
              lastChecked: new Date()
            })
          }
        });

        console.log(`ℹ️ KYC status unchanged: ${session.status}`);
      } catch (statusError: any) {
        // Handle 404 - applicant not found in provider
        if (statusError.message && (statusError.message.includes('404') || statusError.message.includes('not found'))) {
          console.warn(`⚠️ Applicant ${verificationId} not found in provider, returning DB status`);
          
          // Update metadata to mark this issue
          await prisma.kycSession.update({
            where: { id: session.id },
            data: {
              metadata: mergeMetadata(session.metadata, {
                lastChecked: new Date(),
                lastError: 'Applicant not found in provider',
                errorTimestamp: new Date().toISOString()
              })
            }
          });
          
          // Return current status from DB
          return formatStatusResponse(session, 'Status check unavailable - using cached status');
        }
        
        // Re-throw other errors
        throw statusError;
      }
    } else {
      // No verificationId yet - try to create one or check applicant
      console.log(`📊 No verificationId found - attempting to create verification`);
      
      try {
        // Try to create verification for the applicant
        const formId = getFormId(session, secrets);
        
        if (formId && applicantId) {
          console.log(`🔧 Creating verification for applicant: ${applicantId}`);
          const verification = await provider.createVerification(applicantId, formId);
          
          console.log(`✅ Verification created: ${verification.verificationId}`);
          
          // Update session with verificationId
          await prisma.kycSession.update({
            where: { id: session.id },
            data: {
              kycaidVerificationId: verification.verificationId,
              metadata: mergeMetadata(session.metadata, {
                verificationCreatedOnRefresh: new Date().toISOString(),
                verificationData: verification.metadata
              })
            }
          });
          
          console.log(`✅ Session updated with verification ID`);
          
          // Now check the status of newly created verification
          const result = await provider.getVerificationStatus(verification.verificationId);
          
          if (result.status !== session.status.toLowerCase()) {
            const updatedSession = await prisma.kycSession.update({
              where: { id: session.id },
              data: {
                status: result.status.toUpperCase() as any,
                completedAt: result.completedAt || new Date(),
                rejectionReason: result.rejectionReason || undefined,
                metadata: mergeMetadata(session.metadata, {
                  lastChecked: new Date(),
                  providerResponse: result.metadata
                })
              }
            });

            console.log(`✅ KYC status updated from ${session.status} to ${result.status.toUpperCase()}`);

            return formatStatusResponse(updatedSession);
          }
        } else {
          console.warn('⚠️ No Form ID available to create verification');
        }
      } catch (createError: any) {
        console.warn(`⚠️ Failed to create verification: ${createError.message}`);
        console.log('📊 Falling back to applicant status check');
      }
      
      // Fallback: check applicant status directly
      console.log(`📊 Checking applicant status (fallback)`);
      if (!applicantId) {
        throw new Error('No applicant ID found in session');
      }
      const applicant = await provider.getApplicant(applicantId);
      
      console.log(`📋 Applicant status: ${applicant.status}`);
      
      // Check if applicant has been verified (status changed)
      if (applicant.metadata?.verificationStatus) {
        const verificationStatus = applicant.metadata.verificationStatus.toLowerCase();
        
        if (verificationStatus === 'approved' && session.status === 'PENDING') {
          const updatedSession = await prisma.kycSession.update({
            where: { id: session.id },
            data: {
              status: 'APPROVED',
              completedAt: new Date(),
              metadata: mergeMetadata(session.metadata, {
                lastChecked: new Date(),
                applicantResponse: applicant.metadata
              })
            }
          });

          console.log(`✅ KYC status updated to APPROVED (from applicant status)`);

          return formatStatusResponse(updatedSession);
        } else if (verificationStatus === 'declined' && session.status === 'PENDING') {
          const updatedSession = await prisma.kycSession.update({
            where: { id: session.id },
            data: {
              status: 'REJECTED',
              completedAt: new Date(),
              rejectionReason: 'Verification declined',
              metadata: mergeMetadata(session.metadata, {
                lastChecked: new Date(),
                applicantResponse: applicant.metadata
              })
            }
          });

          console.log(`✅ KYC status updated to REJECTED (from applicant status)`);

          return formatStatusResponse(updatedSession);
        }
      }
    }

    return formatStatusResponse(session);
  } catch (error: any) {
    console.error('❌ Failed to check KYC status:', error);
    
    // Enterprise-level error handling:
    // If error is 404 (applicant not found), return current session status
    // This can happen if applicant was deleted/deactivated in provider but exists in our DB
    if (error.message && (error.message.includes('404') || error.message.includes('not found'))) {
      console.warn('⚠️ Applicant not found in provider, returning current DB status');
      if (session) {
        // Update lastChecked timestamp even if provider returned 404
        await prisma.kycSession.update({
          where: { id: session.id },
          data: {
            metadata: mergeMetadata(session.metadata, {
              lastChecked: new Date(),
              lastError: '404 Applicant not found in provider'
            })
          }
        });
        
        return formatStatusResponse(session);
      }
    }
    
    // For other errors, throw with proper context
    const errorMessage = error.message || 'Failed to check KYC status';
    const enhancedError: any = new Error(errorMessage);
    enhancedError.statusCode = error.statusCode || 500;
    enhancedError.originalError = error;
    
    throw enhancedError;
  }
}

/**
 * Process KYC webhook (called by webhook endpoint)
 */
export async function processKycWebhook(
  providerId: string,
  payload: any,
  signature?: string
) {
  try {
    console.log(`📝 Processing KYC webhook from ${providerId}`);

    // Get provider
    const provider = integrationRegistry.getProvider(providerId) as IKycProvider;
    if (!provider) {
      throw new Error(`Provider "${providerId}" not found`);
    }

    // Initialize provider
    const secrets = await getIntegrationWithSecrets(providerId);
    if (secrets?.apiKey) {
      await provider.initialize({
        apiKey: secrets.apiKey,
        apiEndpoint: secrets.apiEndpoint || undefined,
        ...(secrets.config as Record<string, any> || {})
      });
    }

    // Verify signature if provided
    if (signature && provider.verifyWebhookSignature) {
      const isValid = provider.verifyWebhookSignature(JSON.stringify(payload), signature);
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        throw new Error('Invalid webhook signature');
      }
      console.log('✅ Webhook signature verified');
    } else if (!signature) {
      console.warn('⚠️ Webhook received without signature (consider enabling webhook secret in KYCAID dashboard)');
    }

    // Process webhook
    if (!provider.processWebhook) {
      throw new Error('Provider does not support webhooks');
    }

    const webhookData = provider.processWebhook(payload);

    // Find session by verification ID or applicant ID
    const session = await prisma.kycSession.findFirst({
      where: {
        OR: [
          { kycaidVerificationId: webhookData.verificationId },
          { kycaidApplicantId: webhookData.applicantId }
        ],
        kycProviderId: providerId
      }
    });

    if (!session) {
      console.warn(`⚠️ No session found for verification ${webhookData.verificationId}`);
      return { success: false, message: 'Session not found' };
    }

    // Update session
    const updatedSession = await prisma.kycSession.update({
      where: { id: session.id },
      data: {
        status: webhookData.status.toUpperCase() as any,
        completedAt: webhookData.status === 'approved' || webhookData.status === 'rejected' 
          ? new Date() 
          : undefined,
        rejectionReason: webhookData.reason || undefined,
        webhookData: webhookData.metadata,
        metadata: mergeMetadata(session.metadata, {
          lastWebhook: new Date(),
          webhookStatus: webhookData.status
        })
      }
    });

    console.log(`✅ KYC session updated via webhook: ${updatedSession.status}`);

    // Send email notification to user
    try {
      const user = await prisma.user.findUnique({
        where: { id: updatedSession.userId },
        select: { email: true }
      });

      if (user?.email) {
        const { eventEmitter } = await import('./event-emitter.service');
        
        if (updatedSession.status === 'APPROVED') {
          await eventEmitter.emit('KYC_APPROVED', {
            userId: updatedSession.userId,
            recipientEmail: user.email,
          });
          console.log(`✅ [NOTIFICATION] Sent KYC_APPROVED via webhook for user ${updatedSession.userId}`);
        } else if (updatedSession.status === 'REJECTED') {
          await eventEmitter.emit('KYC_REJECTED', {
            userId: updatedSession.userId,
            recipientEmail: user.email,
            reason: updatedSession.rejectionReason || 'No reason provided',
          });
          console.log(`✅ [NOTIFICATION] Sent KYC_REJECTED via webhook for user ${updatedSession.userId}`);
        }
      }
    } catch (notifError) {
      // Don't fail the webhook if notification fails
      console.error('❌ [NOTIFICATION] Failed to send KYC webhook notification:', notifError);
    }

    return {
      success: true,
      status: updatedSession.status,
      sessionId: updatedSession.id
    };
  } catch (error: any) {
    console.error('❌ Failed to process KYC webhook:', error);
    throw error;
  }
}

/**
 * Get status message
 */
function getStatusMessage(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Your verification is being reviewed';
    case 'APPROVED':
      return 'Your identity has been verified';
    case 'REJECTED':
      return 'Your verification was rejected';
    case 'EXPIRED':
      return 'Your verification has expired';
    default:
      return 'Verification status unknown';
  }
}

/**
 * Sync KYC documents from KYCAID and save to database
 * Downloads passport/ID photos and document data
 */
export async function syncKycDocuments(sessionId: string): Promise<{ documentsCount: number; message: string }> {
  try {
    console.log('📄 Syncing KYC documents for session:', sessionId);

    // Get KYC session
    const session = await prisma.kycSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new Error('KYC session not found');
    }

    const applicantId = getApplicantId(session);
    const verificationId = getVerificationId(session);
    
    if (!applicantId) {
      throw new Error('No applicant ID - cannot sync documents');
    }

    if (session.status !== 'APPROVED' && session.status !== 'REJECTED') {
      throw new Error('Documents only available for completed verifications');
    }

    // Get provider
    const providerId = (session.metadata as any)?.provider || 'kycaid';
    const provider = integrationRegistry.getProvider(providerId);
    
    if (!provider) {
      throw new Error(`KYC provider "${providerId}" not found`);
    }

    // Initialize provider
    const secrets = await getIntegrationWithSecrets(providerId);
    if (!secrets?.apiKey) {
      throw new Error('KYCAID is not configured. Please set API key in /admin/integrations');
    }

    // Check if API key is placeholder
    if (secrets.apiKey.includes('your-kycaid-api-key') || secrets.apiKey.includes('placeholder')) {
      throw new Error('KYCAID API key is not configured. Please set a valid API key in /admin/integrations');
    }

    await provider.initialize({
      apiKey: secrets.apiKey,
      apiEndpoint: secrets.apiEndpoint || undefined,
      ...(secrets.config as Record<string, any> || {})
    });

    // Get documents from KYCAID (or other provider)
    const kycaidProvider = provider as any;
    
    if (!kycaidProvider.getApplicantDocuments) {
      throw new Error('Provider does not support document retrieval');
    }

    console.log('📥 Fetching documents from KYC provider...');
    
    if (!verificationId) {
      throw new Error('Missing verification ID');
    }
    
    const documents = await kycaidProvider.getApplicantDocuments(
      applicantId,
      verificationId
    );

    console.log(`✅ Found ${documents.length} documents`);

    if (documents.length === 0) {
      console.log('ℹ️ No documents found - this might be normal');
      console.log('💡 Reasons:');
      console.log('   - Documents are still being processed by KYCAID');
      console.log('   - User did not upload documents in the form');
      console.log('   - Documents will appear in KYCAID after some time');
      console.log('');
      console.log('📌 You can try syncing again in a few minutes');
      
      // Update metadata to track sync attempt
      await prisma.kycSession.update({
        where: { id: sessionId },
        data: {
          metadata: mergeMetadata(session.metadata, {
            lastDocumentSyncAttempt: new Date().toISOString(),
            documentSyncAttempts: ((session.metadata as any)?.documentSyncAttempts || 0) + 1
          })
        }
      });
      
      return {
        documentsCount: 0,
        message: 'No documents found yet. Documents may still be processing in KYCAID. Try again in a few minutes.'
      };
    }

    let syncedCount = 0;

    // Process each document
    for (const doc of documents) {
      try {
        console.log(`📄 Processing document: ${doc.document_id} (${doc.type})`);

        // Check if already exists by checking verification data
        const existingDoc = await prisma.kycDocument.findFirst({
          where: {
            kycSessionId: sessionId,
            verificationData: {
              path: ['document_id'],
              equals: doc.document_id
            }
          }
        });

        if (existingDoc) {
          console.log(`⏭️ Document already synced: ${doc.document_id}`);
          continue;
        }

        // Save to database using existing fields
        const fileName = `${doc.type}_${doc.document_id}`;
        const fileUrl = doc.front_side || doc.back_side || '';

        await prisma.kycDocument.create({
          data: {
            kycSessionId: sessionId,
            documentType: doc.type || 'OTHER',
            fileUrl: fileUrl,
            fileName: fileName,
            fileSize: 0, // Unknown from KYCAID
            mimeType: 'image/jpeg', // Default
            verifiedByAI: doc.status === 'valid',
            verificationData: {
              // KYCAID document data
              document_id: doc.document_id,
              applicant_id: doc.applicant_id,
              type: doc.type,
              provider: doc.provider,
              status: doc.status,
              document_number: doc.document_number,
              additional_number: doc.additional_number,
              issue_date: doc.issue_date,
              expiry_date: doc.expiry_date,
              // Image URLs
              front_side_id: doc.front_side_id,
              front_side: doc.front_side,
              back_side_id: doc.back_side_id,
              back_side: doc.back_side,
              other_side_1_id: doc.other_side_1_id,
              other_side_1: doc.other_side_1,
              other_side_2_id: doc.other_side_2_id,
              other_side_2: doc.other_side_2,
              other_side_3_id: doc.other_side_3_id,
              other_side_3: doc.other_side_3,
              // Financial info
              income_sources: doc.income_sources,
              annual_income: doc.annual_income,
              transaction_amount: doc.transaction_amount,
              transaction_purpose: doc.transaction_purpose,
              transaction_currency: doc.transaction_currency,
              transaction_datetime: doc.transaction_datetime,
              origin_funds: doc.origin_funds,
              // Card/Account
              card_number: doc.card_number,
              account_number: doc.account_number,
              // Decline reasons
              decline_reasons: doc.decline_reasons,
              // System
              created_at: doc.created_at,
              synced_at: new Date().toISOString()
            }
          }
        });

        syncedCount++;
        console.log(`✅ Document saved to database: ${doc.document_id}`);

      } catch (docError: any) {
        console.error(`❌ Failed to process document ${doc.document_id}:`, docError.message);
      }
    }

    // Update session metadata
    await prisma.kycSession.update({
      where: { id: sessionId },
      data: {
        metadata: mergeMetadata(session.metadata, {
          documentsSynced: new Date().toISOString(),
          documentsCount: syncedCount
        })
      }
    });

    console.log(`✅ Successfully synced ${syncedCount} documents`);

    return {
      documentsCount: syncedCount,
      message: `Successfully synced ${syncedCount} document(s)`
    };

  } catch (error: any) {
    console.error('❌ Failed to sync KYC documents:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('502')) {
      throw new Error('KYCAID service is temporarily unavailable. Please try again later.');
    }
    
    if (error.message.includes('401') || error.message.includes('403')) {
      throw new Error('Invalid KYCAID API credentials. Please check integration settings.');
    }
    
    throw new Error(error.message || 'Failed to sync KYC documents');
  }
}

// Keep the old function name for backwards compatibility but make it call syncKycDocuments
export async function downloadKycReport(_sessionId: string): Promise<Buffer> {
  // For now, throw error directing to use new sync function
  throw new Error('PDF reports are not available. Use document sync instead.');
}

/**
 * Get KYC form configuration from admin settings
 */
export async function getKycFormConfig() {
  try {
    const provider = await getActiveKycProvider();
    
    if (!provider) {
      return null;
    }

    const config = provider.getConfig();
    
    return {
      provider: provider.providerId,
      providerId: provider.providerId,
      formId: config.metadata?.formId,
      requiredFields: [
        'firstName',
        'lastName',
        'dateOfBirth',
        'nationality',
        'country',
        'phoneNumber'
      ],
      optionalFields: [
        'city',
        'postalCode',
        'address'
      ]
    };
  } catch (error) {
    console.error('❌ Failed to get KYC form config:', error);
    return null;
  }
}
