# Split Lease Platform

A modern, high-performance multi-page web application for flexible shared accommodations with weekly scheduling. Built with React 18 + Vite Islands Architecture, Supabase Edge Functions (Deno), and Cloudflare Pages.

**Repository**: https://github.com/splitleasesharath/splitlease
**Branch**: main

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Edge Functions](#edge-functions)
- [Four-Layer Logic System](#four-layer-logic-system)
- [Database](#database)
- [Development](#development)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## Overview

Split Lease is a flexible rental marketplace for NYC properties enabling:

- **Split Scheduling**: Property owners list spaces for specific days/weeks
- **Repeat Stays**: Guests rent rooms on selected days (45% less than Airbnb)
- **Proposal System**: Guests submit proposals with custom terms
- **Virtual Meetings**: Video calls between hosts and guests
- **Real-time Messaging**: Native Supabase-powered messaging threads

### What Makes It Special

| Principle | Description |
|-----------|-------------|
| **No Fallback Mechanisms** | 100% truthful data - returns real data or null, never hardcoded demo data |
| **Islands Architecture** | Multi-page app with independent React roots, not a SPA |
| **Four-Layer Logic** | Calculators, Rules, Processors, Workflows for clean separation |
| **Hollow Components** | Page components contain NO logic - delegate everything to hooks |
| **0-Based Day Indexing** | 0=Sunday through 6=Saturday everywhere (matching JavaScript `Date.getDay()`) |
| **Queue-Based Sync** | Supabase-to-Bubble sync via `sync_queue` table with pg_cron |

### Application Scale

| Metric | Count |
|--------|-------|
| Entry Points | 27+ |
| Page Components | 25+ |
| Shared Components | 50+ |
| Edge Functions | 17 |
| Database Tables | 93+ |
| Logic Functions | 57 |
| Documentation Files | 52 |

---

## Architecture

### Tech Stack

```
+---------------------------------------------------------------+
|                     FRONTEND (app/)                            |
|     React 18 + Vite | Islands Architecture | Cloudflare Pages |
+---------------------------------------------------------------+
|                                                                |
|  public/*.html  -->  src/*.jsx (entry)  -->  islands/pages/   |
|  (27 HTML files)     (mount React)          (page components) |
|                                                                |
|  src/logic/  ------------------------------------------        |
|  +-- calculators/   (pure math: calculate*, get*)              |
|  +-- rules/         (boolean predicates: is*, can*, should*)  |
|  +-- processors/    (data transform: adapt*, format*)         |
|  +-- workflows/     (orchestration: *Workflow)                |
|                                                                |
+---------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------+
|                BACKEND (supabase/functions/)                   |
|            Supabase Edge Functions (Deno 2/TypeScript)         |
+---------------------------------------------------------------+
|                                                                |
|  auth-user/       Login, signup, password reset (Supabase Auth)|
|  proposal/        Proposal CRUD with queue-based Bubble sync   |
|  listing/         Listing CRUD with atomic Bubble sync         |
|  messages/        Real-time messaging threads                  |
|  ai-gateway/      OpenAI proxy with prompt templating          |
|  bubble_sync/     Queue processor for Supabase->Bubble sync    |
|  workflow-*/      pgmq-based workflow orchestration            |
|                                                                |
|  _shared/         CORS, errors, validation, Slack, sync utils  |
|                                                                |
+---------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------+
|                        DATA LAYER                              |
+---------------------------------------------------------------+
|  Supabase PostgreSQL  <--->  Bubble.io (legacy, migrating)     |
|  (primary + native)          (source of truth for some data)  |
+---------------------------------------------------------------+
```

### Core Patterns

| Pattern | Description |
|---------|-------------|
| **Islands Architecture** | Each page is an independent React root. Full page loads between pages. |
| **Hollow Components** | Page components delegate everything to `useXxxPageLogic` hooks |
| **Route Registry** | Single source of truth in `app/src/routes.config.js` |
| **Action-Based Edge Functions** | All functions use `{ action, payload }` request pattern |
| **Queue-Based Sync** | Supabase->Bubble sync via `sync_queue` table, processed by cron |
| **Workflow Orchestration** | pgmq-based workflow execution with pg_net triggers |

### Day Indexing Convention

All day indices use JavaScript's 0-based standard (matching `Date.getDay()`):

| Day | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|-----|-----|-----|-----|-----|-----|-----|-----|
| Index | 0 | 1 | 2 | 3 | 4 | 5 | 6 |

The database stores days natively in this format. No conversion needed at API boundaries.

---

## Quick Start

### Prerequisites

- **Bun** (preferred) or Node.js 18+
- **Supabase CLI** (for Edge Functions development)
- **API Keys**: Supabase, Google Maps

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/splitleasesharath/splitlease.git
cd splitlease

# 2. Install dependencies
cd app && bun install

# 3. Configure environment
./scripts/copy_dot_env.sh
# Edit .env with your API keys

# 4. Start development server
bun run dev
# Opens at http://localhost:8000
```

### Available Commands

```bash
# Frontend (from app/ directory)
bun run dev              # Start dev server at http://localhost:8000
bun run build            # Production build (runs generate-routes first)
bun run preview          # Preview production build locally
bun run generate-routes  # Regenerate _redirects and _routes.json

# Supabase Edge Functions
supabase functions serve           # Serve ALL functions locally
supabase functions serve <name>    # Serve single function
supabase functions deploy          # Deploy all functions
supabase functions deploy <name>   # Deploy single function

# Supabase Local Development
supabase start           # Start local Supabase
supabase stop            # Stop local Supabase
supabase db reset        # Reset local database
supabase migration new <name>  # Create new migration
```

---

## Project Structure

```
Split Lease/
+-- app/                              # React frontend application
|   +-- public/                       # Static HTML pages and assets
|   |   +-- *.html                    # 27 HTML entry points
|   |   +-- assets/                   # Fonts, icons, images, lotties, videos
|   |   +-- _redirects                # Generated Cloudflare routing rules
|   |   +-- _headers                  # HTTP header configuration
|   |   +-- _routes.json              # Cloudflare Functions routing
|   +-- src/
|   |   +-- *.jsx                     # 27 entry point files
|   |   +-- islands/
|   |   |   +-- pages/                # Page components (25+)
|   |   |   +-- modals/               # Modal components (17+)
|   |   |   +-- shared/               # Shared components (30+)
|   |   |   +-- proposals/            # Proposal components
|   |   +-- lib/                      # Utilities (24 modules)
|   |   +-- logic/                    # Four-layer business logic
|   |   |   +-- calculators/          # Pure math functions
|   |   |   +-- rules/                # Boolean predicates
|   |   |   +-- processors/           # Data transformers
|   |   |   +-- workflows/            # Orchestration
|   |   +-- styles/                   # CSS stylesheets
|   |   +-- config/                   # Configuration
|   |   +-- routes.config.js          # Route registry (single source of truth)
|   +-- vite.config.js                # Vite build configuration
|   +-- package.json                  # Dependencies
|
+-- supabase/                         # Backend
|   +-- functions/                    # Edge Functions (17)
|   |   +-- auth-user/                # Authentication
|   |   +-- proposal/                 # Proposal CRUD
|   |   +-- listing/                  # Listing CRUD
|   |   +-- messages/                 # Messaging
|   |   +-- ai-gateway/               # OpenAI proxy
|   |   +-- bubble_sync/              # Sync queue processor
|   |   +-- send-email/               # SendGrid integration
|   |   +-- send-sms/                 # Twilio integration
|   |   +-- virtual-meeting/          # Virtual meeting lifecycle
|   |   +-- workflow-*/               # Workflow orchestration
|   |   +-- _shared/                  # Shared utilities (13 files)
|   +-- migrations/                   # Database migrations (14+)
|   +-- config.toml                   # Supabase configuration
|
+-- .claude/                          # Claude Code configuration
|   +-- Documentation/                # Project documentation (52 files)
|   |   +-- miniCLAUDE.md             # Quick reference
|   |   +-- largeCLAUDE.md            # Full context
|   |   +-- Architecture/             # Architecture guides
|   |   +-- Auth/                     # Authentication docs
|   |   +-- Backend(EDGE - Functions)/ # Edge Function docs
|   |   +-- Database/                 # Database schema docs
|   |   +-- Pages/                    # Page-specific docs
|   |   +-- Routing/                  # Routing guides
|   +-- plans/                        # Implementation plans
|   |   +-- New/                      # Active plans
|   |   +-- Done/                     # Completed plans
|   |   +-- Documents/                # Analysis documents
|   +-- agents/                       # Subagent configurations
|   +-- commands/                     # Custom slash commands
|
+-- CLAUDE.md                         # Main project context
```

### Key Files

| What you need | Where to find it |
|---------------|------------------|
| Route Registry | `app/src/routes.config.js` |
| Vite Config | `app/vite.config.js` |
| Authentication | `app/src/lib/auth.js` |
| Supabase client | `app/src/lib/supabase.js` |
| Day utilities | `app/src/lib/dayUtils.js` |
| Business rules | `app/src/logic/rules/` |
| Pricing calculations | `app/src/logic/calculators/pricing/` |
| Edge Functions | `supabase/functions/` |
| Shared Edge utilities | `supabase/functions/_shared/` |
| Page components | `app/src/islands/pages/` |
| Shared components | `app/src/islands/shared/` |

---

## Edge Functions

### Overview

17 Edge Functions running on Deno 2/TypeScript with action-based routing.

### Core Business Functions

| Function | Purpose | Key Actions |
|----------|---------|-------------|
| **auth-user** | Authentication via Supabase Auth | login, signup, logout, validate, request_password_reset, update_password |
| **proposal** | Proposal CRUD with Bubble sync | create, update, get, suggest |
| **listing** | Listing CRUD with atomic sync | create, get, submit |
| **messages** | Real-time messaging threads | send_message, get_messages, send_guest_inquiry |
| **rental-application** | Rental application submissions | submit |
| **virtual-meeting** | Virtual meeting lifecycle | create, delete, accept, decline, send_calendar_invite |

### AI Functions

| Function | Purpose |
|----------|---------|
| **ai-gateway** | OpenAI proxy with prompt templating and data loaders |
| **ai-parse-profile** | GPT-4 profile parsing from freeform signup text |
| **ai-signup-guest** | AI-powered guest signup flow |

### Communication Functions

| Function | Purpose | Provider |
|----------|---------|----------|
| **send-email** | Templated emails | SendGrid |
| **send-sms** | Templated SMS | Twilio |
| **slack** | Slack webhook integration | Slack API |

### Sync & Orchestration

| Function | Purpose |
|----------|---------|
| **bubble_sync** | Process sync_queue, push data FROM Supabase TO Bubble |
| **bubble-proxy** | Legacy Bubble API proxy (being deprecated) |
| **workflow-enqueue** | Entry point for workflow orchestration |
| **workflow-orchestrator** | pgmq-based workflow processor |

### Shared Utilities (`_shared/`)

| Utility | Purpose |
|---------|---------|
| **cors.ts** | CORS headers configuration |
| **errors.ts** | Custom error classes (BubbleApiError, ValidationError, etc.) |
| **validation.ts** | Input validation (email, phone, required fields) |
| **slack.ts** | ErrorCollector class for consolidated Slack reporting |
| **queueSync.ts** | Queue-based Bubble sync utilities |
| **bubbleSync.ts** | BubbleSyncService (Write-Read-Write atomic pattern) |
| **openai.ts** | OpenAI API wrapper (complete, stream) |
| **junctionHelpers.ts** | Junction table dual-write helpers |
| **messagingHelpers.ts** | Native Supabase messaging operations |

---

## Four-Layer Logic System

Business logic is separated into four distinct layers in `app/src/logic/`:

### Layer 1: Calculators (`logic/calculators/`)

Pure mathematical functions with no side effects.

**Naming convention**: `calculate*`, `get*`

| Subdirectory | Examples |
|--------------|----------|
| `pricing/` | `calculateFourWeekRent`, `calculateGuestFacingPrice`, `calculateReservationTotal` |
| `scheduling/` | `calculateCheckInOutDays`, `calculateNextAvailableCheckIn`, `calculateNightsFromDays` |

### Layer 2: Rules (`logic/rules/`)

Boolean predicates that enforce business rules.

**Naming convention**: `is*`, `can*`, `has*`, `should*`

| Subdirectory | Examples |
|--------------|----------|
| `auth/` | `isSessionValid`, `isProtectedPage` |
| `proposals/` | `canAcceptProposal`, `canCancelProposal`, `determineProposalStage` |
| `scheduling/` | `isDateBlocked`, `isDateInRange`, `isScheduleContiguous` |
| `users/` | `hasProfilePhoto`, `isGuest`, `isHost` |

### Layer 3: Processors (`logic/processors/`)

Data transformation functions ("Truth" layer - no fallback patterns).

**Naming convention**: `adapt*`, `extract*`, `process*`, `format*`

| Subdirectory | Examples |
|--------------|----------|
| `display/` | `formatHostName` |
| `listing/` | `extractListingCoordinates`, `parseJsonArrayField` |
| `user/` | `processProfilePhotoUrl`, `processUserData`, `processUserInitials` |

### Layer 4: Workflows (`logic/workflows/`)

Orchestration functions that compose multiple layers.

**Naming convention**: `*Workflow`

| Subdirectory | Examples |
|--------------|----------|
| `auth/` | `checkAuthStatusWorkflow`, `validateTokenWorkflow` |
| `booking/` | `acceptProposalWorkflow`, `cancelProposalWorkflow` |
| `scheduling/` | `validateMoveInDateWorkflow`, `validateScheduleWorkflow` |

### Design Principles

- No React dependencies in logic layer
- No JSX allowed
- No fallback patterns (`||`, `??`, silent try-catch)
- Named parameters for clarity
- 100% unit testable

---

## Database

### Sync Queue System

Supabase-to-Bubble sync via queue table:

```
Supabase -> sync_queue -> bubble_sync -> Bubble API
                ^
        pg_cron (5 min) or immediate trigger
```

### Workflow Orchestration

pgmq-based workflow execution:

```
Frontend -> workflow-enqueue -> pgmq -> workflow-orchestrator -> Edge Functions
```

### Key Migrations

| Migration | Purpose |
|-----------|---------|
| sync_queue | Pending operations for Bubble sync |
| sync_config | Table-to-workflow mappings |
| workflow_definitions | Named workflow configurations |
| workflow_executions | Execution tracking |
| notification_preferences | User notification settings |

### Important Constraints

The `listing` table has **12 FK constraints**. When updating:

```javascript
// BAD - Causes 409 errors
await updateListing(id, formData);

// GOOD - Only send changed fields
const changedFields = {};
for (const [key, value] of Object.entries(formData)) {
  if (value !== originalData[key]) {
    changedFields[key] = value;
  }
}
await updateListing(id, changedFields);
```

---

## Development

### Adding a New Page

1. Add route to `app/src/routes.config.js`
2. Create HTML file in `public/`
3. Create JSX entry point in `src/`
4. Create page component in `src/islands/pages/`
5. Run `bun run generate-routes`

### Adding an Edge Function

1. Create folder in `supabase/functions/`
2. Add to `supabase/config.toml`
3. Use shared utilities from `_shared/`
4. Deploy: `supabase functions deploy <name>`

### Code Style

- Use modern ES6+ features
- Prefer `const` over `let`
- Use template literals
- Use destructuring and optional chaining
- Follow Hollow Component pattern for pages

---

## Deployment

### Cloudflare Pages

```bash
# Manual deployment
npx wrangler pages deploy dist --project-name splitlease

# Or use Claude slash command
/deploy
```

### Edge Functions

```bash
# Deploy all
supabase functions deploy

# Deploy specific function
supabase functions deploy auth-user

# View logs
supabase functions logs auth-user
```

---

## Documentation

### Documentation Hierarchy

| File | Use For |
|------|---------|
| `.claude/Documentation/miniCLAUDE.md` | Quick reference, simple tasks |
| `.claude/Documentation/largeCLAUDE.md` | Full context, complex tasks |
| `app/CLAUDE.md` | Frontend architecture details |
| `supabase/CLAUDE.md` | Edge Functions reference |

### Documentation Structure

```
.claude/Documentation/
+-- miniCLAUDE.md          # Quick reference (17KB)
+-- largeCLAUDE.md         # Full context (55KB)
+-- Architecture/          # Core architecture guides
+-- Auth/                  # Authentication patterns
+-- Backend(EDGE - Functions)/ # Edge Function docs
+-- Database/              # Schema and relations
+-- External/              # Google Maps, Hotjar
+-- Pages/                 # Page-specific references
+-- Routing/               # Route configuration
```

### Key Topics by Document

| Topic | Primary Document |
|-------|------------------|
| Authentication patterns | `Auth/AUTH_GUIDE.md` |
| Routing configuration | `Routing/ROUTING_GUIDE.md` |
| Edge Function development | `Backend(EDGE - Functions)/README.md` |
| Database schema | `Database/DATABASE_TABLES_DETAILED.md` |
| Foreign key constraints | `Database/REFERENCE_TABLES_FK_FIELDS.md` |
| Google Maps integration | `External/GOOGLE_MAPS_API_IMPLEMENTATION.md` |

---

## Rules

### DO

- Use Edge Functions for all API calls (never call external APIs from frontend)
- Run `bun run generate-routes` after any route changes
- Commit after each meaningful change (do not push unless asked)
- Use 0-indexed days (0=Sunday through 6=Saturday) everywhere
- Use the four-layer logic architecture for business logic
- Send only changed fields when updating database records
- Log full error details on database errors

### DON'T

- Expose API keys in frontend code
- Use `git push --force` or push to main without review
- Modify database tables without explicit instruction
- Add fallback mechanisms when things fail
- Over-engineer for hypothetical future needs
- Manually edit `_redirects` or `_routes.json` (auto-generated)

---

## Contributing

### Development Principles

1. **No Fallback Mechanisms**: Return real data or null, never hardcoded demo data
2. **Match Solution to Scale**: Don't over-engineer for hypothetical needs
3. **Work Within Constraints**: If something is hard, it's often a design signal
4. **Be Direct**: Code should clearly express intent

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: Add new feature description"

# Push (only when asked)
git push origin feature/your-feature-name
```

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `chore:` - Build process, dependencies

---

**Last Updated**: 2025-12-18
**Status**: Active Development (Bubble.io -> Supabase Edge Functions migration in progress)
