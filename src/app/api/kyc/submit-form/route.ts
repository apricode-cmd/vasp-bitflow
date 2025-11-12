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
