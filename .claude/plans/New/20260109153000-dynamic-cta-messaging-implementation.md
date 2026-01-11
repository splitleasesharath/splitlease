# Implementation Plan: Dynamic CTA Button Handling in Messaging Page

## Overview
Implement dynamic call-to-action (CTA) button handling in the messaging page that reads CTA types from incoming splitbot messages, queries the Supabase CTA reference table, and routes users to appropriate pages/modals/state changes based on CTA type and user role (guest/host).

## Success Criteria
- [ ] CTA reference table (`os_messaging_cta`) created with all 26+ CTA types from Bubble specification
- [ ] MessageBubble component reads CTA type and renders dynamic button with correct label
- [ ] CTA click handler routes to correct destination based on CTA type and user role
- [ ] Guest-only and host-only CTAs display appropriately based on user context
- [ ] Modal-triggering CTAs open the correct modal component
- [ ] State-changing CTAs update appropriate state (e.g., disabled after action)
- [ ] Navigation CTAs redirect to correct pages with proper parameters

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/MessagingPage/components/MessageBubble.jsx` | Renders individual message with CTA button | Add dynamic CTA routing logic |
| `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js` | Page logic hook with user context | Add CTA handler, fetch CTA config |
| `app/src/islands/pages/MessagingPage/MessagingPage.jsx` | Main page component | Pass CTA handlers to MessageThread |
| `app/src/islands/pages/MessagingPage/components/MessageThread.jsx` | Renders list of messages | Pass handlers to MessageBubble |
| `supabase/functions/_shared/ctaHelpers.ts` | CTA lookup utilities | Already exists, may need extensions |
| `supabase/functions/messages/handlers/getMessages.ts` | Fetches messages with CTA data | May need to enrich CTA response |
| `app/src/styles/components/messaging.css` | Message styling | Add CTA state styles (disabled, colors) |

### Database Tables Required
| Table | Purpose | Status |
|-------|---------|--------|
| `os_messaging_cta` | CTA reference table with routing config | **NEEDS CREATION** |

### Related Documentation
- Bubble.io "Messaging - Call to Action (CTA)" option set specification
- `supabase/functions/_shared/ctaHelpers.ts` - Existing CTA helper functions

### Existing Patterns to Follow
- **Hollow Component Pattern**: MessageBubble is hollow, logic in useMessagingPageLogic
- **Action-Based Edge Functions**: Use `{ action, payload }` pattern
- **Islands Architecture**: Full page loads for navigation, modals for in-page actions

---

## Implementation Steps

### Step 1: Create CTA Reference Table Migration
**Files:** `supabase/migrations/[timestamp]_create_os_messaging_cta.sql`
**Purpose:** Create the CTA reference table with all CTA types and routing configuration

**Details:**
- Create `os_messaging_cta` table with columns:
  - `id` (bigint, primary key)
  - `name` (text, unique) - Internal identifier (snake_case)
  - `display` (text, unique) - Display name from Bubble (e.g., "View Proposal (Guest View)")
  - `button_text` (text) - Text shown on button
  - `message` (text) - Template message body
  - `action_type` (text) - 'navigate' | 'modal' | 'state_change' | 'external'
  - `guest_destination` (text) - URL/modal/action for guests
  - `host_destination` (text) - URL/modal/action for hosts
  - `destination_params` (jsonb) - Additional parameters for navigation
  - `is_proposal_cta` (boolean)
  - `is_lease_cta` (boolean)
  - `is_review_cta` (boolean)
  - `is_house_manual_cta` (boolean)
  - `visible_to_guest_only` (boolean)
  - `visible_to_host_only` (boolean)
  - `requires_proposal_id` (boolean) - Needs proposal context
  - `requires_listing_id` (boolean) - Needs listing context
  - `disabled_status_text` (text) - Text when action already taken
  - `created_at` (timestamptz)

**Validation:** Run migration locally, verify table exists with correct schema

---

### Step 2: Seed CTA Reference Data
**Files:** `supabase/migrations/[timestamp]_seed_os_messaging_cta.sql`
**Purpose:** Populate CTA table with all 26+ CTA types from Bubble specification

**Details:**
Insert records for each CTA type with routing configuration:

```sql
-- Navigation CTAs (redirect to pages)
INSERT INTO os_messaging_cta (name, display, button_text, action_type, guest_destination, host_destination, ...) VALUES
('fill_out_rental_application', 'Fill out Rental Application', 'Fill Out Application', 'navigate', '/account-profile?section=rental-application&openRentalApp=true', NULL, ...),
('view_proposal_guest', 'View Proposal (Guest View)', 'View Proposal', 'navigate', '/guest-proposals?proposalId={{proposal_id}}', NULL, ...),
('view_proposal_host', 'View Proposal (Host View)', 'View Proposal', 'navigate', NULL, '/host-proposals?proposalId={{proposal_id}}', ...),
('review_documents_guest', 'Review Documents (Guest)', 'Review Documents', 'navigate', '/documents-review?proposalId={{proposal_id}}', NULL, ...),
('review_documents_host', 'Review Documents (Host)', 'Review Documents', 'navigate', NULL, '/documents-review?proposalId={{proposal_id}}', ...),
('sign_lease_documents_guest', 'Sign Lease Documents (Guest)', 'Sign Documents', 'navigate', '/sign-lease?proposalId={{proposal_id}}', NULL, ...),
('sign_lease_documents_host', 'Sign Lease Documents (Host)', 'Sign Documents', 'navigate', NULL, '/sign-lease?proposalId={{proposal_id}}', ...),
('lease_activated_guest_view', 'Lease Activated (Guest view)', 'View Lease', 'navigate', '/guest-leases?leaseId={{lease_id}}', NULL, ...),
('lease_activated_host_view', 'Lease Activated (Host view)', 'View Lease', 'navigate', NULL, '/host-leases?leaseId={{lease_id}}', ...),

-- Modal CTAs (open modals in-page)
('see_date_change_request', 'See Date Change Request', 'View Request', 'modal', 'DateChangeRequestModal', 'DateChangeRequestModal', ...),
('view_virtual_meeting_guest', 'View Virtual Meeting (Guest View)', 'View Meeting', 'modal', 'VirtualMeetingModal', NULL, ...),
('view_virtual_meeting_host', 'View Virtual Meeting (Host View)', 'View Meeting', 'modal', NULL, 'VirtualMeetingModal', ...),
('respond_to_counter_offer', 'Respond to Counter Offer', 'Respond', 'modal', 'CounterOfferModal', NULL, ...),

-- External CTAs
('message_split_lease_agent', 'Message Split Lease Agent', 'Chat with Us', 'external', 'crisp_chat', 'crisp_chat', ...),

-- State-change CTAs (update UI state)
('host_accepted_proposal_guest_view', 'Host Accepted Proposal (Guest View)', 'View Details', 'navigate', '/guest-proposals?proposalId={{proposal_id}}', NULL, ...),
('host_accepted_proposal_host_view', 'Host Accepted Proposal (Host View)', 'View Details', 'navigate', NULL, '/host-proposals?proposalId={{proposal_id}}', ...);
```

**Full CTA List from Bubble:**
1. Fill out Rental Application
2. View Proposal (Guest View)
3. View Proposal (Host View)
4. Sign Lease Documents (Guest)
5. Sign Lease Documents (Host)
6. Review Documents (Guest)
7. Review Documents (Host)
8. See Date Change Request
9. View Virtual Meeting (Guest View)
10. View Virtual Meeting (Host View)
11. Lease Activated (Guest view)
12. Lease Activated (Host view)
13. Fill out review (Guest view)
14. Fill out review (Host view)
15. Message Split Lease Agent
16. Respond to Counter Offer
17. Host Accepted Proposal (Guest View)
18. Host Accepted Proposal (Host View)
19. View House Manual (Guest)
20. View House Manual (Host)
21. Submit Verification Documents
22. View Verification Status
23. Schedule Move-In Inspection
24. View Move-In Inspection
25. Request Maintenance
26. View Maintenance Request

**Validation:** Query table, verify all CTAs inserted correctly

---

### Step 3: Create CTA Configuration Fetcher
**Files:** `app/src/lib/ctaConfig.js`
**Purpose:** Client-side utility to fetch and cache CTA configuration

**Details:**
```javascript
/**
 * CTA Configuration Fetcher
 * Fetches CTA routing configuration from Supabase reference table
 */

import { supabase } from './supabase.js';

// Cache CTA config to avoid repeated fetches
let ctaConfigCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all CTA configurations
 * @returns {Promise<Map<string, CTAConfig>>} Map of display name to config
 */
export async function fetchCTAConfig() {
  // Return cached if still valid
  if (ctaConfigCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_TTL)) {
    return ctaConfigCache;
  }

  const { data, error } = await supabase
    .from('os_messaging_cta')
    .select('*');

  if (error) {
    console.error('[ctaConfig] Failed to fetch CTA config:', error);
    return new Map();
  }

  // Build map keyed by display name (what comes from messages)
  const configMap = new Map();
  for (const cta of data) {
    configMap.set(cta.display, cta);
    // Also map by name for flexibility
    configMap.set(cta.name, cta);
  }

  ctaConfigCache = configMap;
  cacheTimestamp = Date.now();

  return configMap;
}

/**
 * Get CTA config by display name or name
 * @param {string} ctaType - CTA display name or internal name
 * @returns {Promise<CTAConfig|null>}
 */
export async function getCTAConfig(ctaType) {
  const config = await fetchCTAConfig();
  return config.get(ctaType) || null;
}

/**
 * Build destination URL with context variables
 * @param {string} template - URL template with {{variables}}
 * @param {Object} context - Variable values (proposal_id, listing_id, etc.)
 * @returns {string} Resolved URL
 */
export function buildCTADestination(template, context) {
  if (!template) return null;

  let url = template;
  for (const [key, value] of Object.entries(context)) {
    url = url.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return url;
}
```

**Validation:** Import and call `fetchCTAConfig()`, verify returns Map with expected data

---

### Step 4: Create CTA Handler Hook
**Files:** `app/src/islands/pages/MessagingPage/useCTAHandler.js`
**Purpose:** Hook that handles CTA clicks based on type and user role

**Details:**
```javascript
/**
 * useCTAHandler Hook
 * Handles CTA button clicks with role-based routing
 */

import { useState, useCallback, useEffect } from 'react';
import { getCTAConfig, buildCTADestination } from '../../../lib/ctaConfig.js';

export function useCTAHandler({
  user,
  threadInfo,
  onOpenModal,
  onStateChange
}) {
  const [ctaConfig, setCtaConfig] = useState(new Map());
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Determine user role in current thread context
  const getUserRole = useCallback((threadInfo, user) => {
    if (!threadInfo || !user) return null;
    // Check if user is host or guest in this thread
    // This comes from thread_info returned by getMessages
    return threadInfo.is_host_in_thread ? 'host' : 'guest';
  }, []);

  // Load CTA config on mount
  useEffect(() => {
    async function loadConfig() {
      const { fetchCTAConfig } = await import('../../../lib/ctaConfig.js');
      const config = await fetchCTAConfig();
      setCtaConfig(config);
      setIsLoadingConfig(false);
    }
    loadConfig();
  }, []);

  /**
   * Handle CTA button click
   * @param {Object} callToAction - CTA data from message
   * @param {Object} messageContext - Context (proposal_id, listing_id, etc.)
   */
  const handleCTAClick = useCallback(async (callToAction, messageContext = {}) => {
    if (!callToAction?.type) {
      console.warn('[useCTAHandler] No CTA type provided');
      return;
    }

    const config = ctaConfig.get(callToAction.type);
    if (!config) {
      console.warn('[useCTAHandler] Unknown CTA type:', callToAction.type);
      // Fallback: use link if provided
      if (callToAction.link) {
        window.location.href = callToAction.link;
      }
      return;
    }

    const userRole = getUserRole(threadInfo, user);
    const { action_type, guest_destination, host_destination, destination_params } = config;

    // Get role-appropriate destination
    const destination = userRole === 'host'
      ? (host_destination || guest_destination)
      : (guest_destination || host_destination);

    if (!destination) {
      console.warn('[useCTAHandler] No destination for role:', userRole);
      return;
    }

    // Build context for URL interpolation
    const context = {
      proposal_id: messageContext.proposalId || threadInfo?.proposalId,
      listing_id: messageContext.listingId || threadInfo?.listingId,
      lease_id: messageContext.leaseId,
      user_id: user?.bubbleId,
      ...messageContext,
    };

    switch (action_type) {
      case 'navigate':
        const url = buildCTADestination(destination, context);
        if (url) {
          window.location.href = url;
        }
        break;

      case 'modal':
        if (onOpenModal) {
          onOpenModal(destination, context);
        }
        break;

      case 'external':
        handleExternalAction(destination, context);
        break;

      case 'state_change':
        if (onStateChange) {
          onStateChange(destination, context);
        }
        break;

      default:
        console.warn('[useCTAHandler] Unknown action type:', action_type);
    }
  }, [ctaConfig, threadInfo, user, getUserRole, onOpenModal, onStateChange]);

  /**
   * Handle external actions (Crisp chat, etc.)
   */
  const handleExternalAction = useCallback((action, context) => {
    switch (action) {
      case 'crisp_chat':
        // Open Crisp chat widget
        if (window.$crisp) {
          window.$crisp.push(['do', 'chat:open']);
        }
        break;
      default:
        console.warn('[useCTAHandler] Unknown external action:', action);
    }
  }, []);

  /**
   * Get button config for a CTA (text, disabled state, etc.)
   */
  const getCTAButtonConfig = useCallback((callToAction) => {
    if (!callToAction?.type) {
      return { text: 'View Details', disabled: false };
    }

    const config = ctaConfig.get(callToAction.type);
    if (!config) {
      return { text: callToAction.message || 'View Details', disabled: false };
    }

    const userRole = getUserRole(threadInfo, user);

    // Check visibility
    if (config.visible_to_guest_only && userRole !== 'guest') {
      return { hidden: true };
    }
    if (config.visible_to_host_only && userRole !== 'host') {
      return { hidden: true };
    }

    return {
      text: config.button_text || callToAction.message || 'View Details',
      disabled: false,
      disabledText: config.disabled_status_text,
    };
  }, [ctaConfig, threadInfo, user, getUserRole]);

  return {
    handleCTAClick,
    getCTAButtonConfig,
    isLoadingConfig,
  };
}
```

**Validation:** Add hook to useMessagingPageLogic, verify click handlers are called

---

### Step 5: Update useMessagingPageLogic to Include CTA Handler
**Files:** `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js`
**Purpose:** Integrate CTA handler and provide modal state management

**Details:**
- Import and use `useCTAHandler` hook
- Add modal state for CTA-triggered modals (`activeModal`, `modalContext`)
- Add `handleOpenModal` and `handleCloseModal` functions
- Update thread_info to include `is_host_in_thread` flag
- Export CTA handler functions

```javascript
// Add to imports
import { useCTAHandler } from './useCTAHandler.js';

// Add state for modals
const [activeModal, setActiveModal] = useState(null);
const [modalContext, setModalContext] = useState(null);

// Modal handlers
const handleOpenModal = useCallback((modalName, context) => {
  setActiveModal(modalName);
  setModalContext(context);
}, []);

const handleCloseModal = useCallback(() => {
  setActiveModal(null);
  setModalContext(null);
}, []);

// Use CTA handler
const { handleCTAClick, getCTAButtonConfig, isLoadingConfig } = useCTAHandler({
  user,
  threadInfo,
  onOpenModal: handleOpenModal,
  onStateChange: null, // Add state change handler if needed
});

// Export in return object
return {
  // ... existing exports
  handleCTAClick,
  getCTAButtonConfig,
  activeModal,
  modalContext,
  handleCloseModal,
};
```

**Validation:** Check that `handleCTAClick` is available in hook return

---

### Step 6: Update getMessages Handler to Include Thread Context
**Files:** `supabase/functions/messages/handlers/getMessages.ts`
**Purpose:** Include `is_host_in_thread` and proposal/listing IDs in thread_info

**Details:**
- Add `is_host_in_thread` to ThreadInfo interface
- Include `proposal_id` and `listing_id` in thread_info response

```typescript
// Update ThreadInfo interface
interface ThreadInfo {
  contact_name: string;
  contact_avatar?: string;
  property_name?: string;
  status?: string;
  status_type?: string;
  is_host_in_thread: boolean;  // ADD
  proposal_id?: string;        // ADD
  listing_id?: string;         // ADD
}

// Update return in thread_info
return {
  messages: transformedMessages,
  has_more: hasMore,
  thread_info: {
    contact_name: contactInfo.name,
    contact_avatar: contactInfo.avatar,
    property_name: propertyName,
    status: proposalStatus,
    status_type: statusType,
    is_host_in_thread: isHostInThread,  // ADD
    proposal_id: thread['Proposal'],     // ADD
    listing_id: thread['Listing'],       // ADD
  },
};
```

**Validation:** Call getMessages, verify response includes new fields

---

### Step 7: Update MessageBubble Component
**Files:** `app/src/islands/pages/MessagingPage/components/MessageBubble.jsx`
**Purpose:** Use CTA handler and render dynamic button

**Details:**
```jsx
/**
 * MessageBubble Component
 * Updated to support dynamic CTA routing
 */

export default function MessageBubble({
  message,
  onCTAClick,
  getCTAButtonConfig,
  messageContext
}) {
  const bubbleClass = message.is_outgoing
    ? 'message-bubble--outgoing'
    : 'message-bubble--incoming';

  const isSplitBot = message.sender_type === 'splitbot';

  // Get CTA button configuration
  const ctaConfig = message.call_to_action
    ? getCTAButtonConfig(message.call_to_action)
    : null;

  // Handle CTA click
  const handleClick = () => {
    if (onCTAClick && message.call_to_action) {
      onCTAClick(message.call_to_action, messageContext);
    }
  };

  // Don't render CTA if hidden for this user role
  if (ctaConfig?.hidden) {
    return (
      <div className={`message-bubble ${bubbleClass} ${isSplitBot ? 'message-bubble--splitbot' : ''}`}>
        {/* ... message content without CTA */}
      </div>
    );
  }

  return (
    <div className={`message-bubble ${bubbleClass} ${isSplitBot ? 'message-bubble--splitbot' : ''}`}>
      {/* Sender name for incoming messages */}
      {!message.is_outgoing && (
        <span className="message-bubble__sender">
          {isSplitBot ? 'Split Bot' : message.sender_name}
        </span>
      )}

      {/* Message Content */}
      <div className="message-bubble__content">
        <p className="message-bubble__text">{message.message_body}</p>

        {/* Dynamic CTA Button */}
        {message.call_to_action && ctaConfig && !ctaConfig.hidden && (
          <button
            className={`message-bubble__cta ${ctaConfig.disabled ? 'message-bubble__cta--disabled' : ''}`}
            onClick={handleClick}
            disabled={ctaConfig.disabled}
          >
            {ctaConfig.disabled ? ctaConfig.disabledText : ctaConfig.text}
          </button>
        )}

        {/* Split Bot Warning */}
        {message.split_bot_warning && (
          <div className="message-bubble__warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{message.split_bot_warning}</span>
          </div>
        )}
      </div>

      {/* Timestamp */}
      <span className="message-bubble__timestamp">
        {message.timestamp || ''}
      </span>
    </div>
  );
}
```

**Validation:** Render message with CTA, verify button shows correct text

---

### Step 8: Update MessageThread to Pass CTA Handlers
**Files:** `app/src/islands/pages/MessagingPage/components/MessageThread.jsx`
**Purpose:** Pass CTA handlers from page logic to MessageBubble

**Details:**
- Accept `onCTAClick`, `getCTAButtonConfig`, `messageContext` props
- Pass these to each MessageBubble component

```jsx
export default function MessageThread({
  messages,
  threadInfo,
  isLoading,
  onBack,
  isMobile,
  isOtherUserTyping,
  typingUserName,
  onCTAClick,          // ADD
  getCTAButtonConfig,  // ADD
}) {
  // Build message context from thread info
  const messageContext = {
    proposalId: threadInfo?.proposal_id,
    listingId: threadInfo?.listing_id,
  };

  return (
    <div className="message-thread">
      {/* ... header */}

      <div className="message-thread__messages" ref={messagesEndRef}>
        {messages.map((message) => (
          <MessageBubble
            key={message._id}
            message={message}
            onCTAClick={onCTAClick}
            getCTAButtonConfig={getCTAButtonConfig}
            messageContext={messageContext}
          />
        ))}
        {/* ... typing indicator */}
      </div>
    </div>
  );
}
```

**Validation:** Verify props flow through to MessageBubble

---

### Step 9: Update MessagingPage to Wire Up CTA Handlers and Modals
**Files:** `app/src/islands/pages/MessagingPage/MessagingPage.jsx`
**Purpose:** Connect CTA handlers and render CTA-triggered modals

**Details:**
```jsx
// Import modal components
import DateChangeRequestModal from '../../modals/DateChangeRequestModal.jsx';
import VirtualMeetingModal from '../../modals/VirtualMeetingModal.jsx';
// ... other modal imports

export default function MessagingPage() {
  const {
    // ... existing
    handleCTAClick,
    getCTAButtonConfig,
    activeModal,
    modalContext,
    handleCloseModal,
  } = useMessagingPageLogic();

  // Modal render helper
  const renderActiveModal = () => {
    if (!activeModal) return null;

    switch (activeModal) {
      case 'DateChangeRequestModal':
        return (
          <DateChangeRequestModal
            isOpen={true}
            onClose={handleCloseModal}
            proposalId={modalContext?.proposalId}
          />
        );
      case 'VirtualMeetingModal':
        return (
          <VirtualMeetingModal
            isOpen={true}
            onClose={handleCloseModal}
            proposalId={modalContext?.proposalId}
          />
        );
      case 'CounterOfferModal':
        // TODO: Import and render CounterOfferModal
        return null;
      default:
        return null;
    }
  };

  return (
    <>
      <Header />
      <main className="main-content">
        <div className="messaging-page">
          {/* ... existing content */}

          {/* Pass CTA handlers to MessageThread */}
          <MessageThread
            messages={messages}
            threadInfo={threadInfo}
            isLoading={isLoadingMessages}
            onBack={handleBackToList}
            isMobile={isMobile}
            isOtherUserTyping={isOtherUserTyping}
            typingUserName={typingUserName}
            onCTAClick={handleCTAClick}
            getCTAButtonConfig={getCTAButtonConfig}
          />
        </div>
      </main>

      {/* CTA-triggered modals */}
      {renderActiveModal()}
    </>
  );
}
```

**Validation:** Click CTA button, verify modal opens for modal-type CTAs

---

### Step 10: Add CTA Button Styling States
**Files:** `app/src/styles/components/messaging.css`
**Purpose:** Add disabled and state-specific CTA button styles

**Details:**
```css
/* CTA Button States */
.message-bubble__cta--disabled {
  background-color: #E5E5E5;
  color: #999999;
  cursor: not-allowed;
  opacity: 0.7;
}

.message-bubble__cta--disabled:hover {
  background-color: #E5E5E5;
}

/* Date Change Request status colors */
.message-bubble__cta--expired {
  background-color: #FED7D7;
  color: #C53030;
}

.message-bubble__cta--accepted {
  background-color: #C6F6D5;
  color: #276749;
}

.message-bubble__cta--rejected {
  background-color: #FED7D7;
  color: #C53030;
}

/* Review/Lease CTAs */
.message-bubble__cta--completed {
  background-color: #C6F6D5;
  color: #276749;
  cursor: default;
}
```

**Validation:** Inspect disabled CTA button styling

---

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| Unknown CTA type | Fall back to `link` if provided, otherwise log warning and do nothing |
| Missing destination for role | Use opposite role's destination if available, otherwise log warning |
| CTA config fetch fails | Return empty map, use fallback behavior |
| Modal component not found | Log warning, do nothing |
| Missing proposal/listing context | URL templating will produce empty strings, may result in invalid URLs |
| Crisp chat not loaded | Check `window.$crisp` exists before calling |

## Testing Considerations

### Unit Tests
- `useCTAHandler` hook: test routing logic for each action type
- `ctaConfig.js`: test URL template building
- `MessageBubble`: test CTA button visibility based on role

### Integration Tests
- Navigate CTA: verify page redirect with correct params
- Modal CTA: verify modal opens with correct context
- External CTA: verify Crisp chat opens

### Manual Testing Scenarios
1. Guest receives "Fill out Rental Application" CTA - navigates to rental app
2. Host receives "View Proposal (Host View)" CTA - navigates to host proposals
3. Guest clicks "See Date Change Request" - DateChangeRequestModal opens
4. Both roles click "Message Split Lease Agent" - Crisp chat opens
5. Disabled CTA shows correct "already completed" text

## Rollback Strategy

1. Remove CTA handler integration from MessagingPage
2. Revert MessageBubble to simple link-based navigation
3. Keep database table (no data loss)
4. Revert getMessages response to previous format

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| `os_messaging_cta` table | **NEEDS CREATION** | Requires Supabase migration |
| DateChangeRequestModal | May exist | Check if component exists |
| VirtualMeetingModal | May exist | Check if component exists |
| CounterOfferModal | May need creation | For counteroffer CTA |
| Crisp integration | Assumed present | Check window.$crisp availability |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CTA config fetch fails | Low | Medium | Cache and fallback handling |
| Missing modal components | Medium | Low | Graceful degradation, log warning |
| URL template produces invalid URLs | Medium | Low | Validate context before building URL |
| Breaking change to message format | Low | High | Backend sends both old and new format during transition |

---

## Files Referenced Summary

### Frontend (app/)
- `app/src/islands/pages/MessagingPage/MessagingPage.jsx`
- `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js`
- `app/src/islands/pages/MessagingPage/useCTAHandler.js` (NEW)
- `app/src/islands/pages/MessagingPage/components/MessageBubble.jsx`
- `app/src/islands/pages/MessagingPage/components/MessageThread.jsx`
- `app/src/lib/ctaConfig.js` (NEW)
- `app/src/styles/components/messaging.css`

### Backend (supabase/)
- `supabase/functions/messages/handlers/getMessages.ts`
- `supabase/functions/_shared/ctaHelpers.ts`
- `supabase/migrations/[timestamp]_create_os_messaging_cta.sql` (NEW)
- `supabase/migrations/[timestamp]_seed_os_messaging_cta.sql` (NEW)

### Modals (may need creation/update)
- `app/src/islands/modals/DateChangeRequestModal.jsx`
- `app/src/islands/modals/VirtualMeetingModal.jsx`
- `app/src/islands/modals/CounterOfferModal.jsx`

---

**PLAN VERSION**: 1.0
**CREATED**: 2026-01-09
**ESTIMATED EFFORT**: 3-4 hours
