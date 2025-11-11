// Cloudflare Pages Function to handle dynamic listing routes
// This catches /view-split-lease/[any-id] and serves view-split-lease.html
// while preserving the URL for client-side JavaScript to parse

export async function onRequest(context) {
  const { request, env, params } = context;

  // Get the listing ID from the URL parameter
  const listingId = params.id;

  // Fetch the view-split-lease.html file from the static assets
  const url = new URL(request.url);
  url.pathname = '/view-split-lease.html';

  // Forward the request to get the HTML file
  const response = await env.ASSETS.fetch(url);

  // Clone the response so we can modify headers
  const newResponse = new Response(response.body, response);

  // Set cache headers for better performance
  newResponse.headers.set('Cache-Control', 'public, max-age=3600');

  return newResponse;
}
