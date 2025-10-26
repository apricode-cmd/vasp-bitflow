/**
 * Client KYC Form Submit API
 * POST /api/kyc/submit-form - Submit KYC form data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const submitFormSchema = z.object({
  formData: z.record(z.string(), z.any()),
  sessionId: z.string().optional() // Admin can submit for specific session
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = submitFormSchema.parse(body);

    console.log('[SUBMIT KYC FORM] User:', session.user.email, 'SessionId:', validated.sessionId || 'auto');

    // Get or create KYC session
    let kycSession;
    
    // If sessionId provided (admin submission), use that session
    if (validated.sessionId) {
      kycSession = await prisma.kycSession.findUnique({
        where: { id: validated.sessionId },
        include: { user: true }
      });
      
      if (!kycSession) {
        return NextResponse.json(
          { success: false, error: 'KYC session not found' },
          { status: 404 }
        );
      }
      
      console.log('[SUBMIT KYC FORM] Admin submission for user:', kycSession.user.email);
      
      // Update existing session
      kycSession = await prisma.kycSession.update({
        where: { id: kycSession.id },
        data: {
          submittedAt: new Date(),
          attempts: { increment: 1 },
          lastAttemptAt: new Date()
        },
        include: { user: true }
      });
    } else {
      // Client submission - use their own session
      kycSession = await prisma.kycSession.findUnique({
        where: { userId: session.user.id },
        include: { user: true }
      });

      if (!kycSession) {
        kycSession = await prisma.kycSession.create({
          data: {
            userId: session.user.id,
            status: 'PENDING',
            submittedAt: new Date(),
            attempts: 1
          },
          include: { user: true }
        });
      } else {
        // Update existing session
        kycSession = await prisma.kycSession.update({
          where: { id: kycSession.id },
          data: {
            submittedAt: new Date(),
            attempts: { increment: 1 },
            lastAttemptAt: new Date()
          },
          include: { user: true }
        });
      }
    }

    // Delete existing form data for this session
    await prisma.kycFormData.deleteMany({
      where: { kycSessionId: kycSession.id }
    });

    // Save new form data
    const formDataEntries = Object.entries(validated.formData).map(([fieldName, fieldValue]) => ({
      kycSessionId: kycSession.id,
      fieldName,
      fieldValue: typeof fieldValue === 'object' ? JSON.stringify(fieldValue) : String(fieldValue)
    }));

    if (formDataEntries.length > 0) {
      await prisma.kycFormData.createMany({
        data: formDataEntries
      });
    }

    // Create/Update KYC Profile with comprehensive data
    const fd = validated.formData;
    const targetUserId = kycSession.user.id; // Use the KYC session's user ID
    const targetEmail = kycSession.user.email;
    
    await prisma.kycProfile.upsert({
      where: { kycSessionId: kycSession.id },
      update: {
        // Personal
        firstName: fd.first_name || '',
        lastName: fd.last_name || '',
        dateOfBirth: fd.date_of_birth ? new Date(fd.date_of_birth) : new Date(),
        placeOfBirth: fd.place_of_birth,
        nationality: fd.nationality || '',
        // Contact
        email: fd.email || targetEmail || '',
        phone: fd.phone || '',
        phoneCountry: fd.phone_country,
        // Address
        addressStreet: fd.residential_street,
        addressCity: fd.residential_city,
        addressRegion: fd.residential_region,
        addressCountry: fd.residential_country,
        addressPostal: fd.residential_postal_code,
        // Document
        idType: fd.id_type,
        idNumber: fd.id_number,
        idIssuingCountry: fd.id_issuing_country,
        idIssueDate: fd.id_issue_date ? new Date(fd.id_issue_date) : undefined,
        idExpiryDate: fd.id_expiry_date ? new Date(fd.id_expiry_date) : undefined,
        // PEP & Sanctions
        pepStatus: fd.pep_status === 'yes' || fd.pep_status === true,
        pepCategory: fd.pep_category,
        sanctionsScreeningDone: fd.sanctions_screening_done === 'yes' || fd.sanctions_screening_done === true,
        sanctionsResult: fd.sanctions_screening_result,
        // Employment
        employmentStatus: fd.employment_status,
        occupation: fd.occupation,
        employerName: fd.employer_name,
        // Purpose
        purposeOfAccount: fd.purpose_of_account,
        intendedUse: fd.intended_use,
        // Funds
        sourceOfFunds: fd.source_of_funds,
        sourceOfWealth: fd.source_of_wealth,
        // Risk
        riskScore: fd.risk_score ? Number(fd.risk_score) : undefined,
        riskFactors: fd.risk_factors ? (typeof fd.risk_factors === 'string' ? JSON.parse(fd.risk_factors) : fd.risk_factors) : undefined,
        // Consents
        consentKyc: fd.consent_kyc === 'yes' || fd.consent_kyc === true,
        consentAml: fd.consent_aml === 'yes' || fd.consent_aml === true,
        consentTfr: fd.consent_tfr === 'yes' || fd.consent_tfr === true,
        consentPrivacy: fd.consent_privacy === 'yes' || fd.consent_privacy === true,
      },
      create: {
        kycSessionId: kycSession.id,
        // Personal
        firstName: fd.first_name || '',
        lastName: fd.last_name || '',
        dateOfBirth: fd.date_of_birth ? new Date(fd.date_of_birth) : new Date(),
        placeOfBirth: fd.place_of_birth,
        nationality: fd.nationality || '',
        // Contact
        email: fd.email || targetEmail || '',
        phone: fd.phone || '',
        phoneCountry: fd.phone_country,
        // Address
        addressStreet: fd.residential_street,
        addressCity: fd.residential_city,
        addressRegion: fd.residential_region,
        addressCountry: fd.residential_country,
        addressPostal: fd.residential_postal_code,
        // Document
        idType: fd.id_type,
        idNumber: fd.id_number,
        idIssuingCountry: fd.id_issuing_country,
        idIssueDate: fd.id_issue_date ? new Date(fd.id_issue_date) : undefined,
        idExpiryDate: fd.id_expiry_date ? new Date(fd.id_expiry_date) : undefined,
        // PEP & Sanctions
        pepStatus: fd.pep_status === 'yes' || fd.pep_status === true,
        pepCategory: fd.pep_category,
        sanctionsScreeningDone: fd.sanctions_screening_done === 'yes' || fd.sanctions_screening_done === true,
        sanctionsResult: fd.sanctions_screening_result,
        // Employment
        employmentStatus: fd.employment_status,
        occupation: fd.occupation,
        employerName: fd.employer_name,
        // Purpose
        purposeOfAccount: fd.purpose_of_account,
        intendedUse: fd.intended_use,
        // Funds
        sourceOfFunds: fd.source_of_funds,
        sourceOfWealth: fd.source_of_wealth,
        // Risk
        riskScore: fd.risk_score ? Number(fd.risk_score) : undefined,
        riskFactors: fd.risk_factors ? (typeof fd.risk_factors === 'string' ? JSON.parse(fd.risk_factors) : fd.risk_factors) : undefined,
        // Consents
        consentKyc: fd.consent_kyc === 'yes' || fd.consent_kyc === true,
        consentAml: fd.consent_aml === 'yes' || fd.consent_aml === true,
        consentTfr: fd.consent_tfr === 'yes' || fd.consent_tfr === true,
        consentPrivacy: fd.consent_privacy === 'yes' || fd.consent_privacy === true,
      }
    });

    // Update user profile with basic info if provided
    if (validated.formData.first_name || validated.formData.last_name) {
      await prisma.profile.upsert({
        where: { userId: targetUserId },
        update: {
          firstName: validated.formData.first_name || undefined,
          lastName: validated.formData.last_name || undefined,
          phoneNumber: validated.formData.phone || undefined,
          phoneCountry: validated.formData.phone_country || undefined,
          country: validated.formData.residential_country || undefined,
          city: validated.formData.residential_city || undefined,
          address: validated.formData.residential_street || undefined,
          postalCode: validated.formData.residential_postal_code || undefined,
          dateOfBirth: validated.formData.date_of_birth ? new Date(validated.formData.date_of_birth) : undefined,
          placeOfBirth: validated.formData.place_of_birth || undefined,
          nationality: validated.formData.nationality || undefined
        },
        create: {
          userId: targetUserId,
          firstName: validated.formData.first_name || '',
          lastName: validated.formData.last_name || '',
          phoneNumber: validated.formData.phone || undefined,
          phoneCountry: validated.formData.phone_country || undefined,
          country: validated.formData.residential_country || undefined,
          city: validated.formData.residential_city || undefined,
          address: validated.formData.residential_street || undefined,
          postalCode: validated.formData.residential_postal_code || undefined,
          dateOfBirth: validated.formData.date_of_birth ? new Date(validated.formData.date_of_birth) : undefined,
          placeOfBirth: validated.formData.place_of_birth || undefined,
          nationality: validated.formData.nationality || undefined
        }
      });
    }

    return NextResponse.json({
      success: true,
      sessionId: kycSession.id,
      message: 'KYC form submitted successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid form data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Submit KYC form error:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}
