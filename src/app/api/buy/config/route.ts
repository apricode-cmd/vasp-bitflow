/**
 * Buy Config API Route
 * 
 * GET /api/buy/config - Returns active currencies, fiat currencies, and payment methods
 * 
 * Caching strategy:
 * - Currencies: 1 hour (rarely change)
 * - Fiat currencies: 1 hour (rarely change)
 * - Platform fee: 5 minutes (may change)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { CacheService } from '@/lib/services/cache.service';

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

    // Try to get currencies from cache
    let currencies = await CacheService.getCurrencies();
    if (currencies === null) {
      // Cache miss - fetch from database
      console.log('📦 [buy/config] Fetching currencies from DB...');
      currencies = await prisma.currency.findMany({
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
      
      // Cache for 1 hour
      await CacheService.setCurrencies(currencies, 3600);
      console.log('✅ [buy/config] Currencies cached:', currencies.length);
    } else {
      console.log('✅ [buy/config] Currencies from cache:', currencies.length);
    }

    // Try to get fiat currencies from cache
    let fiatCurrencies = await CacheService.getFiatCurrencies();
    if (fiatCurrencies === null) {
      // Cache miss - fetch from database
      console.log('📦 [buy/config] Fetching fiat currencies from DB...');
      fiatCurrencies = await prisma.fiatCurrency.findMany({
        where: { isActive: true },
        orderBy: { priority: 'asc' },
        select: {
          code: true,
          name: true,
          symbol: true
        }
      });
      
      // Cache for 1 hour
      await CacheService.setFiatCurrencies(fiatCurrencies, 3600);
      console.log('✅ [buy/config] Fiat currencies cached:', fiatCurrencies.length);
    } else {
      console.log('✅ [buy/config] Fiat currencies from cache:', fiatCurrencies.length);
    }

    // Fetch active payment methods (not cached, as it's less frequent)
    console.log('📦 [buy/config] Fetching payment methods...');
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { 
        isActive: true,
        isAvailableForClients: true // Only show client-available methods
      },
      orderBy: { priority: 'asc' }
    });
    console.log('✅ [buy/config] Payment methods fetched:', paymentMethods.length);

    // Try to get platform fee from cache
    let platformFee = 1.5; // Default value
    const cachedFee = await CacheService.getSetting('platform_fee');
    if (cachedFee !== null) {
      platformFee = parseFloat(cachedFee);
      console.log('✅ [buy/config] Platform fee from cache:', platformFee);
    } else {
      // Cache miss - fetch from database
      console.log('📦 [buy/config] Fetching platform fee from DB...');
      const feeSetting = await prisma.systemSettings.findUnique({
        where: { key: 'platform_fee' }
      });
      
      if (feeSetting?.value) {
        platformFee = parseFloat(feeSetting.value);
        // Cache for 5 minutes
        await CacheService.setSetting('platform_fee', feeSetting.value, 300);
        console.log('✅ [buy/config] Platform fee cached:', platformFee);
      }
    }

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

