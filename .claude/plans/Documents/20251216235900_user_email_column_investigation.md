# User Email Storage Investigation Report

**Date**: 2025-12-16 23:59:00
**Issue**: User with email 'ikercasillas@test.com' exists but query not finding them
**Status**: RESOLVED - Root Cause Identified

---

## Executive Summary

The user with email 'ikercasillas@test.com' **DOES exist** in the database but was not being found because the email is stored in a different column than expected.

---

## Database Investigation Results

### 1. Direct Email Column Search
```sql
SELECT _id, email, "Created Date"
FROM public.user
WHERE email = 'ikercasillas@test.com';
```
**Result**: No records found (empty array)

### 2. Case-Insensitive Search
```sql
SELECT _id, email, "Created Date"
FROM public.user
WHERE LOWER(email) = LOWER('ikercasillas@test.com');
```
**Result**: No records found (empty array)

### 3. Pattern Match Search (SUCCESSFUL)
```sql
SELECT _id, email, "email as text", "Name - Full", "Created Date"
FROM public.user
WHERE email LIKE '%casillas%' OR "email as text" LIKE '%casillas%';
```
**Result**: **FOUND!**
```json
{
  "_id": "1764872273875x945857300898573600",
  "email": null,
  "email as text": "ikercasillas@test.com",
  "Name - Full": "iker casillas",
  "Created Date": "2025-12-04 18:17:55.203+00"
}
```

---

## Root Cause Analysis

### The Problem
The user table has **TWO email-related columns**:
1. `email` (text type)
2. `email as text` (text type)

For user 'ikercasillas@test.com':
- The `email` column is **NULL**
- The `email as text` column contains **"ikercasillas@test.com"**

### Why This Matters
Any queries searching only the `email` column will fail to find this user, even though they exist in the database.

---

## User Details

| Field | Value |
|-------|-------|
| **User ID** | 1764872273875x945857300898573600 |
| **Email (column)** | NULL |
| **Email as text (column)** | ikercasillas@test.com |
| **Full Name** | iker casillas |
| **Created Date** | 2025-12-04 18:17:55.203 UTC |
| **Account Age** | 12 days old |

---

## Recent User Activity Context

The 5 most recently created users in the system:
1. fakeemailtestone1@gmail.com (Created Date: NULL)
2. philfoden@test.com (2025-12-16 15:16:03)
3. splitleasesharath+1216@gmail.com (2025-12-16 12:16:43)
4. silviamartinez@test.com (2025-12-15 00:36:31)
5. silviarodriguez@test.com (2025-12-14 22:36:03)

---

## Implications

### For Queries
All user lookup queries must check BOTH columns:
```sql
-- CORRECT approach
WHERE email = 'target@email.com' OR "email as text" = 'target@email.com'

-- INCORRECT approach (will miss users like ikercasillas@test.com)
WHERE email = 'target@email.com'
```

### For Application Code
Any authentication, user lookup, or email validation logic must account for this dual-column structure.

### Data Consistency Issue
This reveals a potential data consistency problem:
- Why are some users stored in `email` column and others in `email as text`?
- Is this intentional or a bug in the user creation flow?
- Should these columns be consolidated?

---

## Recommendations

1. **Immediate Fix**: Update all user lookup queries to check both `email` AND `email as text` columns

2. **Data Audit**: Investigate how many users have:
   - Email in `email` column only
   - Email in `email as text` column only
   - Email in both columns
   - Email in neither column

3. **Schema Review**: Consider consolidating these columns or documenting why both exist

4. **Application Review**: Audit all code paths that create users to ensure consistent email storage

---

## Related Files

The following files likely interact with user email lookups and should be reviewed:
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\auth.js` - Authentication logic
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\supabase.js` - Supabase client
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\*` - Edge Functions that query users by email
- Any user signup/registration flows

---

**Investigation completed**: 2025-12-16 23:59:00
**Investigator**: Claude Code Agent
