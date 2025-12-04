# Split Lease - Project Overview

**REPOSITORY**: https://github.com/splitleasesharath/splitlease
**BRANCH**: main

---

## What is Split Lease?

Flexible Rental Marketplace for NYC Properties enabling:
- **Split Scheduling**: Property owners list spaces for specific days/weeks
- **Repeat Stays**: Guests rent rooms on selected days (claimed "45% less than Airbnb")
- **Proposal System**: Guests submit proposals with custom terms
- **Virtual Meetings**: Video calls between hosts and guests

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 20 + Vite (Islands Architecture) |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Legacy Backend | Bubble.io (migrating to Edge Functions) |
| Deployment | Cloudflare Pages |
| Node Version | 20 |

---

## Quick Commands

```bash
npm run dev      # Start dev server at http://localhost:5173
npm run build    # Production build
/deploy          # Claude slash command for deployment
```

---

## Project Structure

```
Split Lease/
├── app/                    # React frontend application
├── supabase/               # Edge Functions and database config
├── docs/                   # Migration plans and documentation
├── Documentation/          # Database tables, option sets, and routing guides
├── .claude/                # Claude Code configuration and commands
└── Context/                # Architecture reference guides
```

---

## Context Files

For detailed information, see these context files:

### Frontend Application
- **[../app/CLAUDE.md](../app/CLAUDE.md)** - React app architecture, components, islands pattern, and frontend conventions

### Backend Infrastructure
- **[../supabase/CLAUDE.md](../supabase/CLAUDE.md)** - Edge Functions architecture, shared utilities (bubbleSync, errors, validation, cors, openai), action-based routing, authentication patterns, deployment commands, and configuration

### Logic Architecture
- **[../app/src/logic/CLAUDE.md](../app/src/logic/CLAUDE.md)** - Four-layer logic system (calculators, rules, processors, workflows)

### Database & Data References
- **[../DATABASE_SCHEMA_OVERVIEW.md](../DATABASE_SCHEMA_OVERVIEW.md)** - Complete Supabase table schemas (93 tables)
- **[../Documentation/Database/DATABASE_TABLES_DETAILED.md](../Documentation/Database/DATABASE_TABLES_DETAILED.md)** - Detailed database table documentation with field descriptions
- **[../Documentation/Database/DATABASE_OPTION_SETS_QUICK_REFERENCE.md](../Documentation/Database/DATABASE_OPTION_SETS_QUICK_REFERENCE.md)** - Quick reference for database option sets
- **[../Documentation/Database/OPTION_SETS_DETAILED.md](../Documentation/Database/OPTION_SETS_DETAILED.md)** - Comprehensive option sets documentation with values and usage
### Routing
- **[../Documentation/Routing/ROUTING_GUIDE.md](../Documentation/Routing/ROUTING_GUIDE.md)** - **MUST READ** when adding new pages or modifying routes. Single source of truth for all routing configuration.

### Authentication Flows
- **[../Documentation/Auth/LOGIN_FLOW.md](../Documentation/Auth/LOGIN_FLOW.md)** - Complete login flow documentation with UI states, validation, and API integration
- **[../Documentation/Auth/SIGNUP_FLOW.md](../Documentation/Auth/SIGNUP_FLOW.md)** - Complete signup flow documentation including guest/host registration

### Page Quick References
Located in `Documentation/Pages/` - Quick reference guides for individual pages:
- **[../Documentation/Pages/ABOUT_US_QUICK_REFERENCE.md](../Documentation/Pages/ABOUT_US_QUICK_REFERENCE.md)** - About Us page structure and content
- **[../Documentation/Pages/ACCOUNT_PROFILE_QUICK_REFERENCE.md](../Documentation/Pages/ACCOUNT_PROFILE_QUICK_REFERENCE.md)** - Account profile page with user settings
- **[../Documentation/Pages/CAREERS_QUICK_REFERENCE.md](../Documentation/Pages/CAREERS_QUICK_REFERENCE.md)** - Careers page documentation
- **[../Documentation/Pages/FAQ_QUICK_REFERENCE.md](../Documentation/Pages/FAQ_QUICK_REFERENCE.md)** - FAQ page structure
- **[../Documentation/Pages/FAVORITE_LISTINGS_QUICK_REFERENCE.md](../Documentation/Pages/FAVORITE_LISTINGS_QUICK_REFERENCE.md)** - User's favorite listings page
- **[../Documentation/Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md](../Documentation/Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md)** - Guest proposals management page
- **[../Documentation/Pages/GUEST_SUCCESS_QUICK_REFERENCE.md](../Documentation/Pages/GUEST_SUCCESS_QUICK_REFERENCE.md)** - Guest success/onboarding page
- **[../Documentation/Pages/404_QUICK_REFERENCE.md](../Documentation/Pages/404_QUICK_REFERENCE.md)** - 404 error page

### Migration Documentation
- **[../docs/MIGRATION_PLAN_BUBBLE_TO_EDGE.md](../docs/MIGRATION_PLAN_BUBBLE_TO_EDGE.md)** - Bubble.io to Edge Functions migration

---

## Core Architecture Patterns

### Four-Layer Logic System
Located in `app/src/logic/`:
1. **Calculators** - Pure math functions (`calculate*`, `get*`)
2. **Rules** - Boolean predicates (`can*`, `is*`, `has*`, `should*`)
3. **Processors** - Data transformation (`adapt*`, `extract*`, `process*`)
4. **Workflows** - Orchestration (`*Workflow`)

### Hollow Component Pattern
UI components delegate all business logic to custom hooks.
Example: `ViewSplitLeasePage.jsx` uses `useViewSplitLeasePageLogic.js`

### Day Indexing (CRITICAL)
| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| JavaScript (internal) | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| Bubble API | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

Always convert at system boundaries using `adaptDaysFromBubble()` / `adaptDaysToBubble()`.

---

## Core Principles

### No Fallback Mechanisms
When encountering errors, return null or throw descriptive errors. Never add fallback logic or workarounds.

### Match Solution to Scale
Build for current requirements, not hypothetical future needs. Avoid over-engineering.

### Be Direct
Choose simple, direct solutions over clever abstractions. Code should do exactly what it says.

---

## Essential Rules

### DO
- Use Edge Functions for all Bubble API calls
- Store API keys in Supabase Dashboard Secrets
- Follow four-layer logic architecture
- Commit after each meaningful change
- Convert days at system boundaries
- **Follow [ROUTING_GUIDE.md](../Documentation/Routing/ROUTING_GUIDE.md) when adding/modifying routes** - run `npm run generate-routes` after changes

### DON'T
- Never expose API keys in frontend code
- Never call Bubble API directly from frontend
- Never `git push --force`
- Never modify Supabase tables without explicit instruction
- Never add fallback mechanisms

---

## Git Workflow

- **Main branch**: `main` (production)
- **Staging branch**: `development`
- **Commit style**: Conventional (feat, fix, chore, docs)
- **Rule**: Commit after each change, don't push unless asked

---

## Environment Variables

### Frontend (app/.env)
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_GOOGLE_MAPS_API_KEY=<google-maps-api-key>
```

### Supabase Secrets
Configured in Supabase Dashboard > Project Settings > Secrets:
- `BUBBLE_API_BASE_URL`
- `BUBBLE_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Build fails | Node version is 18, run `npm install` in app/ |
| Edge Function errors | Verify secrets in Supabase Dashboard |
| Auth issues | Check bubble-auth-proxy logs |
| Empty queries | Check RLS policies |

---

**VERSION**: 3.3 (Lightweight)
**LAST_UPDATED**: 2025-12-04
**STATUS**: Added ROUTING_GUIDE.md reference for route management
