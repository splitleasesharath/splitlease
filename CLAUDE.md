# Split Lease - Root Project Guide

## Project Overview

Split Lease is a **flexible rental marketplace for NYC properties** built with:
- **Frontend**: React Islands Architecture with Vite (in `app/`)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Legacy Backend**: Bubble.io (being migrated to Edge Functions)
- **Deployment**: Cloudflare Pages

### Repository Structure
```
SL18/
├── app/                    # Frontend application (see app/CLAUDE.md)
├── supabase/               # Edge Functions & database config
├── docs/                   # Migration & implementation plans
├── .claude/                # Claude Code configuration & commands
├── Context/                # Architecture reference guides
└── [config files]          # Build, deploy, environment
```

---

## Directory Reference

### Core Application
| Directory | Purpose |
|-----------|---------|
| `app/` | Vite + React frontend (see `app/CLAUDE.md` for details) |
| `app/dist/` | Production build output |

### Backend Infrastructure
| Directory | Purpose |
|-----------|---------|
| `supabase/` | Supabase project configuration |
| `supabase/functions/` | Deno Edge Functions |
| `supabase/functions/_shared/` | Shared utilities across functions |

### Configuration
| File | Purpose |
|------|---------|
| `package.json` | Root monorepo scripts |
| `.pages.toml` | Cloudflare Pages deployment config |
| `build.sh` | Build script for deployment |
| `.env` | Environment variables (sensitive) |
| `.node-version` | Node.js version lock (18) |

### Documentation
| Path | Purpose |
|------|---------|
| `README.md` | Comprehensive project documentation |
| `PROJECT_STRUCTURE.md` | Detailed directory breakdown |
| `DATABASE_SCHEMA_OVERVIEW.md` | 93-table schema reference |
| `docs/` | Migration plans & implementation guides |
| `Context/` | Architecture reference (ESM + React Islands) |

### Claude Code
| Path | Purpose |
|------|---------|
| `.claude/settings.json` | Permissions & restrictions |
| `.claude/commands/` | Custom slash commands |
| `.claude/tasks/` | Task definitions |

---

## Supabase Edge Functions

### Function Inventory
```
supabase/functions/
├── _shared/              # Shared utilities
│   ├── cors.ts           # CORS handling
│   ├── errors.ts         # Error types
│   ├── validation.ts     # Input validation
│   ├── bubbleSync.ts     # Bubble.io sync
│   ├── openai.ts         # OpenAI integration
│   └── types.ts          # Shared types
├── bubble-proxy/         # General Bubble API proxy
├── bubble-auth-proxy/    # Authentication proxy (login, signup, logout, validate)
├── ai-gateway/           # AI service gateway
└── ai-signup-guest/      # AI-powered guest signup
```

### Required Secrets
Configure in Supabase Dashboard → Project Settings → Secrets:

| Secret | Value |
|--------|-------|
| `BUBBLE_API_BASE_URL` | `https://app.split.lease/version-test/api/1.1` |
| `BUBBLE_API_KEY` | (see `supabase/SECRETS_SETUP.md`) |
| `BUBBLE_AUTH_BASE_URL` | `https://upgradefromstr.bubbleapps.io/api/1.1` |
| `SUPABASE_SERVICE_ROLE_KEY` | (from Supabase Dashboard) |

### Deploying Edge Functions
```bash
# Deploy single function
supabase functions deploy bubble-proxy

# Deploy all functions
supabase functions deploy
```

See `docs/DEPLOY_EDGE_FUNCTION.md` for detailed guide.

---

## Build & Deployment

### Local Development
```bash
# Install dependencies and start dev server
npm run dev

# Preview production build locally
npm run preview
```

### Production Build
```bash
# Full production build
npm run build

# Or use build script
./build.sh
```

### Cloudflare Pages Deployment
Configured in `.pages.toml`:
- Build command: `npm run build`
- Build directory: `app`
- Output directory: `dist`
- Node version: 20

### Deployment via Claude Command
Use the `/deploy` slash command which:
1. Commits all changes
2. Builds with auto-fix (max 3 attempts)
3. Deploys to Cloudflare Pages
4. Pushes fixes to GitHub

---

## Claude Code Configuration

### Allowed Operations
From `.claude/settings.json`:
- Bash: `mkdir`, `uv`, `find`, `mv`, `grep`, `npm`, `ls`, `cp`, `chmod`, `touch`
- `./scripts/copy_dot_env.sh`
- Write tool

### Blocked Operations
- `git push --force` / `git push -f`
- `rm -rf`

### Custom Slash Commands
| Command | Purpose |
|---------|---------|
| `/deploy` | Build and deploy to Cloudflare Pages |
| `/preview` | Start dev server and open browser |
| `/prime` | Project initialization |
| `/splitlease` | Project-specific operations |

---

## Git Workflow

### Branches
- `main` → Production
- `development` → Staging
- `sl18` → Current feature branch (this branch)

### Remote
```
origin: https://github.com/splitleasesharath/splitlease.git
```

### Commit Convention
After each change, commit to the current branch. Do not push unless explicitly asked.

---

## Database Overview

The project uses **93 Supabase tables**. Key categories:

### Core Tables
| Table | Purpose |
|-------|---------|
| `user` / `users` | User accounts |
| `listing` | Property listings |
| `proposal` / `proposals` | Booking proposals |
| `virtualmeetingschedulesandlinks` | Video call scheduling |

### Feature Lookups
| Table | Purpose |
|-------|---------|
| `zat_geo_borough_toplevel` | NYC boroughs |
| `zat_geo_hood_mediumlevel` | Neighborhoods |
| `zat_features_amenity` | Amenities |
| `zat_features_houserule` | House rules |

See `DATABASE_SCHEMA_OVERVIEW.md` for complete reference.

---

## Environment Variables

### Root `.env` (for CLI tools)
```
GITHUB_PAT=<token>
CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=true
E2B_API_KEY=<key>
```

### App Environment (app/.env)
```
VITE_SUPABASE_URL=<url>
VITE_SUPABASE_ANON_KEY=<key>
VITE_GOOGLE_MAPS_API_KEY=<key>
```

Note: Bubble API keys are stored in Supabase Secrets, NOT in environment files.

---

## Migration Status

The project is migrating from Bubble.io to Supabase Edge Functions.

### Completed Migrations
- Authentication (login, signup, logout, validate)
- General API proxy
- AI gateway

### Documentation
- `docs/MIGRATION_PLAN_BUBBLE_TO_EDGE.md` - Overall plan
- `docs/MIGRATION_STATUS.md` - Current progress
- `docs/BUBBLE_WORKFLOW_API_ENUMERATION.md` - Bubble API reference

---

## Core Principles

### No Fallback Mechanisms
When encountering errors or edge cases:
- Return `null` or throw descriptive errors
- Never add fallback logic or workarounds
- Never return hardcoded demo data

### Match Solution to Scale
- Don't over-engineer for hypothetical future needs
- Keep solutions simple and direct
- Build for current requirements, not speculation

### Embrace Constraints
- Work within the natural boundaries of tools and architecture
- If something is difficult, question whether you're fighting the design

### Be Direct
- Choose simple, direct solutions over clever abstractions
- Code should do exactly what it says, nothing more

---

## DO's

### Development
- Use Edge Functions for all Bubble API calls
- Configure secrets in Supabase Dashboard (never in code)
- Follow the four-layer logic architecture in `app/src/logic/`
- Commit after each meaningful change

### Deployment
- Use `/deploy` command for production releases
- Verify build succeeds before pushing
- Check Cloudflare Pages dashboard for deployment status

### Documentation
- Update relevant docs when changing architecture
- Reference `DATABASE_SCHEMA_OVERVIEW.md` before adding tables
- Check `docs/` for existing migration plans

---

## DON'Ts

### Development
- Never expose API keys in frontend code
- Never call Bubble API directly from frontend
- Never use force push (`git push --force`)
- Never use destructive commands (`rm -rf`)

### Architecture
- Don't add fallback mechanisms
- Don't add compatibility layers
- Don't create abstractions for one-time operations
- Don't design for hypothetical future requirements

### Database
- Don't modify Supabase tables without explicit instruction
- Don't bypass RLS policies
- Don't hardcode IDs in migrations

---

## Quick Reference

### Start Development
```bash
npm run dev
# Opens at http://localhost:5173
```

### Deploy to Production
```
/deploy
```

### Check Database Schema
```
DATABASE_SCHEMA_OVERVIEW.md
```

### Edge Function Documentation
```
supabase/SECRETS_SETUP.md
docs/DEPLOY_EDGE_FUNCTION.md
```

### App-Specific Guide
```
app/CLAUDE.md
```

---

## Support Directories

### Active
| Directory | Purpose |
|-----------|---------|
| `adws/` | Agent Development Workflow System (Python) |
| `.playwright-mcp/` | Playwright browser automation config |
| `ai_docs/` | AI-related documentation |

### Temporary (gitignored)
| Directory | Purpose |
|-----------|---------|
| `input/` | Agent input data |
| `dump/` | Temporary output |
| `Context1/` | Working context files |
| `plan1/` | Branch-specific plans |
| `.temp-signup-login/` | Signup flow testing |

### Empty (placeholder)
| Directory | Purpose |
|-----------|---------|
| `scripts/` | Project scripts (to be added) |
| `agents/` | Agent definitions (to be added) |
| `test-results/` | Test execution results |
| `test-screenshots/` | Visual regression screenshots |
| `specs/` | Feature specifications |

---

## Troubleshooting

### Build Fails
1. Check Node version matches `.node-version` (18)
2. Run `npm install` in `app/` directory
3. Check for TypeScript errors in console output
4. Review `/deploy` command logs in `.claude/logs/`

### Edge Function Errors
1. Verify secrets are set in Supabase Dashboard
2. Check function logs: `supabase functions logs <function-name>`
3. Test locally: `supabase functions serve`

### Authentication Issues
1. Check `bubble-auth-proxy` Edge Function logs
2. Verify `BUBBLE_AUTH_BASE_URL` secret is correct
3. Check browser console for detailed error messages

### Database Connection
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `app/.env`
2. Check RLS policies if queries return empty
3. Use Supabase Dashboard to verify data exists
