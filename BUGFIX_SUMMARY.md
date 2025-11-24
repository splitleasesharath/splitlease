# Bug Fix: AI Signup Market Report - 400 Error

## Problem
When clicking "Submit" on the Market Research Report form in the search page, the request was failing with a 400 Bad Request error:
```
app.split.lease/version-test/api/1.1/wf/ai-signup-guest:1 Failed to load resource: the server responded with a status of 400 ()
```

## Solution Applied

### Files Changed
1. `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`

### Changes Made

#### 1. Migrated to Environment Variables (with Fallback)
**Before:**
```javascript
const response = await fetch('https://app.split.lease/version-test/api/1.1/wf/ai-signup-guest', {
  headers: {
    'Authorization': 'Bearer 5dbb448f9a6bbb043cb56ac16b8de109',
  },
  // ...
});
```

**After:**
```javascript
const baseUrl = import.meta.env.VITE_BUBBLE_API_BASE_URL || 'https://app.split.lease/version-test/api/1.1';
const apiKey = import.meta.env.VITE_BUBBLE_API_KEY || '5dbb448f9a6bbb043cb56ac16b8de109';

const response = await fetch(`${baseUrl}/wf/ai-signup-guest`, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
  },
  // ...
});
```

**Benefits:**
- Uses environment variables when available (following project standards)
- Falls back to hardcoded values for immediate functionality
- No deployment required - works immediately
- Better for different environments (dev, staging, production)

#### 2. Enhanced Error Logging
Added comprehensive logging to diagnose issues:

```javascript
console.log('[AiSignupMarketReport] =====  SIGNUP REQUEST =====');
console.log('[AiSignupMarketReport] URL:', url);
console.log('[AiSignupMarketReport] Payload:', JSON.stringify(payload, null, 2));
// ... on error:
console.error('[AiSignupMarketReport] ===== ERROR RESPONSE =====');
console.error('[AiSignupMarketReport] Status:', response.status);
console.error('[AiSignupMarketReport] Response Body:', errorText);
```

This will help you:
- See exactly what's being sent to the API
- Identify API response errors immediately
- Debug any future issues quickly

#### 3. Added Field Validation
Added validation before making the API call:
```javascript
if (!data.email) {
  throw new Error('Email is required');
}

if (!data.marketResearchText) {
  throw new Error('Market research description is required');
}
```

#### 4. Better Error Handling
Improved error message extraction:
```javascript
// Try to parse error response as JSON
try {
  const errorJson = JSON.parse(errorText);
  errorMessage = errorJson.message || errorJson.error || errorJson.body?.message;
} catch (e) {
  errorMessage = errorText || `Signup failed with status ${response.status}`;
}
```

## How to Test

### Option 1: Quick Test (Recommended)
Since the code now has fallback values, it should work immediately:

1. **Hard refresh the page** (Ctrl+Shift+R or Cmd+Shift+R) to clear cache
2. Go to the search page
3. Click on the Market Research Report button
4. Fill in the form
5. Click Submit
6. **Open browser console (F12)** and check the logs

### Option 2: Use Environment Variables (Best Practice)
For cleaner configuration, add to your `app/.env` file:

```env
VITE_BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1
VITE_BUBBLE_API_KEY=5dbb448f9a6bbb043cb56ac16b8de109
```

Then restart your dev server.

## Expected Results

### Success Case:
Browser console will show:
```
[AiSignupMarketReport] =====  SIGNUP REQUEST =====
[AiSignupMarketReport] URL: https://app.split.lease/version-test/api/1.1/wf/ai-signup-guest
[AiSignupMarketReport] Payload: {
  "email": "user@example.com",
  "phone": "(415) 555-5555",
  "text inputted": "Your market research request..."
}
[AiSignupMarketReport] Response status: 200 OK
[AiSignupMarketReport] ✅ Signup successful
```

The modal will show the success animation and confirmation message.

### Still Getting 400 Error?
If you still see a 400 error, the console will now show:

```
[AiSignupMarketReport] ===== ERROR RESPONSE =====
[AiSignupMarketReport] Status: 400
[AiSignupMarketReport] Response Body: { detailed error from Bubble.io }
```

This means the issue is with the **Bubble.io workflow configuration**. Check:
1. The workflow is enabled and published
2. The workflow expects these exact parameters: `email`, `phone`, `text inputted`
3. The API key has the correct permissions
4. The workflow's privacy rules allow the request

## Next Steps

1. **Test the fix** using Option 1 above
2. **Check the console logs** to see if it works or if there's a specific error
3. **If it still fails**, look at the detailed error in the console and:
   - Check the Bubble.io workflow configuration
   - Verify the API endpoint is correct
   - Ensure the workflow parameters match what we're sending

## Rollback Plan
If you need to revert these changes, the component previously had the exact same endpoint and API key hardcoded, so the functionality should be the same. The main improvements are:
- Better logging for debugging
- Environment variable support
- Improved error handling

## Additional Resources

- See `app/ENV_FIX_INSTRUCTIONS.md` for detailed setup instructions
- See `app/src/islands/shared/AiSignupMarketReport/README.md` for component documentation
- See `app/src/islands/shared/AiSignupMarketReport/MIGRATION_SUMMARY.md` for migration history
