// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Passkey Authentication Challenge API
 * 
 * Generates authentication options for passkey login
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePasskeyAuthenticationOptions } from '@/lib/services/passkey.service';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    console.log('🔐 Generating challenge for:', email);

    const options = await generatePasskeyAuthenticationOptions(email);

    console.log('✅ Challenge generated successfully');

    return NextResponse.json(options);
  } catch (error) {
    console.error('❌ Passkey challenge error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate challenge' },
      { status: 500 }
    );
  }
}


