/**
 * Test Send Email Template API
 * 
 * POST: Send a test email with the template
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { z } from 'zod';

const testSendSchema = z.object({
  recipientEmail: z.string().email('Invalid email address'),
  testData: z.record(z.string()).optional(), // Test variable values
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminRole('ADMIN');
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const { recipientEmail, testData = {} } = testSendSchema.parse(body);

    // Get template
    const template = await prisma.emailTemplate.findUnique({
      where: { id: params.id }
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get white-label settings
    const settings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: ['brandName', 'brandLogo', 'primaryColor', 'supportEmail', 'supportPhone']
        }
      }
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    // Prepare test data with white-label settings
    const defaultTestData: Record<string, string> = {
      brandName: settingsMap.brandName || 'Apricode Exchange',
      brandLogo: settingsMap.brandLogo || 'https://example.com/logo.png',
      primaryColor: settingsMap.primaryColor || '#06b6d4',
      supportEmail: settingsMap.supportEmail || 'support@example.com',
      supportPhone: settingsMap.supportPhone || '+1 234 567 8900',
      userName: 'Test User',
      orderId: 'TEST-12345',
      amount: '1000',
      currency: 'EUR',
      cryptoCurrency: 'BTC',
      rate: '0.00002',
      total: '0.02 BTC',
      orderUrl: 'https://example.com/orders/TEST-12345',
      dashboardUrl: 'https://example.com/dashboard',
      ...testData
    };

    // Replace variables in content
    let htmlContent = template.htmlContent;
    let subject = template.subject;
    let preheader = template.preheader || '';

    Object.entries(defaultTestData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      htmlContent = htmlContent.replace(regex, value);
      subject = subject.replace(regex, value);
      preheader = preheader.replace(regex, value);
    });

    // Replace preheader placeholder in HTML
    htmlContent = htmlContent.replace(/\{\{preheader\}\}/g, preheader);

    // Get email provider
    console.log('🔍 [test-send] Getting email provider...');
    const emailProvider = await integrationFactory.getEmailProvider();

    if (!emailProvider) {
      console.error('❌ [test-send] Email provider not found');
      return NextResponse.json(
        { success: false, error: 'Email provider not configured' },
        { status: 500 }
      );
    }

    console.log('✅ [test-send] Email provider obtained:', emailProvider.providerId);
    console.log('   Configured:', emailProvider.isConfigured());
    
    // Check internal state
    const resendAdapter = emailProvider as any;
    console.log('   Internal state:', {
      initialized: resendAdapter.initialized,
      hasClient: !!resendAdapter.client,
      hasApiKey: !!resendAdapter.config?.apiKey,
      apiKeyLength: resendAdapter.config?.apiKey?.length,
      apiKeyPrefix: resendAdapter.config?.apiKey?.substring(0, 10),
      fromEmail: resendAdapter.config?.fromEmail
    });

    // Send test email
    console.log('📧 [test-send] Sending email to:', recipientEmail);
    const result = await emailProvider.sendEmail({
      to: recipientEmail,
      from: 'onboarding@resend.dev', // Use Resend test domain
      subject: `[TEST] ${subject}`,
      html: htmlContent,
      text: template.textContent || undefined,
    });
    
    console.log('📬 [test-send] Send result:', { success: result.success, messageId: result.messageId, error: result.error });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send test email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${recipientEmail}`,
      messageId: result.messageId
    });
  } catch (error: any) {
    console.error('❌ POST /api/admin/email-templates/[id]/test-send error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}

