# Rental Application Data Investigation

**Date**: 2026-01-08
**User ID Investigated**: `1751052526471x730004712227235700`
**Status**: Analysis Complete

---

## Summary

This document explains how rental application data is stored, retrieved, and displayed in the Split Lease application. It addresses concerns about:
1. Empty employment status dropdown despite step completion checkmark
2. Whether email is stored in rental application table
3. How progress/completion tracking works

---

## 1. Database Architecture

### Table: `rentalapplication`

The rental application data is stored in a Supabase table with the following fields (as defined in `get.ts` handler):

| Field Name | Type | Description |
|------------|------|-------------|
| `_id` | string | Primary key (Bubble-compatible ID) |
| `name` | string | Full name |
| `email` | string | **Email IS stored in the table** |
| `DOB` | string (nullable) | Date of birth |
| `phone number` | string (nullable) | Phone number |
| `permanent address` | jsonb (nullable) | `{ address: string }` |
| `apartment number` | string (nullable) | Apartment unit |
| `length resided` | string (nullable) | How long at current address |
| `renting` | boolean | Whether currently renting |
| `employment status` | string (nullable) | Employment status value |
| `employer name` | string (nullable) | Employer name |
| `employer phone number` | string (nullable) | Employer phone |
| `job title` | string (nullable) | Job title |
| `Monthly Income` | number (nullable) | Monthly income amount |
| `business legal name` | string (nullable) | For self-employed |
| `year business was created?` | number (nullable) | Business establishment year |
| `state business registered` | string (nullable) | Business state |
| `occupants list` | jsonb (nullable) | Array of `{ id, name, relationship }` |
| `pets` | boolean | Has pets |
| `smoking` | boolean | Is smoker |
| `parking` | boolean | Needs parking |
| `references` | string[] (nullable) | References array |
| `signature` | string (nullable) | Signature data |
| `signature (text)` | string (nullable) | Text signature |
| `submitted` | boolean | Whether application is submitted |
| `percentage % done` | number (nullable) | Progress percentage |
| File URL fields | string (nullable) | Various document URLs |

### User → Rental Application Relationship

The `user` table has a `Rental Application` field that stores the rental application `_id` as a foreign key reference.

---

## 2. Edge Function: `rental-application`

**Location**: `supabase/functions/rental-application/`

### Available Actions

| Action | Handler | Description |
|--------|---------|-------------|
| `get` | `handlers/get.ts` | Fetch existing rental application |
| `submit` | `handlers/submit.ts` | Submit new rental application |
| `upload` | `handlers/upload.ts` | Upload documents to storage |

### GET Action Flow

1. Receives `user_id` in payload
2. Detects if UUID (Supabase Auth) or alphanumeric (Bubble legacy ID)
3. Queries `user` table to find user and their `Rental Application` reference
4. If user has rental application, queries `rentalapplication` table by `_id`
5. Returns all fields from the rental application

```typescript
// Key fields returned:
const { data: rentalApp } = await supabase
  .from('rentalapplication')
  .select(`
    _id, name, email, DOB, "phone number", "permanent address",
    "apartment number", "length resided", renting, "employment status",
    "employer name", "employer phone number", "job title", "Monthly Income",
    "business legal name", "year business was created?", "state business registered",
    "occupants list", pets, smoking, parking, references, signature,
    "signature (text)", submitted, "percentage % done",
    "proof of employment", "alternate guarantee", "credit score",
    "State ID - Front", "State ID - Back", "government ID"
  `)
  .eq('_id', rentalAppId)
  .single();
```

---

## 3. Frontend Data Flow

### Modal Architecture

The rental application is now accessed via `AccountProfilePage` as a modal wizard:
- **Main Component**: `RentalApplicationWizardModal/RentalApplicationWizardModal.jsx`
- **Logic Hook**: `useRentalApplicationWizardLogic.js`
- **Field Mapper**: `RentalApplicationPage/utils/rentalApplicationFieldMapper.ts`

### Data Loading Process

When `applicationStatus === 'submitted'`, the wizard:
1. Calls the Edge Function with `action: 'get'`
2. Transforms database fields to form fields via `mapDatabaseToFormData()`
3. Loads into the local store via `loadFromDatabase()`

### Field Mapping (Database → Form)

```typescript
// From rentalApplicationFieldMapper.ts
const formData = {
  employmentStatus: db['employment status'] || '',  // <-- KEY LINE
  // ... other mappings
};
```

**Critical Finding**: The `employment status` field from database maps directly to `employmentStatus` in the form. If this field is `null` or empty string in the database, the dropdown will show "Select employment status".

---

## 4. Step Completion Logic

### How Checkmarks Appear

The `isStepComplete()` function in `useRentalApplicationWizardLogic.js` determines step completion:

```javascript
const STEP_FIELDS = {
  1: ['fullName', 'dob', 'email', 'phone'],           // Personal Info
  2: ['currentAddress', 'lengthResided', 'renting'],   // Address
  3: [],                                                // Occupants (optional)
  4: ['employmentStatus'],                              // Employment
  5: [],                                                // Requirements (optional)
  6: [],                                                // Documents (optional)
  7: ['signature'],                                     // Review & Sign
};

const isStepComplete = (stepNumber) => {
  let stepFields = [...STEP_FIELDS[stepNumber]];

  // Add conditional employment fields for step 4
  if (stepNumber === 4 && formData.employmentStatus) {
    const conditionalFields = CONDITIONAL_REQUIRED_FIELDS[formData.employmentStatus] || [];
    stepFields = [...stepFields, ...conditionalFields];
  }

  // If no required fields, step is complete if visited
  if (stepFields.length === 0) {
    return completedSteps.includes(stepNumber);
  }

  return stepFields.every(field => {
    const value = formData[field];
    return value !== undefined && value !== null && value !== '';
  });
};
```

### Completion Update Mechanism

```javascript
useEffect(() => {
  const newCompleted = [];
  for (let step = 1; step <= TOTAL_STEPS; step++) {
    if (isStepComplete(step)) {
      newCompleted.push(step);
    }
  }
  setCompletedSteps(newCompleted);
}, [formData, isStepComplete]);
```

---

## 5. Root Cause Analysis: Employment Status Issue

### Why the "Work" step shows a checkmark but dropdown shows "Select employment status"

**Possible Causes**:

1. **Database Value Mismatch**: The database stores `employment status` with a value that doesn't match the dropdown options
   - Frontend expects: `'full-time'`, `'part-time'`, `'business-owner'`, `'intern'`, `'student'`, `'unemployed'`, `'other'`
   - Database might have: Different casing, different format, or legacy Bubble values

2. **Null/Empty in Database**: The `employment status` field is `null` or empty string in the database for this user

3. **LocalStorage Override**: If the user has data in localStorage that has `employmentStatus` filled out, this would mark the step as complete, but when loading from database (for `submitted` applications), the database value overwrites localStorage

4. **Step Completion State Desync**: The `completedSteps` array might include step 4 from a previous state, but `formData.employmentStatus` is empty after database load

### Employment Status Dropdown Options

```javascript
const EMPLOYMENT_STATUS_OPTIONS = [
  { value: '', label: 'Select employment status' },
  { value: 'full-time', label: 'Full-time Employee' },
  { value: 'part-time', label: 'Part-time Employee' },
  { value: 'business-owner', label: 'Business Owner' },
  { value: 'intern', label: 'Intern' },
  { value: 'student', label: 'Student' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'other', label: 'Other' }
];
```

---

## 6. Email Storage Confirmation

**Yes, email IS stored in the rental application table.**

- Database field: `email` (string)
- Submitted via: `handleSubmit()` in Edge Function includes `email: input.email`
- Retrieved via: `get` action selects `email` field
- Mapped to form: `email: db.email || ''`

If email is empty in the rental application, the fallback chain should be:
1. Try `db.email` from rental application table
2. If empty, there is **NO automatic fallback** to user's email

**Potential Issue**: If the rental application was submitted without an email (validation should prevent this, but legacy data might exist), the email field would be empty.

---

## 7. Recommendations

### To Investigate Further

1. **Query the actual data** for user `1751052526471x730004712227235700`:
   ```sql
   -- Get user's rental application reference
   SELECT "_id", "Rental Application", email
   FROM "user"
   WHERE "_id" = '1751052526471x730004712227235700';

   -- If rental application ID exists, query it
   SELECT * FROM "rentalapplication"
   WHERE "_id" = '<rental_app_id_from_above>';
   ```

2. **Check browser localStorage** on the user's machine:
   - Key: `rentalApplicationDraft`
   - This might contain data that differs from database

3. **Compare database values** to expected dropdown values for `employment status`

### Potential Fixes

1. **Add email fallback**: When loading from database, if `db.email` is empty, fall back to user's email from the `user` table

2. **Normalize employment status**: Add a transformation layer that normalizes legacy database values to match frontend dropdown values

3. **Fix step completion desync**: The `completedSteps` state should be recalculated after database load completes, not rely on stored state

---

## 8. Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Edge Function Router | `supabase/functions/rental-application/index.ts` |
| GET Handler | `supabase/functions/rental-application/handlers/get.ts` |
| SUBMIT Handler | `supabase/functions/rental-application/handlers/submit.ts` |
| UPLOAD Handler | `supabase/functions/rental-application/handlers/upload.ts` |
| Field Mapper | `app/src/islands/pages/RentalApplicationPage/utils/rentalApplicationFieldMapper.ts` |
| Wizard Logic Hook | `app/src/islands/shared/RentalApplicationWizardModal/useRentalApplicationWizardLogic.js` |
| Employment Step UI | `app/src/islands/shared/RentalApplicationWizardModal/steps/EmploymentStep.jsx` |
| Step Indicator | `app/src/islands/shared/RentalApplicationWizardModal/StepIndicator.jsx` |
| Local Store | `app/src/islands/pages/RentalApplicationPage/store/rentalApplicationLocalStore.ts` |
