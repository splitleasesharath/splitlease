# Code Conventions

## Core Philosophy

Write code for humans first, machines second. Code is read far more often than it is written. Every line should clearly communicate intent.

## Naming Conventions

### Reveal Intent
Names should answer three questions: Why does it exist? What does it do? How is it used?

**Bad:**
```javascript
const d = new Date(); // elapsed time in days
function getData() { ... }
```

**Good:**
```javascript
const elapsedTimeInDays = daysSince(startDate);
function fetchActiveUserProfiles() { ... }
```

### Use Pronounceable Names
If you can't pronounce it, you can't discuss it intelligently.

**Bad:**
```javascript
const genymdhms = () => { ... }; // generate year-month-day-hour-minute-second
```

**Good:**
```javascript
const generateTimestamp = () => { ... };
```

### Use Searchable Names
Single-letter names and numeric constants are hard to locate. Name constants meaningfully.

**Bad:**
```javascript
if (status === 7) { ... }
for (let i = 0; i < 86400; i++) { ... }
```

**Good:**
```javascript
const STATUS_COMPLETE = 7;
const SECONDS_IN_DAY = 86400;

if (status === STATUS_COMPLETE) { ... }
for (let second = 0; second < SECONDS_IN_DAY; second++) { ... }
```

### Class and Function Names
- **Classes/Types**: Nouns or noun phrases (`User`, `AccountManager`, `AddressParser`)
- **Functions/Methods**: Verbs or verb phrases (`deletePage`, `save`, `calculateTotal`)
- **Booleans**: Predicates (`isActive`, `hasPermission`, `canEdit`)

## Functions

### Small
Functions should be small. Really small. They should do one thing, do it well, and do it only.

**Rule of thumb:** If you can extract another function with a name that's not a restatement of its implementation, then you should.

### Single Level of Abstraction
All statements in a function should be at the same level of abstraction.

**Bad - Mixed levels:**
```javascript
function renderPage(pageData) {
  const html = '<div>';  // Low level
  validatePageData(pageData);  // High level
  html += pageData.content;  // Low level
  saveToDatabase(html);  // High level
}
```

**Good - Same level:**
```javascript
function renderPage(pageData) {
  validatePageData(pageData);
  const html = buildHtml(pageData);
  persistPage(html);
}
```

### One Thing
A function should do one thing. If you can extract sections into other functions with meaningful names, the function is doing more than one thing.

### Function Arguments
- Zero arguments is ideal
- One argument is good
- Two arguments require careful consideration
- Three arguments should be avoided when possible
- More than three requires special justification

**Consider:** Use objects to reduce argument count:

```javascript
// Bad
function createUser(name, email, age, address, phone) { ... }

// Good
function createUser({ name, email, age, address, phone }) { ... }
```

### No Side Effects
Functions should not have hidden side effects. If a function modifies state, that should be clear from its name and signature.

**Bad:**
```javascript
function checkPassword(username, password) {
  const user = db.getUser(username);
  if (user.password === password) {
    session.initialize(user);  // Hidden side effect!
    return true;
  }
  return false;
}
```

**Good:**
```javascript
function isPasswordValid(username, password) {
  const user = db.getUser(username);
  return user.password === password;
}

function login(username, password) {
  if (isPasswordValid(username, password)) {
    const user = db.getUser(username);
    session.initialize(user);
    return true;
  }
  return false;
}
```

### Command Query Separation
Functions should either do something (command) or answer something (query), but not both.

## Tidy First Principles

### Make the Change Easy, Then Make the Easy Change
Before adding new behavior, restructure the code to make the change obvious and simple.

### Guard Clauses
Handle edge cases and errors first, then handle the main logic. This reduces nesting and improves readability.

**Bad:**
```javascript
function processPayment(order) {
  if (order.isValid()) {
    if (order.hasPaymentInfo()) {
      if (order.total > 0) {
        // Main logic buried here
        return chargePayment(order);
      }
    }
  }
  return null;
}
```

**Good:**
```javascript
function processPayment(order) {
  if (!order.isValid()) return null;
  if (!order.hasPaymentInfo()) return null;
  if (order.total <= 0) return null;
  
  return chargePayment(order);
}
```

### Delete Dead Code
If code isn't being used, delete it. Version control preserves history. Dead code creates confusion and maintenance burden.

### Normalize Symmetries
Similar things should look similar. If you have similar operations, structure them the same way.

**Bad:**
```javascript
function saveUser(user) { db.insert('users', user); }
function updateProduct(id, data) { return db.products.update(id, data); }
async function deleteOrder(orderId) { await db.remove('orders', orderId); }
```

**Good:**
```javascript
function saveUser(user) { return db.insert('users', user); }
function updateProduct(product) { return db.update('products', product); }
function deleteOrder(order) { return db.delete('orders', order); }
```

### Cohesion Over Coupling
Put code that changes together in the same place. Separate code that changes for different reasons.

### One Pile at a Time
When refactoring, focus on one type of improvement at a time. Don't mix structural changes with behavior changes.

**Separate commits:**
1. Rename variables for clarity
2. Extract helper functions
3. Add new feature

## Error Handling

### Use Exceptions, Not Error Codes
Exceptions separate error handling from the main logic path.

### Don't Return Null
Returning null forces callers to check for null constantly. Consider:
- Throwing an exception
- Returning a special case object (Null Object pattern)
- Returning an empty collection

**Bad:**
```javascript
function findUser(id) {
  const user = db.query(id);
  return user || null;  // Forces null checks everywhere
}

// Every caller must check
const user = findUser(id);
if (user !== null) {
  user.sendEmail();
}
```

**Good:**
```javascript
function findUser(id) {
  const user = db.query(id);
  if (!user) throw new UserNotFoundError(id);
  return user;
}

// Or use Optional pattern
function findUser(id) {
  const user = db.query(id);
  return user || createGuestUser();  // Null Object
}
```

## Comments

### Comments Should Explain Why, Not What
Code should be self-explanatory. Comments should provide context that code cannot.

**Bad:**
```javascript
// Check if user is active
if (user.status === 'active') { ... }
```

**Good:**
```javascript
// We only send notifications to active users to comply with GDPR
if (user.status === 'active') { ... }
```

### TODO Comments
Use TODO comments sparingly. They often accumulate and become noise. If something needs doing, create a task or issue instead.

### Legal Comments
Copyright and licensing information belongs at the top of files.

## Formatting

### Vertical Formatting
- Keep files small (200-500 lines max)
- Related concepts should be vertically close
- Declare variables close to their usage
- Dependent functions should be close (caller above callee)

### Horizontal Formatting
- Keep lines short (80-120 characters max)
- Use horizontal whitespace to associate strongly related things and separate weakly related things

### Indentation
Be consistent. Use your language's standard conventions.

## Data Structures vs Objects

### Objects
Hide data and expose operations on that data (methods).

### Data Structures
Expose data and have no meaningful operations.

Don't create hybrid structures (half object, half data structure). Choose one paradigm and stick with it.

## The Boy Scout Rule

**Leave the codebase cleaner than you found it.**

When you touch a file:
- Fix obvious issues you encounter
- Improve names if they're unclear
- Extract long functions
- Remove dead code

Small improvements accumulate into major codebase health gains.

## Building for Truth (Revisited)

- **No Fallback Mechanisms**: Solve the root problem, don't paper over it
- **Match Solution to Scale**: Don't over-engineer for hypothetical futures
- **Embrace Constraints**: Work with your architecture, not against it
- **Be Direct**: Simple, clear code over clever abstractions

## When to Break the Rules

These are guidelines, not laws. Break them when you have good reason, but be prepared to explain why. The goal is always clarity and maintainability.

---

*"Any fool can write code that a computer can understand. Good programmers write code that humans can understand."* — Martin Fowler

*"Make it work, make it right, make it fast."* — Kent Beck

