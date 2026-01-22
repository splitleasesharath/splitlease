# Implementation Plan: AI Tools Migration (HeyGen, ElevenLabs, Jingles)

## Overview
Migrate AI tools functionality (HeyGen deepfake generation, ElevenLabs voice-over creation, and jingle generation) from the external `_jingles-deepfakes-request` repository into the Split Lease codebase following Islands Architecture, Four-Layer Logic pattern, and Edge Function proxying conventions.

## Success Criteria
- [ ] New `/ai-tools` route accessible to authenticated hosts
- [ ] HeyGen deepfake generation workflow functional with Edge Function proxy
- [ ] ElevenLabs narration generation workflow functional with Edge Function proxy
- [ ] Jingle generation workflow functional with Edge Function proxy
- [ ] All AI API keys secured in Edge Functions (never exposed in frontend)
- [ ] Database schema supports deepfakes, narrations, and jingles
- [ ] House manual attachment workflows complete
- [ ] Admin-only page protection enforced
- [ ] No fallback mechanisms - proper error surfacing

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/routes.config.js` | Route registry | Add `/ai-tools` route definition |
| `app/public/ai-tools.html` | NEW HTML entry point | Create new file |
| `app/src/ai-tools.jsx` | NEW JSX entry point | Create new file |
| `app/src/islands/pages/AiToolsPage/` | NEW page component folder | Create folder structure |
| `app/src/islands/pages/AiToolsPage/AiToolsPage.jsx` | NEW hollow page component | Create new file |
| `app/src/islands/pages/AiToolsPage/useAiToolsPageLogic.js` | NEW page logic hook | Create new file |
| `app/src/islands/pages/AiToolsPage/components/` | NEW section components | Create folder |
| `app/src/styles/ai-tools.css` | NEW page styles | Create new file |
| `supabase/functions/ai-tools/` | NEW Edge Function | Create new function |
| `supabase/functions/_shared/aiToolsTypes.ts` | NEW AI tools types | Create new file |
| `supabase/functions/house-manual/index.ts` | Existing house-manual function | Add AI attachment actions |

### Related Documentation
- `.claude/Documentation/largeCLAUDE.md` - Full architecture context
- `.claude/Documentation/Backend(EDGE - Functions)/AI_GATEWAY.md` - AI Gateway patterns
- `.claude/Documentation/Backend(EDGE - Functions)/HOUSE_MANUAL.md` - House manual function reference
- `supabase/functions/bubble_sync/lib/tableMapping.ts` - Existing table mappings (includes `housemanual`, `visit`, `narration`)

### Existing Patterns to Follow
- **Islands Architecture**: `app/src/islands/pages/HostOverviewPage/` - Admin dashboard pattern
- **Hollow Components**: `app/src/islands/pages/ListingDashboardPage/` - Logic in hook, UI in component
- **Edge Function Pattern**: `supabase/functions/ai-gateway/` - AI service proxying
- **Four-Layer Logic**: `app/src/logic/` - calculators, rules, processors, workflows

### External Repository Analysis
Source: `https://github.com/splitleasesharath/_jingles-deepfakes-request.git`

**Key Files Analyzed:**
- `src/types/index.ts` - Type definitions for HouseManual, Visit, HeyGenDeepfake, Narration, Jingle
- `src/services/api.ts` - API service structure (needs Edge Function proxying)
- `src/components/HeyGenSection.tsx` - HeyGen UI and workflows
- `src/components/ElevenLabsSection.tsx` - ElevenLabs UI and workflows
- `src/components/JingleSection.tsx` - Jingle UI and workflows
- `src/services/mockData.ts` - Mock data and sample content

## Implementation Steps

### Step 1: Database Schema Migration (New Tables)
**Files:** SQL migration file
**Purpose:** Create new tables for deepfakes and jingles (narration table already exists)

**Details:**
1. Create `heygen_deepfake` table with columns:
   - `id` (uuid, primary key)
   - `bubble_id` (text, unique)
   - `house_manual_id` (uuid, FK to housemanual)
   - `video_id` (text) - HeyGen video ID
   - `voice_id` (text) - HeyGen voice ID
   - `script` (text)
   - `video_token` (text) - HeyGen job token
   - `video_url` (text) - Final video URL
   - `status` (enum: pending, processing, completed, failed)
   - `created_at`, `updated_at` timestamps

2. Create `jingle` table with columns:
   - `id` (uuid, primary key)
   - `bubble_id` (text, unique)
   - `house_manual_id` (uuid, FK to housemanual)
   - `visit_id` (uuid, FK to visit, nullable)
   - `lyrics` (text)
   - `melody_preference` (enum: morning-melody, gentle-nighttime, etc.)
   - `content_preferences` (jsonb array)
   - `audio_url` (text)
   - `status` (enum: pending, processing, completed, failed)
   - `created_at`, `updated_at` timestamps

3. Verify `narration` table has required columns (may need migration)

**Validation:** Run migration locally, verify tables created

---

### Step 2: Create Route Entry
**Files:** `app/src/routes.config.js`
**Purpose:** Add AI Tools page to route registry

**Details:**
Add new route configuration:
```javascript
{
  path: '/_internal/ai-tools',
  file: 'ai-tools.html',
  aliases: ['/_internal/ai-tools.html', '/ai-tools'],
  protected: true,
  adminOnly: true,
  cloudflareInternal: false,
  internalName: 'ai-tools-view',
  hasDynamicSegment: false
}
```

**Validation:** Run `bun run generate-routes`, verify no errors

---

### Step 3: Create HTML Entry Point
**Files:** `app/public/ai-tools.html`
**Purpose:** HTML shell for AI Tools page

**Details:**
Create standard Split Lease HTML template:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Tools - Split Lease</title>
  <link rel="icon" type="image/png" href="/assets/images/favicon.png">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/ai-tools.jsx"></script>
</body>
</html>
```

**Validation:** File exists, references correct JSX entry

---

### Step 4: Create JSX Entry Point
**Files:** `app/src/ai-tools.jsx`
**Purpose:** React mount point following Islands Architecture

**Details:**
```javascript
import React from 'react';
import { createRoot } from 'react-dom/client';
import AiToolsPage from './islands/pages/AiToolsPage';

const root = createRoot(document.getElementById('root'));
root.render(<AiToolsPage />);
```

**Validation:** Entry point follows pattern, imports page component

---

### Step 5: Create Page Component Structure
**Files:** `app/src/islands/pages/AiToolsPage/` directory
**Purpose:** Create hollow component with logic hook following Split Lease patterns

**Details:**
Create directory structure:
```
AiToolsPage/
├── index.js                    # Barrel export
├── AiToolsPage.jsx             # Hollow component (UI only)
├── useAiToolsPageLogic.js      # All state, effects, handlers
├── types.js                    # TypeScript-like type definitions
└── components/
    ├── index.js
    ├── HeyGenSection.jsx       # Deepfake generation section
    ├── ElevenLabsSection.jsx   # Voice-over section
    └── JingleSection.jsx       # Jingle creation section
```

**Component Pattern (AiToolsPage.jsx):**
- Import Header, Footer from shared components
- Use `useAiToolsPageLogic()` hook for all logic
- Pure JSX rendering, no useState/useEffect in component
- Pass logic methods to child sections

**Validation:** Component follows hollow pattern, no logic in JSX

---

### Step 6: Create Page Logic Hook
**Files:** `app/src/islands/pages/AiToolsPage/useAiToolsPageLogic.js`
**Purpose:** Centralize all page state and logic

**Details:**
Hook should manage:
1. **Authentication check** - Verify user is admin
2. **Data fetching** - House manuals, visits, existing deepfakes/narrations/jingles
3. **Form state** - Selected house manual, script content, preferences
4. **API calls** - Through new Edge Function (not direct)
5. **Status polling** - Check HeyGen video status
6. **Error handling** - Surface errors, no fallbacks

**State structure:**
```javascript
const [houseManuals, setHouseManuals] = useState([]);
const [selectedHouseManual, setSelectedHouseManual] = useState('');
const [visits, setVisits] = useState([]);
const [selectedVisit, setSelectedVisit] = useState('');

// HeyGen state
const [deepfakes, setDeepfakes] = useState([]);
const [deepfakeForm, setDeepfakeForm] = useState({ videoId: '', voiceId: '', script: '' });
const [deepfakeStatus, setDeepfakeStatus] = useState({ loading: false, error: null });

// ElevenLabs state
const [narrations, setNarrations] = useState([]);
const [selectedNarrator, setSelectedNarrator] = useState('');
const [narrationScript, setNarrationScript] = useState('');
const [narrationStatus, setNarrationStatus] = useState({ loading: false, error: null });

// Jingle state
const [jingles, setJingles] = useState([]);
const [melodyPreference, setMelodyPreference] = useState('optimistic-commercial');
const [contentPreferences, setContentPreferences] = useState(['host-name', 'house-rules']);
const [jingleLyrics, setJingleLyrics] = useState('');
const [jingleStatus, setJingleStatus] = useState({ loading: false, error: null });
```

**Validation:** All state in hook, component receives only computed values and handlers

---

### Step 7: Create Edge Function for AI Tools
**Files:** `supabase/functions/ai-tools/` directory
**Purpose:** Proxy HeyGen and jingle generation APIs (ElevenLabs already has some support in house-manual)

**Details:**
Create new Edge Function structure:
```
ai-tools/
├── index.ts              # Router with action-based routing
├── deno.json             # Import map
└── handlers/
    ├── createDeepfake.ts           # Create deepfake record
    ├── generateDeepfakeScript.ts   # AI script generation (uses ai-gateway)
    ├── generateDeepfakeVideo.ts    # HeyGen API call
    ├── checkDeepfakeStatus.ts      # HeyGen status polling
    ├── getDeepfakeUrl.ts           # Get final video URL
    ├── attachDeepfake.ts           # Attach to house manual
    ├── generateNarrationScript.ts  # AI narration script (uses ai-gateway)
    ├── generateNarration.ts        # ElevenLabs API call
    ├── attachNarration.ts          # Attach to visit
    ├── generateJingleLyrics.ts     # AI jingle lyrics (uses ai-gateway)
    ├── createJingle.ts             # Jingle audio generation
    └── attachJingle.ts             # Attach to house manual
```

**Actions:**
```typescript
const ALLOWED_ACTIONS = [
  // Deepfake actions
  'create_deepfake',
  'generate_deepfake_script',
  'generate_deepfake_video',
  'check_deepfake_status',
  'get_deepfake_url',
  'attach_deepfake',
  // Narration actions
  'generate_narration_script',
  'generate_narration',
  'attach_narration',
  // Jingle actions
  'generate_jingle_lyrics',
  'create_jingle',
  'attach_jingle',
  // Data fetching
  'get_house_manuals',
  'get_deepfakes',
  'get_narrations',
  'get_jingles',
  'get_narrators',
] as const;
```

**Environment Variables Required:**
- `HEYGEN_API_KEY` - HeyGen API key (new)
- `ELEVENLABS_API_KEY` - ElevenLabs API key (may exist)
- `OPENAI_API_KEY` - For script generation (exists)

**Validation:** All external APIs called from Edge Function, no keys in frontend

---

### Step 8: Create Frontend API Service
**Files:** `app/src/lib/aiToolsService.js`
**Purpose:** Frontend client for ai-tools Edge Function

**Details:**
```javascript
import { supabase } from './supabase';

const callAiToolsFunction = async (action, payload) => {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tools`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ action, payload }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'AI Tools API error');
  }

  return response.json();
};

export const aiToolsService = {
  // House manuals
  getHouseManuals: () => callAiToolsFunction('get_house_manuals', {}),

  // Deepfakes
  createDeepfake: (houseManualId) =>
    callAiToolsFunction('create_deepfake', { houseManualId }),
  generateDeepfakeScript: (houseManualId) =>
    callAiToolsFunction('generate_deepfake_script', { houseManualId }),
  generateDeepfakeVideo: (deepfakeId, script) =>
    callAiToolsFunction('generate_deepfake_video', { deepfakeId, script }),
  checkDeepfakeStatus: (videoToken) =>
    callAiToolsFunction('check_deepfake_status', { videoToken }),
  getDeepfakeUrl: (deepfakeId) =>
    callAiToolsFunction('get_deepfake_url', { deepfakeId }),
  attachDeepfake: (deepfakeId, houseManualId) =>
    callAiToolsFunction('attach_deepfake', { deepfakeId, houseManualId }),

  // Narrations
  generateNarrationScript: (houseManualId, visitId, narratorId) =>
    callAiToolsFunction('generate_narration_script', { houseManualId, visitId, narratorId }),
  generateNarration: (houseManualId, visitId, narratorId, script) =>
    callAiToolsFunction('generate_narration', { houseManualId, visitId, narratorId, script }),
  attachNarration: (narrationId, visitId) =>
    callAiToolsFunction('attach_narration', { narrationId, visitId }),

  // Jingles
  generateJingleLyrics: (houseManualId, visitId, melodyPreference, contentPreferences) =>
    callAiToolsFunction('generate_jingle_lyrics', {
      houseManualId, visitId, melodyPreference, contentPreferences
    }),
  createJingle: (houseManualId, visitId, lyrics, melodyPreference, contentPreferences) =>
    callAiToolsFunction('create_jingle', {
      houseManualId, visitId, lyrics, melodyPreference, contentPreferences
    }),
  attachJingle: (jingleId, houseManualId) =>
    callAiToolsFunction('attach_jingle', { jingleId, houseManualId }),
};
```

**Validation:** All API calls go through Edge Function

---

### Step 9: Create Section Components
**Files:** `app/src/islands/pages/AiToolsPage/components/`
**Purpose:** UI sections matching original design

**Details:**

**HeyGenSection.jsx:**
- Three-column grid layout
- Column 1: Voice ID and Video ID creation
- Column 2: Script generation and video creation
- Column 3: Attach to house manual
- Use props from parent logic hook

**ElevenLabsSection.jsx:**
- Two-column grid layout
- Column 1: Narration script generation, narrator selection
- Column 2: Attach to visit, verification display
- Narrator dropdown with predefined options

**JingleSection.jsx:**
- Four-column grid layout
- Column 1: House manual and visit selection
- Column 2: Lyrics generation and jingle creation
- Column 3: Content and melody preferences
- Column 4: Attach to house manual

**Validation:** Components are pure UI, receive all data as props

---

### Step 10: Create Styles
**Files:** `app/src/styles/ai-tools.css`
**Purpose:** Page-specific styles matching external design

**Details:**
- Migrate CSS from external `src/styles/index.css`
- Convert CSS variables to match Split Lease `variables.css`
- Keep section-specific color coding (purple for HeyGen, cyan for ElevenLabs, amber for Jingles)
- Use existing Split Lease patterns for forms, buttons, status displays
- Responsive grid layouts

**Variable Mapping:**
```css
/* External → Split Lease */
--primary-color → var(--sl-primary)
--secondary-color → var(--sl-secondary)
--background-color → var(--sl-background)
--border-color → var(--sl-border)
```

**Validation:** Styles work with Split Lease design system

---

### Step 11: Create AI Prompts for Script Generation
**Files:** `supabase/functions/ai-gateway/prompts/`
**Purpose:** Add prompts for deepfake scripts, narration scripts, and jingle lyrics

**Details:**
Add new prompt files:
1. `deepfake-script.ts` - Generate welcome video script from house manual data
2. `narration-script.ts` - Generate David Attenborough-style narration
3. `jingle-lyrics.ts` - Generate branded jingle lyrics

Register in `_registry.ts` as public prompts.

**Validation:** Prompts registered, can be called via ai-gateway

---

### Step 12: Update Table Mappings for Bubble Sync
**Files:** `supabase/functions/bubble_sync/lib/tableMapping.ts`
**Purpose:** Add new tables to sync mapping

**Details:**
Add to both `toBubble` and `fromBubble` mappings:
```typescript
'heygen_deepfake': 'heygen_deepfake',
'jingle': 'jingle',
```

**Validation:** Tables appear in mapping functions

---

### Step 13: Add API Keys to Supabase Secrets
**Files:** Supabase Dashboard
**Purpose:** Configure environment variables

**Details:**
Add to Supabase Secrets:
- `HEYGEN_API_KEY` - HeyGen API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key (if not present)

**Validation:** Secrets accessible from Edge Functions

---

## Edge Cases & Error Handling

1. **HeyGen video timeout**: Video generation can take 2-5 minutes. Implement polling with timeout (10 minutes max).

2. **ElevenLabs rate limits**: Implement request throttling and queue for narration generation.

3. **Missing house manual data**: Validate house manual has required fields before script generation.

4. **Large scripts**: Limit script length to prevent API timeouts (4000 characters max).

5. **Concurrent generation**: Prevent duplicate generation requests with status checks.

6. **File storage**: Store generated media URLs in Supabase, not actual files (external hosting).

7. **Authentication failure**: Redirect to login, clear session.

8. **API key missing**: Fail fast with clear error message, no fallback.

## Testing Considerations

1. **Unit tests for logic layer**: Test script generation, status parsing, form validation
2. **Integration tests for Edge Function**: Mock external APIs, verify request/response
3. **E2E test scenarios**:
   - Create deepfake for house manual
   - Generate narration for visit
   - Create jingle with preferences
   - Attach media to house manual/visit

## Rollback Strategy

1. **Route rollback**: Remove route from `routes.config.js`, regenerate routes
2. **Migration rollback**: Create down migration to drop new tables
3. **Edge Function rollback**: Delete function folder, redeploy
4. **Environment rollback**: Remove API keys from Supabase Secrets

## Dependencies & Blockers

1. **HeyGen API access**: Need valid API key and account
2. **ElevenLabs API access**: Need valid API key and account
3. **House manual data**: Depends on existing house manual records in database
4. **Admin user**: Need admin authentication to access page

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| HeyGen API changes | Medium | High | Pin API version, document endpoints |
| ElevenLabs rate limits | High | Medium | Implement request queue and throttling |
| Large media files | Medium | Medium | Store URLs only, use external CDN |
| Cost overruns | Medium | Medium | Implement usage tracking and limits |
| Long generation times | High | Low | Async processing with status polling |

---

## File Reference Summary

### New Files to Create
| File | Type | Purpose |
|------|------|---------|
| `app/public/ai-tools.html` | HTML | Entry point |
| `app/src/ai-tools.jsx` | JSX | React mount |
| `app/src/islands/pages/AiToolsPage/index.js` | JS | Barrel export |
| `app/src/islands/pages/AiToolsPage/AiToolsPage.jsx` | JSX | Page component |
| `app/src/islands/pages/AiToolsPage/useAiToolsPageLogic.js` | JS | Logic hook |
| `app/src/islands/pages/AiToolsPage/types.js` | JS | Type definitions |
| `app/src/islands/pages/AiToolsPage/components/index.js` | JS | Component barrel |
| `app/src/islands/pages/AiToolsPage/components/HeyGenSection.jsx` | JSX | HeyGen UI |
| `app/src/islands/pages/AiToolsPage/components/ElevenLabsSection.jsx` | JSX | ElevenLabs UI |
| `app/src/islands/pages/AiToolsPage/components/JingleSection.jsx` | JSX | Jingle UI |
| `app/src/styles/ai-tools.css` | CSS | Page styles |
| `app/src/lib/aiToolsService.js` | JS | API client |
| `supabase/functions/ai-tools/index.ts` | TS | Edge Function router |
| `supabase/functions/ai-tools/deno.json` | JSON | Import map |
| `supabase/functions/ai-tools/handlers/*.ts` | TS | Handler files (12 files) |
| `supabase/functions/_shared/aiToolsTypes.ts` | TS | Type definitions |
| `supabase/functions/ai-gateway/prompts/deepfake-script.ts` | TS | AI prompt |
| `supabase/functions/ai-gateway/prompts/narration-script.ts` | TS | AI prompt |
| `supabase/functions/ai-gateway/prompts/jingle-lyrics.ts` | TS | AI prompt |
| `supabase/migrations/YYYYMMDDHHMMSS_create_ai_tools_tables.sql` | SQL | Database migration |

### Files to Modify
| File | Type | Changes |
|------|------|---------|
| `app/src/routes.config.js` | JS | Add ai-tools route |
| `supabase/functions/bubble_sync/lib/tableMapping.ts` | TS | Add table mappings |
| `supabase/functions/ai-gateway/prompts/_registry.ts` | TS | Register new prompts |

---

**Plan Version**: 1.0
**Created**: 2026-01-21
**Author**: Claude Code (Implementation Planner)
