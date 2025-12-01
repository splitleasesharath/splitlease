# AI Signup Market Report Context

**TYPE**: LEAF NODE
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: AI-powered market research report component for host onboarding
[FEATURE]: Generate personalized NYC rental market analysis during signup
[API]: Calls ai-signup-guest Edge Function

---

## ### COMPONENT_CONTRACTS ###

### AiSignupMarketReport.jsx
[PATH]: ./AiSignupMarketReport.jsx
[INTENT]: Stream AI-generated market insights with typewriter display effect
[PROPS]:
  - neighborhood: string (req) - NYC neighborhood name
  - propertyType: string (opt) - Type of property (apartment, room, etc.)
  - onComplete: () => void (opt) - Callback when generation finishes
[BEHAVIOR]:
  - Calls ai-signup-guest Edge Function
  - Streams response chunks to UI
  - Displays market insights progressively
[DEPENDS_ON]: lib/supabase
[ASYNC]: Yes (streaming)

---

### index.js
[PATH]: ./index.js
[INTENT]: Barrel export
[EXPORTS]: { AiSignupMarketReport }

---

## ### COMPONENT_FLOW ###

```
User enters neighborhood
    │
    ▼
AiSignupMarketReport mounts
    │
    ▼
Call ai-signup-guest Edge Function
    │
    ▼
Stream AI response chunks to UI
    │
    ▼
Display market insights with typewriter effect
    │
    ▼
Call onComplete when finished
```

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Component handles its own loading/error states
[RULE_2]: AI content is streamed, not loaded all at once
[RULE_3]: Edge Function handles API key security

---

## ### DEPENDENCIES ###

[LOCAL]: lib/supabase
[EXTERNAL]: None
[EDGE_FUNCTION]: ai-signup-guest

---

**FILE_COUNT**: 6
**EXPORTS_COUNT**: 1
