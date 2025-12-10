# Tech Debt: Proposal Missing Fields

**Created**: 2025-12-06
**Status**: Open
**Priority**: Medium

---

## Summary

The proposal creation flow is missing UI inputs for two fields that exist in the database:
- `guestFlexibility`
- `preferredGender`

Currently, these fields use default values in the Edge Function:
- `guestFlexibility`: "Flexible"
- `preferredGender`: "any"

---

## Affected Files

### Edge Function
- `supabase/functions/proposal/actions/create.ts` (lines 229-231)
- `supabase/functions/proposal/lib/types.ts` (lines 27-29)
- `supabase/functions/proposal/lib/validators.ts` (lines 44-58)

### Frontend
- `app/src/islands/pages/ViewSplitLeasePage.jsx` - should send these values
- `app/src/islands/shared/CreateProposalFlowV2.jsx` - should collect these from user
- `app/src/islands/shared/CreateProposalFlowV2Components/UserDetailsSection.jsx` - add UI for these fields

---

## Required Changes

### 1. Add UI Fields to UserDetailsSection.jsx

Add form fields to collect:

```jsx
// Guest Flexibility
<label>How flexible is your schedule?</label>
<select value={guestFlexibility} onChange={...}>
  <option value="Flexible">Flexible</option>
  <option value="Somewhat Flexible">Somewhat Flexible</option>
  <option value="Fixed">Fixed</option>
</select>

// Preferred Gender (for roommate situations)
<label>Preferred roommate gender (if applicable)</label>
<select value={preferredGender} onChange={...}>
  <option value="any">No preference</option>
  <option value="male">Male</option>
  <option value="female">Female</option>
</select>
```

### 2. Pass Values Through CreateProposalFlowV2

Update the proposal data passed to `onSubmit` to include these fields.

### 3. Update ViewSplitLeasePage Edge Function Payload

Add to `edgeFunctionPayload`:
```javascript
guestFlexibility: proposalData.guestFlexibility || 'Flexible',
preferredGender: proposalData.preferredGender || 'any',
```

### 4. Remove Default Values in Edge Function

Once UI is implemented, remove the fallback defaults in `create.ts`:
```typescript
// Remove these lines after UI is implemented:
const guestFlexibility = input.guestFlexibility || "Flexible";
const preferredGender = input.preferredGender || "any";

// Change to direct usage:
const guestFlexibility = input.guestFlexibility;
const preferredGender = input.preferredGender;
```

### 5. Make Fields Required in Validators

Update `validators.ts` to require these fields once UI is implemented.

---

## Database Reference

These fields map to the `proposal` table columns:
- `"Guest flexibility"` - stored as string
- `"preferred gender"` - stored as string (references `os_gender_type`)

---

## Option Set Values

### Guest Flexibility Options
- "Flexible"
- "Somewhat Flexible"
- "Fixed"

### Gender Options (os_gender_type)
- "any"
- "male"
- "female"

---

## Acceptance Criteria

- [ ] UI fields are added to CreateProposalFlowV2 UserDetailsSection
- [ ] Values are passed through to Edge Function payload
- [ ] Default values are removed from Edge Function
- [ ] Validators require these fields
- [ ] Fields are stored correctly in `proposal` table
