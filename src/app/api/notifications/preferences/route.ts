/**
 * Notification Preferences API
 * 
 * GET: Get user's notification preferences
 * PUT: Update user's notification preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { notificationService } from '@/lib/services/notification.service';
import { z } from 'zod';

const updatePreferencesSchema = z.object({
  eventKey: z.string(),
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  frequency: z.enum(['INSTANT', 'HOURLY', 'DAILY', 'WEEKLY']).optional(),
  quietHours: z.object({
    start: z.string(),
    end: z.string(),
    timezone: z.string(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const preferences = await notificationService.getUserPreferences(session.user.id);

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('❌ GET /api/notifications/preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updatePreferencesSchema.parse(body);

    const { eventKey, ...preferences } = validatedData;

    await notificationService.updatePreferences(
      session.user.id,
      eventKey,
      preferences
    );

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('❌ PUT /api/notifications/preferences error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

