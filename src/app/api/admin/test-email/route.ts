// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Test Email Sending Endpoint
 * 
 * Тестовый endpoint для проверки отправки уведомлений через Resend
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { sendNotificationEmail } from '@/lib/services/email-notification.service';
import { prisma } from '@/lib/prisma';
import { getEmailUrls } from '@/lib/utils/email-urls';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const body = await request.json();
    const { to, from, templateKey, testData } = body;

    // Validate input
    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Email address is required' },
        { status: 400 }
      );
    }

    if (!from) {
      return NextResponse.json(
        { success: false, error: 'From email address is required' },
        { status: 400 }
      );
    }

    // Get proper URLs
    const emailUrls = getEmailUrls();

    // Default test data with proper URLs
    const defaultTestData = {
      userName: 'Test User',
      orderId: 'TEST-12345',
      amount: '0.5',
      currency: 'BTC',
      cryptoCurrency: 'Bitcoin',
      walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      orderUrl: emailUrls.order('TEST-12345'),
      resetUrl: emailUrls.resetPassword('test-token-123'),
      dashboardUrl: emailUrls.dashboard,
      loginUrl: emailUrls.login,
      expiresIn: '15 minutes',
      txHash: '0x1234...abcd',
      rate: '50000',
      total: '25000',
      ...testData
    };

    console.log(`\n📧 Testing email send`);
    console.log(`   From: ${from}`);
    console.log(`   To: ${to}`);
    console.log(`   Template: ${templateKey || 'GENERIC'}`);
    console.log(`   Test data:`, defaultTestData);

    // Send test email
    const result = await sendNotificationEmail({
      to,
      from,
      subject: `Test Email - ${templateKey || 'GENERIC'}`,
      message: 'This is a test email from Apricode Exchange notification system.',
      data: defaultTestData,
      templateKey: templateKey || 'ORDER_CREATED',
      orgId: null
    });

    if (result.success) {
      console.log(`✅ Test email sent successfully! Message ID: ${result.messageId}`);
      
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId,
        sentTo: to,
        templateKey: templateKey || 'ORDER_CREATED'
      });
    } else {
      console.error(`❌ Test email failed:`, result.error);
      
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to send test email'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Test email endpoint error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        details: error.stack
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get available templates for testing
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const templates = await prisma.emailTemplate.findMany({
      where: {
        status: 'PUBLISHED',
        isActive: true
      },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        category: true,
        variables: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      templates,
      count: templates.length
    });
  } catch (error: any) {
    console.error('❌ Get templates error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

