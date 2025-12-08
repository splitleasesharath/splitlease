# Split Lease - Root Project Guide

**GENERATED**: 2025-11-26
**REPOSITORY**: https://github.com/splitleasesharath/splitlease
**BRANCH**: main
**OPTIMIZATION**: Semantic Searchability + Digestibility

---

## ### QUICK_STATS ###

[TOTAL_FILES]: 150+ source files
[DATABASE_TABLES]: 93 Supabase PostgreSQL tables
[ENTRY_POINTS]: 19 JSX files (React page mounts)
[EDGE_FUNCTIONS]: 4 main functions + 7 shared utilities
[CUSTOM_COMMANDS]: 40+ Claude slash commands
[PRIMARY_LANGUAGE]: JavaScript/TypeScript + React

---

## ### PROJECT_IDENTITY ###

[PROJECT_TYPE]: Flexible Rental Marketplace for NYC Properties
[FRONTEND]: React 18 + Vite (Islands Architecture) in `app/`
[BACKEND]: Supabase (PostgreSQL + Edge Functions)
[LEGACY_BACKEND]: Bubble.io (migrating to Edge Functions)
[DEPLOYMENT]: Cloudflare Pages
[NODE_VERSION]: 18

---

## ### DEPENDENCY_GRAPH ###

```
Frontend (app/) ──> Page Components ──> Shared Components
       │                    │                   │
       └────────────────────┼───────────────────┘
                            ▼
              Logic Layer (logic/)
              ┌─────────────────────┐
              │ 1. Calculators      │ ← Pure math functions
              │ 2. Rules            │ ← Boolean predicates
              │ 3. Processors       │ ← Data transformers
              │ 4. Workflows        │ ← Orchestration
              └─────────────────────┘
                            │
                            ▼
              Edge Functions (supabase/functions/)
                            │
                            ▼
              Bubble.io API (legacy backend)
```

---

## ### DIRECTORY_STRUCTURE ###

### /
[INTENT]: Project root containing configuration, documentation, and subdirectories
[KEY_FILES]: CLAUDE.md, package.json, .pages.toml, build.sh, DATABASE_SCHEMA_OVERVIEW.md

### /app
[INTENT]: Main React frontend application using Islands Architecture
[ENTRY_POINTS]: 19 JSX files mounting React components to HTML pages
[COMPONENTS]: 35+ reusable UI components
[LOGIC_LAYERS]: calculators, rules, processors, workflows
[DETAILED_GUIDE]: app/CLAUDE.md

### /supabase
[INTENT]: Backend infrastructure with Edge Functions and database configuration
[EDGE_FUNCTIONS]: bubble-proxy, auth-user, ai-gateway, ai-signup-guest
[SHARED_UTILITIES]: cors.ts, errors.ts, validation.ts, bubbleSync.ts, openai.ts, types.ts

### /docs
[INTENT]: Migration plans, implementation guides, architecture documentation
[FILES]: 18+ markdown documents including migration status and API enumeration

### /.claude
[INTENT]: Claude Code configuration, custom slash commands, execution logs
[COMMANDS]: 40+ custom commands for deployment, testing, and development

### /Context
[INTENT]: Architecture reference guides including four-layer logic system documentation

---

## ### CONFIGURATION_FILES ###

### package.json
[INTENT]: Root monorepo configuration with workspace scripts
[COMMANDS]: npm run dev, npm run build, npm run preview
[DEPENDENCIES]: Delegates to app/package.json

### .pages.toml
[INTENT]: Cloudflare Pages deployment configuration
[BUILD_COMMAND]: npm run build
[BUILD_DIRECTORY]: app
[OUTPUT_DIRECTORY]: dist

### build.sh
[INTENT]: Shell script automating production build with error handling
[DEPENDENCIES]: app/package.json, vite.config.js

### .node-version
[INTENT]: Lock Node.js version to 18 for consistent builds

### .gitignore
[INTENT]: Exclude node_modules, dist, .env, IDE files from version control

---

## ### EDGE_FUNCTIONS_INVENTORY ###

### supabase/functions/bubble-proxy
[INTENT]: General Bubble API proxy routing listing, messaging, photos, referral, and signup requests
[HANDLERS]: listing.ts, messaging.ts, photos.ts, referral.ts, signup.ts
[DEPENDENCIES]: _shared/bubbleSync, _shared/cors, _shared/validation

### supabase/functions/auth-user
[INTENT]: Native Supabase Auth for login/signup, with legacy Bubble support for logout/validate
[HANDLERS]: login.ts, signup.ts, logout.ts, validate.ts
[DEPENDENCIES]: Supabase Auth (native), _shared/cors, _shared/errors

### supabase/functions/ai-gateway
[INTENT]: AI service gateway routing requests to completion or streaming handlers
[HANDLERS]: complete.ts, stream.ts
[DEPENDENCIES]: _shared/openai, prompts/_registry

### supabase/functions/ai-signup-guest
[INTENT]: AI-powered guest signup flow generating personalized market research reports
[DEPENDENCIES]: _shared/openai, _shared/cors

### supabase/functions/_shared
[INTENT]: Shared utilities across all Edge Functions
[FILES]: cors.ts, errors.ts, validation.ts, bubbleSync.ts, openai.ts, types.ts, aiTypes.ts

---

## ### REQUIRED_SECRETS ###

[CONFIGURE_IN]: Supabase Dashboard > Project Settings > Secrets

### BUBBLE_API_BASE_URL
[VALUE]: https://app.split.lease/version-test/api/1.1
[USED_BY]: bubble-proxy, auth-user (logout/validate only)

### BUBBLE_API_KEY
[VALUE]: See supabase/SECRETS_SETUP.md
[USED_BY]: All Bubble API calls

### SUPABASE_SERVICE_ROLE_KEY
[VALUE]: From Supabase Dashboard
[USED_BY]: Server-side operations requiring elevated permissions

---

## ### ENVIRONMENT_VARIABLES ###

### Root .env (CLI tools)
[GITHUB_PAT]: GitHub personal access token
[CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR]: true
[E2B_API_KEY]: E2B sandbox API key

### app/.env (Frontend)
[VITE_SUPABASE_URL]: Supabase project URL for database and Edge Function calls
[VITE_SUPABASE_ANON_KEY]: Supabase anonymous key for client-side authentication
[VITE_GOOGLE_MAPS_API_KEY]: Google Maps API key for map components

---

## ### DATABASE_OVERVIEW ###

[TOTAL_TABLES]: 93 Supabase PostgreSQL tables
[SCHEMA_REFERENCE]: DATABASE_SCHEMA_OVERVIEW.md

### Core Tables
[user / users]: User accounts
[listing]: Property listings
[proposal / proposals]: Booking proposals
[virtualmeetingschedulesandlinks]: Video call scheduling

### Lookup Tables
[zat_geo_borough_toplevel]: NYC boroughs
[zat_geo_hood_mediumlevel]: Neighborhoods
[zat_features_amenity]: Amenities
[zat_features_houserule]: House rules
[informational_texts]: CMS content

---

## ### ARCHITECTURE_PATTERNS ###

### Four-Layer Logic Architecture
[LAYER_1_CALCULATORS]: Pure mathematical functions with no side effects
[LAYER_2_RULES]: Boolean predicates expressing business rules
[LAYER_3_PROCESSORS]: Data transformation and adaptation
[LAYER_4_WORKFLOWS]: Orchestration combining lower layers
[LOCATION]: app/src/logic/

### Hollow Component Pattern
[DEFINITION]: UI components delegate all business logic to custom hooks
[EXAMPLE]: ViewSplitLeasePage.jsx uses useViewSplitLeasePageLogic.js
[BENEFIT]: Separation of concerns, testable logic

### Day Indexing Convention (CRITICAL)
[JAVASCRIPT_FORMAT]: 0=Sunday, 1=Monday, 2=Tuesday... 6=Saturday
[BUBBLE_API_FORMAT]: 1=Sunday, 2=Monday, 3=Tuesday... 7=Saturday
[CONVERSION_FROM_BUBBLE]: adaptDaysFromBubble() in app/src/logic/processors/external/
[CONVERSION_TO_BUBBLE]: adaptDaysToBubble() in app/src/logic/processors/external/
[CRITICAL_NOTE]: Always convert at system boundaries when interfacing with Bubble API

---

## ### BUILD_DEPLOYMENT ###

### Local Development
[COMMAND]: npm run dev
[URL]: http://localhost:5173

### Production Build
[COMMAND]: npm run build
[OUTPUT]: app/dist/
[ALTERNATIVE]: ./build.sh

### Cloudflare Pages Deployment
[CONFIG_FILE]: .pages.toml
[TRIGGER]: Auto-deploy on push to main
[MANUAL]: /deploy Claude slash command

### Deploy Slash Command
[COMMAND]: /deploy
[STEPS]: Commit changes > Build with auto-fix > Deploy to Cloudflare Pages > Push to GitHub

---

## ### GIT_WORKFLOW ###

[MAIN_BRANCH]: main (production deployments)
[STAGING_BRANCH]: development (staging environment)
[REMOTE]: https://github.com/splitleasesharath/splitlease.git
[COMMIT_STYLE]: Conventional (feat, fix, chore, docs)
[RULE]: Commit after each meaningful change, do not push unless explicitly asked

---

## ### CLAUDE_CODE_CONFIGURATION ###

### Allowed Operations
[BASH_COMMANDS]: mkdir, uv, find, mv, grep, npm, ls, cp, chmod, touch
[SCRIPTS]: ./scripts/copy_dot_env.sh
[TOOLS]: Write tool

### Blocked Operations
[FORBIDDEN]: git push --force, git push -f, rm -rf

### Custom Slash Commands
[/deploy]: Build and deploy to Cloudflare Pages
[/preview]: Start dev server and open browser
[/prime]: Project initialization and context loading
[/splitlease]: Project-specific operations

---

## ### MIGRATION_STATUS ###

[FROM]: Bubble.io
[TO]: Supabase Edge Functions
[STATUS]: In progress

### Completed Migrations
[AUTH]: login, signup via native Supabase Auth (auth-user), logout/validate via Bubble (legacy)
[API_PROXY]: General Bubble API calls via bubble-proxy
[AI_GATEWAY]: AI service gateway via ai-gateway

### Migration Documentation
[PLAN]: docs/MIGRATION_PLAN_BUBBLE_TO_EDGE.md
[STATUS]: docs/MIGRATION_STATUS.md
[API_REFERENCE]: docs/BUBBLE_WORKFLOW_API_ENUMERATION.md

---

## ### CORE_PRINCIPLES ###

### No Fallback Mechanisms
[RULE]: When encountering errors, return null or throw descriptive errors
[FORBIDDEN]: Fallback logic, workarounds, hardcoded demo data
[RATIONALE]: Fallbacks mask real problems and create technical debt

### Match Solution to Scale
[RULE]: Build for current requirements, not hypothetical future needs
[FORBIDDEN]: Over-engineering, premature abstractions
[RATIONALE]: Simple solutions are easier to maintain and modify

### Embrace Constraints
[RULE]: Work within natural boundaries of tools and architecture
[SIGNAL]: If something is difficult, question whether you're fighting the design
[RATIONALE]: Friction often indicates a design mismatch

### Be Direct
[RULE]: Choose simple, direct solutions over clever abstractions
[REQUIREMENT]: Code should do exactly what it says, nothing more
[RATIONALE]: Future maintainers need clear, obvious code

---

## ### DEVELOPMENT_DOS ###

[USE_EDGE_FUNCTIONS]: All Bubble API calls must go through Edge Functions
[CONFIGURE_SECRETS]: Store API keys in Supabase Dashboard, never in code
[FOLLOW_LOGIC_ARCHITECTURE]: Use four-layer logic system in app/src/logic/
[COMMIT_REGULARLY]: Commit after each meaningful change
[VERIFY_BUILDS]: Check build succeeds before pushing
[UPDATE_DOCS]: Update relevant documentation when changing architecture
[CHECK_SCHEMA]: Reference DATABASE_SCHEMA_OVERVIEW.md before modifying tables

---

## ### DEVELOPMENT_DONTS ###

[NEVER_EXPOSE_KEYS]: API keys must not appear in frontend code
[NEVER_DIRECT_BUBBLE_CALLS]: Frontend cannot call Bubble API directly
[NEVER_FORCE_PUSH]: git push --force is forbidden
[NEVER_RM_RF]: Destructive commands are forbidden
[NO_FALLBACK_MECHANISMS]: Never add fallback logic or workarounds
[NO_COMPATIBILITY_LAYERS]: Solve root issues, don't add shims
[NO_PREMATURE_ABSTRACTIONS]: Don't create helpers for one-time operations
[NO_FUTURE_SPECULATION]: Don't design for hypothetical requirements
[NO_TABLE_MODIFICATION]: Don't modify Supabase tables without explicit instruction
[NO_RLS_BYPASS]: Don't bypass Row Level Security policies
[NO_HARDCODED_IDS]: Don't hardcode IDs in migrations

---

## ### TROUBLESHOOTING ###

### Build Fails
[CHECK_1]: Node version matches .node-version (18)
[CHECK_2]: Run npm install in app/ directory
[CHECK_3]: Look for TypeScript errors in console output
[CHECK_4]: Review /deploy command logs in .claude/logs/

### Edge Function Errors
[CHECK_1]: Verify secrets are set in Supabase Dashboard
[CHECK_2]: Check function logs: supabase functions logs <function-name>
[CHECK_3]: Test locally: supabase functions serve

### Authentication Issues
[CHECK_1]: Check auth-user Edge Function logs
[CHECK_2]: Verify Supabase Auth configuration in Dashboard
[CHECK_3]: Check browser console for detailed error messages

### Database Connection
[CHECK_1]: Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in app/.env
[CHECK_2]: Check RLS policies if queries return empty
[CHECK_3]: Use Supabase Dashboard to verify data exists

---

## ### SUPPORT_DIRECTORIES ###

### Active Directories
[adws/]: Agent Development Workflow System (Python)
[.playwright-mcp/]: Playwright browser automation config
[ai_docs/]: AI-related documentation

### Temporary Directories (gitignored)
[input/]: Agent input data
[dump/]: Temporary output
[Context1/]: Working context files
[plan1/]: Branch-specific plans
[.temp-signup-login/]: Signup flow testing

### Placeholder Directories (empty)
[scripts/]: Project scripts (to be added)
[agents/]: Agent definitions (to be added)
[test-results/]: Test execution results
[test-screenshots/]: Visual regression screenshots
[specs/]: Feature specifications

---

## ### QUICK_REFERENCE ###

### Start Development
[COMMAND]: npm run dev
[URL]: http://localhost:5173

### Deploy to Production
[COMMAND]: /deploy

### Check Database Schema
[FILE]: DATABASE_SCHEMA_OVERVIEW.md

### Edge Function Documentation
[SECRETS]: supabase/SECRETS_SETUP.md
[DEPLOYMENT]: docs/DEPLOY_EDGE_FUNCTION.md

### App-Specific Guide
[FILE]: app/CLAUDE.md

---

**DOCUMENT_VERSION**: 2.0
**LAST_UPDATED**: 2025-11-26
**STATUS**: LLM-Optimized for Semantic Searchability
