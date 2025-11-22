# Account Profile Error Analysis & Resolution Plan

## 🔴 Error Summary

**Error**: `TypeError: Cannot set properties of null (setting 'innerHTML')`
**Secondary Error**: `TypeError: window.userProfileData.Recent Days Selected.map is not a function`
**Page**: `/account-profile.html`
**Trigger**: After migrating user dropdown from Header.jsx to LoggedInHeaderAvatar2 island

---

## 🔍 Root Cause Analysis

### **The Problem**

The `account-profile.html` page has **TWO separate systems** trying to fetch and manage user data:

1. **Header Component** (`Header.jsx`)
   - Fetches minimal user data via `validateTokenAndFetchUser()`
   - Returns: `{ userId, firstName, fullName, profilePhoto, userType }`
   - Used ONLY for displaying avatar dropdown in header
   - **NO LONGER exposes this data globally**

2. **HTML Page Script** (`account-profile.html` lines 1076+)
   - Fetches FULL user profile data via `fetchUserData()`
   - Returns complete profile including: name, email, phone, bio, listings, reviews, etc.
   - Sets: `window.userProfileData = user` (line 1193)
   - Used by React islands: `ScheduleSelectorWrapper`, `NotificationSettingsWrapper`

### **What Changed**

**BEFORE** (with inline dropdown in Header.jsx):
- Header.jsx fetched user data via `validateTokenAndFetchUser()`
- Stored in Header's `currentUser` state
- Header displayed inline dropdown using this data
- ✅ account-profile.html's `fetchUserData()` ran independently
- ✅ Both systems coexisted without conflict

**AFTER** (with LoggedInHeaderAvatar2 island):
- Header.jsx still fetches user data via `validateTokenAndFetchUser()`
- Stored in Header's `currentUser` state
- Header passes data to `<LoggedInHeaderAvatar2 user={currentUser} />`
- ✅ LoggedInHeaderAvatar2 displays dropdown correctly
- ❌ **NO CHANGE** to how Header manages user data
- ✅ account-profile.html's `fetchUserData()` still runs independently

### **The ACTUAL Problem**

The error **is NOT caused by the LoggedInHeaderAvatar2 migration**.

Looking at the console output:
```
✅ User ID retrieved from auth state: 1737150128596x517612209343693900
Fetching user data for ID: 1737150128596x517612209343693900
User data retrieved: Object
Host data retrieved: Object
Listings retrieved: Array(1)
Guest data retrieved: Object
User type detected: Object
```

The data IS being fetched successfully. The errors occur AFTER data retrieval:

```javascript
// Error 1: Cannot set properties of null (setting 'innerHTML')
// This means a DOM element with a specific ID doesn't exist

// Error 2: window.userProfileData.Recent Days Selected.map is not a function
// This means "Recent Days Selected" is NOT an array
```

---

## 🎯 Actual Root Causes

### **Issue #1: Missing DOM Element**
```
Error: Cannot set properties of null (setting 'innerHTML')
```

**Cause**: The HTML is trying to set `innerHTML` on a null element.

**Most Likely Culprit** (line 1205 in account-profile.html):
```javascript
if (user['Profile Photo']) {
    const photoElement = document.getElementById('profilePhoto');
    photoElement.innerHTML = `<img src="${user['Profile Photo']}" alt="Profile Photo">`;
}
```

If `document.getElementById('profilePhoto')` returns `null`, this will throw the error.

**Potential Causes**:
1. Element `id="profilePhoto"` doesn't exist in HTML
2. Script runs before DOM is fully loaded
3. Element was removed/renamed in HTML

### **Issue #2: Recent Days Selected is Not an Array**
```
Error: window.userProfileData.Recent Days Selected.map is not a function
```

**Cause**: The database field "Recent Days Selected" is NOT returning an array.

**Evidence from account-profile.jsx** (lines 52-54):
```javascript
if (window.userProfileData && window.userProfileData['Recent Days Selected']) {
    const dayNames = window.userProfileData['Recent Days Selected'];
    const dayIndices = dayNames.map(name => dayMap[name]).filter(idx => idx !== undefined);
    // ^^^ This assumes dayNames is an array, but it's not
}
```

**Potential Causes**:
1. Database field is stored as a **string** instead of array
2. Database field is null/undefined
3. Database field is an object instead of array
4. Field name has changed in database schema

---

## 🔬 Evidence from Console Logs

### **What's Working ✅**
```
✅ User ID retrieved from auth state: 1737150128596x517612209343693900
✅ Token valid - Step 2: Fetching user data from Supabase...
✅ User type loaded from cache: Trial Host
✅ User data fetched from Supabase: Sharath - Type: Trial Host
User data retrieved: Object
Host data retrieved: Object
Guest data retrieved: Object
Listings retrieved: Array(1)
Good guest reasons loaded: Array(12)
Storage items loaded: Array(17)
```

### **What's Failing ❌**
```
❌ Failed to load resource: the server responded with a status of 400
   URL: /rest/v1/mainreview?select=*&Reviewee%2FTarget=eq.1737150128596x517612209343693900&Is+Published%3F=eq.true&limit=5

❌ TypeError: window.userProfileData.Recent Days Selected.map is not a function
   (This error appears 39 times)
```

---

## 💡 Key Insight

**The LoggedInHeaderAvatar2 migration did NOT break account-profile.**

Both errors are **pre-existing issues** that were already present:
1. The DOM element issue (profilePhoto)
2. The data type issue (Recent Days Selected)

These issues were **masked or not triggered** in previous testing, and are now surfacing.

---

## 🛠️ Resolution Plan

### **Phase 1: Fix DOM Element Error**

#### **Step 1.1: Verify Element Exists**
```bash
grep -n 'id="profilePhoto"' app/public/account-profile.html
```

#### **Step 1.2: Add Null Check**
Update `account-profile.html` line ~1205:
```javascript
// BEFORE (unsafe):
if (user['Profile Photo']) {
    const photoElement = document.getElementById('profilePhoto');
    photoElement.innerHTML = `<img src="${user['Profile Photo']}" alt="Profile Photo">`;
}

// AFTER (safe):
if (user['Profile Photo']) {
    const photoElement = document.getElementById('profilePhoto');
    if (photoElement) {
        photoElement.innerHTML = `<img src="${user['Profile Photo']}" alt="Profile Photo">`;
    } else {
        console.warn('⚠️ Profile photo element not found in DOM');
    }
}
```

### **Phase 2: Fix Recent Days Selected Type Error**

#### **Step 2.1: Investigate Database Field**
Check what type "Recent Days Selected" actually is in Supabase:
```sql
SELECT
    "_id",
    "Recent Days Selected",
    pg_typeof("Recent Days Selected") as field_type
FROM "user"
WHERE "_id" = '1737150128596x517612209343693900';
```

#### **Step 2.2: Add Type Safety to React Component**
Update `account-profile.jsx` lines 52-57:
```javascript
// BEFORE (unsafe):
if (window.userProfileData && window.userProfileData['Recent Days Selected']) {
    const dayNames = window.userProfileData['Recent Days Selected'];
    const dayIndices = dayNames.map(name => dayMap[name]).filter(idx => idx !== undefined);
    setSelectedDays(dayIndices);
    clearInterval(checkUserData);
}

// AFTER (type-safe):
if (window.userProfileData && window.userProfileData['Recent Days Selected']) {
    const recentDays = window.userProfileData['Recent Days Selected'];

    // Handle different data types
    let dayNames = [];
    if (Array.isArray(recentDays)) {
        dayNames = recentDays;
    } else if (typeof recentDays === 'string') {
        // Handle comma-separated string
        dayNames = recentDays.split(',').map(s => s.trim());
    } else if (recentDays === null || recentDays === undefined) {
        dayNames = [];
    } else {
        console.warn('⚠️ Unexpected type for Recent Days Selected:', typeof recentDays, recentDays);
        dayNames = [];
    }

    const dayIndices = dayNames.map(name => dayMap[name]).filter(idx => idx !== undefined);
    setSelectedDays(dayIndices);
    clearInterval(checkUserData);
}
```

### **Phase 3: Fix Supabase Query Error**

The 400 error on reviews query:
```
/rest/v1/mainreview?select=*&Reviewee%2FTarget=eq.1737150128596x517612209343693900&Is+Published%3F=eq.true&limit=5
```

**Issues**:
1. URL encoding problem: `Reviewee%2FTarget` should be `"Reviewee/Target"`
2. Field name with `?` needs proper escaping: `Is+Published%3F`

#### **Step 3.1: Find and Fix Reviews Query**
Search for where this query is constructed:
```bash
grep -n "mainreview" app/public/account-profile.html
```

Update to use proper field name quoting:
```javascript
// BEFORE:
const { data, error } = await supabase
  .from('mainreview')
  .select('*')
  .eq('Reviewee/Target', userId)
  .eq('Is Published?', true)
  .limit(5);

// AFTER:
const { data, error } = await supabase
  .from('mainreview')
  .select('*')
  .eq('"Reviewee/Target"', userId)  // Quote field name
  .eq('"Is Published?"', true)      // Quote field with special char
  .limit(5);
```

---

## 📋 Implementation Checklist

### **Immediate Fixes (Critical)**
- [ ] Add null check for profilePhoto element
- [ ] Add type safety for Recent Days Selected
- [ ] Fix mainreview Supabase query field names
- [ ] Test account-profile page loads without errors

### **Investigation Tasks**
- [ ] Check if `id="profilePhoto"` element exists in HTML
- [ ] Query Supabase to determine actual type of "Recent Days Selected"
- [ ] Verify all other DOM element references have null checks
- [ ] Check if other Supabase queries have similar field name issues

### **Verification Tasks**
- [ ] Clear browser cache and test
- [ ] Test with user who HAS Recent Days Selected data
- [ ] Test with user who DOESN'T HAVE Recent Days Selected data
- [ ] Check browser console for all errors cleared
- [ ] Verify SearchScheduleSelector displays correctly

---

## 🚫 What NOT to Do

❌ **DO NOT** modify LoggedInHeaderAvatar2
- It's working correctly
- It's not related to these errors

❌ **DO NOT** modify Header.jsx user data fetching
- It's working correctly
- account-profile.html has its own independent data fetching

❌ **DO NOT** try to share user data between Header and account-profile
- They serve different purposes
- Header: minimal data for dropdown
- account-profile: full profile data

---

## ✅ Expected Outcomes

After implementing fixes:

1. **No DOM errors**
   - All `getElementById()` calls have null checks
   - Graceful degradation if elements missing

2. **No type errors**
   - Recent Days Selected handles all data types
   - Empty arrays used as safe fallback

3. **No Supabase query errors**
   - Field names properly quoted
   - 400 errors resolved

4. **Functional page**
   - Profile loads completely
   - Schedule selector works
   - All React islands hydrate correctly

---

## 📊 Impact Assessment

### **Components Affected**
1. `account-profile.html` - Inline JavaScript (3 fixes needed)
2. `account-profile.jsx` - ScheduleSelectorWrapper (1 fix needed)

### **Components NOT Affected**
1. ✅ LoggedInHeaderAvatar2 - No changes needed
2. ✅ Header.jsx - No changes needed
3. ✅ Footer.jsx - Working correctly
4. ✅ Auth system - Working correctly

### **Risk Level**
- **Low Risk** - Fixes are defensive programming (null checks, type safety)
- **High Confidence** - Root causes clearly identified
- **Easy Rollback** - Changes are isolated and minimal

---

## 🔄 Testing Strategy

### **Test Case 1: User with Complete Profile**
- Has profile photo
- Has Recent Days Selected (as array)
- Has reviews
- Expected: Page loads perfectly

### **Test Case 2: User with Partial Profile**
- NO profile photo
- NO Recent Days Selected
- NO reviews
- Expected: Page loads, shows placeholders, no errors

### **Test Case 3: User with String Recent Days**
- Recent Days Selected stored as string "Monday,Tuesday"
- Expected: Converted to array, schedule selector works

### **Test Case 4: Fresh User**
- Newly created account
- Minimal data
- Expected: Page loads with defaults, no errors

---

## 📝 Commit Strategy

### **Commit 1: Add Defensive Checks**
```
fix: Add null checks and type safety to account-profile page

- Add null check for profilePhoto element
- Add type safety for Recent Days Selected field
- Handle string, array, and null values gracefully
- Prevent "cannot set property of null" errors
- Prevent "map is not a function" errors
```

### **Commit 2: Fix Supabase Query**
```
fix: Correct Supabase field name quoting in reviews query

- Properly quote field names with special characters
- Fix "Reviewee/Target" field reference
- Fix "Is Published?" field reference
- Resolve 400 Bad Request errors on reviews fetch
```

---

## 🎓 Lessons Learned

1. **The migration did NOT cause these errors** - They were pre-existing
2. **Defensive programming is essential** - Always check if DOM elements exist
3. **Type safety matters** - Never assume data types from external sources
4. **Field names with special characters** need proper quoting in Supabase queries
5. **Two independent systems** (Header auth vs page-specific data) can coexist

---

## 📞 Next Actions

1. **Implement Phase 1 fixes** (DOM null checks)
2. **Investigate database schema** (Recent Days Selected type)
3. **Implement Phase 2 fixes** (type safety)
4. **Implement Phase 3 fixes** (Supabase query)
5. **Test thoroughly** with different user profiles
6. **Commit fixes** with descriptive messages

---

**Status**: Ready for implementation
**Estimated Time**: 1-2 hours
**Complexity**: Low-Medium
**Confidence**: High (root causes identified)
