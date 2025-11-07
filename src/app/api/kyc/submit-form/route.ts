/**
 * POST /api/kyc/submit-form
 * Save all KYC form data to KycFormData table
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { prisma } from '@/lib/prisma';

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

    // Get existing KYC session (it should exist from /api/kyc/start)
    let kycSession = await prisma.kycSession.findUnique({
      where: { userId: session.user.id }
    });

    if (!kycSession) {
      console.log('⚠️ No KYC session found, this should not happen!');
      return NextResponse.json(
        { error: 'KYC session not found. Please start verification first.' },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      sessionId: kycSession.id,
      fieldsSaved: formDataRecords.length
    });

  } catch (error) {
    console.error('❌ Save KYC form data error:', error);
    return NextResponse.json(
      { error: 'Failed to save form data' },
      { status: 500 }
    );
  }
}
