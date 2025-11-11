/**
 * OpenAPI Specification Endpoint
 * 
 * Generates OpenAPI 3.0 specification dynamically from route definitions
 */

import { NextResponse } from 'next/server';
import { generateOpenAPISpec } from '@/lib/openapi-generator';
import { apiRoutes } from '@/lib/openapi-routes';

export async function GET() {
  try {
    // Generate OpenAPI spec from route definitions
    const openApiSpec = generateOpenAPISpec(apiRoutes);

    return NextResponse.json(openApiSpec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes (shorter for dynamic generation)
      },
    });
  } catch (error) {
    console.error('Failed to generate OpenAPI spec:', error);
    return NextResponse.json(
      { error: 'Failed to generate API specification' },
      { status: 500 }
    );
  }
}
