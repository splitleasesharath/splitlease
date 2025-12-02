# Bubble Workflow API Calls Enumeration

Complete list of all Bubble.io backend workflow API endpoints used in the Split Lease application.

## Summary

**Total Unique Workflows: 9**
- Authentication workflows: 4
- Core feature workflows: 5

---

## Authentication Workflows (upgradefromstr.bubbleapps.io)

### 1. Login User
**Endpoint:** `https://upgradefromstr.bubbleapps.io/api/1.1/wf/login-user`
**Method:** POST
**Location:** `app/src/lib/auth.js:405`
**Function:** `loginUser(email, password)`
**Parameters:**
```json
{
  "email": "string",
  "password": "string"
}
```
**Response:**
```json
{
  "status": "success",
  "response": {
    "token": "string",
    "user_id": "string",
    "expires": "number"
  }
}
```

### 2. Signup User
**Endpoint:** `https://upgradefromstr.bubbleapps.io/api/1.1/wf/signup-user`
**Method:** POST
**Location:** `app/src/lib/auth.js:406`
**Function:** `signupUser(email, password, retype)`
**Parameters:**
```json
{
  "email": "string",
  "password": "string",
  "retype": "string"
}
```
**Response:**
```json
{
  "status": "success",
  "response": {
    "token": "string",
    "user_id": "string",
    "expires": "number"
  }
}
```
**Error Reasons:**
- `NOT_VALID_EMAIL`: Invalid email format
- `USED_EMAIL`: Email already registered
- `DO_NOT_MATCH`: Passwords don't match

### 3. Check Login
**Endpoint:** `https://upgradefromstr.bubbleapps.io/api/1.1/wf/check-login`
**Method:** GET/POST
**Location:** `app/src/lib/auth.js:407`
**Notes:** Currently defined but not actively used (token validation uses User Object endpoint instead)

### 4. Logout User
**Endpoint:** `https://upgradefromstr.bubbleapps.io/api/1.1/wf/logout-user`
**Method:** POST
**Location:** `app/src/lib/auth.js:408`
**Function:** `logoutUser()`
**Headers:**
```
Authorization: Bearer {token}
```

---

## Core Feature Workflows (app.split.lease)

### 5. AI Signup Guest (Market Research)
**Endpoint:** `https://app.split.lease/version-test/api/1.1/wf/ai-signup-guest`
**Method:** POST
**Location:** `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx:105`
**Constant:** `AI_SIGNUP_WORKFLOW_URL` in `app/src/lib/constants.js:24`
**Function:** `submitSignup(data)`
**Parameters:**
```json
{
  "email": "string",
  "phone": "string",
  "text inputted": "string"
}
```
**Description:** Handles AI-powered market research signup flow where users describe what they're looking for

### 6. Contact Host - Send Message
**Endpoint:** `https://app.split.lease/api/1.1/wf/core-contact-host-send-message`
**Method:** POST
**Location:** `app/src/islands/shared/ContactHostMessaging.jsx:111`
**Constant:** `BUBBLE_MESSAGING_ENDPOINT` in `app/src/lib/constants.js:23`
**Parameters:**
```json
{
  "listing_unique_id": "string",
  "sender_name": "string",
  "sender_email": "string",
  "message_body": "string"
}
```
**Description:** Sends a message from a guest/visitor to a listing host

### 7. Referral - Index Lite
**Endpoint:** `https://app.split.lease/api/1.1/wf/referral-index-lite`
**Method:** POST
**Location:** `app/src/islands/shared/Footer.jsx:46`
**Constant:** `REFERRAL_API_ENDPOINT` in `app/src/lib/constants.js:22`
**Parameters:**
```json
{
  "method": "string",
  "contact": "string"
}
```
**Description:** Handles user referrals from the footer referral form

### 8. Listing Creation in Code
**Endpoint:** `{VITE_BUBBLE_API_BASE_URL}/wf/listing_creation_in_code`
**Method:** POST
**Location:** `app/src/lib/bubbleAPI.js:122`
**Function:** `createListingInCode(listingName, userEmail)`
**Used In:** `app/src/islands/shared/CreateDuplicateListingModal/CreateDuplicateListingModal.jsx:75`
**Parameters:**
```json
{
  "listing_name": "string",
  "user_email": "string (optional)"
}
```
**Response:**
```json
{
  "response": {
    "listing_id": "string"
  }
}
```
**Description:** Creates a new listing programmatically (used for duplicating listings)

### 9. Listing Photos Section in Code
**Endpoint:** `https://app.split.lease/api/1.1/wf/listing_photos_section_in_code`
**Method:** POST
**Location:** `app/src/islands/shared/SubmitListingPhotos/SubmitListingPhotos.jsx:69`
**Content-Type:** `multipart/form-data`
**Parameters:**
```
Listing_id: string
Photos: File[] (multiple files)
```
**Description:** Uploads photos for a listing

---

## API Configuration

### Environment Variables
All workflow API calls use the following environment variables:

```bash
# Primary Bubble API configuration (used by bubbleAPI.js)
VITE_BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1
VITE_BUBBLE_API_KEY=your_api_key_here
```

### Base URL Patterns
- **Authentication:** `https://upgradefromstr.bubbleapps.io/api/1.1/wf/`
- **Core Features:** `https://app.split.lease/api/1.1/wf/`
- **Development/Test:** `https://app.split.lease/version-test/api/1.1/wf/`

---

## Utility Functions

### Generic Workflow Trigger
**Location:** `app/src/lib/bubbleAPI.js:47`

```javascript
triggerBubbleWorkflow(workflowName, parameters)
```

**Usage:**
```javascript
import { triggerBubbleWorkflow } from './lib/bubbleAPI.js';

const response = await triggerBubbleWorkflow('workflow_name', {
  param1: 'value1',
  param2: 'value2'
});
```

**Features:**
- Automatic authorization header injection
- Console logging for debugging
- Error handling for failed workflows
- Handles both 200 (with JSON) and 204 (No Content) responses

---

## Additional API Endpoints (Non-Workflow)

### Bubble Data API - User Object
**Endpoint:** `https://upgradefromstr.bubbleapps.io/api/1.1/obj/user/{user_id}`
**Method:** GET
**Location:** `app/src/lib/auth.js:617`
**Function:** `validateTokenAndFetchUser()`
**Description:** Validates authentication token and retrieves user data (not a workflow, but a Data API endpoint)

---

## Usage Patterns

### 1. Direct Fetch (Most Common)
```javascript
const response = await fetch(WORKFLOW_ENDPOINT, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${BUBBLE_API_KEY}`
  },
  body: JSON.stringify(parameters)
});
```

### 2. Via bubbleAPI.js Helper
```javascript
import { triggerBubbleWorkflow } from './lib/bubbleAPI.js';

const result = await triggerBubbleWorkflow('workflow_name', parameters);
```

### 3. Via Specialized Function
```javascript
import { createListingInCode } from './lib/bubbleAPI.js';

const result = await createListingInCode('My Listing', 'user@example.com');
```

---

## Error Handling

All workflow calls should handle:
1. **Network errors** - Connection failures
2. **HTTP errors** - Non-2xx status codes
3. **Bubble-specific errors** - `status: "error"` in response
4. **Missing configuration** - Environment variables not set

**Standard Error Response:**
```json
{
  "status": "error",
  "message": "Error description",
  "reason": "ERROR_CODE"
}
```

---

## Migration Notes

### Deprecated/Unused Workflows
- `check-login` (defined but not actively used)

### Environment-Specific URLs
- Production: `https://app.split.lease/api/1.1/wf/`
- Test/Version: `https://app.split.lease/version-test/api/1.1/wf/`
- Auth Domain: `https://upgradefromstr.bubbleapps.io/api/1.1/wf/`

---

## Security Considerations

1. **API Keys:**
   - Never commit API keys to version control
   - Use environment variables (`VITE_BUBBLE_API_KEY`)
   - Keys are exposed client-side (this is expected for Bubble workflows)

2. **Authentication:**
   - Tokens stored in localStorage
   - Token validation on protected routes
   - Automatic token cleanup on logout

3. **Data Validation:**
   - Client-side validation before API calls
   - Server-side validation in Bubble workflows
   - Sanitize user input before sending

---

## Testing

### Test Endpoints
Several workflows have test endpoints documented:
- AI Market Research: `.claude/commands/Dump/e2e/test_ai_market_research.md`
- Contact Host: `.claude/commands/Dump/e2e/test_contact_host.md`

### Test Configuration
Test pages available at:
- `app/src/islands/shared/AiSignupMarketReport/TestPage.jsx`

---

## File Locations Reference

| Workflow | Primary Implementation |
|----------|----------------------|
| Login/Signup/Logout | `app/src/lib/auth.js` |
| Generic Workflow Trigger | `app/src/lib/bubbleAPI.js` |
| AI Signup | `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx` |
| Contact Host | `app/src/islands/shared/ContactHostMessaging.jsx` |
| Referrals | `app/src/islands/shared/Footer.jsx` |
| Listing Creation | `app/src/islands/shared/CreateDuplicateListingModal/CreateDuplicateListingModal.jsx` |
| Photo Upload | `app/src/islands/shared/SubmitListingPhotos/SubmitListingPhotos.jsx` |
| Constants | `app/src/lib/constants.js` |

---

## Maintenance Checklist

When adding new Bubble workflows:
- [ ] Add endpoint constant to `app/src/lib/constants.js` (if reusable)
- [ ] Use `triggerBubbleWorkflow()` for consistency (if applicable)
- [ ] Document parameters and response format
- [ ] Add error handling
- [ ] Update this enumeration document
- [ ] Test with both success and failure scenarios
- [ ] Verify environment variable configuration

---

**Last Updated:** 2025-11-24
**Document Version:** 1.0
