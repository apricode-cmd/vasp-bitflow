/**
 * Client API - Create Virtual IBAN for current user
 * 
 * POST /api/client/virtual-iban/create - Create Virtual IBAN account
 * 
 * Requirements:
 * - User must be authenticated
 * - User must have APPROVED KYC status
 * - User profile must have required data (name, address, DOB, nationality)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';
import { prisma } from '@/lib/prisma';
import { VirtualIbanCreationTimeoutError } from '@/lib/errors/VirtualIbanCreationTimeoutError';

export async function POST(req: NextRequest) {
  try {
    console.log('[VirtualIBAN API] POST /api/client/virtual-iban/create - Request received');
    
    // Check client auth
    const { error, session } = await requireAuth();
    if (error) return error;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('[VirtualIBAN API] User ID:', userId);

    // Parse request body for edited data (optional)
    let editedData: Partial<{
      firstName: string;
      lastName: string;
      address: string;
      city: string;
      postalCode: string;
    }> | undefined;

    try {
      const body = await req.json();
      editedData = body.editedData;
      console.log('[VirtualIBAN API] Request body:', { hasEditedData: !!editedData, editedData });
    } catch (e) {
      console.log('[VirtualIBAN API] No request body or invalid JSON');
      // No body or invalid JSON - that's fine, we'll use profile data
    }

    // Get user with KYC session and profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        kycSession: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // ✅ Check KYC status - must be APPROVED
    if (!user.kycSession || user.kycSession.status !== 'APPROVED') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'KYC verification required',
          code: 'KYC_REQUIRED',
          kycStatus: user.kycSession?.status || 'NOT_STARTED',
          message: 'Please complete KYC verification before opening a Virtual IBAN account.'
        },
        { status: 403 }
      );
    }

    // ✅ Check profile data completeness
    if (!user.profile) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Profile incomplete',
          code: 'PROFILE_INCOMPLETE',
          message: 'Please complete your profile before opening a Virtual IBAN account.'
        },
        { status: 400 }
      );
    }

    const { firstName, lastName, country, city, address, postalCode, dateOfBirth, nationality } = user.profile;

    // If user provided edited data, validate and update profile first
    if (editedData) {
      console.log('[VirtualIBAN API] User provided edited data:', editedData);
      
      // Validate edited data
      const validationErrors: string[] = [];
      
      if (editedData.firstName !== undefined && !editedData.firstName.trim()) {
        validationErrors.push('firstName cannot be empty');
      }
      if (editedData.lastName !== undefined && !editedData.lastName.trim()) {
        validationErrors.push('lastName cannot be empty');
      }
      if (editedData.address !== undefined && !editedData.address.trim()) {
        validationErrors.push('address cannot be empty');
      }
      if (editedData.city !== undefined && !editedData.city.trim()) {
        validationErrors.push('city cannot be empty');
      }
      
      if (validationErrors.length > 0) {
        console.error('[VirtualIBAN API] Validation errors for edited data:', validationErrors);
        console.error('[VirtualIBAN API] Edited data received:', editedData);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid edited data',
            code: 'VALIDATION_ERROR',
            validationErrors,
            message: `Validation failed: ${validationErrors.join(', ')}`
          },
          { status: 400 }
        );
      }
      
      // Build update data object - only include fields that were actually edited
      const updateData: any = {};
      
      if (editedData.firstName !== undefined) {
        updateData.firstName = editedData.firstName.trim();
      }
      if (editedData.lastName !== undefined) {
        updateData.lastName = editedData.lastName.trim();
      }
      if (editedData.address !== undefined) {
        updateData.address = editedData.address.trim();
      }
      if (editedData.city !== undefined) {
        updateData.city = editedData.city.trim();
      }
      if (editedData.postalCode !== undefined) {
        updateData.postalCode = editedData.postalCode.trim() || null; // Allow null for optional field
      }
      
      await prisma.profile.update({
        where: { userId },
        data: updateData,
      });
      
      console.log('[VirtualIBAN API] Profile updated with edited data:', updateData);
      console.log('[VirtualIBAN API] Profile changes saved permanently to database');
      
      // Re-fetch user profile to get updated data
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      
      if (!updatedUser || !updatedUser.profile) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch updated profile' },
          { status: 500 }
        );
      }
      
      // Use updated profile data for subsequent checks
      user.profile = updatedUser.profile;
    }

    // NOW check for missing required fields (after potential update)
    const currentProfile = user.profile;
    const missingFields: string[] = [];
    if (!currentProfile.firstName) missingFields.push('firstName');
    if (!currentProfile.lastName) missingFields.push('lastName');
    if (!currentProfile.country) missingFields.push('country');
    if (!currentProfile.city) missingFields.push('city');
    if (!currentProfile.address) missingFields.push('address');
    if (!currentProfile.dateOfBirth) missingFields.push('dateOfBirth');

    if (missingFields.length > 0) {
      console.error('[VirtualIBAN API] Missing profile fields (after update):', missingFields);
      console.error('[VirtualIBAN API] Profile data:', currentProfile);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Profile data incomplete',
          code: 'MISSING_PROFILE_DATA',
          missingFields,
          message: `Missing required profile fields: ${missingFields.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Check if user already has a WORKING account (not FAILED or CLOSED)
    // Note: PENDING removed - BCB creates instantly or fails with error
    const existingAccounts = await virtualIbanService.getUserAccounts(userId);
    const activeAccount = existingAccounts.find(acc => 
      acc.status !== 'FAILED' && acc.status !== 'CLOSED'
    );
    
    if (activeAccount) {
      return NextResponse.json({
        success: true,
        data: activeAccount,
        message: 'Virtual IBAN already exists',
        alreadyExists: true,
      });
    }
    
    // Delete failed accounts before creating new one
    const failedAccounts = existingAccounts.filter(acc => acc.status === 'FAILED');
    if (failedAccounts.length > 0) {
      console.log('[VirtualIBAN] Cleaning up failed accounts before retry:', failedAccounts.map(a => a.id));
      for (const failedAcc of failedAccounts) {
        await prisma.virtualIbanAccount.delete({ where: { id: failedAcc.id } });
      }
    }

    // Create Virtual IBAN account (uses latest profile data from DB)
    console.log('[VirtualIBAN API] Calling virtualIbanService.createAccountForUser...');
    const account = await virtualIbanService.createAccountForUser(userId);
    console.log('[VirtualIBAN API] Account created successfully:', { accountId: account.id, iban: account.iban });

    return NextResponse.json({
      success: true,
      data: account,
      message: 'Virtual IBAN created successfully',
    });
  } catch (error) {
    console.error('[API] Create Virtual IBAN failed:', error);
    
    // Handle timeout error specifically
    if (error instanceof VirtualIbanCreationTimeoutError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Virtual IBAN creation timeout',
          code: 'VIRTUAL_IBAN_CREATION_TIMEOUT',
          details: error.message,
        },
        { status: 408 } // 408 Request Timeout
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create Virtual IBAN', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Check eligibility and get user data for confirmation dialog
 */
export async function GET(req: NextRequest) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user with KYC session and profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        kycSession: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check existing Virtual IBAN (exclude FAILED and CLOSED accounts)
    const existingAccounts = await virtualIbanService.getUserAccounts(userId);
    let activeAccount = existingAccounts.find(acc => 
      acc.status !== 'FAILED' && acc.status !== 'CLOSED'
    );
    const hasFailedAccount = existingAccounts.some(acc => acc.status === 'FAILED');
    
    // Update lastBalanceUpdate for active account (to show refresh time)
    if (activeAccount) {
      activeAccount = await prisma.virtualIbanAccount.update({
        where: { id: activeAccount.id },
        data: { lastBalanceUpdate: new Date() },
      });
    }
    
    // Build eligibility response
    const kycApproved = user.kycSession?.status === 'APPROVED';
    const profileComplete = !!(
      user.profile?.firstName &&
      user.profile?.lastName &&
      user.profile?.country &&
      user.profile?.city &&
      user.profile?.address &&
      user.profile?.dateOfBirth
    );

    // ✅ Get verified address from Sumsub API if available
    let addressStreet = user.profile?.address || '';
    let addressCity = user.profile?.city || '';
    let addressPostalCode = user.profile?.postalCode || '';
    let addressCountry = user.profile?.country || '';

    if (kycApproved && user.kycSession?.applicantId && user.kycSession?.kycProviderId === 'sumsub') {
      try {
        console.log('[VirtualIBAN API GET] Fetching verified address from Sumsub API...');
        console.log('[VirtualIBAN API GET] Applicant ID:', user.kycSession.applicantId);
        
        // Get KYC provider
        const { integrationFactory } = await import('@/lib/integrations/IntegrationFactory');
        const kycProvider = await integrationFactory.getProviderByService('sumsub');
        
        if (kycProvider && typeof kycProvider.getApplicant === 'function') {
          console.log('[VirtualIBAN API GET] Calling Sumsub API getApplicant...');
          const applicant = await kycProvider.getApplicant(user.kycSession.applicantId);
          console.log('[VirtualIBAN API GET] Sumsub API response received');
          
          // Extract address from Sumsub response
          const sumsubInfo = applicant.metadata?.info;
          const sumsubFixedInfo = applicant.metadata?.fixedInfo;
          const addresses = sumsubInfo?.addresses || 
                          sumsubFixedInfo?.addresses || 
                          sumsubInfo?.fixedInfo?.addresses || 
                          [];
          
          console.log('[VirtualIBAN API GET] Extracted addresses from Sumsub:', {
            addressesCount: addresses.length,
            firstAddress: addresses[0] || null,
          });
          
          if (addresses.length > 0) {
            const sumsubAddress = addresses[0];
            
            if (sumsubAddress.street || sumsubAddress.town) {
              addressStreet = sumsubAddress.street || '';
              addressCity = sumsubAddress.town || '';
              addressPostalCode = sumsubAddress.postCode || '';
              
              // Convert ISO-3 to ISO-2 for country
              if (sumsubAddress.country) {
                const { alpha3ToIso2 } = await import('@/lib/utils/country-codes');
                addressCountry = alpha3ToIso2(sumsubAddress.country) || sumsubAddress.country;
              }
              
              console.log('[VirtualIBAN API GET] ✅ Using verified address from Sumsub:', {
                street: addressStreet,
                city: addressCity,
                postalCode: addressPostalCode,
                country: addressCountry,
              });
            }
          } else {
            console.log('[VirtualIBAN API GET] ⚠️ Sumsub applicant found but no address in response');
          }
        } else {
          console.log('[VirtualIBAN API GET] ⚠️ KYC provider not found or getApplicant method not available');
        }
      } catch (error) {
        console.error('[VirtualIBAN API GET] ❌ Failed to fetch address from Sumsub API, using profile data:', error);
        // Fallback to profile data (already set above)
      }
    } else {
      console.log('[VirtualIBAN API GET] Skipping Sumsub API call:', {
        kycApproved,
        hasApplicantId: !!user.kycSession?.applicantId,
        isSumsub: user.kycSession?.kycProviderId === 'sumsub',
      });
    }

    // Eligible if KYC approved, profile complete, and no active account
    const eligible = kycApproved && profileComplete && !activeAccount;

    return NextResponse.json({
      success: true,
      eligible,
      hasExistingAccount: !!activeAccount,
      existingAccount: activeAccount || null,
      hasFailedAccount, // So UI can show retry option
      kycStatus: user.kycSession?.status || 'NOT_STARTED',
      kycApproved,
      profileComplete,
      // Data for confirmation dialog (with verified address from Sumsub if available)
      userData: kycApproved ? {
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        email: user.email,
        dateOfBirth: user.profile?.dateOfBirth,
        nationality: user.profile?.nationality || user.profile?.country,
        country: addressCountry || user.profile?.country,
        city: addressCity || user.profile?.city,
        address: addressStreet || user.profile?.address,
        postalCode: addressPostalCode || user.profile?.postalCode,
      } : null,
    });
  } catch (error) {
    console.error('[API] Check Virtual IBAN eligibility failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check eligibility' },
      { status: 500 }
    );
  }
}





