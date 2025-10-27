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
    const userData: KycUserData = {
      email: user.email,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      dateOfBirth: user.profile.dateOfBirth.toISOString().split('T')[0], // YYYY-MM-DD
      nationality: user.profile.nationality,
      residenceCountry: user.profile.country,
      phone: user.profile.phoneNumber,
      city: user.profile.city || undefined,
      postalCode: user.profile.postalCode || undefined,
      address: user.profile.address || undefined,
      externalId: userId
    };

    console.log('👤 Creating applicant...');
    
    // Step 1: Create applicant
    const applicant = await provider.createApplicant(userData);
    console.log(`✅ Applicant created: ${applicant.applicantId}`);

    // Step 2: Get form URL (documents will be uploaded through the form)
    console.log('📝 Getting form URL...');
    const formUrlResult = await provider.getFormUrl(applicant.applicantId, formId);
    console.log(`✅ Form URL generated: ${formUrlResult.url}`);

    // Step 3: Save session in database (verification will be created via webhook after form submission)
    const kycSession = await prisma.kycSession.create({
      data: {
        userId: userId,
        // Don't set kycProviderId - it has a foreign key constraint we don't use
        kycaidApplicantId: applicant.applicantId,
        kycaidFormId: formId,
        // verificationId will be set later via webhook
        status: 'PENDING',
        metadata: {
          applicantStatus: applicant.status,
          formUrl: formUrlResult.url,
          provider: provider.providerId // Store provider in metadata instead
        },
        attempts: 1,
        lastAttemptAt: new Date()
      }
    });

    console.log(`✅ KYC session created: ${kycSession.id}`);

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
    const providerId = (session.metadata as any)?.provider || 'kycaid'; // Get from metadata or default to kycaid
    
    if (!providerId || !session.kycaidVerificationId) {
      // No verification ID yet - user hasn't completed the form
      // Return PENDING with formUrl so they can complete it
      return {
        status: session.status,
        sessionId: session.id,
        formUrl: (session.metadata as any)?.formUrl,
        completedAt: session.completedAt,
        rejectionReason: session.rejectionReason,
        message: 'Please complete the verification form'
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
    if (secrets?.apiKey) {
      await provider.initialize({
        apiKey: secrets.apiKey,
        apiEndpoint: secrets.apiEndpoint || undefined,
        ...secrets.config
      });
    }

    // Poll provider for status
    const result = await provider.getVerificationStatus(session.kycaidVerificationId);

    // Update session if status changed
    if (result.status !== session.status.toLowerCase()) {
      const updatedSession = await prisma.kycSession.update({
        where: { id: session.id },
        data: {
          status: result.status.toUpperCase() as any,
          completedAt: result.completedAt || undefined,
          rejectionReason: result.rejectionReason || undefined,
          metadata: {
            ...session.metadata as any,
            lastChecked: new Date(),
            providerResponse: result.metadata
          }
        }
      });

      console.log(`✅ KYC status updated: ${result.status}`);

      return {
        status: updatedSession.status,
        sessionId: updatedSession.id,
        completedAt: updatedSession.completedAt,
        rejectionReason: updatedSession.rejectionReason,
        formUrl: (updatedSession.metadata as any)?.formUrl,
        message: getStatusMessage(updatedSession.status)
      };
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

