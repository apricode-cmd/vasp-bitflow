// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Setup Initialization API
 * 
 * POST /api/setup/init
 * 
 * Initializes the system setup process.
 * This should be called only on first-time setup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const initSchema = z.object({
  // Admin account
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  
  // Company info
  companyName: z.string().min(1),
  companyEmail: z.string().email(),
  
  // Optional
  companyWebsite: z.string().url().optional(),
  companyPhone: z.string().optional()
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // First check if setup is already complete
    const adminCount = await prisma.admin.count();
    
    if (adminCount > 0) {
      return NextResponse.json(
        { error: 'Setup already completed. Admin account exists.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = initSchema.parse(body);

    // Create admin account
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(validatedData.adminPassword, 10);

    const admin = await prisma.admin.create({
      data: {
        email: validatedData.adminEmail,
        password: hashedPassword,
        firstName: validatedData.adminFirstName,
        lastName: validatedData.adminLastName,
        role: 'SUPER_ADMIN',
        isActive: true,
        isSuspended: false,
        emailVerified: new Date() // Auto-verify on setup
      }
    });

    // Create or update essential system settings
    const settings = [
      { key: 'brandName', value: validatedData.companyName, type: 'STRING', category: 'GENERAL' },
      { key: 'companyEmail', value: validatedData.companyEmail, type: 'STRING', category: 'GENERAL' },
      { key: 'companyWebsite', value: validatedData.companyWebsite || '', type: 'STRING', category: 'GENERAL' },
      { key: 'companyPhone', value: validatedData.companyPhone || '', type: 'STRING', category: 'GENERAL' },
      { key: 'platformFee', value: '0.015', type: 'NUMBER', category: 'FINANCIAL' },
      { key: 'setupCompleted', value: 'true', type: 'BOOLEAN', category: 'SYSTEM' }
    ];

    for (const setting of settings) {
      await prisma.systemSettings.upsert({
        where: { key: setting.key },
        create: setting as any,
        update: { value: setting.value }
      });
    }

    console.log('✅ [Setup] Initial setup completed:', {
      adminId: admin.id,
      adminEmail: admin.email,
      companyName: validatedData.companyName
    });

    return NextResponse.json({
      success: true,
      message: 'Setup completed successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        name: `${admin.firstName} ${admin.lastName}`
      }
    });

  } catch (error) {
    console.error('[Setup Init] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Setup failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

