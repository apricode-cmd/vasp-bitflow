/**
 * CoinGecko API Test Route
 * 
 * POST /api/admin/integrations/coingecko/test - Test CoinGecko API connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { coinGeckoService } from '@/lib/services/coingecko';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin authentication
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    console.log('🧪 Testing CoinGecko API connection...');

    // Test connection
    const testResult = await coinGeckoService.testConnection();
    
    if (testResult.success) {
      console.log('✅ CoinGecko API test successful:', testResult);
      
      // Get current rates to verify full functionality
      const rates = await coinGeckoService.getCurrentRates();
      
      return NextResponse.json({
        success: true,
        message: 'CoinGecko API connection successful',
        data: {
          connection: testResult,
          rates: {
            BTC: rates.BTC,
            ETH: rates.ETH,
            USDT: rates.USDT,
            SOL: rates.SOL,
            updatedAt: rates.updatedAt
          }
        }
      });
    } else {
      console.error('❌ CoinGecko API test failed:', testResult);
      
      return NextResponse.json({
        success: false,
        message: testResult.message,
        data: {
          connection: testResult
        }
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ CoinGecko API test error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}
