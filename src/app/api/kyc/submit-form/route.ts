// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * POST /api/kyc/submit-form
 * Save all KYC form data to KycFormData table
 * AND update applicant data in Sumsub
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getClientSession } from '@/auth-client';
import { prisma } from '@/lib/prisma';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { KycUserData } from '@/lib/integrations/categories/IKycProvider';
import { alpha3ToIso2, formatDateForKyc } from '@/lib/utils/country-codes';

export async function POST(request: NextRequest) {
  try {
    const session = await getClientSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { formData } = body;

    if (!formData || typeof formData !== 'object') {
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      );
    }

    console.log('📝 Saving KYC form data for user:', session.user.id);
    console.log('📊 Total fields to save:', Object.keys(formData).length);

    // Get existing KYC session or create one
    let kycSession = await prisma.kycSession.findUnique({
      where: { userId: session.user.id }
    });

    if (!kycSession) {
      console.log('⚠️ No KYC session found, creating one automatically...');
      
      // Create KYC session automatically (without provider - will be set later)
      kycSession = await prisma.kycSession.create({
        data: {
          userId: session.user.id,
          status: 'PENDING',
          metadata: {
            createdVia: 'form-submit',
            createdAt: new Date().toISOString()
          }
        }
      });
      
      console.log('✅ Created KYC session:', kycSession.id);
      
      // Revalidate cache when creating new session
      revalidatePath('/admin/kyc');
      revalidatePath('/admin/users');
      revalidatePath(`/admin/users/${session.user.id}`);
      revalidateTag('kyc-sessions');
      revalidateTag(`kyc-${session.user.id}`);
    }

    console.log('📋 Using existing KYC Session ID:', kycSession.id);

    // Delete existing form data for this session
    await prisma.kycFormData.deleteMany({
      where: { kycSessionId: kycSession.id }
    });

    console.log('🗑️ Cleared old form data');

    // Save all form fields to KycFormData
    const formDataRecords = Object.entries(formData)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([fieldName, fieldValue]) => ({
        kycSessionId: kycSession.id,
        fieldName,
        fieldValue: String(fieldValue)
      }));

    if (formDataRecords.length > 0) {
      await prisma.kycFormData.createMany({
        data: formDataRecords
      });

      console.log('✅ Saved', formDataRecords.length, 'form fields');
    }

    // Update session metadata
    await prisma.kycSession.update({
      where: { id: kycSession.id },
      data: {
        submittedAt: new Date(),
        metadata: {
          ...(kycSession.metadata as any || {}),
          formFieldsCount: formDataRecords.length,
          lastFormUpdate: new Date().toISOString()
        }
      }
    });

    console.log('✅ KYC form data saved successfully!');

    // Link any uploaded documents to this session
    const documentsLinked = await prisma.kycDocument.updateMany({
      where: {
        userId: session.user.id,
        kycSessionId: null
      },
      data: {
        kycSessionId: kycSession.id
      }
    });

    if (documentsLinked.count > 0) {
      console.log(`✅ Linked ${documentsLinked.count} documents to session`);
    }

    // Send KYC_SUBMITTED notification
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, profile: true }
      });

      if (user?.email) {
        const { eventEmitter } = await import('@/lib/services/event-emitter.service');
        await eventEmitter.emit('KYC_SUBMITTED', {
          userId: session.user.id,
          recipientEmail: user.email,
          userName: user.profile?.firstName || 'User',
          kycSessionId: kycSession.id,
        });
        console.log(`✅ [NOTIFICATION] Sent KYC_SUBMITTED for user ${session.user.id}`);
      }
    } catch (notifError) {
      // Don't fail the request if notification fails
      console.error('❌ [NOTIFICATION] Failed to send KYC_SUBMITTED:', notifError);
    }

    // UPDATE applicant in Sumsub with latest profile data
    if (kycSession.applicantId && kycSession.kycProviderId) {
      console.log('🔄 Updating applicant in provider with current profile...');
      
      try {
        // Get user profile
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          include: { profile: true }
        });

        if (user?.profile) {
          // Prepare user data (using imported helpers)
          const userData: KycUserData = {
            email: user.email,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            dateOfBirth: formatDateForKyc(user.profile.dateOfBirth),
            nationality: alpha3ToIso2(user.profile.nationality),
            residenceCountry: alpha3ToIso2(user.profile.country),
            phone: user.profile.phoneNumber,
            city: user.profile.city || undefined,
            postalCode: user.profile.postalCode || undefined,
            address: user.profile.address || undefined,
            placeOfBirth: (user.profile as any).placeOfBirth || undefined,
            gender: (user.profile as any).gender || undefined,
            externalId: user.id
          };

          // Log what we're sending
          console.log('📋 User data to send to provider:', {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            dateOfBirth: userData.dateOfBirth,
            nationality: userData.nationality,
            residenceCountry: userData.residenceCountry,
            phone: userData.phone,
            gender: (userData as any).gender,
            placeOfBirth: (userData as any).placeOfBirth,
            city: userData.city,
            postalCode: userData.postalCode,
            address: userData.address
          });

          // Get KYC provider
          const provider = await integrationFactory.getProviderByService(kycSession.kycProviderId);
          
          if (provider && provider.updateApplicant) {
            const updateResult = await provider.updateApplicant(kycSession.applicantId, userData);
            
            if (updateResult.success) {
              console.log('✅ Applicant updated in provider successfully');
            } else {
              console.warn('⚠️ Failed to update applicant in provider:', updateResult.error);
            }
          } else {
            console.log('ℹ️ Provider does not support updateApplicant or not found');
          }
        }
      } catch (updateError) {
        console.error('⚠️ Failed to update applicant (non-critical):', updateError);
        // Don't fail the whole request if update fails
      }
    } else {
      console.log('ℹ️ No applicantId yet, skipping provider update');
    }

    return NextResponse.json({
      success: true,
      sessionId: kycSession.id,
      fieldsSaved: formDataRecords.length,
      documentsLinked: documentsLinked.count
    });

  } catch (error) {
    console.error('❌ Save KYC form data error:', error);
    return NextResponse.json(
      { error: 'Failed to save form data' },
      { status: 500 }
    );
  }
}
