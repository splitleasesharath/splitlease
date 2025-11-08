# E2E Test: Contact Host Messaging

## Test ID
`test_contact_host`

## User Story
As a user interested in a specific property, I want to send a message to the host through a contact form so that I can inquire about availability, ask questions, or express interest in booking.

## Prerequisites
- Application server running on http://localhost:8000
- At least 1 listing card visible on the page
- Bubble.io API configured with valid endpoint and API key
- Contact Host React component loaded (`components/ContactHost/contact-host-messaging.js`)

## Test Steps

### Step 1: Load Page and Locate Listing
**Action**: Navigate to http://localhost:8000 and wait for listings to load
**Verify**:
- At least 1 listing card is visible
- Each listing has a "Contact Host" button
**Screenshot**: Capture listings with Contact Host buttons as `01_listings_with_contact_buttons.png`

### Step 2: Open Contact Host Modal
**Action**: Click the "Contact Host" button on the first listing card
**Verify**:
- Modal/dialog opens overlaying the page
- Modal contains a message form
- Modal shows property details (title, address, or image)
- Modal has a close button (X) in top corner
- Page content behind modal is dimmed/blurred
**Screenshot**: Capture opened modal as `02_contact_modal_opened.png`

### Step 3: Verify Form Fields
**Action**: Inspect the contact form fields
**Verify**:
- "Name" text input field is present
- "Email" text input field is present
- "Phone Number" text input field is present (optional)
- "Message" textarea is present
- "Send Message" submit button is present
- All required fields are marked (asterisk or "required" indicator)
**Screenshot**: Capture form structure as `03_contact_form_fields.png`

### Step 4: Test Form Validation - Empty Submission
**Action**:
1. Leave all fields empty
2. Click "Send Message" button
**Verify**:
- Form does not submit
- Validation errors appear for required fields
- Error messages are clear (e.g., "Name is required", "Email is required")
- Fields with errors are highlighted (red border or similar)
- No API request is made (check network tab)
**Screenshot**: Capture validation errors as `04_validation_errors.png`

### Step 5: Test Email Validation
**Action**:
1. Fill in Name field: "John Doe"
2. Fill in Email field with invalid email: "notanemail"
3. Fill in Message: "I'm interested in this property"
4. Click "Send Message" button
**Verify**:
- Form does not submit
- Email validation error appears (e.g., "Please enter a valid email address")
- Email field is highlighted as invalid
- Other fields remain filled (no data loss)
**Screenshot**: Capture email validation error as `05_invalid_email.png`

### Step 6: Fill Form With Valid Data
**Action**:
1. Clear and refill Name field: "Jane Smith"
2. Fill in Email field: "jane.smith@example.com"
3. Fill in Phone field: "555-1234" (optional)
4. Fill in Message: "Hi, I'm interested in renting this space from Mon-Fri. Is it available starting next month? Can I schedule a viewing? Thanks!"
**Verify**:
- All fields accept input correctly
- No validation errors appear
- Character counter updates for message field (if exists)
- Send button becomes enabled (if disabled before)
**Screenshot**: Capture completed form as `06_form_filled_valid.png`

### Step 7: Submit Message
**Action**: Click "Send Message" button
**Verify**:
- Button shows loading state (spinner, "Sending...", or disabled)
- Form fields become disabled during submission
- No console errors appear
**Screenshot**: Capture loading state as `07_message_sending.png`

### Step 8: Verify Success State
**Action**: Wait for submission to complete (up to 5 seconds)
**Verify**:
- Success message appears (e.g., "Message sent successfully!")
- Success message is visually distinct (green background, checkmark icon)
- Form either clears or modal closes automatically after 2-3 seconds
- If modal closes, user returns to listing page
**Screenshot**: Capture success message as `08_message_success.png`

### Step 9: Verify Message Was Sent
**Action**: Check browser developer tools Network tab
**Verify**:
- POST request made to Bubble.io messaging endpoint
- Request payload contains:
  - Guest name: "Jane Smith"
  - Guest email: "jane.smith@example.com"
  - Phone: "555-1234"
  - Message text
  - Listing ID or property reference
- Response status is 200 OK
- Response indicates success
**Screenshot**: Capture network request details as `09_network_request.png`

### Step 10: Test Modal Close Functionality
**Action**:
1. Open Contact Host modal again on a different listing
2. Start filling form but don't submit
3. Click the X (close) button or click outside modal
**Verify**:
- Modal closes immediately
- User returns to listing page
- No form submission occurs
- No API requests made
**Screenshot**: Capture closed modal (back to listings) as `10_modal_closed.png`

### Step 11: Test Multiple Listings
**Action**:
1. Open Contact Host modal on second listing card
2. Verify form opens
3. Close modal
4. Open Contact Host modal on third listing card
**Verify**:
- Each modal correctly references its respective listing
- Property details in modal match the listing card clicked
- Form works consistently across different listings
**Screenshot**: Capture modal for different listing as `11_different_listing_modal.png`

### Step 12: Test Error Handling - Network Failure
**Action**:
1. Open browser DevTools
2. Set network throttling to "Offline"
3. Fill contact form with valid data
4. Submit form
**Verify**:
- Form shows loading state
- After timeout (5-10 seconds), error message appears
- Error message is user-friendly (e.g., "Failed to send message. Please check your connection and try again.")
- Form data is preserved (not lost)
- User can retry submission
**Screenshot**: Capture network error state as `12_network_error.png`

## Success Criteria
- ✅ Contact Host button is visible on all listing cards
- ✅ Modal opens correctly when button is clicked
- ✅ Form validates required fields before submission
- ✅ Email validation works correctly
- ✅ Form submits successfully with valid data
- ✅ Success message displays after submission
- ✅ API request is made to correct endpoint with proper payload
- ✅ Modal closes properly (X button and outside click)
- ✅ Form works consistently across different listings
- ✅ Error handling works for network failures
- ✅ No console errors during entire flow
- ✅ Form data is not lost during validation errors

## Expected Results
Users can successfully contact property hosts through a well-designed modal form with proper validation, loading states, success feedback, and error handling.

## Test Data Requirements
- At least 3 listings visible on page for testing multiple modals
- Valid Bubble.io API endpoint configured
- Network connectivity for successful submission test

## Failure Scenarios
- **Modal doesn't open**: Check React component initialization in `contact-host-messaging.js`
- **Form doesn't submit**: Verify Bubble.io API key in `config.local.js`
- **Validation not working**: Check form validation logic in ContactHost component
- **API request fails**: Check Bubble.io endpoint URL and CORS settings
- **Modal shows wrong property**: Verify listing ID is passed correctly to modal

## Performance Expectations
- Modal should open within 100ms
- Form validation should be instant (client-side)
- Submission should complete within 3 seconds on normal connection
- Success message should appear within 500ms of API response

## API Integration Details
**Endpoint**: `https://app.split.lease/api/1.1/wf/core-contact-host-send-message`

**Expected Request Payload**:
```json
{
  "guest_name": "Jane Smith",
  "guest_email": "jane.smith@example.com",
  "guest_phone": "555-1234",
  "message": "Message text here...",
  "listing_id": "1234567890",
  "property_title": "Property Title"
}
```

**Expected Response** (200 OK):
```json
{
  "status": "success",
  "message": "Message sent successfully"
}
```

## Notes
This is a critical conversion feature - users interested in properties need a reliable way to contact hosts. Any friction here directly impacts business metrics. The form should be intuitive, fast, and error-tolerant.

The Contact Host component is a React Island, so proper integration with listing cards (vanilla JS) is essential.
