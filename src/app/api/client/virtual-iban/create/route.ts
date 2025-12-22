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
    // Check client auth
    const { error, session } = await requireAuth();
    if (error) return error;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

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
    } catch {
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

    // Required fields check
    const missingFields: string[] = [];
    if (!firstName) missingFields.push('firstName');
    if (!lastName) missingFields.push('lastName');
    if (!country) missingFields.push('country');
    if (!city) missingFields.push('city');
    if (!address) missingFields.push('address');
    if (!dateOfBirth) missingFields.push('dateOfBirth');

    if (missingFields.length > 0) {
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

    // If user provided edited data, temporarily update profile
    // This allows them to fix non-ASCII characters or incorrect data
    if (editedData) {
      console.log('[VirtualIBAN] User provided edited data:', editedData);
      await prisma.profile.update({
        where: { userId },
        data: {
          ...(editedData.firstName && { firstName: editedData.firstName }),
          ...(editedData.lastName && { lastName: editedData.lastName }),
          ...(editedData.address && { address: editedData.address }),
          ...(editedData.city && { city: editedData.city }),
          ...(editedData.postalCode && { postalCode: editedData.postalCode }),
        },
      });
      console.log('[VirtualIBAN] Profile updated with edited data');
    }

    // Create Virtual IBAN account
    const account = await virtualIbanService.createAccountForUser(userId);

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
      // Data for confirmation dialog (from KYC verified profile)
      userData: kycApproved ? {
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        email: user.email,
        dateOfBirth: user.profile?.dateOfBirth,
        nationality: user.profile?.nationality || user.profile?.country,
        country: user.profile?.country,
        city: user.profile?.city,
        address: user.profile?.address,
        postalCode: user.profile?.postalCode,
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





