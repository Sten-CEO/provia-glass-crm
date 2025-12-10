/**
 * CORS Configuration for Edge Functions
 *
 * This file centralizes CORS settings for all Edge Functions.
 * Update ALLOWED_ORIGINS with your production domains.
 */

// List of allowed origins - UPDATE THIS WITH YOUR DOMAINS
const ALLOWED_ORIGINS = [
  // Development
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',

  // Production - ADD YOUR DOMAINS HERE
  // 'https://your-app.vercel.app',
  // 'https://your-domain.com',
  // 'https://www.your-domain.com',
];

/**
 * Get CORS headers based on request origin
 * Only allows origins in the ALLOWED_ORIGINS list
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';

  // Check if origin is allowed
  const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
                    origin.endsWith('.supabase.co') ||  // Allow Supabase domains
                    origin.endsWith('.lovable.app');     // Allow Lovable domains if used

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
}

/**
 * Create a JSON response with CORS headers
 */
export function corsJsonResponse(
  data: unknown,
  request: Request,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...getCorsHeaders(request),
        'Content-Type': 'application/json',
      },
    }
  );
}
