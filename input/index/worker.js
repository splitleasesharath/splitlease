// Cloudflare Worker for routing between main site and Bubble app
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Define your Bubble app paths
  const bubbleAppPaths = [
    '/app',
    '/login',
    '/signup',
    '/dashboard',
    '/api'
  ]
  
  // Check if the path should go to Bubble
  const shouldRouteToBubble = bubbleAppPaths.some(path => 
    url.pathname.startsWith(path)
  )
  
  if (shouldRouteToBubble) {
    // Route to your Bubble app
    const bubbleUrl = `https://app.split.lease${url.pathname}${url.search}`
    
    // Fetch from Bubble and return the response
    const response = await fetch(bubbleUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    })
    
    // Clone the response and modify headers if needed
    const modifiedResponse = new Response(response.body, response)
    modifiedResponse.headers.set('X-Proxied-By', 'Cloudflare-Worker')
    
    return modifiedResponse
  }
  
  // For all other paths, serve from Cloudflare Pages (your static site)
  return fetch(request)
}