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
    // Check authentication
    const { error, session } = await requireAuth();
    if (error) return error;

    // Fetch active cryptocurrencies with blockchain networks
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
            blockchain: { isActive: true }
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

    // Fetch active fiat currencies
    const fiatCurrencies = await prisma.fiatCurrency.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
      select: {
        code: true,
        name: true,
        symbol: true
      }
    });

    // Fetch active payment methods for clients
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { 
        isActive: true,
        isAvailableForClients: true // Only show client-available methods
      },
      orderBy: { priority: 'asc' }
    });

    // Get platform fee from settings (or use default)
    const settings = await prisma.adminSettings.findFirst({
      select: { platformFeePercent: true }
    });

    const platformFee = settings?.platformFeePercent ?? 1.5;

    return NextResponse.json({
      success: true,
      data: {
        currencies,
        fiatCurrencies,
        paymentMethods,
        platformFee
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load buy configuration' },
      { status: 500 }
    );
  }
}

