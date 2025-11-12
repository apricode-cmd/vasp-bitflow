/**
 * Test Send Email Template API
 * 
 * POST: Send a test email with the template
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { getEmailUrls } from '@/lib/utils/email-urls';
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
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

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

    // Get proper URLs
    const emailUrls = getEmailUrls();

    // Prepare test data with white-label settings and proper URLs
    const defaultTestData: Record<string, string> = {
      // White-label settings
      brandName: settingsMap.brandName || 'Apricode Exchange',
      brandLogo: emailUrls.logo(settingsMap.brandLogo || '/logo.png'),
      primaryColor: settingsMap.primaryColor || '#06b6d4',
      supportEmail: settingsMap.supportEmail || 'support@apricode.io',
      supportPhone: settingsMap.supportPhone || '+48 123 456 789',
      currentYear: new Date().getFullYear().toString(),
      
      // Test user data
      userName: 'Test User',
      userEmail: 'test@example.com',
      
      // Test order data
      orderId: 'TEST-12345',
      orderNumber: 'TEST-12345',
      orderUrl: emailUrls.order('TEST-12345'),
      
      // Test amounts
      cryptoAmount: '0.02000000',
      cryptoCurrency: 'BTC',
      cryptoCurrencyName: 'Bitcoin',
      fiatAmount: '1000.00',
      fiatCurrency: 'EUR',
      fiatCurrencyName: 'Euro',
      
      // Test rates and fees
      exchangeRate: '50000.00',
      rate: '50000.00',
      fee: '15.00',
      feePercent: '1.50',
      totalAmount: '1015.00',
      total: '1015.00 EUR',
      
      // Test wallet
      walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      blockchain: 'Bitcoin',
      blockchainCode: 'BTC',
      
      // Test URLs
      dashboardUrl: emailUrls.dashboard,
      loginUrl: emailUrls.login,
      kycUrl: emailUrls.kyc,
      buyUrl: emailUrls.buy,
      resetUrl: emailUrls.resetPassword('test-token-123'),
      verifyUrl: emailUrls.verifyEmail('test-verification-token-123'),
      setupUrl: emailUrls.adminSetupPasskey('test-setup-token-123'),
      
      // Test dates and times
      expiresAt: '24 hours',
      expiresIn: '15 minutes',
      createdAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      
      // Test payment data
      paymentMethod: 'Bank Transfer',
      bankName: 'Test Bank',
      accountNumber: '1234567890',
      iban: 'PL12345678901234567890123456',
      swift: 'TESTPL22',
      reference: 'TEST-REF-12345',
      
      // Test KYC data
      kycStatus: 'APPROVED',
      rejectionReason: '',
      
      // Test transaction data
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      confirmations: '6',
      
      // Test admin data
      adminName: 'Admin User',
      adminEmail: 'admin@apricode.io',
      invitedBy: 'Super Admin',
      
      // Override with custom test data
      ...testData
    };

    // Replace variables in content
    let htmlContent = template.htmlContent;
    let subject = template.subject;
    let preheader = template.preheader || '';

    console.log('🔄 [test-send] Replacing variables...');
    console.log('   Variables to replace:', Object.keys(defaultTestData).length);
    
    // Find all variables in template
    const variablesInTemplate = htmlContent.match(/\{\{([^}]+)\}\}/g) || [];
    console.log('   Variables in template:', variablesInTemplate.slice(0, 10));

    Object.entries(defaultTestData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const beforeCount = (htmlContent.match(regex) || []).length;
      htmlContent = htmlContent.replace(regex, value);
      subject = subject.replace(regex, value);
      preheader = preheader.replace(regex, value);
      
      if (beforeCount > 0) {
        console.log(`   ✅ Replaced {{${key}}} (${beforeCount}x) with: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
      }
    });

    // Replace preheader placeholder in HTML
    htmlContent = htmlContent.replace(/\{\{preheader\}\}/g, preheader);
    
    // Check for remaining unreplaced variables
    const remainingVars = htmlContent.match(/\{\{([^}]+)\}\}/g) || [];
    if (remainingVars.length > 0) {
      console.warn('⚠️  [test-send] Unreplaced variables:', remainingVars.slice(0, 5));
    } else {
      console.log('✅ [test-send] All variables replaced successfully');
    }

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

