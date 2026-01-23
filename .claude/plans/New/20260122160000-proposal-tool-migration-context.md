# Proposal Tool Migration - Classification & Context

**Classification**: BUILD

**Date**: 2026-01-22

## Raw Request Summary

Integrate external proposal management tool (GitHub: `_proposal-manage.git`) into Split Lease codebase.

### External Tool Details
- React 18 + Vite app
- Features: advanced filtering, quick proposal creation wizard, status management, reminders
- Mock data with planned REST API integration
- React Router for routing
- axios for HTTP calls
- Various React UI libraries

### Target Integration Context
- Islands Architecture (React 18 + Vite, full-page loads)
- Supabase Edge Functions backend
- Route Registry: `routes.config.js`
- Hollow Component Pattern: Components contain NO logic, delegate to `useXxxPageLogic` hooks
- Four-layer logic: calculators → rules → processors → workflows
- Existing proposal Edge Functions and services available

## Architecture Mismatch Analysis

| Aspect | External Tool | Split Lease | Integration Need |
|--------|---------------|-------------|-----------------|
| Routing | React Router (SPA) | Islands + Route Registry | Register as new island page, remove Router |
| API Calls | axios to REST APIs | Supabase Edge Functions | Map to existing Edge Functions, create Edge Functions wrapper if needed |
| Component Pattern | Stateful components | Hollow components with logic hooks | Extract logic into `useXxxPageLogic` hooks |
| Logic Organization | Mixed in components | Four-layer (calc/rules/proc/workflows) | Refactor to match layers |
| Authentication | TBD in external tool | Supabase Auth via `app/src/lib/auth.js` | Integrate auth checks in logic hooks |
| State Management | Likely useState/context | Hooks + logic layers | Adapt to logic hook pattern |

## Scope Definition

### Phase 1: Analysis & Planning
- Inventory external tool components and features
- Map features to existing Split Lease proposal infrastructure
- Identify code reuse candidates vs. complete rewrites
- Plan route registration and page structure
- Define API/Edge Function mappings

### Phase 2: Core Integration
- Create/adapt page component(s) in Islands architecture
- Implement logic hooks following four-layer pattern
- Register routes in `routes.config.js`
- Map API calls to existing Edge Functions
- Implement authentication integration

### Phase 3: Feature Adaptation
- Adapt filtering/search logic
- Integrate proposal creation wizard
- Implement status management
- Add reminder functionality
- Ensure all features work within Islands constraints

### Phase 4: Testing & Refinement
- Test full-page loads and navigation
- Verify API integration with real Edge Functions
- Security/auth validation
- Performance optimization

## Critical Constraints

1. **No React Router**: Islands architecture uses full-page loads, not client-side routing
2. **Edge Functions Only**: All API calls must go through Supabase Edge Functions, not direct axios
3. **Hollow Components**: Page components must be dumb shells delegating to logic hooks
4. **No Fallback Mechanisms**: If Edge Functions fail, surface real errors (per "Building for Truth")
5. **Authentication**: Must integrate with existing Supabase Auth
6. **Database**: Must work within existing Supabase schema and replica Bubble.io constraints

## Files to Reference

- `app/src/routes.config.js` - Route registry
- `app/src/lib/auth.js` - Authentication utilities
- `app/src/lib/supabase.js` - Supabase client
- `app/src/islands/pages/` - Page component examples
- `app/src/islands/shared/` - Shared component patterns
- `app/src/logic/` - Four-layer logic examples
- `supabase/functions/proposal/` - Existing proposal Edge Functions
- External repo: `_proposal-manage.git` - Source tool for analysis
