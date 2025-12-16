# Implementation Changelog

**Plan Executed**: 20251216210000-cleanup-account-host-mockup-proposal.md
**Execution Date**: 2025-12-16
**Status**: Complete

## Summary

Removed the `account-host` table dependency from the mockup proposal creation flow. The Edge Function now resolves the host user ID directly from the listing's `Host / Landlord` field, handling both legacy listings (where this field contains `account_host._id`) and new listings (where it contains `user._id` directly). The frontend no longer queries or passes `hostAccountId`.

## Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/functions/listing/handlers/createMockupProposal.ts` | Modified | Removed hostAccountId from interface, added Step 2.5 host resolution logic |
| `supabase/functions/listing/index.ts` | Modified | Updated type assertion to remove hostAccountId |
| `app/src/lib/listingService.js` | Modified | Removed Account - Host / Landlord query and hostAccountId from payload |

## Detailed Changes

### Phase 1: Edge Function Updates

#### File: `supabase/functions/listing/handlers/createMockupProposal.ts`

**Change 1: Updated payload interface (lines 27-31)**
- Removed `hostAccountId: string` from `CreateMockupProposalPayload` interface
- Interface now only requires: `listingId`, `hostUserId`, `hostEmail`

**Change 2: Updated ListingData interface (line 47)**
- Added `'Host / Landlord'?: string` to interface to support fetching this field

**Change 3: Updated listing SELECT query (line 365)**
- Added `"Host / Landlord"` to the listing fetch query

**Change 4: Updated destructuring (line 319)**
- Changed from `const { listingId, hostAccountId, hostUserId, hostEmail } = payload`
- To `const { listingId, hostUserId, hostEmail } = payload`
- Removed `Host Account` logging line

**Change 5: Added Step 2.5 - Host Resolution Logic (lines 395-434)**
- New logic block added after Step 2 (listing data fetch)
- Declares `resolvedHostUserId` initialized with passed `hostUserId`
- Extracts `hostLandlordId` from listing's `Host / Landlord` field
- If `hostLandlordId` exists:
  - First checks if it exists in `user` table (new listing pattern)
  - If found, uses it as `resolvedHostUserId`
  - If not found, looks up in `account_host` table for `User` field (legacy pattern)
  - If found in account_host, uses `accountHost.User` as `resolvedHostUserId`
- Logs the final resolved host user ID

**Change 6: Updated proposal data (line 530)**
- Changed `'Host - Account': hostAccountId` to `'Host - Account': resolvedHostUserId`

**Change 7: Updated Step 9 - Host User Lookup (lines 620-647)**
- Changed `.eq('_id', hostUserId)` to `.eq('_id', resolvedHostUserId)` (line 623)
- Changed `.eq('_id', hostUserId)` to `.eq('_id', resolvedHostUserId)` in update query (line 638)
- Changed `addUserProposal(supabase, hostUserId, ...)` to `addUserProposal(supabase, resolvedHostUserId, ...)` (line 647)

#### File: `supabase/functions/listing/index.ts`

**Change 1: Updated type assertion (lines 146-150)**
- Removed `hostAccountId: string` from the type assertion for createMockupProposal action
- Type assertion now matches the updated interface

### Phase 2: Frontend Updates

#### File: `app/src/lib/listingService.js`

**Change 1: Simplified SELECT query (line 194)**
- Changed from `.select('_id, email, Listings, "Account - Host / Landlord"')`
- To `.select('_id, email, Listings')`

**Change 2: Removed hostAccountId extraction (lines 203-204)**
- Removed line: `const hostAccountId = userData['Account - Host / Landlord'];`
- Now only extracts `listings` and `userEmail`

**Change 3: Simplified validation (lines 212-215)**
- Changed from `if (!hostAccountId || !userEmail)`
- To `if (!userEmail)`
- Updated warning message to only mention missing email

**Change 4: Simplified payload (lines 230-234)**
- Removed `hostAccountId: hostAccountId` from payload
- Payload now only includes: `listingId`, `hostUserId`, `hostEmail`

## Database Changes

None - No schema modifications required. This cleanup only removes dependencies, doesn't add new fields.

## Edge Function Changes

- **listing**: Updated `createMockupProposal` handler to resolve host user ID from listing data instead of receiving it from frontend

## Git Commits

1. `c9d9800` - refactor(mockup-proposal): Remove account-host dependency from mockup proposal flow
2. `b5921c2` - docs: Move completed cleanup plan to Done directory

## Verification Steps Completed

- [x] TypeScript interface updated (hostAccountId removed)
- [x] Edge Function handler updated with host resolution logic
- [x] Edge Function index.ts type assertion updated
- [x] Frontend listingService.js updated to remove Account - Host / Landlord query
- [x] Frontend payload simplified to exclude hostAccountId
- [x] All changes committed to git
- [x] Plan file moved to Done directory

## Notes & Observations

1. **Backward Compatibility**: The Edge Function now handles both listing patterns:
   - New listings: `Host / Landlord` contains `user._id` directly
   - Legacy listings: `Host / Landlord` contains `account_host._id` (resolved via account_host table lookup)

2. **Default Behavior**: If `Host / Landlord` is not set on the listing, the function falls back to the `hostUserId` passed in the payload, ensuring the mockup proposal can still be created.

3. **Manual Deployment Required**: The Edge Function changes require manual deployment:
   ```bash
   supabase functions deploy listing
   ```

4. **Proposal Host - Account Field**: After this change, new mockup proposals will store `user._id` in the `Host - Account` field instead of `account_host._id`. This aligns with the ongoing migration away from the `account_host` table.

## Recommendations for Follow-up

1. **Deploy Edge Function**: Run `supabase functions deploy listing` to deploy the updated Edge Function
2. **Test Flow**: Create a new listing through self-listing to verify mockup proposal creation works
3. **Monitor Logs**: Check Edge Function logs for the new Step 2.5 resolution logging to confirm both legacy and new listing patterns are handled correctly
