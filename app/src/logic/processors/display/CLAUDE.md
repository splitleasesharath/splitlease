# Display Processors Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/processors/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Transform data for UI display formatting
[LAYER]: Layer 3 - Processors (format for presentation)
[PATTERN]: Take raw data, return display-ready strings

---

## ### PROCESSOR_CONTRACTS ###

### formatHostName
[PATH]: ./formatHostName.js
[INTENT]: Format host name for privacy-safe display
[SIGNATURE]: ({ fullName: string }) => string
[INPUT]:
  - fullName: string (req) - Full name of the host
[OUTPUT]: string - Formatted name (first name + last initial for multi-part names)
[THROWS]:
  - Error when fullName is not a string
  - Error when fullName is empty or whitespace
[BUSINESS_RULES]:
  - Single name: Return as-is ("John" → "John")
  - Multiple names: Return "FirstName L." ("John Smith" → "John S.")
  - Privacy: Never expose full last name in public contexts
[EXAMPLE]:
  - `formatHostName({ fullName: 'John Smith' })` => "John S."
  - `formatHostName({ fullName: 'John' })` => "John"
  - `formatHostName({ fullName: 'Mary Jane Watson' })` => "Mary W."
[DEPENDS_ON]: None (pure function)

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Use for all public host name displays (listing cards, profiles)
[RULE_2]: Never show full last name in guest-facing UI
[RULE_3]: Use full name internally (admin, host's own dashboard)

---

## ### COMMON_PATTERNS ###

### Host Profile Display
```javascript
import { formatHostName } from 'logic/processors/display/formatHostName'

function HostCard({ host }) {
  const displayName = formatHostName({ fullName: host.fullName })

  return (
    <div className="host-card">
      <span className="host-name">{displayName}</span>
    </div>
  )
}
```

---

## ### DEPENDENCIES ###

[LOCAL]: None
[EXTERNAL]: None
[EXPORTS]: formatHostName

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: Throws error on invalid input
[PURE]: No side effects, deterministic output
[PRIVACY]: Designed for privacy protection

---

**FILE_COUNT**: 1
**EXPORTS_COUNT**: 1
