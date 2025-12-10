# AI Signup Market Report - Testing Instructions

## What Was Fixed

### 1. Enhanced Logging (submitSignup function)
Added comprehensive console logging to track exactly what's happening during signup:
- Request details (URL, payload)
- Response status and body
- Detailed error messages
- Exception handling

### 2. Fixed Lottie Animation Loading Error
The error you saw was:
```
Failed to load Lottie animation: SyntaxError: Unexpected token 'P', "PK
```

**Cause**: The LOADING_LOTTIE_URL uses `.lottie` format (a ZIP file), but the code was trying to parse it as JSON.

**Fix**: Added detection and graceful handling for `.lottie` files - they now show a placeholder instead of crashing.

## How to Test

### Step 1: Clear Cache and Reload
1. Open the page in your browser
2. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Open browser console: `F12` → Console tab

### Step 2: Open the Market Research Modal
1. Click the market research button on the search page
2. Check console for Lottie loading logs (should see `[LottieAnimation]` messages)

### Step 3: Fill Out the Form
Fill in test data:
```
I need a quiet space near downtown Manhattan, weekly from Monday to Friday.
Contact me at test@gmail.com or (415) 555-5555
```

### Step 4: Submit and Check Logs
Click Submit and look for these console logs:

**Expected Success Logs:**
```
[AiSignupMarketReport] ========== SIGNUP REQUEST ==========
[AiSignupMarketReport] URL: https://app.split.lease/version-test/api/1.1/wf/ai-signup-guest
[AiSignupMarketReport] Payload: {
  "email": "test@gmail.com",
  "phone": "(415) 555-5555",
  "text inputted": "I need a quiet space near downtown Manhattan..."
}
[AiSignupMarketReport] =====================================
[AiSignupMarketReport] Response status: 200 OK
[AiSignupMarketReport] ========== SUCCESS RESPONSE ==========
[AiSignupMarketReport] Full response: { ... }
[AiSignupMarketReport] =====================================
```

**If You See an Error:**
```
[AiSignupMarketReport] ========== ERROR RESPONSE ==========
[AiSignupMarketReport] Status: 400
[AiSignupMarketReport] Status Text: Bad Request
[AiSignupMarketReport] Response Body: { detailed error }
[AiSignupMarketReport] ====================================
```

## Possible Issues and Solutions

### Issue 1: No `[AiSignupMarketReport]` Logs at All
**Symptoms**: Click submit but don't see any signup-related logs in console

**Cause**: JavaScript error preventing the submit function from running

**Solution**:
1. Check console for ANY error messages
2. Look for errors before clicking submit
3. Check Network tab for failed requests

### Issue 2: Still Getting 400 Error
**Symptoms**: See logs with "Status: 400"

**Cause**: Bubble.io workflow is rejecting the request

**Possible reasons**:
1. **Wrong parameter names**: Check that Bubble expects `email`, `phone`, and `text inputted`
2. **API key expired**: The key might have been revoked
3. **Workflow not enabled**: The workflow might be disabled in Bubble
4. **CORS issue**: Though unlikely since it's the same domain

**Solution**:
1. Copy the exact error response from the logs
2. Check the Bubble.io workflow configuration
3. Verify the workflow parameters match exactly
4. Check if the workflow is enabled and published

### Issue 3: Lottie Animation Errors
**Symptoms**: See `[LottieAnimation]` errors but signup works

**Cause**: The `.lottie` file format needs special handling

**Solution**: This is now handled gracefully - the animation will show a placeholder instead of crashing. No action needed.

## Next Steps Based on Results

### If Signup Works:
1. ✅ Test with different data
2. ✅ Test the auto-submit flow (perfect email + phone in first field)
3. ✅ Test the manual flow (imperfect data, shows contact form)
4. ✅ Verify you receive the email/notification

### If Signup Still Fails:
1. Share the EXACT error logs from the console
2. Include the full `[AiSignupMarketReport] ========== ERROR RESPONSE ==========` section
3. Check Bubble.io workflow logs to see if the request even reaches it
4. Verify the API key hasn't been revoked

## Quick Debugging Commands

Open console and run these to test the API directly:

```javascript
// Test 1: Check if the API endpoint is reachable
fetch('https://app.split.lease/version-test/api/1.1/wf/ai-signup-guest', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 5dbb448f9a6bbb043cb56ac16b8de109',
  },
  body: JSON.stringify({
    email: 'test@example.com',
    phone: '4155555555',
    'text inputted': 'Test message'
  })
})
.then(r => console.log('Status:', r.status, r.statusText))
.catch(e => console.error('Error:', e));
```

## File Changes Made

**Modified**: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`

**Changes**:
1. Lines 104-183: Enhanced `submitSignup` function with detailed logging
2. Lines 187-248: Fixed `LottieAnimation` component to handle `.lottie` files gracefully

**No other files modified**

## Environment Variables (Optional)

For better practice (but not required for immediate fix), you can add to your `.env`:
```env
VITE_BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1
VITE_BUBBLE_API_KEY=5dbb448f9a6bbb043cb56ac16b8de109
```

However, the current fix works without these - they're hardcoded as fallback values.
