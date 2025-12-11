# SPLIT LEASE ARCHITECTURE GUIDE
## ESM + React Islands + Logic Core

---

## CORE PRINCIPLES

**Stack**: ESM-only, React Islands, Vite, Cloudflare Pages, Supabase PostgreSQL.

**Separation of Concerns**:
- **Islands** = Look, feel, polish (rendering, animations, user feedback)
- **Logic Core** = Calculations, rules, data processing (zero UI dependencies)

**Module Rules**: Strict ESM. All imports require `.js`/`.jsx` extensions. No CommonJS.

**No Fallback**: Logic fails explicitly with descriptive errors—never silent defaults.

---

## PROJECT STRUCTURE

```
src/
├── islands/                    # PURE UI (React components)
│   ├── shared/                 # Reusable UI primitives
│   │   ├── Button.jsx
│   │   ├── DatePicker.jsx
│   │   └── Avatar.jsx
│   └── pages/                  # Page-specific islands
│       ├── BookingForm.jsx
│       └── SearchFilters.jsx
│
├── logic/                      # BUSINESS DOMAIN (No React, no DOM)
│   ├── calculators/            # Pure math (pricing, dates, quantities)
│   │   ├── rentalPricing.js
│   │   ├── periodMapping.js
│   │   └── dateSpans.js
│   ├── rules/                  # Boolean predicates (permissions, visibility)
│   │   ├── proposalRules.js
│   │   ├── bookingRules.js
│   │   └── hostRules.js
│   ├── processors/             # Data transformers (API → UI shapes)
│   │   ├── proposalProcessor.js
│   │   └── listingProcessor.js
│   └── workflows/              # Multi-step state machines
│       └── bookingFlow.js
│
├── lib/                        # Infrastructure (DB clients, generic utils)
│   ├── supabase.js
│   └── constants.js
│
├── routes/                     # Future server routes
│   └── index.js
│
└── styles/
    └── main.css

public/                         # Static HTML shells
dist/                           # Build output (gitignored)
```

---

## LOGIC CORE CONVENTIONS

### Calculators (Pure Math)
Functions return computed values. Zero side effects. All inputs via named parameters.

```javascript
// src/logic/calculators/rentalPricing.js

export const getPeriodMultiplier = ({ spanInWeeks }) => {
  const PERIOD_MAP = { 6: 1.5, 7: 1.75, 8: 2, 12: 3 };
  if (!PERIOD_MAP[spanInWeeks]) {
    throw new Error(`Unsupported span: ${spanInWeeks} weeks`);
  }
  return PERIOD_MAP[spanInWeeks];
};

export const computeTotalPrice = ({ baseRate, periodMultiplier, markup }) => {
  return baseRate * periodMultiplier * (1 + markup);
};
```

### Rules (Boolean Predicates)
Functions return `true`/`false`. Names start with: `can`, `should`, `is`, `has`.

```javascript
// src/logic/rules/proposalRules.js

export const canGuestEditProposal = ({ user, proposal }) => {
  if (!user || !proposal) return false;
  return user.id === proposal.guestId && proposal.status === 'Draft';
};

export const shouldShowContactButton = ({ proposal, userRole }) => {
  return proposal.status === 'Active' && userRole === 'guest';
};

export const isProposalExpired = ({ proposal, now }) => {
  return new Date(proposal.expiresAt) < now;
};
```

### Processors (Data Gatekeepers)
Validate and transform raw data. Enforce No Fallback by throwing on missing required fields.

```javascript
// src/logic/processors/proposalProcessor.js

export const validateProposalData = ({ rawProposal }) => {
  const required = ['id', 'guestId', 'hostId', 'status', 'listingId'];
  for (const field of required) {
    if (rawProposal[field] === undefined) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  return rawProposal;
};

export const transformProposalForUI = ({ proposal, listing }) => {
  return {
    id: proposal.id,
    title: listing.title,
    status: proposal.status,
    displayPrice: `$${proposal.totalPrice.toFixed(2)}`
  };
};
```

---

## ISLANDS PATTERN (UI ONLY)

Islands import logic—never define it inline. Components handle:
- Rendering JSX
- User interactions (onClick, onChange)
- Visual states (loading, hover, animation)
- Calling logic functions with current state

```jsx
// src/islands/pages/ProposalCard.jsx
import { useState } from 'react';
import { canGuestEditProposal, shouldShowContactButton } from '../../logic/rules/proposalRules.js';
import { transformProposalForUI } from '../../logic/processors/proposalProcessor.js';
import Button from '../shared/Button.jsx';

export default function ProposalCard({ proposal, listing, user }) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Logic lives in /logic — islands just call it
  const displayData = transformProposalForUI({ proposal, listing });
  const canEdit = canGuestEditProposal({ user, proposal });
  const showContact = shouldShowContactButton({ proposal, userRole: user.role });

  return (
    <div className="proposal-card">
      <h3>{displayData.title}</h3>
      <p>{displayData.displayPrice}</p>
      {canEdit && <Button onClick={() => {}}>Edit</Button>}
      {showContact && <Button variant="secondary">Contact Host</Button>}
    </div>
  );
}
```

---

## SEMANTIC NAMING GUIDE

Function names reveal intent for LLM semantic search:

| Type | Prefix | Example |
|------|--------|---------|
| Calculator | `compute`, `calculate`, `get` | `computeTotalPrice`, `getWeeksBetween` |
| Rule | `can`, `should`, `is`, `has` | `canUserBook`, `shouldShowWarning`, `isExpired` |
| Processor | `validate`, `transform`, `normalize` | `validateBooking`, `transformForAPI` |
| Workflow | `handle`, `process`, `execute` | `handleBookingSubmit`, `executePaymentFlow` |

**File naming**: Domain entity + type → `proposalRules.js`, `rentalPricing.js`, `bookingProcessor.js`

---

## ESM IMPORT RULES

```javascript
// ✅ CORRECT
import { computeTotalPrice } from '../logic/calculators/rentalPricing.js';
import { canGuestEditProposal } from '../logic/rules/proposalRules.js';
import Button from '../shared/Button.jsx';

// ❌ FORBIDDEN
import { utils } from '../lib/utils';        // Missing extension
const rules = require('./rules');            // No CommonJS
```

**Import order**: External packages → logic → islands/shared → islands/pages → lib → same directory

---

## CRITICAL CONSTRAINTS

1. **No business logic in islands** — If it's not rendering, it belongs in `/logic`
2. **No React in logic** — Logic modules are framework-agnostic
3. **No implicit defaults** — Throw errors for missing data, don't substitute
4. **Named parameters only** — `{ spanInWeeks }` not `(spanInWeeks)`
5. **One responsibility per function** — Short, testable, searchable

---

## MIGRATION CHECKLIST

When extracting logic from existing components:

- [ ] Identify calculations → move to `logic/calculators/`
- [ ] Identify conditionals (if/ternary for visibility/permissions) → move to `logic/rules/`
- [ ] Identify data transforms → move to `logic/processors/`
- [ ] Update imports in island to use new logic paths
- [ ] Verify No Fallback: all required data validated before use
