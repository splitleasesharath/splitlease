# Migration Plan: Contact Host Messaging to Native Supabase Messages Edge Function

**Plan ID**: 20251216143000-migrate-contact-host-messaging
**Classification**: CLEANUP
**Priority**: HIGH
**Created**: 2025-12-16

---

## 1. Executive Summary

### What is Being Cleaned Up
Migrate the Contact Host messaging functionality from the legacy `bubble-proxy` Edge Function (which routes through Bubble.io's backend) to the native Supabase `messages` Edge Function (which stores messages directly in Supabase database).

### Why This Migration
- **Remove Bubble Dependency**: The current flow routes messages through Bubble.io workflows, which is legacy infrastructure being phased out
- **Native Supabase Storage**: Messages will be stored in Supabase's `thread` and `_message` tables
- **Real-time Ready**: Native messages can leverage Supabase Realtime for instant message delivery
- **Consistent Messaging UX**: Aligns Contact Host with the existing in-app messaging system

### Scope and Boundaries
- **In Scope**:
  - `ContactHostMessaging.jsx` component
  - Usage in `ViewSplitLeasePage.jsx`, `SearchPage.jsx`, `FavoriteListingsPage.jsx`, `SearchPageTest.jsx`
  - `messages` Edge Function (may need a new action for "contact host")
- **Out of Scope**:
  - Email notifications (handled separately)
  - The `bubble-proxy` Edge Function itself (other actions still use it)
  - Database schema changes

### Expected Outcomes
- Contact Host messages stored natively in Supabase
- Messages appear in host's message inbox immediately
- Thread created (or existing thread reused) for guest-host communication about a listing
- User experience remains identical (form, validation, success feedback)

---

## 2. Current State Analysis

### 2.1 Component Inventory

| File | Full Path | Purpose |
|------|-----------|---------|
| ContactHostMessaging.jsx | `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\ContactHostMessaging.jsx` | Modal component for contacting hosts |
| ViewSplitLeasePage.jsx | `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\ViewSplitLeasePage.jsx` | Primary usage - listing detail page |
| SearchPage.jsx | `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\SearchPage.jsx` | Search results page with contact modal |
| FavoriteListingsPage.jsx | `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.jsx` | Favorites page with contact modal |
| SearchPageTest.jsx | `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\SearchPageTest.jsx` | Test variant of search page |

### 2.2 Current API Flow

```
Frontend (ContactHostMessaging.jsx)
    |
    | supabase.functions.invoke('bubble-proxy', {
    |   action: 'send_message',
    |   payload: { listing_unique_id, sender_name, sender_email, message_body }
    | })
    |
    v
Edge Function (bubble-proxy/handlers/messaging.ts)
    |
    | syncService.triggerWorkflowOnly('core-contact-host-send-message', {...})
    |
    v
Bubble.io Workflow (core-contact-host-send-message)
    |
    | Creates notification, sends email to host
    v
(No message stored in Supabase)
```

### 2.3 Current Payload Structure

**From ContactHostMessaging.jsx (lines 99-111)**:
```javascript
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'send_message',
    payload: {
      listing_unique_id: listing.id,  // listing._id
      sender_name: formData.userName,
      sender_email: formData.email,
      message_body: formData.message
    }
  }
});
```

### 2.4 Current Data Available to Component

**Props received by ContactHostMessaging**:
```javascript
function ContactHostMessaging({ isOpen, onClose, listing, userEmail, userName })
```

**Listing object structure (from ViewSplitLeasePage.jsx lines 2799-2805)**:
```javascript
listing={{
  id: listing._id,
  title: listing.Name,
  host: {
    name: listing.host ? `${listing.host['Name - First']} ${listing.host['Name - Last']?.charAt(0)}.` : 'Host'
  }
}}
```

**Problem**: The current `listing.host` object does NOT include the host user's `_id` (Bubble ID). It only includes display name. We need to modify how the listing is passed to include `host._id` (the user's `_id`, not the host_account ID).

### 2.5 Target API (Messages Edge Function)

**From sendMessage.ts (lines 24-43)**:
```typescript
interface SendMessagePayload {
  thread_id?: string;          // Optional if creating new thread
  message_body: string;        // Required: Message content
  // For new thread creation:
  recipient_user_id?: string;  // Required if no thread_id
  listing_id?: string;         // Optional: Associated listing
  // Message options:
  splitbot?: boolean;          // Optional: Is Split Bot message
  call_to_action?: string;     // Optional: CTA type
  split_bot_warning?: string;  // Optional: Warning text
}
```

**Requirements for Migration**:
1. The `messages` Edge Function **requires authentication** (all actions)
2. It expects `recipient_user_id` (the host's user._id in the `user` table)
3. It can auto-create threads via `findExistingThread` + `createThread`
4. It stores messages in Supabase `_message` table

### 2.6 Database Schema Reference

**Thread Table (`thread`)**:
| Column | Type | Description |
|--------|------|-------------|
| _id | text (PK) | Thread ID |
| -Host User | text | Host's user._id |
| -Guest User | text | Guest's user._id |
| Listing | text | Listing._id (optional) |
| Proposal | text | Proposal._id (optional) |
| Thread Subject | text | Subject line |
| Created By | text | Creator's user._id |
| from logged out user? | boolean | For anonymous users |

**Message Table (`_message`)**:
| Column | Type | Description |
|--------|------|-------------|
| _id | text (PK) | Message ID |
| Associated Thread/Conversation | text | Thread._id |
| Message Body | text | Message content |
| -Originator User | text | Sender's user._id |
| -Host User | text | Host's user._id |
| -Guest User | text | Guest's user._id |
| is Split Bot | boolean | Is system message |
| is Visible to Host | boolean | Visibility flag |
| is Visible to Guest | boolean | Visibility flag |
| Not Logged In Email | text | For anonymous senders |
| Not Logged In Name | text | For anonymous senders |

---

## 3. Target State Definition

### 3.1 New API Flow

```
Frontend (ContactHostMessaging.jsx)
    |
    | AUTHENTICATED: supabase.functions.invoke('messages', {
    |   action: 'send_message',
    |   payload: { recipient_user_id, listing_id, message_body }
    | })
    |
    | UNAUTHENTICATED: supabase.functions.invoke('messages', {
    |   action: 'contact_host',  // NEW ACTION
    |   payload: { recipient_user_id, listing_id, sender_name, sender_email, message_body }
    | })
    |
    v
Edge Function (messages/index.ts)
    |
    | Route to appropriate handler
    |
    v
Handler (messages/handlers/sendMessage.ts OR new contactHost.ts)
    |
    | Create/find thread, create message in Supabase
    v
Supabase Database (thread, _message tables)
```

### 3.2 Key Decision: Authentication Requirement

**Current State**: Contact Host works for both logged-in and anonymous users (uses sender_name/sender_email from form)

**Target State Options**:

**Option A: Require Authentication** (RECOMMENDED)
- Redirect anonymous users to login first
- Use existing `send_message` action which requires auth
- Simpler implementation, no new Edge Function action needed
- Aligns with proposal workflow which already requires auth

**Option B: Support Anonymous Users**
- Create new `contact_host` action in messages Edge Function
- Store sender info in `Not Logged In Email` and `Not Logged In Name` fields
- More complex but maintains current UX for anonymous users

**Recommendation**: Option A - Require authentication. Users submitting proposals already need to login, and Contact Host is similar intent (start conversation with host).

### 3.3 Data Flow Requirements

1. **ContactHostMessaging.jsx** needs:
   - Host's user._id (NOT host_account._id)
   - Listing._id
   - User must be authenticated

2. **Parent Components** need to pass:
   - `listing.host.userId` - the host's user._id from the `user` table
   - `listing._id` - the listing ID

3. **listingDataFetcher.js** needs modification to include `userData._id` in host object

### 3.4 Success Criteria

- [x] Contact Host form submits successfully for authenticated users
- [x] Message appears in host's message thread list
- [x] Thread is created with listing association
- [x] If existing thread exists for same guest/host/listing, reuse it
- [x] Error messages displayed for validation/network failures
- [x] Anonymous users see login prompt before Contact Host form

---

## 4. File-by-File Action Plan

### File 1: `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\listingDataFetcher.js`

**Current State**: Lines 279-295 - Host data fetched but `_id` set to host_account ID

**Required Changes**:
1. Include `userData._id` in the returned hostData object
2. Add `userId` field to hostData for clarity

**Code Reference (lines 287-295)**:
```javascript
// CURRENT
} else if (userData) {
  hostData = {
    _id: userData['Account - Host / Landlord'],  // This is host_account ID
    'Name - First': userData['Name - First'],
    'Name - Last': userData['Name - Last'],
    'Profile Photo': userData['Profile Photo'],
    Email: userData['email as text']
  };
}
```

**Target Code**:
```javascript
} else if (userData) {
  hostData = {
    _id: userData['Account - Host / Landlord'],  // host_account ID (keep for backwards compat)
    userId: userData._id,  // NEW: user's Bubble ID (needed for messaging)
    'Name - First': userData['Name - First'],
    'Name - Last': userData['Name - Last'],
    'Profile Photo': userData['Profile Photo'],
    Email: userData['email as text']
  };
}
```

**Dependencies**: None

**Verification**:
- Log `listing.host` after fetch and confirm `userId` is present
- `userId` should be in format like `1234567890123x12345678901234567`

---

### File 2: `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\ContactHostMessaging.jsx`

**Current State**: 481 lines, uses `bubble-proxy` Edge Function

**Required Changes**:
1. Change Edge Function from `bubble-proxy` to `messages`
2. Change action from `send_message` to `send_message` (same name, different function)
3. Change payload structure to match messages Edge Function
4. Add authentication check before showing form
5. Update props to receive `listing.host.userId`
6. Add login prompt for unauthenticated users

**Code Reference (current, lines 86-144)**:
```javascript
const handleSubmit = async () => {
  if (!validate()) return;

  setIsSubmitting(true);
  setErrors({});

  console.log('[ContactHostMessaging] Sending message via Edge Function', {
    listing_unique_id: listing.id,
    sender_email: formData.email,
    sender_name: formData.userName,
    message_body_length: formData.message.length
  });

  try {
    // Send message via Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('bubble-proxy', {
      body: {
        action: 'send_message',
        payload: {
          listing_unique_id: listing.id,
          sender_name: formData.userName,
          sender_email: formData.email,
          message_body: formData.message
        }
      }
    });
    // ... error handling and success ...
  } catch (error) {
    // ... exception handling ...
  } finally {
    setIsSubmitting(false);
  }
};
```

**Target Code**:
```javascript
const handleSubmit = async () => {
  if (!validate()) return;

  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    setErrors({
      submit: 'Please log in to contact the host.'
    });
    // Optionally trigger login modal here
    return;
  }

  setIsSubmitting(true);
  setErrors({});

  console.log('[ContactHostMessaging] Sending message via messages Edge Function', {
    recipient_user_id: listing.host?.userId,
    listing_id: listing.id,
    message_body_length: formData.message.length
  });

  try {
    // Validate we have the host user ID
    if (!listing.host?.userId) {
      throw new Error('Host information unavailable. Please try again later.');
    }

    // Send message via native messages Edge Function
    const { data, error } = await supabase.functions.invoke('messages', {
      body: {
        action: 'send_message',
        payload: {
          recipient_user_id: listing.host.userId,  // Host's user._id
          listing_id: listing.id,                   // Listing association
          message_body: formData.message.trim()
        }
      }
    });

    if (error) {
      console.error('[ContactHostMessaging] Edge Function error:', error);
      setErrors({
        submit: error.message || 'Failed to send message. Please try again.'
      });
      return;
    }

    if (!data.success) {
      console.error('[ContactHostMessaging] Message send failed:', data.error);
      setErrors({
        submit: data.error || 'Failed to send message. Please try again.'
      });
      return;
    }

    console.log('[ContactHostMessaging] Message sent successfully', {
      thread_id: data.data?.thread_id,
      message_id: data.data?.message_id,
      is_new_thread: data.data?.is_new_thread
    });
    setMessageSent(true);
    setTimeout(() => {
      handleClose();
    }, 2000);
  } catch (error) {
    console.error('[ContactHostMessaging] Exception sending message:', error);
    setErrors({
      submit: error.message || 'Network error. Please check your connection and try again.'
    });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Additional Changes**:

1. **Remove userName and email form fields** (lines 275-370) - User is authenticated, we don't need these
2. **Simplify form to just message field**
3. **Update component signature**:
   ```javascript
   // CURRENT
   export default function ContactHostMessaging({ isOpen, onClose, listing, userEmail, userName })

   // NEW - remove userEmail, userName as they're not needed when authenticated
   export default function ContactHostMessaging({ isOpen, onClose, listing, onLoginRequired })
   ```

4. **Update validation function** (lines 62-83):
   ```javascript
   // CURRENT - validates userName, email, message
   const validate = () => {
     const newErrors = {};
     if (!formData.userName.trim()) {
       newErrors.userName = 'Name is required';
     }
     if (!formData.email.trim()) {
       newErrors.email = 'Email is required';
     } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
       newErrors.email = 'Please enter a valid email';
     }
     if (!formData.message.trim()) {
       newErrors.message = 'Message is required';
     } else if (formData.message.trim().length < 10) {
       newErrors.message = 'Message must be at least 10 characters';
     }
     setErrors(newErrors);
     return Object.keys(newErrors).length === 0;
   };

   // NEW - only validates message
   const validate = () => {
     const newErrors = {};
     if (!formData.message.trim()) {
       newErrors.message = 'Message is required';
     } else if (formData.message.trim().length < 10) {
       newErrors.message = 'Message must be at least 10 characters';
     }
     setErrors(newErrors);
     return Object.keys(newErrors).length === 0;
   };
   ```

5. **Simplify state** (lines 25-29):
   ```javascript
   // CURRENT
   const [formData, setFormData] = useState({
     userName: userName || '',
     email: userEmail || '',
     message: ''
   });

   // NEW
   const [formData, setFormData] = useState({
     message: ''
   });
   ```

**Dependencies**:
- `listingDataFetcher.js` must be updated first to provide `host.userId`

**Verification**:
- Console log should show `thread_id`, `message_id`, and `is_new_thread` on success
- Check Supabase `_message` table for new message
- Check Supabase `thread` table for new/existing thread

---

### File 3: `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\ViewSplitLeasePage.jsx`

**Current State**: Lines 2795-2808 pass simplified listing object to ContactHostMessaging

**Required Changes**:
1. Include `host.userId` in the listing prop
2. Remove `userEmail` and `userName` props (no longer needed)
3. Add `onLoginRequired` callback to trigger SignUpLoginModal

**Code Reference (current, lines 2795-2808)**:
```jsx
{showContactHostModal && listing && (
  <ContactHostMessaging
    isOpen={showContactHostModal}
    onClose={() => setShowContactHostModal(false)}
    listing={{
      id: listing._id,
      title: listing.Name,
      host: {
        name: listing.host ? `${listing.host['Name - First']} ${listing.host['Name - Last']?.charAt(0)}.` : 'Host'
      }
    }}
    userEmail={loggedInUserData?.email || ''}
    userName={loggedInUserData?.fullName || loggedInUserData?.firstName || ''}
  />
)}
```

**Target Code**:
```jsx
{showContactHostModal && listing && (
  <ContactHostMessaging
    isOpen={showContactHostModal}
    onClose={() => setShowContactHostModal(false)}
    listing={{
      id: listing._id,
      title: listing.Name,
      host: {
        userId: listing.host?.userId,  // NEW: user's Bubble ID for messaging
        name: listing.host ? `${listing.host['Name - First']} ${listing.host['Name - Last']?.charAt(0)}.` : 'Host'
      }
    }}
    onLoginRequired={() => {
      setShowContactHostModal(false);
      setShowSignUpLoginModal(true);
    }}
  />
)}
```

**Dependencies**:
- `ContactHostMessaging.jsx` must be updated to accept new props
- `listingDataFetcher.js` must provide `host.userId`

**Verification**:
- Open Contact Host modal
- If not logged in, should redirect to login
- If logged in, message should send successfully

---

### File 4: `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\SearchPage.jsx`

**Current State**: Lines 2729-2735 - uses ContactHostMessaging

**Required Changes**: Same pattern as ViewSplitLeasePage

**Code Reference (current, lines 2729-2735)**:
```jsx
<ContactHostMessaging
  isOpen={isContactModalOpen}
  onClose={handleCloseContactModal}
  listing={selectedListing}
  userEmail={currentUser?.email || ''}
  userName={currentUser?.name || ''}
/>
```

**Target Code**:
```jsx
<ContactHostMessaging
  isOpen={isContactModalOpen}
  onClose={handleCloseContactModal}
  listing={{
    id: selectedListing?.id || selectedListing?._id,
    title: selectedListing?.title || selectedListing?.Name,
    host: {
      userId: selectedListing?.host?.userId,
      name: selectedListing?.host?.name
    }
  }}
  onLoginRequired={() => {
    handleCloseContactModal();
    setShowSignUpLoginModal(true);  // Assuming this state exists
  }}
/>
```

**Note**: SearchPage transforms listings differently. Need to verify `selectedListing` structure has `host.userId`. May need to modify `transformListing` function or pass raw listing data.

**Dependencies**:
- Verify `selectedListing` structure in SearchPage
- May need to update listing transformation logic

**Verification**: Same as ViewSplitLeasePage

---

### File 5: `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.jsx`

**Current State**: Lines 1362-1367 - uses ContactHostMessaging

**Required Changes**: Same pattern as SearchPage

**Code Reference (current, lines 1362-1367)**:
```jsx
<ContactHostMessaging
  isOpen={isContactModalOpen}
  onClose={handleCloseContactModal}
  listing={selectedListing}
  userEmail={currentUser?.email || ''}
  userName={currentUser?.name || ''}
/>
```

**Target Code**:
```jsx
<ContactHostMessaging
  isOpen={isContactModalOpen}
  onClose={handleCloseContactModal}
  listing={{
    id: selectedListing?.id || selectedListing?._id,
    title: selectedListing?.title || selectedListing?.Name,
    host: {
      userId: selectedListing?.host?.userId,
      name: selectedListing?.host?.name
    }
  }}
  onLoginRequired={() => {
    handleCloseContactModal();
    // Trigger login modal - need to verify state name
  }}
/>
```

**Dependencies**: Same as SearchPage

**Verification**: Same as ViewSplitLeasePage

---

### File 6: `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\SearchPageTest.jsx`

**Current State**: Lines 1705-1710 - uses ContactHostMessaging

**Required Changes**: Same pattern, but note that SearchPageTest doesn't have currentUser

**Code Reference (current, lines 1705-1710)**:
```jsx
<ContactHostMessaging
  isOpen={isContactModalOpen}
  onClose={handleCloseContactModal}
  listing={selectedListing}
  userEmail={null}
/>
```

**Target Code**:
```jsx
<ContactHostMessaging
  isOpen={isContactModalOpen}
  onClose={handleCloseContactModal}
  listing={{
    id: selectedListing?.id || selectedListing?._id,
    title: selectedListing?.title || selectedListing?.Name,
    host: {
      userId: selectedListing?.host?.userId,
      name: selectedListing?.host?.name
    }
  }}
  onLoginRequired={() => {
    handleCloseContactModal();
    // SearchPageTest may not have login modal - just close
  }}
/>
```

**Dependencies**: Same as SearchPage

**Verification**: Test page may have limited functionality

---

### File 7: Listing Transformation Functions (if needed)

**Potential File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\transformListing.js` or inline in SearchPage

**Current State**: Search pages transform raw listing data. Need to verify if `host.userId` is preserved.

**Required Changes**: Ensure `host.userId` is included in transformed listing object

**Investigation Needed**:
1. Check how SearchPage transforms listings
2. Check if host data includes userId after transformation
3. May need to modify `transformListing` function

---

## 5. Execution Order

### Phase 1: Backend Preparation
1. **listingDataFetcher.js** - Add `userId` to host data (no breaking changes, additive only)

### Phase 2: Component Update
2. **ContactHostMessaging.jsx** - Full refactor:
   - Change Edge Function target
   - Update payload structure
   - Add auth check
   - Simplify form (remove name/email fields)
   - Update props interface

### Phase 3: Parent Component Updates
3. **ViewSplitLeasePage.jsx** - Update ContactHostMessaging props
4. **SearchPage.jsx** - Update ContactHostMessaging props
5. **FavoriteListingsPage.jsx** - Update ContactHostMessaging props
6. **SearchPageTest.jsx** - Update ContactHostMessaging props

### Phase 4: Verification & Cleanup
7. Test all Contact Host flows
8. Verify messages appear in database
9. Remove any unused code

### Safe Stopping Points
- After Phase 1: Backend ready, frontend still uses old flow
- After Phase 2: Core component ready, but parent components broken (do NOT stop here)
- After Phase 3: All pages updated and functional

---

## 6. Risk Assessment

### Potential Breaking Changes
1. **Authentication Requirement**: Anonymous users can no longer contact hosts without logging in
   - **Mitigation**: This aligns with proposal flow which already requires login
   - **UX Impact**: Minor - prompt to login

2. **Missing host.userId**: If listingDataFetcher fails to get user._id, messaging will fail
   - **Mitigation**: Add explicit error handling and user-friendly message
   - **Fallback**: None (NO FALLBACK principle) - show clear error

3. **SearchPage/FavoriteListingsPage Listing Structure**: These pages may transform listing data differently
   - **Mitigation**: Investigate listing structure before implementation
   - **Risk**: Medium - may need additional changes

### Edge Cases
1. **User not found for host_account**: Host may exist in host_account but not in user table
   - **Detection**: `userData` will be null
   - **Handling**: hostData will be null, ContactHost will show error

2. **Existing thread reuse**: User sends multiple messages about same listing
   - **Handling**: `findExistingThread` in messages handler handles this
   - **Expected Behavior**: Messages go to same thread

3. **Host and Guest are same user**: Unlikely but possible
   - **Handling**: Thread creation may behave unexpectedly
   - **Mitigation**: Add validation in Edge Function if needed

### Rollback Considerations
- If issues arise, revert ContactHostMessaging.jsx to use bubble-proxy
- listingDataFetcher.js changes are additive and don't need rollback
- Parent component changes would need to be reverted

---

## 7. Verification Checklist

### Functional Tests
- [ ] Logged-in user can send message to host from ViewSplitLeasePage
- [ ] Logged-in user can send message to host from SearchPage
- [ ] Logged-in user can send message to host from FavoriteListingsPage
- [ ] Anonymous user sees login prompt when attempting to contact host
- [ ] Message appears in Supabase `_message` table
- [ ] Thread created in Supabase `thread` table
- [ ] Thread reused for subsequent messages about same listing
- [ ] Success message displayed after sending
- [ ] Error message displayed for validation failures
- [ ] Error message displayed for network failures

### Data Verification
- [ ] `thread` record has correct `-Host User`, `-Guest User`, `Listing` fields
- [ ] `_message` record has correct `Message Body`, `-Originator User`, `Associated Thread/Conversation`
- [ ] Messages are visible to both host and guest (visibility flags)

### Edge Cases
- [ ] Contact Host when listing has no host data shows appropriate error
- [ ] Multiple messages create only one thread per guest/host/listing combo
- [ ] Very long messages (>1000 chars) handled correctly

### Definition of Done
- All functional tests pass
- All data verification checks pass
- No console errors during Contact Host flow
- Edge Function logs show successful message creation
- Code committed with clear commit message

---

## 8. Reference Appendix

### All File Paths

**Frontend Components**:
- `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\ContactHostMessaging.jsx`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\ViewSplitLeasePage.jsx`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\SearchPage.jsx`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.jsx`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\SearchPageTest.jsx`

**Data Fetching**:
- `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\listingDataFetcher.js`

**Edge Functions**:
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\messages\index.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\messages\handlers\sendMessage.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\messagingHelpers.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\bubble-proxy\handlers\messaging.ts` (legacy, reference only)

### Key Code Patterns

**Before (bubble-proxy)**:
```javascript
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'send_message',
    payload: {
      listing_unique_id: listing.id,
      sender_name: formData.userName,
      sender_email: formData.email,
      message_body: formData.message
    }
  }
});
```

**After (messages)**:
```javascript
const { data, error } = await supabase.functions.invoke('messages', {
  body: {
    action: 'send_message',
    payload: {
      recipient_user_id: listing.host.userId,  // Host's user._id
      listing_id: listing.id,                   // Listing._id
      message_body: formData.message.trim()
    }
  }
});
```

### Database Tables

**thread**:
```sql
CREATE TABLE thread (
  _id text PRIMARY KEY,
  "-Host User" text,
  "-Guest User" text,
  "Listing" text,
  "Proposal" text,
  "Thread Subject" text,
  "Created By" text,
  "Created Date" timestamptz,
  "Modified Date" timestamptz,
  "from logged out user?" boolean
);
```

**_message**:
```sql
CREATE TABLE _message (
  _id text PRIMARY KEY,
  "Associated Thread/Conversation" text REFERENCES thread(_id),
  "Message Body" text,
  "-Originator User" text,
  "-Host User" text,
  "-Guest User" text,
  "is Split Bot" boolean NOT NULL DEFAULT false,
  "is Visible to Host" boolean DEFAULT true,
  "is Visible to Guest" boolean DEFAULT true,
  "Not Logged In Email" text,
  "Not Logged In Name" text,
  "Created Date" timestamptz NOT NULL,
  "Modified Date" timestamptz NOT NULL
);
```

### Related Documentation
- `c:\Users\Split Lease\Documents\Split Lease\.claude\CLAUDE.md`
- `c:\Users\Split Lease\Documents\Split Lease\app\CLAUDE.md`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\CLAUDE.md`

---

## Implementation Notes

### Authentication Strategy
The current `messages` Edge Function REQUIRES authentication. The `send_message` action validates the user token and uses the authenticated user's ID as the sender. This is a good security model.

For Contact Host:
- User MUST be logged in
- If not logged in, show login modal
- After login, user returns to Contact Host form
- Message sent with authenticated user as sender

### No Edge Function Changes Required
The existing `send_message` action in the messages Edge Function handles all our needs:
- Creates thread if needed (via `findExistingThread` + `createThread`)
- Associates listing with thread
- Creates message with proper sender/recipient
- Database triggers handle Realtime broadcast

### UI Simplification
Since authentication is required:
- Remove Name field (use authenticated user's name)
- Remove Email field (use authenticated user's email)
- Keep only Message textarea
- Form is simpler and faster to fill

---

**Plan Status**: READY FOR EXECUTION
**Estimated Effort**: 2-3 hours
**Dependencies**: None (all infrastructure already exists)
