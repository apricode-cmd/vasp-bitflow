/**
 * Buy Config API Route
 * 
 * GET /api/buy/config - Returns active currencies, fiat currencies, and payment methods
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export async function GET(): Promise<NextResponse> {
  try {
    console.log('🔍 [buy/config] Starting...');
    
    // Check authentication
    const { error, session } = await requireAuth();
    if (error) {
      console.error('❌ [buy/config] Auth error:', error);
      return error;
    }
    
    if (!session?.user) {
      console.error('❌ [buy/config] No session');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('✅ [buy/config] User authenticated:', session.user.id);

    // Fetch active cryptocurrencies with blockchain networks
    console.log('📦 [buy/config] Fetching currencies...');
    const currencies = await prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
      select: {
        code: true,
        name: true,
        symbol: true,
        coingeckoId: true,
        iconUrl: true,
        minOrderAmount: true,
        maxOrderAmount: true,
        decimals: true,
        blockchainNetworks: {
          where: { 
            isActive: true,
            blockchain: {
              isActive: true
            }
          },
          include: {
            blockchain: {
              select: {
                code: true,
                name: true,
                isActive: true
              }
            }
          }
        }
      }
    });

    console.log('✅ [buy/config] Currencies fetched:', currencies.length);

    // Fetch active fiat currencies
    console.log('📦 [buy/config] Fetching fiat currencies...');
    const fiatCurrencies = await prisma.fiatCurrency.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
      select: {
        code: true,
        name: true,
        symbol: true
      }
    });

    console.log('✅ [buy/config] Fiat currencies fetched:', fiatCurrencies.length);

    // Fetch active payment methods for clients
    console.log('📦 [buy/config] Fetching payment methods...');
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { 
        isActive: true,
        isAvailableForClients: true // Only show client-available methods
      },
      orderBy: { priority: 'asc' }
    });

    console.log('✅ [buy/config] Payment methods fetched:', paymentMethods.length);

    // Get platform fee from SystemSettings (or use default)
    console.log('📦 [buy/config] Fetching platform fee...');
    const feeSetting = await prisma.systemSettings.findUnique({
      where: { key: 'platform_fee' }
    });

    const platformFee = feeSetting?.value ? parseFloat(feeSetting.value) : 1.5;
    console.log('✅ [buy/config] Platform fee:', platformFee);

    console.log('✅ [buy/config] Returning config...');
    return NextResponse.json({
      success: true,
      currencies,
      fiatCurrencies,
      paymentMethods,
      platformFee
    });
  } catch (error) {
    console.error('❌ [buy/config] Error:', error);
    console.error('❌ [buy/config] Stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load buy configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

