# Deploy AI Signup Guest Edge Function - Manual Steps

## Status
✅ **Frontend Deployed**: https://0b7e494c.splitlease.pages.dev
⏳ **Edge Function**: Needs manual deployment via Supabase Dashboard

## Step-by-Step Deployment

### 1. Open Supabase Dashboard
Go to: https://supabase.com/dashboard/project/qcfifybkaddcoimjroca/functions

### 2. Create New Function
1. Click **"Create a new function"**
2. Function name: `ai-signup-guest`
3. Click **"Create function"**

### 3. Copy Edge Function Code
Open the file: `supabase/functions/ai-signup-guest/index.ts`

Or copy from below:

```typescript
/**
 * AI Signup Guest - Unauthenticated Endpoint
 * Split Lease - Edge Function
 *
 * Allows GUEST users (non-authenticated) to submit market research signups
 * This bypasses authentication requirements for this specific workflow
 *
 * Security: Rate limited by Supabase, validated inputs only
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { formatErrorResponse, getStatusCodeFromError } from '../_shared/errors.ts';
import { validateRequiredFields, validateEmail, validatePhone } from '../_shared/validation.ts';

console.log('[ai-signup-guest] Edge Function started');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    console.log(`[ai-signup-guest] ========== NEW GUEST SIGNUP REQUEST ==========`);
    console.log(`[ai-signup-guest] Method: ${req.method}`);
    console.log(`[ai-signup-guest] Origin: ${req.headers.get('origin')}`);

    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed. Use POST.');
    }

    // Parse request body
    const body = await req.json();
    console.log(`[ai-signup-guest] Request body:`, JSON.stringify(body, null, 2));

    // Validate required fields
    validateRequiredFields(body, ['email', 'text_inputted']);

    const { email, phone, text_inputted } = body;

    // Validate email format
    validateEmail(email);

    // Validate phone if provided (optional)
    if (phone && phone.trim()) {
      validatePhone(phone);
    }

    // Validate text is not empty
    if (!text_inputted || !text_inputted.trim()) {
      throw new Error('Market research description cannot be empty');
    }

    console.log(`[ai-signup-guest] ✅ Validation passed`);
    console.log(`[ai-signup-guest] Email: ${email}`);
    console.log(`[ai-signup-guest] Phone: ${phone || 'Not provided'}`);
    console.log(`[ai-signup-guest] Description length: ${text_inputted.length}`);

    // Get Bubble API credentials from environment
    const bubbleBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
    const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');

    if (!bubbleBaseUrl || !bubbleApiKey) {
      console.error('[ai-signup-guest] Missing Bubble configuration');
      throw new Error('Server configuration error');
    }

    // Call Bubble workflow directly
    const bubbleUrl = `${bubbleBaseUrl}/wf/ai-signup-guest`;
    console.log(`[ai-signup-guest] Calling Bubble API: ${bubbleUrl}`);

    const bubblePayload = {
      email,
      phone: phone || '',
      'text inputted': text_inputted,
    };

    console.log(`[ai-signup-guest] Bubble payload:`, JSON.stringify(bubblePayload, null, 2));

    const bubbleResponse = await fetch(bubbleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bubbleApiKey}`,
      },
      body: JSON.stringify(bubblePayload),
    });

    console.log(`[ai-signup-guest] Bubble response status: ${bubbleResponse.status}`);

    if (!bubbleResponse.ok) {
      const errorText = await bubbleResponse.text();
      console.error(`[ai-signup-guest] Bubble API error:`, errorText);
      throw new Error(`Bubble API returned ${bubbleResponse.status}: ${errorText}`);
    }

    // Handle 204 No Content
    let bubbleResult;
    if (bubbleResponse.status === 204) {
      console.log(`[ai-signup-guest] ✅ Bubble returned 204 No Content (success)`);
      bubbleResult = { success: true };
    } else {
      bubbleResult = await bubbleResponse.json();
      console.log(`[ai-signup-guest] ✅ Bubble response:`, JSON.stringify(bubbleResult, null, 2));
    }

    console.log(`[ai-signup-guest] ✅ Guest signup completed successfully`);
    console.log(`[ai-signup-guest] ========== REQUEST COMPLETE ==========`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signup submitted successfully',
        data: bubbleResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ai-signup-guest] ========== ERROR ==========');
    console.error('[ai-signup-guest] Error:', error);
    console.error('[ai-signup-guest] Error stack:', error.stack);

    const statusCode = getStatusCodeFromError(error);
    const errorResponse = formatErrorResponse(error);

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

### 4. Verify Secrets are Set
Go to: Settings → Edge Functions → Secrets

Make sure these are set:
- `BUBBLE_API_BASE_URL` = `https://app.split.lease/version-test/api/1.1`
- `BUBBLE_API_KEY` = `5dbb448f9a6bbb043cb56ac16b8de109`

### 5. Deploy the Function
1. Paste the code into the editor
2. Click **"Deploy function"**
3. Wait for deployment to complete

### 6. Test the Function
Once deployed, test it:

```bash
curl -X POST https://qcfifybkaddcoimjroca.supabase.co/functions/v1/ai-signup-guest \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "4155555555",
    "text_inputted": "I need a quiet space near downtown Manhattan"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Signup submitted successfully",
  "data": { ... }
}
```

### 7. Test on Production Site
1. Go to https://0b7e494c.splitlease.pages.dev/search
2. Click "Get Market Research Report"
3. Fill out the form
4. Submit
5. Check browser console for success logs

## What Happens After Deployment?

Once the Edge Function is deployed, the signup flow will work like this:

1. User fills out the form on the website
2. Frontend calls `https://qcfifybkaddcoimjroca.supabase.co/functions/v1/ai-signup-guest`
3. Edge Function validates the input
4. Edge Function calls Bubble API with the server-side API key
5. Bubble workflow creates the user record
6. Success message shown to user

## Troubleshooting

### Function Not Found (404)
- Make sure you deployed the function with the exact name `ai-signup-guest`
- Check the function exists in the Supabase dashboard

### CORS Error
- Make sure the function includes the CORS headers in the OPTIONS handler
- The code above already includes proper CORS handling

### Bubble API Error (401)
- Check that `BUBBLE_API_KEY` secret is set correctly
- Verify the API key hasn't expired

### Validation Error
- Check that the request body includes `email` and `text_inputted`
- Email must be valid format
- Phone (if provided) must be valid format

## Dependencies

The Edge Function relies on shared modules:
- `../_shared/cors.ts` - CORS headers
- `../_shared/errors.ts` - Error formatting
- `../_shared/validation.ts` - Input validation

These should already exist in your `supabase/functions/_shared/` directory. If not, you may need to deploy those first.
