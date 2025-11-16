// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Test Notification System
 * 
 * Simulate all notification events to test email delivery
 * 
 * POST /api/admin/test/notifications
 * Body: { "email": "test@example.com" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { eventEmitter } from '@/lib/services/event-emitter.service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Require SUPER_ADMIN for testing
    const authResult = await requireAdminRole('SUPER_ADMIN');
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { email, eventKey } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get or create test user
    let testUser = await prisma.user.findUnique({
      where: { email },
      include: { profile: true }
    });

    if (!testUser) {
      // Create test user
      testUser = await prisma.user.create({
        data: {
          email,
          password: 'test_password_hash', // Not used for testing
          role: 'CLIENT',
          profile: {
            create: {
              firstName: 'Test',
              lastName: 'User',
              country: 'PL',
              phoneNumber: '+48123456789'
            }
          }
        },
        include: { profile: true }
      });
    }

    const results: any[] = [];

    // Define all test events
    const testEvents: Record<string, any> = {
      // ORDER EVENTS
      ORDER_CREATED: {
        userId: testUser.id,
        recipientEmail: email,
        orderId: 'TEST-ORD-001',
        orderReference: 'PAY-TEST-001',
        cryptoAmount: 0.001,
        currencyCode: 'BTC',
        cryptoCurrency: 'BTC',
        totalFiat: 50.00,
        fiatCurrencyCode: 'EUR',
        walletAddress: 'bc1qtest123456789',
        amount: 50.00,
        currency: 'EUR',
        userName: `${testUser.profile?.firstName} ${testUser.profile?.lastName}`,
        orderUrl: `${process.env.NEXTAUTH_URL}/orders/TEST-ORD-001`
      },
      ORDER_PAYMENT_RECEIVED: {
        userId: testUser.id,
        recipientEmail: email,
        orderId: 'TEST-ORD-002',
        orderReference: 'PAY-TEST-002',
        cryptoAmount: 0.002,
        currencyCode: 'ETH',
        totalFiat: 100.00,
        fiatCurrencyCode: 'EUR',
        walletAddress: '0xtest123456789',
        userName: `${testUser.profile?.firstName} ${testUser.profile?.lastName}`
      },
      ORDER_PROCESSING: {
        userId: testUser.id,
        recipientEmail: email,
        orderId: 'TEST-ORD-003',
        orderReference: 'PAY-TEST-003',
        cryptoAmount: 0.003,
        currencyCode: 'BTC',
        totalFiat: 150.00,
        fiatCurrencyCode: 'EUR',
        walletAddress: 'bc1qtest987654321',
        userName: `${testUser.profile?.firstName} ${testUser.profile?.lastName}`,
        estimatedCompletion: '1-2 hours'
      },
      ORDER_COMPLETED: {
        userId: testUser.id,
        recipientEmail: email,
        orderId: 'TEST-ORD-004',
        orderReference: 'PAY-TEST-004',
        cryptoAmount: 0.004,
        currencyCode: 'BTC',
        totalFiat: 200.00,
        fiatCurrencyCode: 'EUR',
        walletAddress: 'bc1qtest111222333',
        transactionHash: '0xtesthash123456789abcdef',
        blockExplorerUrl: 'https://blockchair.com/bitcoin/transaction/0xtesthash123456789abcdef',
        userName: `${testUser.profile?.firstName} ${testUser.profile?.lastName}`
      },
      ORDER_CANCELLED: {
        userId: testUser.id,
        recipientEmail: email,
        orderId: 'TEST-ORD-005',
        orderReference: 'PAY-TEST-005',
        cryptoAmount: 0.005,
        currencyCode: 'BTC',
        totalFiat: 250.00,
        fiatCurrencyCode: 'EUR',
        reason: 'Payment timeout',
        userName: `${testUser.profile?.firstName} ${testUser.profile?.lastName}`
      },
      ORDER_EXPIRED: {
        userId: testUser.id,
        recipientEmail: email,
        orderId: 'TEST-ORD-006',
        orderReference: 'PAY-TEST-006',
        cryptoAmount: 0.006,
        currencyCode: 'BTC',
        totalFiat: 300.00,
        fiatCurrencyCode: 'EUR',
        buyUrl: `${process.env.NEXTAUTH_URL}/buy`,
        userName: `${testUser.profile?.firstName} ${testUser.profile?.lastName}`
      },
      ORDER_FAILED: {
        userId: testUser.id,
        recipientEmail: email,
        orderId: 'TEST-ORD-007',
        orderReference: 'PAY-TEST-007',
        cryptoAmount: 0.007,
        currencyCode: 'BTC',
        totalFiat: 350.00,
        fiatCurrencyCode: 'EUR',
        reason: 'Processing error - please contact support',
        userName: `${testUser.profile?.firstName} ${testUser.profile?.lastName}`,
        supportUrl: `${process.env.NEXTAUTH_URL}/support`
      },
      ORDER_REFUNDED: {
        userId: testUser.id,
        recipientEmail: email,
        orderId: 'TEST-ORD-008',
        orderReference: 'PAY-TEST-008',
        refundAmount: 400.00,
        refundCurrency: 'EUR',
        originalAmount: 400.00,
        userName: `${testUser.profile?.firstName} ${testUser.profile?.lastName}`,
        processingTime: '3-5 business days'
      },

      // KYC EVENTS
      KYC_SUBMITTED: {
        userId: testUser.id,
        recipientEmail: email,
        userName: testUser.profile?.firstName || 'Test',
        kycSessionId: 'TEST-KYC-001',
        dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard`
      },
      KYC_APPROVED: {
        userId: testUser.id,
        recipientEmail: email,
        userName: testUser.profile?.firstName || 'Test',
        dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard`,
        buyUrl: `${process.env.NEXTAUTH_URL}/buy`
      },
      KYC_REJECTED: {
        userId: testUser.id,
        recipientEmail: email,
        userName: testUser.profile?.firstName || 'Test',
        reason: 'Documents not clear - please resubmit higher quality photos',
        resubmitUrl: `${process.env.NEXTAUTH_URL}/kyc`,
        supportUrl: `${process.env.NEXTAUTH_URL}/support`
      },

      // SECURITY EVENTS
      SECURITY_2FA_ENABLED: {
        userId: testUser.id,
        recipientEmail: email,
        userName: testUser.profile?.firstName || 'Test',
        method: 'TOTP',
        dashboardUrl: `${process.env.NEXTAUTH_URL}/profile/security`,
        timestamp: new Date().toISOString()
      },
      SECURITY_2FA_DISABLED: {
        userId: testUser.id,
        recipientEmail: email,
        userName: testUser.profile?.firstName || 'Test',
        dashboardUrl: `${process.env.NEXTAUTH_URL}/profile/security`,
        timestamp: new Date().toISOString(),
        ipAddress: '127.0.0.1'
      },

      // USER EVENTS
      WELCOME_EMAIL: {
        userId: testUser.id,
        recipientEmail: email,
        userName: `${testUser.profile?.firstName} ${testUser.profile?.lastName}`,
        dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard`,
        buyUrl: `${process.env.NEXTAUTH_URL}/buy`,
        kycUrl: `${process.env.NEXTAUTH_URL}/kyc`,
        supportUrl: `${process.env.NEXTAUTH_URL}/support`
      },

      // ADMIN EVENTS
      ADMIN_INVITED: {
        recipientEmail: email,
        adminName: 'Test Admin',
        inviteUrl: `${process.env.NEXTAUTH_URL}/admin/invite/test-token`,
        role: 'ADMIN',
        invitedBy: 'Super Admin',
        expiresIn: '48 hours'
      }
    };

    // If specific eventKey provided, test only that one
    if (eventKey) {
      if (!testEvents[eventKey]) {
        return NextResponse.json(
          { success: false, error: `Unknown event key: ${eventKey}` },
          { status: 400 }
        );
      }

      try {
        console.log(`🧪 Testing event: ${eventKey}`);
        await eventEmitter.emit(eventKey, testEvents[eventKey]);
        results.push({ event: eventKey, status: 'success' });
      } catch (error: any) {
        console.error(`❌ Failed to emit ${eventKey}:`, error);
        results.push({ 
          event: eventKey, 
          status: 'error', 
          error: error.message 
        });
      }
    } else {
      // Test all events
      for (const [key, payload] of Object.entries(testEvents)) {
        try {
          console.log(`🧪 Testing event: ${key}`);
          await eventEmitter.emit(key, payload);
          results.push({ event: key, status: 'success' });
          
          // Small delay between events to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          console.error(`❌ Failed to emit ${key}:`, error);
          results.push({ 
            event: key, 
            status: 'error', 
            error: error.message 
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Test notifications sent to ${email}`,
      results,
      summary: {
        total: results.length,
        success: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length
      },
      note: 'Check /admin/notification-queue for delivery status'
    });
  } catch (error: any) {
    console.error('❌ Test notifications error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send test notifications',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// GET: List available test events
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminRole('SUPER_ADMIN');
    if (authResult instanceof NextResponse) return authResult;

    const events = await prisma.notificationEvent.findMany({
      select: {
        eventKey: true,
        name: true,
        description: true,
        category: true,
        channels: true,
        isActive: true,
        templateId: true,
        emailTemplate: {
          select: {
            key: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: { category: 'asc' }
    });

    return NextResponse.json({
      success: true,
      events,
      usage: {
        testAll: 'POST /api/admin/test/notifications { "email": "test@example.com" }',
        testOne: 'POST /api/admin/test/notifications { "email": "test@example.com", "eventKey": "ORDER_CREATED" }'
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

