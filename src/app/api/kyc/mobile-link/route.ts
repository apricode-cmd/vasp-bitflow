/**
 * Generate Sumsub Mobile SDK Link
 * 
 * Creates a web SDK link that can be used for QR code or direct mobile access
 * Uses the modular KYC service architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { getIntegrationWithSecrets } from '@/lib/services/integration-management.service';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    console.log('📱 Generating mobile SDK link...');

    // 1. Check authentication
    const session = await getClientSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log('👤 User ID:', userId);

    // 2. Get active KYC provider (uses modular architecture)
    const kycProvider = await integrationFactory.getKycProvider();
    if (!kycProvider) {
      return NextResponse.json(
        { error: 'KYC provider not configured' },
        { status: 500 }
      );
    }

    const providerId = kycProvider.providerId;
    console.log('🔧 Active provider:', providerId);

    // 3. Get integration config with decrypted secrets
    const integration = await getIntegrationWithSecrets(providerId);
    if (!integration?.config) {
      return NextResponse.json(
        { error: 'KYC provider configuration not found' },
        { status: 500 }
      );
    }

    const config = integration.config as any;
    const levelName = config.levelName;
    const baseUrl = config.baseUrl || 'https://api.sumsub.com';
    const appToken = config.appToken || integration.apiKey;
    const secretKey = config.secretKey;

    if (!appToken || !secretKey || !levelName) {
      return NextResponse.json(
        { error: 'KYC provider credentials incomplete (appToken, secretKey, levelName required)' },
        { status: 500 }
      );
    }

    console.log('🔧 Config:', { levelName, baseUrl: baseUrl.substring(0, 30) + '...' });

    // 4. Check if KYC session exists
    const kycSession = await prisma.kycSession.findUnique({
      where: { userId }
    });

    // ✅ IMPORTANT: Use the ACTUAL externalUserId that was used to create the applicant
    // This may be different from userId if there was a 409 conflict and retry
    // The correct externalUserId is stored in kycSession.metadata.applicant.externalUserId
    const metadata = kycSession?.metadata as any;
    const externalUserId = metadata?.applicant?.externalUserId || userId;
    
    console.log('🔍 KYC Session:', {
      exists: !!kycSession,
      applicantId: kycSession?.applicantId || 'N/A',
      externalUserId: externalUserId,
      isRetried: externalUserId !== userId
    });

    // 5. Build Sumsub websdkLink request (following SumsubAdapter pattern)
    const method = 'POST';
    const path = '/resources/sdkIntegrations/levels/-/websdkLink';
    const requestBody = {
      levelName,
      userId: externalUserId, // Our internal user ID (externalUserId)
      ttlInSecs: 3600 // 1 hour
    };
    const body = JSON.stringify(requestBody);

    // Build signature (same as SumsubAdapter.buildSignature)
    const ts = Math.floor(Date.now() / 1000).toString();
    const payload = ts + method.toUpperCase() + path + body;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    console.log('📡 Calling Sumsub websdkLink API...');

    // Make request
    const response = await fetch(baseUrl + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': appToken,
        'X-App-Access-Ts': ts,
        'X-App-Access-Sig': signature
      },
      body
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Sumsub API error:', response.status, errorText);
      
      // Special case: Applicant is deactivated (Sumsub-specific)
      if (response.status === 404 && errorText.includes('deactivated')) {
        console.error('⚠️ Applicant is deactivated:', externalUserId);
        return NextResponse.json(
          { 
            error: 'Your verification session has been deactivated. Please contact support to restart the verification process.',
            code: 'APPLICANT_DEACTIVATED'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to generate mobile link: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Mobile link response:', JSON.stringify(data, null, 2));
    
    // Sumsub returns 'url' field (not 'href')
    const mobileUrl = data.url || data.href || data.link;
    console.log('📱 Mobile URL:', mobileUrl || 'N/A');

    if (!mobileUrl) {
      console.error('❌ No mobile URL in response:', data);
      return NextResponse.json(
        { error: 'Failed to generate mobile link: No URL in response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mobileUrl,
      externalActionId: data.externalActionId
    });

  } catch (error: any) {
    console.error('❌ Error generating mobile link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate mobile link' },
      { status: 500 }
    );
  }
}

