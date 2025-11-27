# Split Lease - Quick Start Navigation Guide

**Purpose**: One-stop reference for navigating and understanding the Split Lease codebase
**Updated**: 2025-11-26

---

## What Is Split Lease?

Split Lease is a **flexible rental marketplace for NYC properties** where:
- **Hosts** list properties with flexible scheduling (every week, one week on/off, etc.)
- **Guests** book rooms for selected days/weeks at competitive prices (claimed 45% less than Airbnb)
- **System** handles proposals, counteroffers, virtual meetings, and payments

**Tech**: React (frontend) + Supabase (backend) + Cloudflare Pages (hosting)

---

## Documentation Files - What to Read When

### Understanding Project Structure
1. **Start Here**: `CLAUDE.md` (root) - 10k word comprehensive project guide
2. **For architects**: `docs/CODEBASE_COMPREHENSIVE_STRUCTURE.md` - This report
3. **Visual reference**: `docs/DIRECTORY_TREE.md` - Directory tree with annotations
4. **Configuration**: `docs/CONFIGURATION_AND_DEPLOYMENT.md` - Config files & deployment

### For Frontend Development
1. **App guide**: `app/CLAUDE.md` - React/Vite architecture and patterns
2. **Component examples**: `app/src/islands/shared/` - Reusable components
3. **Logic layer**: `app/src/logic/` - Business logic organization

### For Backend Development
1. **Edge Functions**: `supabase/SECRETS_SETUP.md` - Function setup & secrets
2. **Deployment**: `docs/DEPLOY_EDGE_FUNCTION.md` - Function deployment guide
3. **Auth flow**: `docs/AUTH_FLOW_COMPLETE.md` - Complete auth architecture
4. **API reference**: `docs/BUBBLE_WORKFLOW_API_ENUMERATION.md` - Available APIs

### For Migrations & Planning
1. **Migration plan**: `docs/MIGRATION_PLAN_BUBBLE_TO_EDGE.md` - Bubble to Supabase
2. **Status**: `docs/MIGRATION_STATUS.md` - Current progress
3. **Auth flow diagram**: `docs/AUTH_FLOW_DIAGRAM.md` - Visual diagrams

### Database Reference
1. **Schema overview**: `DATABASE_SCHEMA_OVERVIEW.md` - 93-table reference
2. **Lookup tables**: `app/CLAUDE.md` (Database Tables section)

---

## Directory Navigation - Find What You Need

### I Want to...

#### Understand the Project
- **Overall structure**: Read `CLAUDE.md` (20 minutes)
- **Visual overview**: See `docs/DIRECTORY_TREE.md` (5 minutes)
- **Architecture deep-dive**: Read `app/CLAUDE.md` (30 minutes)

#### Build a New Feature
1. **Design**: Follow `app/src/logic/` four-layer architecture
2. **Components**: Check patterns in `app/src/islands/shared/`
3. **Styling**: Use CSS variables from `src/styles/variables.css`
4. **API calls**: Use Edge Functions (not direct Bubble calls)

#### Fix a Bug
1. **Check logs**: Browser console → Network → Function logs
2. **Find code**: Use `docs/DIRECTORY_TREE.md` to locate
3. **Day indexing**: See `app/CLAUDE.md` (Day Indexing Convention section)
4. **Auth issues**: Check `docs/AUTH_FLOW_COMPLETE.md`

#### Deploy Code
1. **Simple**: Run `/deploy` command
2. **Manual**: Run `./build.sh`
3. **Verify**: Check Cloudflare Pages dashboard

#### Set Up Edge Function
1. **Configuration**: Read `supabase/SECRETS_SETUP.md`
2. **Example**: Check `supabase/functions/bubble-auth-proxy/`
3. **Deploy**: Run `supabase functions deploy <name>`
4. **Debug**: Run `supabase functions logs <name> --tail`

#### Understand Authentication
1. **Overview**: `docs/AUTH_QUICK_REFERENCE.md` (2 minutes)
2. **Complete flow**: `docs/AUTH_FLOW_COMPLETE.md` (20 minutes)
3. **Diagram**: `docs/AUTH_FLOW_DIAGRAM.md` (visual)
4. **Code**: `app/src/lib/auth.js` + `supabase/functions/bubble-auth-proxy/`

#### Understand Proposals
1. **Status flow**: `app/CLAUDE.md` (Proposal Status Flow section)
2. **Rules**: `app/src/logic/rules/proposals/`
3. **Components**: `app/src/islands/pages/GuestProposalsPage.jsx`
4. **Workflows**: `app/src/logic/workflows/proposals/`

#### Understand Pricing
1. **System**: `app/CLAUDE.md` (Pricing System section)
2. **Calculators**: `app/src/logic/calculators/pricing/`
3. **Rules**: `app/src/logic/rules/pricing/`
4. **Components**: `app/src/islands/shared/ListingScheduleSelector.jsx`

#### Work with Days/Schedule
1. **Critical reading**: `app/CLAUDE.md` (Day Indexing Convention) - MUST READ
2. **Conversion functions**: `app/src/logic/processors/external/`
3. **Validators**: `app/src/lib/scheduleSelector/validators.js`
4. **Example**: `app/src/islands/shared/ListingScheduleSelector.jsx`

---

## Key Files at a Glance

### Root Level (10 critical files)
```
.pages.toml                           Cloudflare Pages config
.node-version                         Node 18 lock
CLAUDE.md                            PROJECT GUIDE (read first!)
DATABASE_SCHEMA_OVERVIEW.md          93-table schema reference
README.md                            Project overview
app/                                 Frontend application
supabase/                            Backend (Edge Functions)
docs/                                Implementation guides
build.sh                             Build script
package.json                         Root monorepo config
```

### In app/src/ (7 main directories)
```
main.jsx                             Landing page entry
islands/                             React Island components
  pages/                             Page-level components
  shared/                            Reusable components
lib/                                 Utility libraries
  auth.js                            Authentication
  constants.js                       All constants
  supabase.js                        Supabase client
logic/                               FOUR-LAYER ARCHITECTURE
  calculators/                       Pure math functions
  rules/                             Boolean predicates
  processors/                        Data transformation
  workflows/                         Orchestration
data/                                Data lookups
  helpCenterData.js                  CMS content
```

### In supabase/functions/ (4 main functions)
```
_shared/                             Shared utilities
  bubbleSync.ts                      Bubble API helpers
  cors.ts, errors.ts, types.ts      Common utilities
ai-gateway/                          AI services
bubble-auth-proxy/                   Login/signup/logout
bubble-proxy/                        General Bubble API
```

### In docs/ (Essential reading)
```
CODEBASE_COMPREHENSIVE_STRUCTURE.md  THIS PROJECT (start here)
DIRECTORY_TREE.md                    Visual directory tree
CONFIGURATION_AND_DEPLOYMENT.md      Config & deployment reference
AUTH_FLOW_COMPLETE.md               Complete auth architecture
MIGRATION_PLAN_BUBBLE_TO_EDGE.md    Migration strategy
DATABASE_SCHEMA_OVERVIEW.md         93-table schema (in root)
```

---

## The Four-Layer Logic Architecture

**Split Lease organizes business logic into 4 layers** (in `app/src/logic/`):

```
┌─────────────────────────────────────────────────┐
│ LAYER 4: WORKFLOWS (orchestration)              │ acceptProposalWorkflow
│ ├─ Coordinates multiple layers                  │ validateTokenWorkflow
│ └─ Naming: *Workflow                            │ loadProposalDetailsWorkflow
├─────────────────────────────────────────────────┤
│ LAYER 3: PROCESSORS (data transformation)       │ adaptDaysFromBubble
│ ├─ Transforms raw data for UI/API              │ processProposalData
│ └─ Naming: adapt*, process*, format*            │ formatHostName
├─────────────────────────────────────────────────┤
│ LAYER 2: RULES (boolean predicates)             │ canCancelProposal
│ ├─ Expresses business rules                     │ isSessionValid
│ └─ Naming: can*, is*, has*, should*             │ hasProfilePhoto
├─────────────────────────────────────────────────┤
│ LAYER 1: CALCULATORS (pure math)                │ calculateFourWeekRent
│ ├─ Pure functions, no side effects              │ getNightlyRateByFrequency
│ └─ Naming: calculate*, get*                     │ calculateNightsFromDays
└─────────────────────────────────────────────────┘
```

**Example**: When processing a proposal:
1. **Calculator**: Get nightly rate from pricing data
2. **Rule**: Check if guest can modify this proposal status
3. **Processor**: Transform raw Bubble proposal to app format
4. **Workflow**: Coordinate all steps to accept proposal

---

## Critical Concepts - Must Know

### 1. Day Indexing (CRITICAL!)
```
Two systems exist - you MUST convert at boundaries:

JavaScript (internal):  0=Sunday, 1=Monday, 2=Tuesday...
Bubble API (external):  1=Sunday, 2=Monday, 3=Tuesday...

Always use these functions:
  adaptDaysFromBubble([2,3,4,5,6])  // Bubble → JS
  adaptDaysToBubble([1,2,3,4,5])    // JS → Bubble
```

**Where to find**: `app/src/logic/processors/external/`
**When needed**: Every API call or Bubble data interaction

### 2. Islands Architecture
```
Each page is an independent React root:
  src/main.jsx              → app/public/index.html
  src/search.jsx            → app/public/search.html
  src/view-split-lease.jsx  → app/public/view-split-lease.html

Shared components in src/islands/shared/
Business logic in src/logic/ and hooks
```

### 3. Hollow Component Pattern
```
Component = Pure JSX rendering only
Hook = All state, logic, API calls

Example:
  GuestProposalsPage.jsx
    ↓ (delegates to)
  useGuestProposalsPageLogic.js
    ↓ (imports from)
  src/logic/rules/proposals/
  src/logic/workflows/proposals/
  src/logic/processors/proposal/
```

### 4. Proposal Status Flow
```
SUBMITTED
  ↓ (guest completes rental app)
AWAITING_HOST_REVIEW
  ↓ (host reviews)
  ├─ REJECTED
  ├─ COUNTEROFFER_SUBMITTED
  │   ↓ (guest accepts/rejects)
  │   ├─ ACCEPTED
  │   └─ REJECTED
  └─ APPROVED_BY_HOST
      ↓ (guest pays)
      LEASE_ACTIVATED (terminal)
```

**Where to find**: `app/src/logic/rules/proposals/proposalRules.js`

### 5. Authentication Flow
```
1. User submits email/password
2. Edge Function (bubble-auth-proxy) calls Bubble API
3. Bubble returns JWT token + user data
4. Frontend encrypts token → secureStorage
5. Token used in requests until logout/expiration
6. Protected pages check session validity

Where to find:
  - Frontend: app/src/lib/auth.js
  - Backend: supabase/functions/bubble-auth-proxy/
  - Documentation: docs/AUTH_FLOW_COMPLETE.md
```

---

## Common Tasks - Quick How-To

### Start Development
```bash
npm run dev
# Opens http://localhost:5173 with auto-reload
```

### Deploy to Production
```bash
/deploy
# or manually: npm run build → push to main
```

### Add a New Component
1. Create file in `app/src/islands/shared/` (PascalCase)
2. Extract logic to hook in same directory
3. Use CSS for styling
4. Import & use in page components

### Add a New Page
1. Create entry point in `app/src/` (e.g., `my-page.jsx`)
2. Create HTML in `app/public/my-page.html`
3. Create component in `app/src/islands/pages/MyPage.jsx`
4. Export component from page entry point

### Add Business Logic
1. Decide layer (calculator/rule/processor/workflow)
2. Create file in appropriate `app/src/logic/` subdirectory
3. Use naming convention
4. Export from `index.js` in that layer
5. Import in components/hooks as needed

### Fix Authentication Issue
1. Check browser console for errors
2. Verify Edge Function logs: `supabase functions logs bubble-auth-proxy --tail`
3. Check token storage: `secureStorage.getToken()`
4. Review `docs/AUTH_FLOW_COMPLETE.md`
5. Check Bubble API credentials in Supabase Secrets

### Debug Search Page
1. Check console logs (use Playwright tests)
2. Review `app/src/islands/pages/useSearchPageLogic.js`
3. Check filters in `app/src/logic/rules/search/`
4. See `docs/SEARCH_PAGE_CONSOLE_LOGS.md` for examples

### Add Price Calculation
1. Add logic to `app/src/logic/calculators/pricing/`
2. Use in `ListingScheduleSelector.jsx`
3. Display using `PriceDisplay.jsx` component
4. Validate with rules in `app/src/logic/rules/pricing/`

### Deploy Edge Function
```bash
# Configure secrets first in Supabase Dashboard
# Then deploy:
supabase functions deploy <function-name>

# Test locally:
supabase functions serve
# Call: http://localhost:54321/functions/v1/<function-name>

# View logs:
supabase functions logs <function-name> --tail
```

---

## Important Principles (From CLAUDE.md)

### DO's
- Use four-layer logic architecture
- Keep business logic in hooks (Hollow Component Pattern)
- Use Edge Functions for Bubble API calls
- Store all configuration in constants
- Always convert days at system boundaries
- Check auth status before protected resources
- Throw descriptive errors

### DON'Ts
- Never add fallback mechanisms or workarounds
- Never expose API keys in frontend
- Never call Bubble API directly from frontend
- Never mix day numbering systems
- Never hardcode color values
- Never use Redux (keep state simple)
- Never force push to main/master

---

## File Naming Conventions

```
React Components:      HomePage.jsx (PascalCase)
Hooks:                useGuestProposalsPageLogic.js (use prefix)
Utilities:            priceCalculations.js (camelCase)
Constants:            BUBBLE_API_URL (UPPER_SNAKE_CASE)
CSS Classes:          .hero-section (kebab-case)
Calculators:          calculateFourWeekRent.js
Rules:                canCancelProposal.js
Processors:           adaptDaysFromBubble.js
Workflows:            acceptProposalWorkflow.js
```

---

## Environment Variables

### Client-Side (app/.env)
```
VITE_SUPABASE_URL=<url>
VITE_SUPABASE_ANON_KEY=<key>
VITE_GOOGLE_MAPS_API_KEY=<key>
```

### Server-Side (Supabase Secrets)
```
BUBBLE_API_BASE_URL
BUBBLE_API_KEY
BUBBLE_AUTH_BASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

**Rule**: Never expose server secrets in frontend code

---

## Build & Deployment

```bash
# Development
npm run dev              # Start dev server (port 5173)

# Production
npm run build            # Build for production
npm run preview          # Preview production locally

# Deploy
/deploy                  # Build + deploy + push to GitHub
./build.sh              # Manual build script

# Edge Functions
supabase functions serve # Local function testing
supabase functions deploy <name>  # Deploy function
supabase functions logs <name> --tail  # View logs
```

---

## Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 | UI framework |
| **Frontend** | Vite | Build tool (fast, ESM) |
| **Frontend** | CSS Modules + Variables | Styling |
| **Frontend** | Google Maps React | Map integration |
| **Backend** | Supabase | Database + Auth + Functions |
| **Backend** | Deno | Edge Functions runtime |
| **Backend** | TypeScript | Type safety in functions |
| **Hosting** | Cloudflare Pages | Production deployment |
| **Legacy** | Bubble.io | Data source (being migrated) |
| **Testing** | Playwright | E2E testing |

---

## Database at a Glance

**Bubble Tables** (Source of truth):
- `user` - User accounts
- `listing` - Property listings
- `proposal` - Booking proposals

**Supabase Lookup Tables**:
- `zat_geo_borough_toplevel` - NYC boroughs
- `zat_geo_hood_mediumlevel` - Neighborhoods
- `zat_features_amenity` - Amenities
- `zat_features_houserule` - House rules
- `informational_texts` - CMS content

**Total**: 93 tables (see `DATABASE_SCHEMA_OVERVIEW.md`)

---

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, test locally
npm run dev

# Commit (auto-commit after /deploy)
git add .
git commit -m "feat: description"

# Push to feature branch (not main)
git push origin feature/my-feature

# Create PR on GitHub
# Review → Merge to main
# Cloudflare Pages auto-deploys
```

**Rule**: Never force push to main/master

---

## Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| Build fails | Check Node 18, run `npm ci` in app/ |
| Auth not working | Check Supabase secrets, see AUTH_FLOW_COMPLETE.md |
| Pages not loading | Check _redirects, view Cloudflare logs |
| Proposal status wrong | Check adapters in logic/processors/external |
| Pricing incorrect | Check calculators in logic/calculators/pricing |
| Day selection wrong | Check day indexing, must convert at boundaries |
| Component not rendering | Check if in correct islands/pages/ or islands/shared/ |
| Function not deployed | Run `supabase functions deploy`, check logs |

---

## Quick Links to Key Files

| Find | Location |
|------|----------|
| Main project guide | `CLAUDE.md` (root) |
| App architecture | `app/CLAUDE.md` |
| Authentication | `app/src/lib/auth.js` |
| Constants | `app/src/lib/constants.js` |
| Day conversion | `app/src/logic/processors/external/` |
| Pricing logic | `app/src/logic/calculators/pricing/` |
| Proposal rules | `app/src/logic/rules/proposals/` |
| Database schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| Auth flow | `docs/AUTH_FLOW_COMPLETE.md` |
| Edge functions | `supabase/functions/` |
| Secrets setup | `supabase/SECRETS_SETUP.md` |
| Deployment | `.pages.toml` + `build.sh` |
| Configuration | `docs/CONFIGURATION_AND_DEPLOYMENT.md` |

---

## Learning Path

**If you have 30 minutes:**
1. Read `CLAUDE.md` (root) - Project overview
2. Scan `app/CLAUDE.md` - Architecture
3. Look at `docs/DIRECTORY_TREE.md` - File locations

**If you have 2 hours:**
1. Complete 30-minute path
2. Read `app/CLAUDE.md` fully
3. Review `docs/AUTH_FLOW_COMPLETE.md`
4. Look at example component: `app/src/islands/pages/SearchPage.jsx`
5. Look at example logic: `app/src/logic/rules/proposals/`

**If you have a day:**
1. Complete 2-hour path
2. Review `DATABASE_SCHEMA_OVERVIEW.md`
3. Study `app/src/logic/` - understand four layers
4. Explore Edge Functions in `supabase/functions/`
5. Review git history: `git log --oneline` (recent commits)

---

## Need Help?

### For Questions About:
- **Project structure**: See `docs/CODEBASE_COMPREHENSIVE_STRUCTURE.md`
- **Specific files**: Check `docs/DIRECTORY_TREE.md`
- **Configuration**: Read `docs/CONFIGURATION_AND_DEPLOYMENT.md`
- **Frontend**: Consult `app/CLAUDE.md`
- **Backend**: Check `supabase/SECRETS_SETUP.md`
- **Authentication**: Study `docs/AUTH_FLOW_COMPLETE.md`
- **Deployments**: Review `.pages.toml` and `build.sh`

### For Code Examples:
- **Components**: Explore `app/src/islands/shared/`
- **Pages**: Look at `app/src/islands/pages/`
- **Logic**: Study `app/src/logic/` layers
- **Functions**: Review `supabase/functions/`

### For Implementation:
- **New feature**: Follow pattern in `app/src/logic/`
- **New page**: Mirror existing page structure
- **Edge function**: Copy pattern from `bubble-proxy/`
- **Database**: Query from `app/src/lib/supabaseUtils.js`

---

**Version**: 1.0
**Last Updated**: 2025-11-26
**Status**: Ready for Navigation and Learning
