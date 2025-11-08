# E2E Test: AI Market Research Signup

## Test ID
`test_ai_market_research`

## User Story
As a user researching split lease options, I want to request a custom AI-generated market report by describing my needs in freeform text so that I can get personalized insights delivered to my email.

## Prerequisites
- Application server running on http://localhost:8000
- Bubble.io API configured for AI research workflow
- Lottie animation library loaded
- AI Signup modal component loaded (`js/ai-signup.js`)
- "Generate Market Report" floating button visible on map

## Test Steps

### Step 1: Load Page and Locate Entry Points
**Action**: Navigate to http://localhost:8000
**Verify**:
- Purple floating button with atom animation visible on map section (bottom-right)
- Chat widget visible in bottom-right corner with "Get Market Research" label
- Both entry points are clickable
**Screenshot**: Capture page with AI entry points as `01_ai_entry_points.png`

### Step 2: Open AI Signup Modal via Floating Button
**Action**: Click the "Generate Market Report" floating button on the map
**Verify**:
- AI Signup modal opens with overlay
- Modal shows multi-step wizard interface
- Lottie atom animation plays in modal header
- Step indicator shows "Step 1 of 3" or similar
- Page content behind modal is dimmed
**Screenshot**: Capture opened AI modal as `02_ai_modal_opened.png`

### Step 3: Verify Step 1 - Describe Your Needs
**Action**: Inspect the first step of the wizard
**Verify**:
- Large textarea is present for freeform text input
- Placeholder text provides guidance (e.g., "Tell us what you're looking for...")
- Character counter may be present (optional)
- "Next" or "Continue" button is visible
- "Cancel" or close (X) button is visible
**Screenshot**: Capture Step 1 as `03_step1_describe_needs.png`

### Step 4: Enter Freeform Description
**Action**:
Fill textarea with:
```
I'm looking for a flexible shared housing option in Brooklyn,
preferably Williamsburg or Bushwick area. I need Monday through
Thursday nights for the next 6 months while I'm working in NYC.
My budget is around $250-300 per night. I'd prefer a private room
in a shared apartment with other young professionals. Contact me
at sarah.johnson@email.com or 917-555-0123.
```
**Verify**:
- Text is accepted and displayed in textarea
- Character counter updates (if present)
- Next button becomes enabled (if disabled before)
- Text wraps properly in textarea
**Screenshot**: Capture filled description as `04_description_entered.png`

### Step 5: Proceed to Step 2 - Contact Information
**Action**: Click "Next" or "Continue" button
**Verify**:
- Modal transitions to Step 2 (smooth animation preferred)
- Step indicator updates to "Step 2 of 3"
- Email and phone fields are displayed
- If email was detected in freeform text, it's auto-filled
- If phone was detected in freeform text, it's auto-filled
- "Back" button is present to return to Step 1
**Screenshot**: Capture Step 2 with auto-filled fields as `05_step2_contact_info.png`

### Step 6: Verify Auto-Extraction and Auto-Correction
**Action**: Check the auto-filled values
**Verify**:
- Email field shows: "sarah.johnson@email.com" (correctly extracted)
- Phone field shows: "917-555-0123" (correctly extracted)
- Common typos were auto-corrected (e.g., "gmial.com" → "gmail.com")
- User can edit these fields if needed
**Screenshot**: Capture auto-extraction verification as `06_auto_extraction.png`

### Step 7: Test Email Validation
**Action**:
1. Clear email field
2. Enter invalid email: "notvalid"
3. Try to proceed to next step
**Verify**:
- Validation error appears for email field
- Error message is clear (e.g., "Please enter a valid email address")
- Cannot proceed to next step
- Phone field remains optional (not required)
**Screenshot**: Capture email validation error as `07_email_validation.png`

### Step 8: Correct Email and Proceed
**Action**:
1. Enter valid email: "sarah.johnson@example.com"
2. Verify phone: "917-555-0123"
3. Click "Next" or "Continue"
**Verify**:
- Validation passes
- Modal transitions to Step 3 (Confirmation)
- Step indicator shows "Step 3 of 3"
**Screenshot**: Capture transition to Step 3 as `08_step3_confirmation.png`

### Step 9: Verify Step 3 - Confirmation
**Action**: Review the confirmation step
**Verify**:
- Summary of request is shown:
  - User's description (truncated or full)
  - Email address where report will be sent
  - Phone number (if provided)
- "Submit Request" or "Get My Report" button is prominent
- "Back" button available to make changes
- Terms/privacy notice may be displayed
- Lottie animation continues playing
**Screenshot**: Capture confirmation step as `09_confirmation_step.png`

### Step 10: Submit AI Research Request
**Action**: Click "Submit Request" or "Get My Report" button
**Verify**:
- Button shows loading state (spinner, "Submitting...", disabled)
- Form fields become disabled during submission
- No console errors appear
**Screenshot**: Capture loading state as `10_submitting_request.png`

### Step 11: Verify Success State
**Action**: Wait for submission to complete (up to 5 seconds)
**Verify**:
- Success message appears (e.g., "Your market report is on the way!")
- Success message explains delivery timeline (e.g., "You'll receive your personalized report within 24 hours")
- Confirmation includes email address report will be sent to
- Lottie animation may show success state (checkmark animation)
- Modal either closes automatically after 3-5 seconds or shows "Close" button
**Screenshot**: Capture success message as `11_success_message.png`

### Step 12: Verify API Request
**Action**: Check browser developer tools Network tab
**Verify**:
- POST request made to Bubble.io AI research endpoint
- Request payload contains:
  - User description text
  - Email address
  - Phone number
  - Timestamp
  - Source (e.g., "search_page")
- Response status is 200 OK
- Response indicates successful queue/processing
**Screenshot**: Capture network request as `12_api_request.png`

### Step 13: Test Modal Navigation - Back Button
**Action**:
1. Open AI modal again
2. Fill Step 1 and proceed to Step 2
3. Click "Back" button
**Verify**:
- Returns to Step 1
- Description text is preserved (not lost)
- Step indicator shows "Step 1 of 3"
- Can navigate forward again
**Screenshot**: Capture back navigation as `13_back_navigation.png`

### Step 14: Test Modal Close During Process
**Action**:
1. Open AI modal
2. Fill some data in Step 1
3. Click close (X) button or click outside modal
**Verify**:
- Confirmation prompt may appear ("Are you sure you want to exit?")
- If confirmed, modal closes
- Data is not submitted
- No API requests made
- User returns to search page
**Screenshot**: Capture close confirmation as `14_close_confirmation.png`

### Step 15: Test Alternative Entry Point
**Action**:
1. Click the chat widget button in bottom-right corner
2. Observe modal behavior
**Verify**:
- Same AI Signup modal opens
- Functionality is identical to floating button entry point
- Both entry points open the same component
**Screenshot**: Capture modal from chat widget as `15_chat_widget_entry.png`

### Step 16: Test Error Handling - Network Failure
**Action**:
1. Open browser DevTools
2. Set network to "Offline"
3. Complete all steps and submit
**Verify**:
- Loading state appears
- After timeout, error message displays
- Error is user-friendly (e.g., "Unable to submit request. Please check your connection and try again.")
- Data is preserved (can retry)
- "Retry" button may be present
**Screenshot**: Capture network error as `16_network_error.png`

## Success Criteria
- ✅ Both entry points (floating button and chat widget) open modal
- ✅ Multi-step wizard progresses smoothly through 3 steps
- ✅ Freeform text input accepts large descriptions
- ✅ Email and phone are automatically extracted from description
- ✅ Email auto-correction works (gmial → gmail, etc.)
- ✅ Email validation prevents invalid submissions
- ✅ Phone field is optional
- ✅ Back/forward navigation preserves data
- ✅ Confirmation step shows accurate summary
- ✅ Submission succeeds and shows success message
- ✅ API request is made with correct payload
- ✅ Success message includes delivery timeline
- ✅ Modal can be closed at any step
- ✅ Error handling works for network failures
- ✅ Lottie animations play smoothly
- ✅ No console errors during entire flow

## Expected Results
Users can easily request AI market research through an intuitive multi-step wizard with smart auto-extraction, validation, and clear feedback throughout the process.

## Test Data Requirements
- Valid Bubble.io AI research workflow endpoint
- Lottie animation JSON files accessible
- Network connectivity for submission test

## Failure Scenarios
- **Modal doesn't open**: Check `ai-signup.js` initialization and Lottie library load
- **Auto-extraction fails**: Verify regex patterns in modal component
- **API request fails**: Check Bubble.io endpoint and API key in config
- **Animations don't play**: Verify Lottie library and JSON file URLs
- **Steps don't transition**: Check wizard state management in component

## Performance Expectations
- Modal should open within 200ms
- Step transitions should be smooth (< 300ms)
- Lottie animations should play at 24-30 fps
- Auto-extraction should be instant
- Form validation should be real-time (client-side)
- Submission should complete within 3 seconds

## API Integration Details
**Endpoint**: `https://app.split.lease/api/1.1/wf/ai-market-research-signup`

**Expected Request Payload**:
```json
{
  "description": "User's freeform text...",
  "email": "sarah.johnson@example.com",
  "phone": "917-555-0123",
  "source": "search_page",
  "timestamp": "2025-01-15T10:30:00Z",
  "metadata": {
    "current_filters": {...},
    "listings_viewed": [...]
  }
}
```

**Expected Response** (200 OK):
```json
{
  "status": "success",
  "message": "Research request queued",
  "request_id": "req_abc123",
  "estimated_delivery": "2025-01-16T10:30:00Z"
}
```

## Lottie Animation URLs
- Atom animation (white): `https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1746105302928x174581704119754800/atom%20white.json`
- Success animation (if different): TBD

## Notes
This is a lead generation feature - capturing user intent and contact info for follow-up. The experience should feel magical with smart auto-extraction and smooth animations. This differentiates Split Lease as an AI-powered platform, not just a listing directory.

The multi-step wizard reduces form abandonment by breaking complex input into manageable chunks while providing progress feedback.
