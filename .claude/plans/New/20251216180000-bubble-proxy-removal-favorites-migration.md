# Implementation Plan: Bubble-Proxy Removal and Favorites Migration to Supabase

## Overview
This plan details the removal of the `bubble-proxy` edge function from the codebase and the migration of favorites functionality from Bubble API to Supabase-native storage. The favorites feature will use the existing `junctions.user_listing_favorite` table instead of the legacy `"Favorited Listings"` JSONB field on the user table.

## Success Criteria
- [ ] bubble-proxy edge function directory is removed from codebase
- [ ] All callers updated to use alternative endpoints or graceful error handling
- [ ] FavoriteButton component works with Supabase-native favorites API
- [ ] favoritesApi.js uses new Supabase RPC functions directly
- [ ] No runtime errors when favorites features are used
- [ ] FavoriteListingsPage loads favorites from junction table
- [ ] All identified testing areas documented and verified

---

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/bubble-proxy/` | Edge function directory to remove | DELETE entire directory |
| `supabase/functions/bubble-proxy/index.ts` | Main router for bubble-proxy actions | REMOVE |
| `supabase/functions/bubble-proxy/handlers/*.ts` | Action handlers | MIGRATE or REMOVE |
| `app/src/islands/shared/FavoriteButton/FavoriteButton.jsx` | Toggle favorites UI | UPDATE to use Supabase RPC |
| `app/src/islands/pages/FavoriteListingsPage/favoritesApi.js` | API service for favorites | REWRITE to use Supabase directly |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Favorites page | MINOR updates for new API |
| `app/src/lib/bubbleAPI.js` | Legacy Bubble API wrapper | REMOVE deprecated bubble-proxy calls |
| `app/src/islands/shared/ContactHostMessaging.jsx` | Contact host modal | MIGRATE to dedicated edge function |
| `app/src/islands/shared/Footer.jsx` | Footer with referral form | MIGRATE to dedicated edge function |
| `app/src/islands/shared/ScheduleCohost/cohostService.js` | Co-host scheduling | MIGRATE to dedicated edge function |
| `supabase/functions/_shared/junctionHelpers.ts` | Junction table helpers | KEEP (already has favorites helpers) |

### Related Documentation
- `supabase/CLAUDE.md` - Edge function architecture
- `app/src/islands/pages/CLAUDE.md` - Page component patterns
- `.claude/Documentation/Pages/FAVORITE_LISTINGS_QUICK_REFERENCE.md` - Favorites feature reference

### Existing Database Assets
The following already exist and support this migration:

**Junction Table**: `junctions.user_listing_favorite`
- Columns: `user_id`, `listing_id`, `favorited_at`
- Primary key: `(user_id, listing_id)`
- Already populated via dual-write from bubble-proxy handlers

**RPC Functions** (already exist in public schema):
- `get_user_favorites(p_user_id text) -> text[]` - Returns array of listing IDs
- `is_listing_favorited(p_user_id text, p_listing_id text) -> boolean` - Check single favorite
- `update_user_favorites(p_user_id text, p_favorites jsonb) -> void` - Legacy JSONB update (can be deprecated)

**Helper Functions** (`_shared/junctionHelpers.ts`):
- `addUserListingFavorite(supabase, userId, listingId)` - Add to junction
- `removeUserListingFavorite(supabase, userId, listingId)` - Remove from junction

---

## Implementation Steps

### Phase 1: Create New Favorites Edge Function

**Step 1.1: Create New `favorites` Edge Function**
**Files:** `supabase/functions/favorites/index.ts`
**Purpose:** Dedicated endpoint for favorites operations, replacing bubble-proxy favorites handlers
**Details:**
- Create new edge function directory `supabase/functions/favorites/`
- Implement action-based routing: `toggle`, `get`, `check`
- Use Supabase directly (no Bubble API calls)
- Copy junction helper logic inline (no external handler files needed)

```typescript
// Structure
{
  action: 'toggle' | 'get' | 'check',
  payload: {
    userId: string,
    listingId?: string,  // required for toggle/check
  }
}
```

**Validation:** Test via curl/Postman with sample requests

---

**Step 1.2: Implement Toggle Action**
**Files:** `supabase/functions/favorites/index.ts`
**Purpose:** Add/remove a listing from favorites
**Details:**
- Accept `userId`, `listingId`, `action: 'add' | 'remove'`
- Write to `junctions.user_listing_favorite` table
- Return updated favorites list
- Handle idempotent operations (adding already-favorited, removing not-favorited)

**Validation:** Toggle a favorite and verify junction table update

---

**Step 1.3: Implement Get Action**
**Files:** `supabase/functions/favorites/index.ts`
**Purpose:** Get user's favorited listings with details
**Details:**
- Accept `userId`, optional pagination params
- Query junction table joined with listing table
- Return transformed listing data (same format as current getFavorites handler)
- Filter for Active listings only

**Validation:** Fetch favorites for a user and verify listing data returned

---

**Step 1.4: Implement Check Action**
**Files:** `supabase/functions/favorites/index.ts`
**Purpose:** Check if specific listing is favorited
**Details:**
- Accept `userId`, `listingId`
- Use `is_listing_favorited` RPC or direct junction query
- Return `{ isFavorited: boolean }`

**Validation:** Check favorited and non-favorited listings

---

### Phase 2: Create Dedicated Edge Functions for Other bubble-proxy Actions

The bubble-proxy currently handles these actions that need new homes:

**Step 2.1: Create `messaging` Edge Function**
**Files:** `supabase/functions/messaging/index.ts`
**Purpose:** Handle send_message action (contact host)
**Details:**
- Copy logic from `bubble-proxy/handlers/messaging.ts`
- Maintains Bubble API call (send-message-to-host workflow)
- Action: `send_message`

**Validation:** Send a test message to host

---

**Step 2.2: Create `referral` Edge Function**
**Files:** `supabase/functions/referral/index.ts`
**Purpose:** Handle submit_referral action
**Details:**
- Copy logic from `bubble-proxy/handlers/referral.ts`
- Maintains Bubble API call (submit-referral workflow)
- Requires authentication
- Action: `submit`

**Validation:** Submit a test referral

---

**Step 2.3: Create `photo-upload` Edge Function**
**Files:** `supabase/functions/photo-upload/index.ts`
**Purpose:** Handle upload_photos action
**Details:**
- Copy logic from `bubble-proxy/handlers/photos.ts`
- Maintains Bubble API call (upload-photos workflow)
- Action: `upload`

**Validation:** Upload test photos for a listing

---

**Step 2.4: Create `ai-inquiry` Edge Function** (if not already separate)
**Files:** `supabase/functions/ai-inquiry/index.ts`
**Purpose:** Handle ai_inquiry action
**Details:**
- Copy logic from `bubble-proxy/handlers/aiInquiry.ts`
- Maintains Bubble API call (ai-inquiry workflow)
- Action: `inquiry`

**Validation:** Submit a test AI inquiry

---

**Step 2.5: Migrate cohost-request Action**
**Files:** `supabase/functions/cohost/index.ts` or add to existing function
**Purpose:** Handle cohost-request actions (create, rate)
**Details:**
- NOTE: bubble-proxy does NOT currently handle cohost-request (not in allowed actions)
- This action appears to be legacy/unused in bubble-proxy
- Verify if cohostService.js actually works, or if this feature is broken
- If broken, either fix by creating dedicated endpoint or remove feature

**Validation:** Test co-host scheduling flow end-to-end

---

### Phase 3: Update Frontend Callers

**Step 3.1: Update FavoriteButton Component**
**Files:** `app/src/islands/shared/FavoriteButton/FavoriteButton.jsx`
**Purpose:** Use new favorites edge function
**Details:**
- Change from:
  ```javascript
  supabase.functions.invoke('bubble-proxy', {
    body: { action: 'toggle_favorite', payload: {...} }
  })
  ```
- To:
  ```javascript
  supabase.functions.invoke('favorites', {
    body: { action: 'toggle', payload: {...} }
  })
  ```
- Update payload structure to match new API
- Update response handling

**Validation:** Toggle favorites on SearchPage and ViewSplitLeasePage

---

**Step 3.2: Rewrite favoritesApi.js**
**Files:** `app/src/islands/pages/FavoriteListingsPage/favoritesApi.js`
**Purpose:** Use Supabase directly instead of bubble-proxy
**Details:**
- `getFavoritedListings()`: Use `supabase.functions.invoke('favorites', { action: 'get' })`
- `removeFromFavorites()`: Use `supabase.functions.invoke('favorites', { action: 'toggle', payload: { action: 'remove' } })`
- `addToFavorites()`: Use `supabase.functions.invoke('favorites', { action: 'toggle', payload: { action: 'add' } })`
- Consider using Supabase RPC directly for simpler cases

**Validation:** Load FavoriteListingsPage, add/remove favorites

---

**Step 3.3: Update ContactHostMessaging**
**Files:** `app/src/islands/shared/ContactHostMessaging.jsx`
**Purpose:** Use new messaging edge function
**Details:**
- Change `bubble-proxy` to `messaging`
- Update action from `send_message` to `send` (or keep same if new function uses same action name)

**Validation:** Send message from ViewSplitLeasePage

---

**Step 3.4: Update Footer Referral**
**Files:** `app/src/islands/shared/Footer.jsx`
**Purpose:** Use new referral edge function
**Details:**
- Change `bubble-proxy` to `referral`
- Update action from `submit_referral` to `submit`

**Validation:** Submit referral from footer form

---

**Step 3.5: Update cohostService.js**
**Files:** `app/src/islands/shared/ScheduleCohost/cohostService.js`
**Purpose:** Use new cohost edge function (or fix broken feature)
**Details:**
- Current code calls `bubble-proxy` with action `cohost-request`
- This action is NOT in bubble-proxy's allowed actions list
- Either create new cohost endpoint or investigate if feature is disabled

**Validation:** Test co-host scheduling flow

---

**Step 3.6: Update bubbleAPI.js**
**Files:** `app/src/lib/bubbleAPI.js`
**Purpose:** Remove deprecated bubble-proxy references
**Details:**
- Remove or update `createListingInCode()` - uses bubble-proxy with deprecated action
- Remove or update `getListingById()` - uses bubble-proxy with deprecated action
- Remove or update `uploadListingPhotos()` - migrate to photo-upload function
- Remove or update `submitListingFull()` - uses bubble-proxy with deprecated action
- These functions should use the dedicated `listing` edge function instead

**Validation:** Test listing creation flow in SelfListingPage

---

### Phase 4: Remove bubble-proxy Edge Function

**Step 4.1: Delete bubble-proxy Directory**
**Files:** `supabase/functions/bubble-proxy/`
**Purpose:** Remove the deprecated edge function
**Details:**
- Delete entire `supabase/functions/bubble-proxy/` directory
- Files to delete:
  - `index.ts`
  - `handlers/messaging.ts`
  - `handlers/referral.ts`
  - `handlers/photos.ts`
  - `handlers/aiInquiry.ts`
  - `handlers/favorites.ts`
  - `handlers/getFavorites.ts`
  - `handlers/parseProfile.ts`
  - `handlers/listingSync.ts`
  - `deno.json`

**Validation:** Build succeeds, no import errors

---

**Step 4.2: Update Supabase Config**
**Files:** `supabase/config.toml`
**Purpose:** Remove bubble-proxy from function list (if listed)
**Details:**
- Check if bubble-proxy is explicitly configured
- Remove any bubble-proxy specific configuration

**Validation:** `supabase functions list` shows no bubble-proxy

---

### Phase 5: Database Cleanup (Optional)

**Step 5.1: Deprecate Legacy JSONB Field**
**Files:** Database migration
**Purpose:** Stop writing to `"Favorited Listings"` on user table
**Details:**
- The junction table is now the source of truth
- `update_user_favorites` RPC can be deprecated
- Consider removing the JSONB field in a future migration
- For now, keep for backwards compatibility with Bubble

**Validation:** Verify junction table is sole data source

---

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| User not authenticated | Return 401, FavoriteButton shows login prompt via `onRequireAuth` |
| Listing doesn't exist | Return error, revert UI state |
| Duplicate favorite add | Idempotent - no error, return success |
| Remove non-existent favorite | Idempotent - no error, return success |
| Network failure | FavoriteButton reverts visual state, shows error |
| Guest user (no userId) | FavoriteButton triggers auth modal |

---

## Testing Considerations

### Unit Tests
- [ ] `favorites` edge function: toggle, get, check actions
- [ ] `messaging` edge function: send action
- [ ] `referral` edge function: submit action
- [ ] Junction helpers: add/remove operations

### Integration Tests
- [ ] FavoriteButton toggles correctly on SearchPage
- [ ] FavoriteButton toggles correctly on ViewSplitLeasePage
- [ ] FavoriteButton toggles correctly in GoogleMap info windows
- [ ] FavoriteListingsPage loads all favorites
- [ ] FavoriteListingsPage updates when favorite removed
- [ ] ContactHostMessaging sends messages successfully
- [ ] Footer referral form submits successfully
- [ ] Multiple FavoriteButtons for same listing stay in sync

### E2E Test Flows
1. **Favorite Flow**:
   - Login as guest
   - Navigate to SearchPage
   - Click heart on listing card
   - Verify heart fills
   - Navigate to FavoriteListingsPage
   - Verify listing appears
   - Click heart to unfavorite
   - Verify listing removed from page

2. **Contact Host Flow**:
   - Navigate to ViewSplitLeasePage
   - Click "Message" button
   - Fill form and submit
   - Verify success message

3. **Referral Flow**:
   - Scroll to Footer
   - Enter friend's email
   - Click submit
   - Verify success toast

### Manual Testing Checklist
- [ ] SearchPage: Favorites work for logged-in users
- [ ] SearchPage: Heart prompts login for guests
- [ ] ViewSplitLeasePage: Heart in header works
- [ ] GoogleMap: Heart in info popup works
- [ ] FavoriteListingsPage: Page loads with favorites
- [ ] FavoriteListingsPage: Remove favorite updates list
- [ ] ContactHostMessaging: Message sends successfully
- [ ] Footer: Referral submits successfully
- [ ] SelfListingPage: Photo upload works (if using photo-upload function)

---

## Rollback Strategy

If issues arise after deployment:

1. **Immediate**: Revert frontend changes, keep bubble-proxy deployed
2. **Partial**: Keep new edge functions, revert frontend to call bubble-proxy
3. **Full**: Redeploy bubble-proxy, revert all frontend changes

**Git strategy**: Implement in feature branch, squash merge after testing

---

## Dependencies & Blockers

### Prerequisites
- [ ] Supabase Edge Functions can be deployed
- [ ] Junction table `junctions.user_listing_favorite` has data integrity
- [ ] RPC functions `get_user_favorites`, `is_listing_favorited` are working

### Blockers
- None identified

### Deployment Order
1. Deploy new edge functions (`favorites`, `messaging`, `referral`, `photo-upload`)
2. Deploy frontend changes
3. Verify all flows working
4. Delete bubble-proxy (can be done later as cleanup)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Junction table missing data | Low | High | Already dual-writing; verify data before cutover |
| New edge functions have bugs | Medium | Medium | Thorough testing; keep bubble-proxy as fallback |
| Frontend regressions | Medium | Medium | Test all affected pages; feature flags if needed |
| Bubble sync breaks | Low | Medium | Only favorites moves to Supabase; other actions still call Bubble |
| Performance degradation | Low | Low | Supabase direct access should be faster than Bubble proxy |

---

## Files Referenced in This Plan

### Edge Functions (Supabase)
- `supabase/functions/bubble-proxy/index.ts` - TO REMOVE
- `supabase/functions/bubble-proxy/handlers/favorites.ts` - TO REMOVE
- `supabase/functions/bubble-proxy/handlers/getFavorites.ts` - TO REMOVE
- `supabase/functions/bubble-proxy/handlers/messaging.ts` - MIGRATE to new function
- `supabase/functions/bubble-proxy/handlers/referral.ts` - MIGRATE to new function
- `supabase/functions/bubble-proxy/handlers/photos.ts` - MIGRATE to new function
- `supabase/functions/bubble-proxy/handlers/aiInquiry.ts` - MIGRATE to new function
- `supabase/functions/bubble-proxy/handlers/parseProfile.ts` - MIGRATE to ai-parse-profile
- `supabase/functions/_shared/junctionHelpers.ts` - KEEP (used by new functions)
- `supabase/functions/_shared/bubbleSync.ts` - KEEP (used by migrated handlers)
- `supabase/functions/_shared/validation.ts` - KEEP (used by new functions)
- `supabase/functions/_shared/errors.ts` - KEEP (used by new functions)
- `supabase/functions/_shared/cors.ts` - KEEP (used by new functions)

### Frontend (React)
- `app/src/islands/shared/FavoriteButton/FavoriteButton.jsx` - UPDATE
- `app/src/islands/pages/FavoriteListingsPage/favoritesApi.js` - REWRITE
- `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` - MINOR UPDATE
- `app/src/islands/shared/ContactHostMessaging.jsx` - UPDATE
- `app/src/islands/shared/Footer.jsx` - UPDATE
- `app/src/islands/shared/ScheduleCohost/cohostService.js` - UPDATE or FIX
- `app/src/lib/bubbleAPI.js` - UPDATE (remove deprecated functions)

### Database
- Junction table: `junctions.user_listing_favorite`
- RPC: `get_user_favorites(p_user_id text)`
- RPC: `is_listing_favorited(p_user_id text, p_listing_id text)`
- RPC: `update_user_favorites(p_user_id text, p_favorites jsonb)` - DEPRECATED

### Configuration
- `supabase/config.toml` - REVIEW

---

**Plan Created**: 2025-12-16
**Estimated Effort**: 2-3 days
**Priority**: High (bubble-proxy is deleted/deprecated)
