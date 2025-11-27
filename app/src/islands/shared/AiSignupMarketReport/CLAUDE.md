# AI Signup Market Report Component

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: AI-powered market research report component for host onboarding
[FEATURE]: Generate personalized NYC rental market analysis during signup
[API]: Calls ai-signup-guest Edge Function

---

## ### FILE_INVENTORY ###

### index.js
[INTENT]: Barrel export providing AiSignupMarketReport component
[EXPORTS]: AiSignupMarketReport

### AiSignupMarketReport.jsx
[INTENT]: Main component rendering AI-generated market research report with streaming display
[IMPORTS]: react
[DEPENDENCIES]: supabase/functions/ai-signup-guest/
[PROPS]: neighborhood, propertyType, onComplete

### Example.jsx
[INTENT]: Example usage demonstrating component integration in signup flow
[IMPORTS]: react, ./index

### TestPage.jsx
[INTENT]: Test page for validating AI report functionality with mock data
[IMPORTS]: react, ./index
[DEPENDENCIES]: supabase/functions/ai-gateway/

### README.md
[INTENT]: Component usage documentation

### MIGRATION_SUMMARY.md
[INTENT]: Migration notes from Bubble.io implementation

---

## ### COMPONENT_FLOW ###

```
User enters neighborhood
    │
    ▼
AiSignupMarketReport triggers
    │
    ▼
Call ai-signup-guest Edge Function
    │
    ▼
Stream AI response to UI
    │
    ▼
Display market insights
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { AiSignupMarketReport } from 'islands/shared/AiSignupMarketReport'
[CONSUMED_BY]: ListWithUsPage, host signup flow

---

**FILE_COUNT**: 6
**EXPORTS_COUNT**: 1 (main component)
