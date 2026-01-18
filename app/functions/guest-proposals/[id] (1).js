// Cloudflare Pages Function to handle dynamic guest proposals routes
// This catches /guest-proposals/[any-user-id] and serves guest-proposals.html
// while preserving the URL for client-side JavaScript to parse the user ID

export async function onRequest(context) {
  const { request, env, params } = context;

  // Get the user ID from the URL parameter
  const userId = params.id;

  // Fetch the guest-proposals.html file from the static assets
  const url = new URL(request.url);
  url.pathname = '/guest-proposals.html';

  // Forward the request to get the HTML file
  const response = await env.ASSETS.fetch(url);

  // Clone the response so we can modify headers
  const newResponse = new Response(response.body, response);

  // Set cache headers for better performance
  newResponse.headers.set('Cache-Control', 'public, max-age=3600');

  return newResponse;
}
