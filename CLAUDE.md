# Split Lease - Project Guide

## Quick Start
```bash
npm run dev     # http://localhost:5173
npm run build   # Production build
/deploy         # Deploy to Cloudflare Pages
```

## Stack
- **Frontend**: React 18 + Vite (Islands Architecture) in `app/`
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Legacy**: Bubble.io (migrating to Edge Functions)
- **Deploy**: Cloudflare Pages | Node 18

## Directory Structure
```
/                  Root config (package.json, .pages.toml, build.sh)
/app               React frontend - see app/CLAUDE.md
/supabase          Edge Functions + database config
/docs              Migration plans, implementation guides
/.claude           Slash commands + logs
/Context           Architecture reference guides
```

## Edge Functions
| Function | Purpose |
|----------|---------|
| `bubble-proxy` | Listing, messaging, photos, referral, signup |
| `bubble-auth-proxy` | Login, signup, logout, token validation |
| `ai-gateway` | AI completion + streaming |
| `ai-signup-guest` | AI-powered guest signup |

## Required Secrets (Supabase Dashboard)
- `BUBBLE_API_BASE_URL`: https://app.split.lease/version-test/api/1.1
- `BUBBLE_API_KEY`: See supabase/SECRETS_SETUP.md
- `BUBBLE_AUTH_BASE_URL`: https://upgradefromstr.bubbleapps.io/api/1.1
- `SUPABASE_SERVICE_ROLE_KEY`: From Supabase Dashboard

## Environment Variables
```bash
# Root .env (CLI tools)
GITHUB_PAT, E2B_API_KEY

# app/.env (Frontend)
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GOOGLE_MAPS_API_KEY
```

## Architecture Patterns

### Four-Layer Logic (`app/src/logic/`)
| Layer | Purpose | Naming |
|-------|---------|--------|
| Calculators | Pure math | `calculate*`, `get*` |
| Rules | Boolean predicates | `can*`, `is*`, `has*` |
| Processors | Data transformation | `adapt*`, `process*` |
| Workflows | Orchestration | `*Workflow` |

### Hollow Component Pattern
UI delegates all logic to hooks. Example: `ViewSplitLeasePage.jsx` uses `useViewSplitLeasePageLogic.js`

### Day Indexing (CRITICAL)
| JS | 0=Sun, 1=Mon... 6=Sat |
| Bubble | 1=Sun, 2=Mon... 7=Sat |

Convert at boundaries: `adaptDaysFromBubble()`, `adaptDaysToBubble()`

## Database
- **93 tables** in Supabase PostgreSQL
- Schema reference: `DATABASE_SCHEMA_OVERVIEW.md`
- Relations: `Context/Database/DATABASE_RELATIONS.md`

## Git Workflow
- **main**: Production | **development**: Staging
- Commit after each change, do not push unless asked
- Style: Conventional (feat, fix, chore, docs)

## Core Principles
1. **No Fallbacks**: Return null or throw errors, never mask problems
2. **Match Scale**: Build for current needs, not hypothetical futures
3. **Be Direct**: Simple solutions over clever abstractions
4. **Embrace Constraints**: Friction signals design mismatch

## DO
- All Bubble calls through Edge Functions
- Store secrets in Supabase Dashboard
- Use four-layer logic architecture
- Commit regularly, verify builds
- Reference DATABASE_SCHEMA_OVERVIEW.md before modifying tables

## DON'T
- Expose API keys in frontend
- Call Bubble API directly
- Force push or rm -rf
- Add fallback/compatibility layers
- Modify tables without explicit instruction
- Hardcode IDs in migrations

## Key References
| What | Where |
|------|-------|
| App guide | `app/CLAUDE.md` |
| Development beliefs | `Context/DEVELOPMENT_BELIEFS.md` |
| Database schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| Database relations | `Context/Database/DATABASE_RELATIONS.md` |
| Logic architecture | `Context/Refactoring Architecture for Logic Core.md` |
| Edge Function secrets | `supabase/SECRETS_SETUP.md` |
| Migration status | `docs/MIGRATION_STATUS.md` |

## Troubleshooting
- **Build fails**: Check Node 18, run `npm install` in app/
- **Edge Function errors**: Verify secrets in Supabase Dashboard
- **Auth issues**: Check bubble-auth-proxy logs
- **Empty queries**: Check RLS policies
