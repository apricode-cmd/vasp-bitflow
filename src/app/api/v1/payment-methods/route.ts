/**
 * Public API v1 - Payment Methods
 * 
 * GET /api/v1/payment-methods - Get available payment methods (requires API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey, logApiRequest } from '@/lib/middleware/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Validate API key
    const authResult = await requireApiKey(request, 'payment-methods', 'read');

    if (!authResult.authorized) {
      return authResult.error!;
    }

    const { apiKey } = authResult;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const fiatCurrency = searchParams.get('fiatCurrency');
    const country = searchParams.get('country');

    // Build where clause
    const where: any = {
      isActive: true
    };

    if (fiatCurrency) {
      where.fiatCurrencies = {
        has: fiatCurrency
      };
    }

    if (country) {
      where.countries = {
        has: country
      };
    }

    // Get payment methods with bank details
    const paymentMethods = await prisma.paymentMethod.findMany({
      where,
      include: {
        bankAccount: {
          select: {
            bankName: true,
            currency: true,
            accountHolder: true,
            iban: true,
            swift: true,
            bic: true,
            sortCode: true,
            instructions: true
          }
        }
      },
      orderBy: { priority: 'asc' }
    });

    // Format response
    const formattedMethods = paymentMethods.map(method => ({
      code: method.code,
      name: method.name,
      type: method.type,
      description: method.description,
      currencies: method.fiatCurrencies,
      countries: method.countries,
      processingTime: method.processingTime,
      limits: {
        min: method.minAmount,
        max: method.maxAmount,
        currency: method.bankAccount?.currency || method.fiatCurrencies[0]
      },
      fees: {
        fixed: method.feeFixed,
        percentage: method.feePercentage
      },
      bankDetails: method.bankAccount ? {
        bankName: method.bankAccount.bankName,
        accountHolder: method.bankAccount.accountHolder,
        iban: method.bankAccount.iban,
        swift: method.bankAccount.swift,
        bic: method.bankAccount.bic,
        sortCode: method.bankAccount.sortCode,
        instructions: method.bankAccount.instructions
      } : null
    }));

    const responseTime = Date.now() - startTime;
    await logApiRequest(apiKey.id, request, 200, responseTime);

    return NextResponse.json({
      success: true,
      data: {
        paymentMethods: formattedMethods,
        total: formattedMethods.length
      },
      meta: {
        version: '1.0',
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error) {
    console.error('API v1 get payment methods error:', error);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve payment methods',
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      },
      { status: 500 }
    );
  }
}

