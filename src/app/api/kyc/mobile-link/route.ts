/**
 * Generate Sumsub Mobile SDK Link
 * 
 * Creates a web SDK link that can be used for QR code or direct mobile access
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { IntegrationFactory } from '@/lib/integrations/IntegrationFactory';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('📱 Generating Sumsub mobile link...');

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

    // 2. Get active KYC provider (Sumsub)
    const kycProvider = await IntegrationFactory.getKycProvider();
    if (!kycProvider) {
      return NextResponse.json(
        { error: 'KYC provider not configured' },
        { status: 500 }
      );
    }

    // 3. Get or create KYC session
    let kycSession = await prisma.kycSession.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } }
    });

    if (!kycSession) {
      console.log('📝 Creating new KYC session...');
      kycSession = await prisma.kycSession.create({
        data: {
          userId,
          status: 'PENDING',
          kycProviderId: kycProvider.name
        },
        include: { user: { include: { profile: true } } }
      });
    }

    // 4. Get integration config for levelName
    const integration = await prisma.integration.findUnique({
      where: { service: kycProvider.name }
    });

    if (!integration?.config) {
      return NextResponse.json(
        { error: 'KYC provider configuration not found' },
        { status: 500 }
      );
    }

    const config = integration.config as any;
    const levelName = config.levelName || 'basic-kyc-level';

    console.log('🔧 Level name:', levelName);

    // 5. Generate mobile link via Sumsub API
    const baseUrl = config.baseUrl || 'https://api.sumsub.com';
    const appToken = config.appToken || integration.apiKey;
    const secretKey = config.secretKey;

    if (!appToken || !secretKey) {
      return NextResponse.json(
        { error: 'Sumsub credentials not configured' },
        { status: 500 }
      );
    }

    // Create HMAC signature
    const crypto = require('crypto');
    const timestamp = Math.floor(Date.now() / 1000);
    const method = 'POST';
    const resource = '/resources/sdkIntegrations/levels/-/websdkLink';
    
    const signatureString = `${timestamp}${method}${resource}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(signatureString)
      .digest('hex');

    // Request body
    const requestBody = {
      levelName,
      userId: userId,
      ttlInSecs: 3600 // 1 hour
    };

    console.log('📡 Calling Sumsub API:', `${baseUrl}${resource}`);

    const response = await fetch(`${baseUrl}${resource}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': appToken,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestamp.toString()
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Sumsub API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Failed to generate mobile link: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Mobile link generated:', data);

    return NextResponse.json({
      success: true,
      mobileUrl: data.href || data.link || data.url,
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

