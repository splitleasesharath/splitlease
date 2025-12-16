# Implementation Changelog

**Plan Executed**: 20251216223000-debug-mockup-proposal-self-listing-v2.md
**Execution Date**: 2025-12-16
**Status**: Complete

## Summary

Fixed the mockup proposal creation bug in `listingService.js` where the wrong database column name was being used (`"Host Account"` instead of `"Account - Host / Landlord"`), causing the feature to silently fail. Also added a "View Your Proposals" CTA button to the success modal on SelfListingPageV2 to help hosts navigate to their proposals page after creating a listing.

## Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `app/src/lib/listingService.js` | Modified | Fixed incorrect field name in Supabase query for mockup proposal trigger |
| `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx` | Modified | Added "View Your Proposals" CTA button to success modal |

## Detailed Changes

### Fix 1: Field Name Bug in listingService.js
- **File**: `app/src/lib/listingService.js`
  - **Change 1 (Line 194)**: Updated Supabase select query from `"Host Account"` to `"Account - Host / Landlord"`
  - **Change 2 (Line 204)**: Updated property access from `userData['Host Account']` to `userData['Account - Host / Landlord']`
  - **Reason**: The `triggerMockupProposalIfFirstListing` function was using the wrong column name, causing the query to return undefined for the `hostAccountId`, which triggered the early return with warning "Missing hostAccountId or email for mockup proposal"
  - **Impact**: Mockup proposals will now be correctly created for first-time hosts when they submit a listing through SelfListingPageV2

### Fix 2: Add "View Your Proposals" CTA to Success Modal
- **File**: `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx`
  - **Change**: Added new `<a>` element with href="/host-proposals" inside the `renderSuccessModal()` function's `success-actions` div
  - **Reason**: Per plan requirements, hosts should have a direct path to view their proposals (including the newly created mockup proposal) after successfully creating a listing
  - **Impact**: After listing creation, hosts will see three CTAs: "Go to My Dashboard", "Preview Listing" (if listing ID exists), and "View Your Proposals"

## Database Changes
- None required - the Edge Function `listing/createMockupProposal` was already correctly implemented

## Edge Function Changes
- None required - no Edge Function deployment needed as the bug was in the frontend code

## Git Commits
1. `f2b7de9` - fix(listing): Correct field name for mockup proposal and add View Proposals CTA

## Verification Steps Completed
- [x] Verified correct column name "Account - Host / Landlord" matches usage in other files (auth-user/handlers/signup.ts, login.ts, validate.ts, listing/handlers/create.ts, submit.ts)
- [x] Verified route `/host-proposals` exists in routes.config.js (line 201)
- [x] Verified existing CSS classes `.btn-next` and `.btn-secondary` will correctly style the new button
- [x] Changes committed to git

## Notes & Observations
- The bug was introduced in commit `57d9f28` when the mockup proposal trigger was added to `listingService.js`
- All other code in the codebase consistently uses "Account - Host / Landlord" - this was an isolated typo
- No Edge Function redeployment is needed since the bug was entirely in the frontend code
- The plan file has been moved to `.claude/plans/Done/`
