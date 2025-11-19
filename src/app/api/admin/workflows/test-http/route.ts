/**
 * Test HTTP Request Node
 * 
 * POST /api/admin/workflows/test-http
 * 
 * Test HTTP request configuration before saving to workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { httpExecutor } from '@/lib/services/http-executor.service';
import { HttpRequestConfig } from '@/lib/validations/http-request';
import { z } from 'zod';

const TestRequestSchema = z.object({
  config: z.any(), // HttpRequestConfig
  context: z.object({
    variables: z.record(z.any()).optional().default({}),
    env: z.record(z.string()).optional().default({}),
  }).optional().default({ variables: {}, env: {} }),
});

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 error
    }

    // Parse request body
    const body = await request.json();
    const validated = TestRequestSchema.parse(body);

    // Execute HTTP request
    const startTime = Date.now();
    const response = await httpExecutor.execute(
      validated.config as HttpRequestConfig,
      validated.context
    );
    const executionTime = Date.now() - startTime;

    console.log(`✅ [HTTP Test] Request executed in ${executionTime}ms:`, {
      status: response.status,
      success: response.success,
      duration: response.duration,
    });

    // Return result
    return NextResponse.json({
      success: true,
      response,
      executionTime,
    });

  } catch (error: any) {
    console.error('❌ [HTTP Test] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to execute HTTP request' },
      { status: 500 }
    );
  }
}

