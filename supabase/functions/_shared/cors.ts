/**
 * CORS Configuration for Edge Functions
 *
 * This file centralizes CORS settings for all Edge Functions.
 */

// List of allowed origins
const ALLOWED_ORIGINS = [
  // Development
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',

  // Production domains
  'https://provia-glass.app',
  'https://www.provia-glass.app',
  'https://app.provia-glass.com',
  'https://proviabase.fr',
  'https://www.proviabase.fr',
  'https://download.proviabase.fr',
];

// Allowed domain patterns for dynamic checking
const ALLOWED_DOMAIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,  // Lovable preview domains
  /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/,  // Lovable branch previews
];

/**
 * Get CORS headers based on request origin
 * Only allows origins in the ALLOWED_ORIGINS list or matching patterns
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';

  // Check if origin is in explicit allow list
  let isAllowed = ALLOWED_ORIGINS.includes(origin);

  // Check against allowed patterns if not in explicit list
  if (!isAllowed && origin) {
    isAllowed = ALLOWED_DOMAIN_PATTERNS.some(pattern => pattern.test(origin));
  }

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
