/**
 * Test data factories for Split Lease Edge Function tests.
 * Creates consistent test data without external dependencies.
 */

/**
 * Create a mock HTTP Request object.
 */
export function createMockRequest(options: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Request {
  const { method = 'POST', body, headers = {} } = options;

  return new Request('https://test.supabase.co/functions/v1/test', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Create a standard action request payload.
 */
export function createActionPayload<T>(action: string, payload: T): { action: string; payload: T } {
  return { action, payload };
}

/**
 * Sample user data for auth tests.
 */
export const sampleUser = {
  id: 'test-user-id-12345',
  email: 'test@example.com',
  phone: '+15551234567',
} as const;

/**
 * Sample listing data for listing tests.
 */
export const sampleListing = {
  id: 'test-listing-id-12345',
  title: 'Test Listing',
  neighborhood: 'East Village',
  borough: 'Manhattan',
} as const;
