/**
 * Passkey Authentication Challenge API
 * 
 * Generates authentication options for passkey login
 */

import { NextRequest, NextResponse } from 'next/server';
import { PasskeyService } from '@/lib/services/passkey.service';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    const result = await PasskeyService.generatePasskeyAuthenticationOptions(email);

    // Return only options (result contains {options, email})
    return NextResponse.json(result.options);
  } catch (error) {
    console.error('❌ Passkey challenge error:', error);
    return NextResponse.json(
      { error: 'Failed to generate challenge' },
      { status: 500 }
    );
  }
}

