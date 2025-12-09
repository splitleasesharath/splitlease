# Split Lease - Project Overview

Flexible Rental Marketplace for NYC Properties | React 20 + Vite | Supabase | Cloudflare Pages

---

## Quick Start

```bash
npm run dev      # http://localhost:5173
npm run build    # Production build
/deploy          # Claude slash command
```

---

## Documentation Index

### Architecture & Code Guides
| File | Description |
|------|-------------|
| [app/CLAUDE.md](../app/CLAUDE.md) | Frontend: React, components, islands pattern |
| [supabase/CLAUDE.md](../supabase/CLAUDE.md) | Backend: Edge Functions, shared utilities |
| [DATABASE_SCHEMA_OVERVIEW.md](../DATABASE_SCHEMA_OVERVIEW.md) | Complete Supabase table schemas (93 tables) |

### .claude/Documentation/

#### Auth
| File | Description |
|------|-------------|
| [Documentation/Auth/LOGIN_FLOW.md](./Documentation/Auth/LOGIN_FLOW.md) | Login flow, UI states, validation |
| [Documentation/Auth/SIGNUP_FLOW.md](./Documentation/Auth/SIGNUP_FLOW.md) | Guest/host signup flow |

#### CORE-Functions
| File | Description |
|------|-------------|
| [Documentation/CORE-Functions/README.md](./Documentation/CORE-Functions/README.md) | Core functions overview |
| [Documentation/CORE-Functions/QUICK_REFERENCE.md](./Documentation/CORE-Functions/QUICK_REFERENCE.md) | Quick reference for core functions |
| [Documentation/CORE-Functions/ARCHITECTURE_ANALYSIS.md](./Documentation/CORE-Functions/ARCHITECTURE_ANALYSIS.md) | Architecture analysis |
| [Documentation/CORE-Functions/VISUAL_GUIDE.md](./Documentation/CORE-Functions/VISUAL_GUIDE.md) | Visual guide to core functions |

#### Database
| File | Description |
|------|-------------|
| [Documentation/Database/REFERENCE_TABLES_FK_FIELDS.md](./Documentation/Database/REFERENCE_TABLES_FK_FIELDS.md) | Reference tables and foreign key fields |

#### EDGE-Functions
| File | Description |
|------|-------------|
| [Documentation/EDGE-Functions/BUBBLE_SYNC_SERVICE.md](./Documentation/EDGE-Functions/BUBBLE_SYNC_SERVICE.md) | Bubble sync service documentation |

#### Pages
| File | Description |
|------|-------------|
| [Documentation/Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md](./Documentation/Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md) | Guest proposals page |
| [Documentation/Pages/LISTING_DASHBOARD_PAGE_CONTEXT.md](./Documentation/Pages/LISTING_DASHBOARD_PAGE_CONTEXT.md) | Listing dashboard page context |

#### Routing
| File | Description |
|------|-------------|
| [Documentation/Routing/ROUTING_GUIDE.md](./Documentation/Routing/ROUTING_GUIDE.md) | **MUST READ** for adding/modifying routes |

---

## Critical Patterns

### Day Indexing
| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| JavaScript | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| Bubble API | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

Use `adaptDaysFromBubble()` / `adaptDaysToBubble()` at system boundaries.

### Unique ID Generation
```typescript
const { data: newId } = await supabaseAdmin.rpc('generate_bubble_id');
```

### Four-Layer Logic (`app/src/logic/`)
1. **Calculators** - Pure math (`calculate*`, `get*`)
2. **Rules** - Boolean predicates (`can*`, `is*`, `has*`, `should*`)
3. **Processors** - Data transformation (`adapt*`, `extract*`, `process*`)
4. **Workflows** - Orchestration (`*Workflow`)

---

## Rules

**DO**: Use Edge Functions for Bubble API | Store secrets in Supabase Dashboard | Commit after changes | Run `npm run generate-routes` after route changes

**DON'T**: Expose API keys in frontend | Call Bubble API directly | `git push --force` | Modify tables without instruction | Add fallback mechanisms

---

## Environment

### app/.env
```
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GOOGLE_MAPS_API_KEY
```

### Supabase Secrets
```
BUBBLE_API_BASE_URL, BUBBLE_API_KEY, OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY
```

---

**VERSION**: 4.0 | **UPDATED**: 2025-12-09
