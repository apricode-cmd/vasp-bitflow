// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * User Registration API Route
 * 
 * Handles new user registration with profile creation.
 * Checks if registration is enabled in system settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth-utils';
import { registerSchema } from '@/lib/validations/auth';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { eventEmitter } from '@/lib/services/event-emitter.service';
import { z } from 'zod';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if registration is enabled
    const registrationSetting = await prisma.systemSettings.findUnique({
      where: { key: 'registrationEnabled' }
    });

    if (registrationSetting?.value === 'false') {
      return NextResponse.json(
        { error: 'Registration is currently disabled. Please contact support.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input data
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        role: 'CLIENT',
        profile: {
          create: {
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            phoneNumber: validatedData.phoneNumber,
            country: validatedData.country
          }
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    // Log user registration
    await auditService.logUserAction(
      user.id,
      AUDIT_ACTIONS.USER_REGISTERED,
      AUDIT_ENTITIES.USER,
      user.id,
      {
        email: user.email,
        country: validatedData.country
      }
    );

    // Emit WELCOME_EMAIL event
    await eventEmitter.emit('WELCOME_EMAIL', {
      userId: user.id,
      recipientEmail: user.email,
      userName: `${validatedData.firstName} ${validatedData.lastName}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

