// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Setup Status API
 * 
 * GET /api/setup/status
 * 
 * Checks if initial system setup has been completed.
 * Used to determine if setup wizard should be shown.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface SetupStatus {
  isComplete: boolean;
  steps: {
    database: {
      completed: boolean;
      message: string;
    };
    admin: {
      completed: boolean;
      message: string;
    };
    currencies: {
      completed: boolean;
      message: string;
    };
    settings: {
      completed: boolean;
      message: string;
    };
  };
  completionPercentage: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check 1: Database connectivity
    const databaseCheck = await checkDatabase();
    
    // Check 2: Admin account exists
    const adminCheck = await checkAdminExists();
    
    // Check 3: Currencies configured
    const currenciesCheck = await checkCurrencies();
    
    // Check 4: Basic settings configured
    const settingsCheck = await checkSettings();

    // Calculate completion
    const checks = [
      databaseCheck.completed,
      adminCheck.completed,
      currenciesCheck.completed,
      settingsCheck.completed
    ];
    
    const completedCount = checks.filter(Boolean).length;
    const completionPercentage = Math.round((completedCount / checks.length) * 100);
    
    const isComplete = completionPercentage === 100;

    const status: SetupStatus = {
      isComplete,
      steps: {
        database: databaseCheck,
        admin: adminCheck,
        currencies: currenciesCheck,
        settings: settingsCheck
      },
      completionPercentage
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('[Setup Status] Error:', error);
    
    return NextResponse.json({
      isComplete: false,
      steps: {
        database: {
          completed: false,
          message: 'Failed to check database'
        },
        admin: {
          completed: false,
          message: 'Unknown'
        },
        currencies: {
          completed: false,
          message: 'Unknown'
        },
        settings: {
          completed: false,
          message: 'Unknown'
        }
      },
      completionPercentage: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Check if database is connected and migrations are up to date
 */
async function checkDatabase(): Promise<{
  completed: boolean;
  message: string;
}> {
  try {
    // Try a simple query
    await prisma.$queryRaw`SELECT 1`;
    
    // Check if essential tables exist
    const adminCount = await prisma.admin.count();
    const currencyCount = await prisma.currency.count();
    
    // If we can query these tables, migrations are applied
    return {
      completed: true,
      message: 'Database connected and migrations applied'
    };
  } catch (error) {
    return {
      completed: false,
      message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check if at least one admin account exists
 */
async function checkAdminExists(): Promise<{
  completed: boolean;
  message: string;
}> {
  try {
    const adminCount = await prisma.admin.count({
      where: {
        isActive: true
      }
    });
    
    if (adminCount === 0) {
      return {
        completed: false,
        message: 'No admin account found'
      };
    }
    
    return {
      completed: true,
      message: `${adminCount} admin account(s) configured`
    };
  } catch (error) {
    return {
      completed: false,
      message: 'Failed to check admin accounts'
    };
  }
}

/**
 * Check if currencies are configured
 */
async function checkCurrencies(): Promise<{
  completed: boolean;
  message: string;
}> {
  try {
    const currencyCount = await prisma.currency.count({
      where: {
        isActive: true
      }
    });
    
    const fiatCount = await prisma.fiatCurrency.count({
      where: {
        isActive: true
      }
    });
    
    if (currencyCount === 0 || fiatCount === 0) {
      return {
        completed: false,
        message: 'Currencies not configured'
      };
    }
    
    return {
      completed: true,
      message: `${currencyCount} crypto currencies, ${fiatCount} fiat currencies`
    };
  } catch (error) {
    return {
      completed: false,
      message: 'Failed to check currencies'
    };
  }
}

/**
 * Check if basic system settings are configured
 */
async function checkSettings(): Promise<{
  completed: boolean;
  message: string;
}> {
  try {
    const settingsCount = await prisma.systemSettings.count();
    
    // Check for essential settings
    const essentialSettings = [
      'brandName',
      'companyEmail',
      'platformFee'
    ];
    
    const existingSettings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: essentialSettings
        }
      }
    });
    
    if (existingSettings.length < essentialSettings.length) {
      return {
        completed: false,
        message: 'Essential settings not configured'
      };
    }
    
    return {
      completed: true,
      message: `${settingsCount} settings configured`
    };
  } catch (error) {
    return {
      completed: false,
      message: 'Failed to check settings'
    };
  }
}

