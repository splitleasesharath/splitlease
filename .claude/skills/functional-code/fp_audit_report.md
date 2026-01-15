# Functional Programming Audit Report

**Total Violations:** 17

## Summary by Severity

- 🔴 **High:** 17
- 🟡 **Medium:** 0
- 🟢 **Low:** 0

## Summary by Principle

- **DECLARATIVE STYLE:** 3 violations
- **EFFECTS AT EDGES:** 5 violations
- **IMMUTABILITY:** 9 violations

---

## DECLARATIVE STYLE

**3 violations**

### 🔴 calculators\scheduling\calculateCheckInOutDays.js:59

**Type:** Imperative Loop

**Description:** Imperative loop found (consider map/filter/reduce)

**Current Code:**
```javascript
for (let i = 1; i < sorted.length; i++) {
```

**Suggested Fix:**
Replace with map/filter/reduce or other declarative array methods

**Rationale:** Declarative array methods (map/filter/reduce) are more expressive and less error-prone than imperative loops.

---

### 🔴 rules\scheduling\isScheduleContiguous.js:64

**Type:** Imperative Loop

**Description:** Imperative loop found (consider map/filter/reduce)

**Current Code:**
```javascript
for (let i = 1; i < sorted.length; i++) {
```

**Suggested Fix:**
Replace with map/filter/reduce or other declarative array methods

**Rationale:** Declarative array methods (map/filter/reduce) are more expressive and less error-prone than imperative loops.

---

### 🔴 rules\scheduling\isScheduleContiguous.js:95

**Type:** Imperative Loop

**Description:** Imperative loop found (consider map/filter/reduce)

**Current Code:**
```javascript
for (let i = minNotSelected; i <= maxNotSelected; i++) {
```

**Suggested Fix:**
Replace with map/filter/reduce or other declarative array methods

**Rationale:** Declarative array methods (map/filter/reduce) are more expressive and less error-prone than imperative loops.

---

## EFFECTS AT EDGES

**5 violations**

### 🔴 processors\listing\extractListingCoordinates.js:46

**Type:** Io In Core

**Description:** I/O operation found in core business logic

**Current Code:**
```javascript
console.error(
```

**Suggested Fix:**
Move I/O to workflow/handler layer. Pass data as parameters instead.

**Rationale:** Pure business logic (calculators/rules/processors) should not perform I/O. This makes testing harder and violates Functional Core principle.

---

### 🔴 processors\listing\extractListingCoordinates.js:62

**Type:** Io In Core

**Description:** I/O operation found in core business logic

**Current Code:**
```javascript
console.error('❌ extractListingCoordinates: Failed to parse Location - Address:', {
```

**Suggested Fix:**
Move I/O to workflow/handler layer. Pass data as parameters instead.

**Rationale:** Pure business logic (calculators/rules/processors) should not perform I/O. This makes testing harder and violates Functional Core principle.

---

### 🔴 processors\listing\extractListingCoordinates.js:98

**Type:** Io In Core

**Description:** I/O operation found in core business logic

**Current Code:**
```javascript
console.warn('⚠️ extractListingCoordinates: No valid coordinates found for listing:', {
```

**Suggested Fix:**
Move I/O to workflow/handler layer. Pass data as parameters instead.

**Rationale:** Pure business logic (calculators/rules/processors) should not perform I/O. This makes testing harder and violates Functional Core principle.

---

### 🔴 processors\user\processUserData.js:58

**Type:** Io In Core

**Description:** I/O operation found in core business logic

**Current Code:**
```javascript
console.warn(`processUserData: User ${rawUser._id} has no name fields, using default`)
```

**Suggested Fix:**
Move I/O to workflow/handler layer. Pass data as parameters instead.

**Rationale:** Pure business logic (calculators/rules/processors) should not perform I/O. This makes testing harder and violates Functional Core principle.

---

### 🔴 rules\proposals\proposalRules.js:306

**Type:** Io In Core

**Description:** I/O operation found in core business logic

**Current Code:**
```javascript
console.warn('[getCancellationReasonOptions] Cache empty, using fallback values');
```

**Suggested Fix:**
Move I/O to workflow/handler layer. Pass data as parameters instead.

**Rationale:** Pure business logic (calculators/rules/processors) should not perform I/O. This makes testing harder and violates Functional Core principle.

---

## IMMUTABILITY

**9 violations**

### 🔴 calculators\scheduling\calculateCheckInOutDays.js:50

**Type:** Mutating Method

**Description:** Using mutating array sort/reverse

**Current Code:**
```javascript
const sorted = [...selectedDays].sort((a, b) => a - b)
```

**Suggested Fix:**
Use toSorted() or toReversed(), or [...arr].sort()

**Rationale:** sort() and reverse() mutate the original array. Use immutable alternatives.

---

### 🔴 calculators\scheduling\calculateNextAvailableCheckIn.js:54

**Type:** Mutating Method

**Description:** Using mutating array sort/reverse

**Current Code:**
```javascript
const sortedDays = [...selectedDayIndices].sort((a, b) => a - b)
```

**Suggested Fix:**
Use toSorted() or toReversed(), or [...arr].sort()

**Rationale:** sort() and reverse() mutate the original array. Use immutable alternatives.

---

### 🔴 rules\scheduling\isScheduleContiguous.js:55

**Type:** Mutating Method

**Description:** Using mutating array sort/reverse

**Current Code:**
```javascript
const sorted = [...selectedDayIndices].sort((a, b) => a - b)
```

**Suggested Fix:**
Use toSorted() or toReversed(), or [...arr].sort()

**Rationale:** sort() and reverse() mutate the original array. Use immutable alternatives.

---

### 🔴 rules\scheduling\isScheduleContiguous.js:96

**Type:** Mutating Method

**Description:** Using mutating array method

**Current Code:**
```javascript
expectedNotSelected.push(i)
```

**Suggested Fix:**
Use spread operator or immutable methods: [...arr, item] instead of arr.push(item)

**Rationale:** Mutating methods modify the original array, making code harder to test and reason about.

---

### 🔴 workflows\proposals\counterofferWorkflow.js:156

**Type:** Mutating Method

**Description:** Using mutating array method

**Current Code:**
```javascript
changes.push({
```

**Suggested Fix:**
Use spread operator or immutable methods: [...arr, item] instead of arr.push(item)

**Rationale:** Mutating methods modify the original array, making code harder to test and reason about.

---

### 🔴 workflows\proposals\counterofferWorkflow.js:165

**Type:** Mutating Method

**Description:** Using mutating array method

**Current Code:**
```javascript
changes.push({
```

**Suggested Fix:**
Use spread operator or immutable methods: [...arr, item] instead of arr.push(item)

**Rationale:** Mutating methods modify the original array, making code harder to test and reason about.

---

### 🔴 workflows\proposals\counterofferWorkflow.js:174

**Type:** Mutating Method

**Description:** Using mutating array method

**Current Code:**
```javascript
changes.push({
```

**Suggested Fix:**
Use spread operator or immutable methods: [...arr, item] instead of arr.push(item)

**Rationale:** Mutating methods modify the original array, making code harder to test and reason about.

---

### 🔴 workflows\proposals\counterofferWorkflow.js:183

**Type:** Mutating Method

**Description:** Using mutating array method

**Current Code:**
```javascript
changes.push({
```

**Suggested Fix:**
Use spread operator or immutable methods: [...arr, item] instead of arr.push(item)

**Rationale:** Mutating methods modify the original array, making code harder to test and reason about.

---

### 🔴 workflows\proposals\counterofferWorkflow.js:192

**Type:** Mutating Method

**Description:** Using mutating array method

**Current Code:**
```javascript
changes.push({
```

**Suggested Fix:**
Use spread operator or immutable methods: [...arr, item] instead of arr.push(item)

**Rationale:** Mutating methods modify the original array, making code harder to test and reason about.

---

