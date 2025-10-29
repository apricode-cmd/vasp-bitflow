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
 * Get active KYC provider
 */
async function getActiveKycProvider(): Promise<IKycProvider | null> {
  try {
    console.log('🔍 Looking for active KYC provider...');
    
    // Find active KYC integration (KYCAID for now)
    const integration = await prisma.integration.findFirst({
      where: {
        service: 'kycaid', // We only have KYCAID for now
        isEnabled: true,
        status: 'active'
      }
    });

    if (!integration) {
      console.warn('⚠️ No active KYCAID integration found');
      console.log('Check: /admin/integrations - KYCAID should be enabled with API key');
      return null;
    }

    console.log('✅ Found KYCAID integration:', integration.service);

    // Get provider from registry
    const provider = integrationRegistry.getProvider(integration.service) as IKycProvider;
    
    if (!provider) {
      console.error(`❌ KYC provider "${integration.service}" not found in registry`);
      return null;
    }

    console.log('✅ Provider found in registry');

    // Initialize with secrets
    const secrets = await getIntegrationWithSecrets(integration.service);
    if (secrets?.apiKey) {
      console.log('✅ Initializing provider with API key');
      await provider.initialize({
        apiKey: secrets.apiKey,
        apiEndpoint: secrets.apiEndpoint || undefined,
        ...secrets.config
      });
    } else {
      console.warn('⚠️ No API key found for KYCAID');
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

    // Validate required fields
    if (!user.profile.firstName || !user.profile.lastName || 
        !user.profile.dateOfBirth || !user.profile.nationality || 
        !user.profile.country || !user.profile.phoneNumber) {
      throw new Error('Please complete your profile before starting KYC');
    }

    // Get active provider
    const provider = await getActiveKycProvider();
    if (!provider) {
      throw new Error('KYC provider not configured. Please contact support.');
    }

    console.log(`📝 Starting KYC verification for user ${userId} with provider ${provider.providerId}`);

    // Get integration secrets to access formId from config
    const secrets = await getIntegrationWithSecrets(provider.providerId);
    const formId = secrets?.config?.formId;
    
    if (!formId) {
      throw new Error('KYC Form ID not configured. Please set it in admin panel: /admin/integrations');
    }

    console.log(`📋 Using form ID: ${formId}`);

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
      dateOfBirth: user.profile.dateOfBirth.toISOString().split('T')[0], // YYYY-MM-DD
      nationality: alpha3ToIso2(user.profile.nationality),
      residenceCountry: alpha3ToIso2(user.profile.country),
      phone: user.profile.phoneNumber,
      city: user.profile.city || undefined,
      postalCode: user.profile.postalCode || undefined,
      address: user.profile.address || undefined,
      externalId: userId
    };

    console.log('👤 Creating applicant with ISO2 country codes...');
    console.log('  nationality:', user.profile.nationality, '→', userData.nationality);
    console.log('  residenceCountry:', user.profile.country, '→', userData.residenceCountry);
    
    // Step 1: Create applicant
    const applicant = await provider.createApplicant(userData);
    console.log(`✅ Applicant created: ${applicant.applicantId}`);

    // Step 2: Get form URL (documents will be uploaded through the form)
    console.log('📝 Getting form URL...');
    const formUrlResult = await provider.getFormUrl(applicant.applicantId, formId);
    console.log(`✅ Form URL generated: ${formUrlResult.url}`);
    
    // Check if KYCAID returned verificationId in the form URL response
    if (formUrlResult.sessionId) {
      console.log(`✅ Verification ID received: ${formUrlResult.sessionId}`);
    }

    // Step 3: Save session in database (verification will be created via webhook after form submission)
    // Create or update KYC session in database
    const kycSession = await prisma.kycSession.upsert({
      where: { userId: userId },
      create: {
        userId: userId,
        kycaidApplicantId: applicant.applicantId,
        kycaidVerificationId: formUrlResult.sessionId || null, // Save if available
        kycaidFormId: formId,
        status: 'PENDING',
        metadata: {
          applicantStatus: applicant.status,
          formUrl: formUrlResult.url,
          provider: provider.providerId,
          verificationIdFromFormUrl: !!formUrlResult.sessionId // Track if we got it
        },
        attempts: 1,
        lastAttemptAt: new Date()
      },
      update: {
        kycaidApplicantId: applicant.applicantId,
        kycaidVerificationId: formUrlResult.sessionId || null, // Save if available
        kycaidFormId: formId,
        status: 'PENDING',
        metadata: {
          applicantStatus: applicant.status,
          formUrl: formUrlResult.url,
          provider: provider.providerId,
          verificationIdFromFormUrl: !!formUrlResult.sessionId // Track if we got it
        },
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
      formUrl: formUrlResult.url,
      applicantId: applicant.applicantId,
      provider: provider.displayName
    };
  } catch (error: any) {
    console.error('❌ Failed to start KYC verification:', error);
    throw new Error(error.message || 'Failed to start KYC verification');
  }
}

/**
 * Check KYC status (polling)
 */
export async function checkKycStatus(userId: string) {
  try {
    // Get user's KYC session
    const session = await prisma.kycSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      return {
        status: 'NOT_STARTED',
        message: 'KYC verification not started'
      };
    }

    // If already completed/rejected, return cached status
    if (session.status === 'APPROVED' || session.status === 'REJECTED' || session.status === 'EXPIRED') {
      return {
        status: session.status,
        sessionId: session.id,
        completedAt: session.completedAt,
        rejectionReason: session.rejectionReason,
        formUrl: (session.metadata as any)?.formUrl,
        message: getStatusMessage(session.status)
      };
    }

    // Get provider and check status
    const providerId = (session.metadata as any)?.provider || 'kycaid';
    
    // Must have at least applicantId to check status
    if (!providerId || !session.kycaidApplicantId) {
      return {
        status: session.status,
        sessionId: session.id,
        formUrl: (session.metadata as any)?.formUrl,
        completedAt: session.completedAt,
        rejectionReason: session.rejectionReason,
        message: 'KYC session created, please complete the form'
      };
    }
    
    const provider = integrationRegistry.getProvider(providerId) as IKycProvider;
    if (!provider) {
      return {
        status: session.status,
        sessionId: session.id,
        completedAt: session.completedAt,
        rejectionReason: session.rejectionReason,
        message: 'Unable to check status - provider not found'
      };
    }

    // Initialize provider
    const secrets = await getIntegrationWithSecrets(providerId);
    if (!secrets?.apiKey) {
      console.warn('⚠️ No API key found for KYC provider');
      return {
        status: session.status,
        sessionId: session.id,
        formUrl: (session.metadata as any)?.formUrl,
        message: 'Unable to check status - provider not configured'
      };
    }
    
    await provider.initialize({
      apiKey: secrets.apiKey,
      apiEndpoint: secrets.apiEndpoint || undefined,
      ...secrets.config
    });

    console.log(`🔍 Polling KYC status for applicant: ${session.kycaidApplicantId}`);

    // Check if we have verificationId (form was submitted)
    if (session.kycaidVerificationId) {
      // Poll provider for verification status
      console.log(`📊 Checking verification: ${session.kycaidVerificationId}`);
      const result = await provider.getVerificationStatus(session.kycaidVerificationId);

      // Update session if status changed
      if (result.status !== session.status.toLowerCase()) {
        const updatedSession = await prisma.kycSession.update({
          where: { id: session.id },
          data: {
            status: result.status.toUpperCase() as any,
            completedAt: result.completedAt || new Date(),
            rejectionReason: result.rejectionReason || undefined,
            metadata: {
              ...session.metadata as any,
              lastChecked: new Date(),
              providerResponse: result.metadata
            }
          }
        });

        console.log(`✅ KYC status updated from ${session.status} to ${result.status.toUpperCase()}`);

        return {
          status: updatedSession.status,
          sessionId: updatedSession.id,
          completedAt: updatedSession.completedAt,
          rejectionReason: updatedSession.rejectionReason,
          formUrl: (updatedSession.metadata as any)?.formUrl,
          message: getStatusMessage(updatedSession.status)
        };
      }

      console.log(`ℹ️ KYC status unchanged: ${session.status}`);
    } else {
      // No verificationId yet - try to create one or check applicant
      console.log(`📊 No verificationId found - attempting to create verification`);
      
      try {
        // Try to create verification for the applicant
        const formId = session.kycaidFormId || secrets.config?.formId;
        
        if (formId) {
          console.log(`🔧 Creating verification for applicant: ${session.kycaidApplicantId}`);
          const verification = await provider.createVerification(session.kycaidApplicantId, formId);
          
          console.log(`✅ Verification created: ${verification.verificationId}`);
          
          // Update session with verificationId
          await prisma.kycSession.update({
            where: { id: session.id },
            data: {
              kycaidVerificationId: verification.verificationId,
              metadata: {
                ...session.metadata as any,
                verificationCreatedOnRefresh: new Date().toISOString(),
                verificationData: verification.metadata
              }
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
                metadata: {
                  ...session.metadata as any,
                  lastChecked: new Date(),
                  providerResponse: result.metadata
                }
              }
            });

            console.log(`✅ KYC status updated from ${session.status} to ${result.status.toUpperCase()}`);

            return {
              status: updatedSession.status,
              sessionId: updatedSession.id,
              completedAt: updatedSession.completedAt,
              rejectionReason: updatedSession.rejectionReason,
              formUrl: (updatedSession.metadata as any)?.formUrl,
              message: getStatusMessage(updatedSession.status)
            };
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
      const applicant = await provider.getApplicant(session.kycaidApplicantId);
      
      console.log(`📋 Applicant status: ${applicant.status}`);
      
      // Check if applicant has been verified (status changed)
      if (applicant.metadata?.verificationStatus) {
        const verificationStatus = applicant.metadata.verificationStatus.toLowerCase();
        
        if (verificationStatus === 'approved' && session.status !== 'APPROVED') {
          const updatedSession = await prisma.kycSession.update({
            where: { id: session.id },
            data: {
              status: 'APPROVED',
              completedAt: new Date(),
              metadata: {
                ...session.metadata as any,
                lastChecked: new Date(),
                applicantResponse: applicant.metadata
              }
            }
          });

          console.log(`✅ KYC status updated to APPROVED (from applicant status)`);

          return {
            status: updatedSession.status,
            sessionId: updatedSession.id,
            completedAt: updatedSession.completedAt,
            formUrl: (updatedSession.metadata as any)?.formUrl,
            message: getStatusMessage(updatedSession.status)
          };
        } else if (verificationStatus === 'declined' && session.status !== 'REJECTED') {
          const updatedSession = await prisma.kycSession.update({
            where: { id: session.id },
            data: {
              status: 'REJECTED',
              completedAt: new Date(),
              rejectionReason: 'Verification declined',
              metadata: {
                ...session.metadata as any,
                lastChecked: new Date(),
                applicantResponse: applicant.metadata
              }
            }
          });

          console.log(`✅ KYC status updated to REJECTED (from applicant status)`);

          return {
            status: updatedSession.status,
            sessionId: updatedSession.id,
            completedAt: updatedSession.completedAt,
            rejectionReason: updatedSession.rejectionReason,
            formUrl: (updatedSession.metadata as any)?.formUrl,
            message: getStatusMessage(updatedSession.status)
          };
        }
      }
    }

    return {
      status: session.status,
      sessionId: session.id,
      formUrl: (session.metadata as any)?.formUrl,
      message: getStatusMessage(session.status)
    };
  } catch (error: any) {
    console.error('❌ Failed to check KYC status:', error);
    throw new Error('Failed to check KYC status');
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
        ...secrets.config
      });
    }

    // Verify signature if provided
    if (signature && provider.verifyWebhookSignature) {
      const isValid = provider.verifyWebhookSignature(JSON.stringify(payload), signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
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
        metadata: {
          ...session.metadata as any,
          lastWebhook: new Date(),
          webhookStatus: webhookData.status
        }
      }
    });

    console.log(`✅ KYC session updated via webhook: ${updatedSession.status}`);

    // TODO: Send email notification to user
    // TODO: Trigger any post-approval actions

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
      provider: provider.displayName,
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

