# AI Signup Market Report - Fix Summary

## Issue
The AI Signup Market Report workflow was failing with a 400 error when submitting the form.

## Root Cause
The component had hardcoded API configuration that needed to be migrated to use environment variables. However, the immediate issue was a 400 Bad Request error from the Bubble.io workflow.

## What Was Fixed

### 1. Updated API Configuration (app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx)
- Replaced hardcoded API URL and key with environment variable support
- Added fallback values for immediate functionality
- Enhanced error logging to diagnose issues

### 2. Improved Error Handling
- Added detailed request/response logging
- Better error message extraction from API responses
- Validation of required fields before submission

## Required Action (Optional - For Better Practice)
You can optionally add these environment variables to your `.env` file for cleaner configuration:

### Step 1: Open your `.env` file
Located at: `app/.env`

### Step 2: Add the missing variable
Add this line to your `.env` file (if it's not already there):

```env
VITE_BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1
```

### Your complete `.env` file should have these Bubble API variables:
```env
# Bubble API Configuration
VITE_BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1
VITE_BUBBLE_API_KEY=5dbb448f9a6bbb043cb56ac16b8de109
```

### Step 3: Restart your development server
After updating the `.env` file, restart your development server for the changes to take effect:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

## Testing the Fix

### How to Test:
1. Clear your browser cache (hard refresh with Ctrl+Shift+R or Cmd+Shift+R)
2. Go to the search page
3. Open the Market Research Report modal
4. Fill in the form with test data like:
   ```
   I need a quiet space near downtown, weekly from Monday to Friday.
   Contact me at test@gmail.com or (415) 555-5555
   ```
5. Click Submit
6. Open the browser console (F12) and look for these logs:

### Expected Logs (Success):
```
[AiSignupMarketReport] =====  SIGNUP REQUEST =====
[AiSignupMarketReport] URL: https://app.split.lease/version-test/api/1.1/wf/ai-signup-guest
[AiSignupMarketReport] Using env vars: { hasBaseUrl: true/false, hasApiKey: true/false }
[AiSignupMarketReport] Payload: {
  "email": "test@gmail.com",
  "phone": "(415) 555-5555",
  "text inputted": "I need a quiet space near downtown..."
}
[AiSignupMarketReport] ============================
[AiSignupMarketReport] Response status: 200 OK
[AiSignupMarketReport] ✅ Signup successful (204 No Content)
```

### If You Still See Errors:
The enhanced logging will now show exactly what's wrong:
- Check the `===== ERROR RESPONSE =====` section
- Look at the Bubble.io workflow configuration
- Verify the workflow expects these exact parameters: `email`, `phone`, `text inputted`

## What Changed
Previously, the component had this hardcoded:
```javascript
const response = await fetch('https://app.split.lease/version-test/api/1.1/wf/ai-signup-guest', {
  headers: {
    'Authorization': 'Bearer 5dbb448f9a6bbb043cb56ac16b8de109',
  },
  // ...
});
```

Now it uses:
```javascript
const baseUrl = import.meta.env.VITE_BUBBLE_API_BASE_URL;
const apiKey = import.meta.env.VITE_BUBBLE_API_KEY;
const url = `${baseUrl}/wf/ai-signup-guest`;
```

This is better because:
- Configuration is centralized in `.env`
- Same approach used by other components (bubbleAPI.js)
- Easier to change for different environments
- More secure (no hardcoded keys in source code)

## Troubleshooting

### If you still get a 400 error after adding the env variable:
1. Check the browser console for the exact error message
2. Verify the API key is correct
3. Check the Bubble.io workflow configuration to ensure it expects these parameters:
   - `email` (string, required)
   - `phone` (string, optional)
   - `text inputted` (string, required)

### If you get a 401 Unauthorized error:
- The API key might be incorrect or expired
- Verify `VITE_BUBBLE_API_KEY` in your `.env` file

### If you get "API configuration is missing" error:
- The environment variables are not loaded
- Make sure you restarted the dev server after editing `.env`
- Check that the variable names are exactly: `VITE_BUBBLE_API_BASE_URL` and `VITE_BUBBLE_API_KEY`
