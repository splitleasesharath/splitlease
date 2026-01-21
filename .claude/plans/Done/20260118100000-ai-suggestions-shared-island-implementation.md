# AI Suggestions Shared Island Implementation Plan

**Date:** 2026-01-18
**Type:** Feature Implementation
**Status:** PENDING
**Classification:** BUILD
**Estimated Complexity:** High (Multi-file, New Edge Functions, Database Integration)

---

## Executive Summary

This plan outlines the integration of the Bubble AI Suggestions reusable element (from `github.com/splitleasesharath/ai-suggestions`) as a shared island component in the Split Lease React + Supabase architecture. The component enables hosts to review, accept, combine, or ignore AI-generated suggestions for house manual content.

---

## Source Analysis

### Repository Structure (ai-suggestions.git)

```
ai-suggestions/
├── src/
│   ├── components/
│   │   ├── AISuggestionsModal.tsx     # Main modal container
│   │   ├── SuggestionCard.tsx         # Individual suggestion item
│   │   └── TranscriptPopup.tsx        # Call transcript overlay
│   ├── hooks/
│   │   └── useAISuggestions.ts        # Reducer-based state management
│   ├── services/
│   │   └── supabase.ts                # Database operations
│   ├── types/
│   │   └── index.ts                   # TypeScript definitions
│   └── demo/
│       └── mockData.ts                # Preview data
```

### Key Functionality

1. **Modal Display** - Shows AI suggestions for house manual fields
2. **Suggestion Actions** - Accept, Ignore, Combine (with editing)
3. **Progress Tracking** - Stages: transcribing → analyzing → generating → ready
4. **Transcript Viewer** - Read-only popup for call transcripts
5. **Real-time Updates** - Postgres subscriptions for live sync
6. **Reuse Previous** - Copy suggestions from prior house manuals

---

## Gap Analysis: Inconsistencies & Required Modifications

### 1. TypeScript → JavaScript Conversion

| Source (ai-suggestions) | Target (Split Lease) | Action |
|-------------------------|----------------------|--------|
| `.tsx` components | `.jsx` components | Convert to JSX, use JSDoc for types |
| TypeScript interfaces | JSDoc `@typedef` | Create type comments for IDE support |
| `as const` assertions | Regular constants | Remove TypeScript-specific syntax |

**Rationale:** Split Lease frontend uses JavaScript with JSDoc typing, not TypeScript.

### 2. Database Schema Mapping

The `ai-suggestions` repo expects tables named:
- `house_manuals` (snake_case)
- `ai_suggestions` (snake_case)

Split Lease Supabase has:
- `housemanual` (lowercase, no underscore)
- `zat_aisuggestions` (prefixed with `zat_`)

| Source Field | Split Lease Column | Notes |
|--------------|-------------------|-------|
| `id` | `_id` | Bubble ID format (text, not UUID) |
| `slug` | N/A | Not present in Split Lease |
| `being_processed` | `being processed?` | Space + question mark in column name |
| `decision` | N/A | **MISSING** - Must add or track differently |
| `content` | `Content` | Pascal case |
| `previous_content` | `Previous Content` | Pascal case |
| `field_suggested_house` | `Field suggested house manual` | Full name |
| `field_suggested_listing` | `Field suggested listing` | Full name |
| `source_flags.from_call` | `from call?` | Boolean with question mark |
| `house_manual_id` | `House Manual` | FK reference |
| `listing_id` | `Listing` | FK reference |
| `creator_id` | `Created By` | User reference |
| `created_at` | `Created Date` | Timestamp |
| `modified_at` | `Modified Date` | Timestamp |

**Critical: `decision` Column Missing**

The source tracks suggestion state via a `decision` enum (`'pending' | 'accepted' | 'ignored' | 'combined'`). This column does **NOT** exist in `zat_aisuggestions`.

**Options:**
1. **Add migration** - Create `decision` column (RECOMMENDED)
2. **Derive from other fields** - Use `being processed?` + check if content applied
3. **Store in JSONB** - Add to `housemanual.AI Suggestions` inline

### 3. House Manual Schema Differences

| Source Field | Split Lease Column | Status |
|--------------|-------------------|--------|
| `progress_stage` | N/A | **MISSING** - Need progress tracking |
| `transcript` | N/A | **MISSING** - Need transcript storage |
| `transcript_source` | N/A | **MISSING** |
| `ai_suggestions_creation` | `AI suggestions creation ended?` | Similar but boolean only |

**Progress Tracking Gap:**

Source expects enum: `'idle' | 'transcribing' | 'analyzing' | 'generating' | 'ready' | 'complete' | 'error'`

Split Lease only has: `AI suggestions creation ended?` (boolean)

### 4. CSS/Styling Conversion

| Source Pattern | Split Lease Pattern | Action |
|----------------|---------------------|--------|
| CSS-in-JS (inline styles) | External CSS files | Extract to `.css` file |
| Colors: `#8b5cf6`, `#3b82f6` | CSS variables: `--accent-purple`, `--accent-blue` | Map to design tokens |
| z-index: 1000, 1100, 1200 | z-index: 9999, 10000 | Align with existing modals |
| `position: fixed` | Same | Compatible |

**Color Mapping:**

| Source Color | Split Lease Variable |
|--------------|---------------------|
| `#8b5cf6` (Purple) | `--accent-purple` (#8C68EE) |
| `#3b82f6` (Blue) | `--info-indigo-hover` (#3b82f6) ✓ exact |
| `#f3f4f6` (Light Gray) | `--bg-light-gray` (#f3f4f6) ✓ exact |
| `#f59e0b` (Amber) | Custom or `--warning-amber` (need to add) |
| `#22c55e` (Green) | `--success-green` (#22C55E) ✓ exact |

### 5. API/Service Layer Differences

| Source Pattern | Split Lease Pattern | Action |
|----------------|---------------------|--------|
| Direct Supabase client calls | Edge Function with `{ action, payload }` | Route through `house-manual` Edge Function |
| `@supabase/supabase-js` in service | `app/src/lib/supabase.js` client | Use existing client |
| Real-time subscriptions in hook | Same pattern available | Implement in hook |

**Edge Function Actions Needed:**

The `house-manual` Edge Function currently supports:
- `parse_text`, `transcribe_audio`, `extract_wifi`, `parse_document`, `parse_google_doc`, `initiate_call`

**NEW Actions Required:**
- `get_suggestions` - Fetch suggestions for a house manual
- `accept_suggestion` - Accept and apply a suggestion
- `ignore_suggestion` - Mark suggestion as ignored
- `combine_suggestion` - Accept with modified content
- `accept_all_suggestions` - Bulk accept
- `reuse_previous` - Copy from prior house manual

### 6. Component Architecture Differences

| Source Pattern | Split Lease Pattern | Action |
|----------------|---------------------|--------|
| Reducer-based state (useReducer) | useState + handlers | Keep reducer (clean pattern) |
| Single exported modal | Feature module directory | Create `AISuggestions/` folder |
| TypeScript generics | JSDoc generics | Convert type syntax |
| Props interface | JSDoc `@param` | Document with JSDoc |

### 7. Missing Infrastructure

| Feature | Status | Action |
|---------|--------|--------|
| Real-time subscriptions | Available in Supabase | Implement in hook |
| Bubble sync for suggestions | `sync_queue` exists | Add sync triggers |
| Toast notifications | `Toast.jsx` exists | Use existing system |
| Progress tracking columns | Missing in DB | Add via migration |

---

## Implementation Plan

### Phase 1: Database Migration (Priority: HIGH)

**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_ai_suggestions_tracking.sql`

```sql
-- Add decision tracking to zat_aisuggestions
ALTER TABLE zat_aisuggestions
ADD COLUMN IF NOT EXISTS "decision" text DEFAULT 'pending';

-- Add progress tracking to housemanual
ALTER TABLE housemanual
ADD COLUMN IF NOT EXISTS "progress_stage" text DEFAULT 'idle';

ALTER TABLE housemanual
ADD COLUMN IF NOT EXISTS "transcript" text;

ALTER TABLE housemanual
ADD COLUMN IF NOT EXISTS "transcript_source" text;

-- Create index for pending suggestions lookup
CREATE INDEX IF NOT EXISTS idx_aisuggestions_pending
ON zat_aisuggestions ("House Manual", "decision")
WHERE "decision" = 'pending';

-- Add decision enum constraint (optional but recommended)
ALTER TABLE zat_aisuggestions
ADD CONSTRAINT check_decision_valid
CHECK ("decision" IN ('pending', 'accepted', 'ignored', 'combined'));
```

**Bubble Sync Consideration:** These new columns need to be added to Bubble.io as well, or excluded from sync.

---

### Phase 2: Edge Function Handlers (Priority: HIGH)

**Location:** `supabase/functions/house-manual/handlers/`

#### 2.1 Create `getSuggestions.ts`

```typescript
/**
 * Fetch pending AI suggestions for a house manual
 *
 * Payload: { houseManualId: string }
 * Returns: { houseManual, suggestions[] }
 */
export async function handleGetSuggestions(context: HandlerContext) {
  const { houseManualId } = context.payload;

  // Fetch house manual with progress info
  const { data: houseManual, error: hmError } = await context.supabaseClient
    .from('housemanual')
    .select('*')
    .eq('_id', houseManualId)
    .single();

  // Fetch pending suggestions
  const { data: suggestions, error: sugError } = await context.supabaseClient
    .from('zat_aisuggestions')
    .select('*')
    .eq('House Manual', houseManualId)
    .neq('decision', 'ignored')
    .eq('being processed?', false)
    .order('Created Date', { ascending: true });

  return { houseManual, suggestions };
}
```

#### 2.2 Create `acceptSuggestion.ts`

```typescript
/**
 * Accept an AI suggestion and apply to house manual
 *
 * Payload: { suggestionId: string }
 * Returns: { suggestion, houseManual }
 */
export async function handleAcceptSuggestion(context: HandlerContext) {
  const { suggestionId } = context.payload;

  // 1. Mark suggestion as processing
  await context.supabaseClient
    .from('zat_aisuggestions')
    .update({
      'being processed?': true,
      'decision': 'accepted',
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', suggestionId);

  // 2. Fetch suggestion to get field and content
  const { data: suggestion } = await context.supabaseClient
    .from('zat_aisuggestions')
    .select('*')
    .eq('_id', suggestionId)
    .single();

  // 3. Apply content to house manual field
  const fieldName = suggestion['Field suggested house manual'];
  const content = suggestion['Content'];

  await context.supabaseClient
    .from('housemanual')
    .update({
      [fieldName]: content,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', suggestion['House Manual']);

  // 4. Queue for Bubble sync
  await context.supabaseClient
    .from('sync_queue')
    .insert({
      table_name: 'housemanual',
      record_id: suggestion['House Manual'],
      operation: 'UPDATE',
      payload: { [fieldName]: content }
    });

  // 5. Mark suggestion as complete
  await context.supabaseClient
    .from('zat_aisuggestions')
    .update({ 'being processed?': false })
    .eq('_id', suggestionId);

  return { suggestion, success: true };
}
```

#### 2.3 Create `ignoreSuggestion.ts`

```typescript
/**
 * Ignore an AI suggestion
 *
 * Payload: { suggestionId: string }
 */
export async function handleIgnoreSuggestion(context: HandlerContext) {
  const { suggestionId } = context.payload;

  const { data, error } = await context.supabaseClient
    .from('zat_aisuggestions')
    .update({
      'decision': 'ignored',
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', suggestionId)
    .select()
    .single();

  if (error) throw error;
  return { suggestion: data };
}
```

#### 2.4 Create `combineSuggestion.ts`

```typescript
/**
 * Combine previous + new content for a suggestion
 *
 * Payload: { suggestionId: string, combinedContent: string }
 */
export async function handleCombineSuggestion(context: HandlerContext) {
  const { suggestionId, combinedContent } = context.payload;

  // Update suggestion with combined content
  await context.supabaseClient
    .from('zat_aisuggestions')
    .update({
      'Content': combinedContent,
      'decision': 'combined',
      'being processed?': true,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', suggestionId);

  // Apply to house manual (same as accept)
  // ... (similar to acceptSuggestion)

  return { success: true };
}
```

#### 2.5 Update `house-manual/index.ts`

Add new actions to the router:

```typescript
const ALLOWED_ACTIONS = [
  // Existing
  "parse_text",
  "transcribe_audio",
  "extract_wifi",
  "parse_document",
  "parse_google_doc",
  "initiate_call",
  // NEW
  "get_suggestions",
  "accept_suggestion",
  "ignore_suggestion",
  "combine_suggestion",
  "accept_all_suggestions",
  "reuse_previous",
] as const;
```

---

### Phase 3: Frontend Shared Island Component (Priority: HIGH)

**Location:** `app/src/islands/shared/AISuggestions/`

#### 3.1 Directory Structure

```
app/src/islands/shared/AISuggestions/
├── index.js                     # Public exports
├── AISuggestionsModal.jsx       # Main modal component
├── SuggestionCard.jsx           # Individual suggestion card
├── TranscriptPopup.jsx          # Transcript viewer overlay
├── CombineModal.jsx             # Nested modal for combining
├── useAISuggestionsState.js     # Reducer-based state hook
├── aiSuggestionsService.js      # API calls to Edge Function
├── ai-suggestions.css           # Component styles
└── constants.js                 # Source icons, field labels
```

#### 3.2 Convert `useAISuggestions.ts` → `useAISuggestionsState.js`

```javascript
/**
 * @typedef {'pending' | 'accepted' | 'ignored' | 'combined'} SuggestionDecision
 *
 * @typedef {Object} AISuggestion
 * @property {string} _id - Suggestion ID
 * @property {string} Content - The AI-generated suggestion text
 * @property {string|null} ['Previous Content'] - Existing content for comparison
 * @property {string} ['Field suggested house manual'] - Target field name
 * @property {boolean} ['being processed?'] - Processing flag
 * @property {SuggestionDecision} decision - Current decision state
 * @property {boolean} ['from call?'] - Source flags
 * @property {boolean} ['from audio?']
 * @property {boolean} ['from PDF?']
 * @property {boolean} ['from google doc?']
 * @property {boolean} ['from listing?']
 * @property {boolean} ['from free text form?']
 */

import { useReducer, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

const initialState = {
  isOpen: false,
  isLoading: false,
  error: null,
  showTranscript: false,
  houseManual: null,
  suggestions: [],
  currentIndex: 0,
  combineModalActive: false,
  editedContent: '',
};

function reducer(state, action) {
  switch (action.type) {
    case 'OPEN_MODAL':
      return { ...state, isOpen: true };
    case 'CLOSE_MODAL':
      return { ...initialState };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_DATA':
      return {
        ...state,
        houseManual: action.payload.houseManual,
        suggestions: action.payload.suggestions,
        isLoading: false
      };
    case 'REMOVE_SUGGESTION':
      return {
        ...state,
        suggestions: state.suggestions.filter(s => s._id !== action.payload),
      };
    case 'UPDATE_SUGGESTION':
      return {
        ...state,
        suggestions: state.suggestions.map(s =>
          s._id === action.payload._id ? action.payload : s
        ),
      };
    case 'TOGGLE_TRANSCRIPT':
      return { ...state, showTranscript: !state.showTranscript };
    case 'OPEN_COMBINE_MODAL':
      return {
        ...state,
        combineModalActive: true,
        editedContent: action.payload
      };
    case 'CLOSE_COMBINE_MODAL':
      return { ...state, combineModalActive: false, editedContent: '' };
    case 'SET_EDITED_CONTENT':
      return { ...state, editedContent: action.payload };
    default:
      return state;
  }
}

export function useAISuggestionsState(houseManualId) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Fetch suggestions on mount
  useEffect(() => {
    if (!houseManualId || !state.isOpen) return;

    const fetchData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const response = await fetch('/api/house-manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_suggestions',
            payload: { houseManualId }
          })
        });

        const { data, error } = await response.json();
        if (error) throw new Error(error);

        dispatch({ type: 'SET_DATA', payload: data });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message });
      }
    };

    fetchData();
  }, [houseManualId, state.isOpen]);

  // Real-time subscription
  useEffect(() => {
    if (!houseManualId || !state.isOpen) return;

    const channel = supabase
      .channel(`suggestions:${houseManualId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'zat_aisuggestions',
        filter: `House Manual=eq.${houseManualId}`
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          dispatch({ type: 'UPDATE_SUGGESTION', payload: payload.new });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [houseManualId, state.isOpen]);

  // Action handlers
  const openModal = useCallback(() => {
    dispatch({ type: 'OPEN_MODAL' });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' });
  }, []);

  const acceptSuggestion = useCallback(async (suggestionId) => {
    try {
      await fetch('/api/house-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept_suggestion',
          payload: { suggestionId }
        })
      });

      dispatch({ type: 'REMOVE_SUGGESTION', payload: suggestionId });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, []);

  const ignoreSuggestion = useCallback(async (suggestionId) => {
    try {
      await fetch('/api/house-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ignore_suggestion',
          payload: { suggestionId }
        })
      });

      dispatch({ type: 'REMOVE_SUGGESTION', payload: suggestionId });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, []);

  const combineSuggestion = useCallback(async (suggestionId, combinedContent) => {
    try {
      await fetch('/api/house-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'combine_suggestion',
          payload: { suggestionId, combinedContent }
        })
      });

      dispatch({ type: 'REMOVE_SUGGESTION', payload: suggestionId });
      dispatch({ type: 'CLOSE_COMBINE_MODAL' });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, []);

  return {
    state,
    dispatch,
    actions: {
      openModal,
      closeModal,
      acceptSuggestion,
      ignoreSuggestion,
      combineSuggestion,
      toggleTranscript: () => dispatch({ type: 'TOGGLE_TRANSCRIPT' }),
    },
    computed: {
      currentSuggestion: state.suggestions[state.currentIndex] || null,
      pendingCount: state.suggestions.filter(s => s.decision === 'pending').length,
      isEmpty: state.suggestions.length === 0,
      isProcessing: state.isLoading,
    }
  };
}
```

#### 3.3 Create `AISuggestionsModal.jsx`

Follow the pattern from `AIImportAssistantModal.jsx`:

```javascript
/**
 * AISuggestionsModal
 *
 * Modal for reviewing and acting on AI-generated suggestions
 * for house manual content.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility
 * @param {Function} props.onClose - Close callback
 * @param {string} props.houseManualId - House manual to load suggestions for
 * @param {Function} props.onComplete - Called when all suggestions processed
 */

import { useEffect } from 'react';
import SuggestionCard from './SuggestionCard';
import TranscriptPopup from './TranscriptPopup';
import CombineModal from './CombineModal';
import { useAISuggestionsState } from './useAISuggestionsState';
import { SOURCE_ICONS, PROGRESS_STAGES } from './constants';
import './ai-suggestions.css';

// Icons
const SparklesIcon = () => (/* Same as AIImportAssistantModal */);
const SpinnerIcon = () => (/* Same as AIImportAssistantModal */);

export default function AISuggestionsModal({
  isOpen,
  onClose,
  houseManualId,
  onComplete = () => {},
}) {
  const { state, actions, computed } = useAISuggestionsState(houseManualId);

  // Auto-open when isOpen prop changes
  useEffect(() => {
    if (isOpen) actions.openModal();
  }, [isOpen, actions]);

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !state.isLoading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, state.isLoading, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !state.isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const { houseManual, suggestions, showTranscript, error } = state;
  const progressStage = houseManual?.progress_stage || 'idle';

  return (
    <>
      <div
        className="ai-suggestions-overlay"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
      >
        <div className="ai-suggestions-modal" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <header className="ai-suggestions-header">
            <div className="ai-suggestions-header-left">
              <SparklesIcon />
              <h2>AI Suggestions</h2>
              {computed.pendingCount > 0 && (
                <span className="ai-suggestions-badge">
                  {computed.pendingCount} pending
                </span>
              )}
            </div>

            <div className="ai-suggestions-header-right">
              {houseManual?.transcript && (
                <button
                  type="button"
                  className="ai-suggestions-transcript-btn"
                  onClick={actions.toggleTranscript}
                >
                  View Transcript
                </button>
              )}

              {!state.isLoading && (
                <button
                  type="button"
                  className="ai-suggestions-close-btn"
                  onClick={onClose}
                  aria-label="Close"
                >
                  &times;
                </button>
              )}
            </div>
          </header>

          {/* Progress indicator */}
          {progressStage !== 'ready' && progressStage !== 'complete' && (
            <div className="ai-suggestions-progress">
              <SpinnerIcon />
              <span>{PROGRESS_STAGES[progressStage]}</span>
            </div>
          )}

          {/* Content */}
          <div className="ai-suggestions-content">
            {state.isLoading ? (
              <div className="ai-suggestions-loading">
                <SpinnerIcon />
                <p>Loading suggestions...</p>
              </div>
            ) : error ? (
              <div className="ai-suggestions-error">
                <p>{error}</p>
                <button onClick={actions.openModal}>Retry</button>
              </div>
            ) : computed.isEmpty ? (
              <div className="ai-suggestions-empty">
                <p>No suggestions to review</p>
                <button
                  type="button"
                  className="ai-suggestions-reuse-btn"
                  onClick={() => {/* reuse previous */}}
                >
                  Reuse from Previous House Manual
                </button>
              </div>
            ) : (
              <div className="ai-suggestions-list">
                {suggestions.map(suggestion => (
                  <SuggestionCard
                    key={suggestion._id}
                    suggestion={suggestion}
                    onAccept={actions.acceptSuggestion}
                    onIgnore={actions.ignoreSuggestion}
                    onCombine={(id, content) => {
                      state.dispatch({
                        type: 'OPEN_COMBINE_MODAL',
                        payload: content
                      });
                    }}
                    isProcessing={suggestion['being processed?']}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="ai-suggestions-footer">
            <button
              type="button"
              className="ai-suggestions-btn-secondary"
              onClick={onClose}
              disabled={state.isLoading}
            >
              Close
            </button>

            {!computed.isEmpty && (
              <button
                type="button"
                className="ai-suggestions-btn-primary"
                onClick={() => {/* accept all */}}
                disabled={state.isLoading}
              >
                Accept All ({computed.pendingCount})
              </button>
            )}
          </footer>
        </div>
      </div>

      {/* Transcript Popup */}
      <TranscriptPopup
        isOpen={showTranscript}
        transcript={houseManual?.transcript}
        onClose={actions.toggleTranscript}
      />

      {/* Combine Modal */}
      <CombineModal
        isOpen={state.combineModalActive}
        content={state.editedContent}
        onContentChange={(c) => state.dispatch({
          type: 'SET_EDITED_CONTENT',
          payload: c
        })}
        onConfirm={(id) => actions.combineSuggestion(id, state.editedContent)}
        onClose={() => state.dispatch({ type: 'CLOSE_COMBINE_MODAL' })}
      />
    </>
  );
}
```

#### 3.4 Create `SuggestionCard.jsx`

```javascript
/**
 * SuggestionCard
 *
 * Individual suggestion item with comparison and action buttons.
 *
 * @param {Object} props
 * @param {Object} props.suggestion - The suggestion object
 * @param {Function} props.onAccept - Accept handler
 * @param {Function} props.onIgnore - Ignore handler
 * @param {Function} props.onCombine - Combine handler
 * @param {boolean} props.isProcessing - Processing state
 */

import { SOURCE_ICONS, FIELD_LABELS } from './constants';

export default function SuggestionCard({
  suggestion,
  onAccept,
  onIgnore,
  onCombine,
  isProcessing = false,
}) {
  const fieldName = suggestion['Field suggested house manual'] || 'Unknown Field';
  const content = suggestion['Content'] || '';
  const previousContent = suggestion['Previous Content'];

  // Determine source icon
  const sourceIcon = getSourceIcon(suggestion);

  // Pre-fill combine content
  const combineContent = previousContent
    ? `${previousContent}\n\n${content}`
    : content;

  return (
    <div className={`suggestion-card ${isProcessing ? 'suggestion-card--processing' : ''}`}>
      {/* Header */}
      <div className="suggestion-card-header">
        <span className="suggestion-card-source">{sourceIcon}</span>
        <span className="suggestion-card-field">
          {FIELD_LABELS[fieldName] || fieldName}
        </span>
        {isProcessing && (
          <span className="suggestion-card-processing-badge">Processing...</span>
        )}
      </div>

      {/* Previous content (if exists) */}
      {previousContent && (
        <div className="suggestion-card-previous">
          <span className="suggestion-card-previous-label">Previously recorded:</span>
          <p className="suggestion-card-previous-text">{previousContent}</p>
        </div>
      )}

      {/* AI suggestion content */}
      <div className="suggestion-card-content">
        <textarea
          className="suggestion-card-textarea"
          value={content}
          readOnly
          rows={4}
        />
      </div>

      {/* Action buttons */}
      <div className="suggestion-card-actions">
        <button
          type="button"
          className="suggestion-card-btn suggestion-card-btn--ignore"
          onClick={() => onIgnore(suggestion._id)}
          disabled={isProcessing}
        >
          Ignore
        </button>

        {previousContent && (
          <button
            type="button"
            className="suggestion-card-btn suggestion-card-btn--combine"
            onClick={() => onCombine(suggestion._id, combineContent)}
            disabled={isProcessing}
          >
            Combine
          </button>
        )}

        <button
          type="button"
          className="suggestion-card-btn suggestion-card-btn--accept"
          onClick={() => onAccept(suggestion._id)}
          disabled={isProcessing}
        >
          Accept
        </button>
      </div>
    </div>
  );
}

function getSourceIcon(suggestion) {
  if (suggestion['from call?']) return SOURCE_ICONS.call;
  if (suggestion['from audio?']) return SOURCE_ICONS.audio;
  if (suggestion['from PDF?']) return SOURCE_ICONS.pdf;
  if (suggestion['from google doc?']) return SOURCE_ICONS.googleDoc;
  if (suggestion['from listing?']) return SOURCE_ICONS.listing;
  if (suggestion['from free text form?']) return SOURCE_ICONS.freeText;
  return SOURCE_ICONS.default;
}
```

#### 3.5 Create `constants.js`

```javascript
/**
 * Constants for AI Suggestions component
 */

export const SOURCE_ICONS = {
  call: '📞',
  audio: '🎙️',
  pdf: '📄',
  googleDoc: '📝',
  listing: '🏠',
  freeText: '✍️',
  default: '🤖',
};

export const PROGRESS_STAGES = {
  idle: 'Waiting to start...',
  transcribing: 'Transcribing audio...',
  analyzing: 'Analyzing content...',
  generating: 'Generating suggestions...',
  ready: 'Ready for review',
  complete: 'All done!',
  error: 'An error occurred',
};

export const FIELD_LABELS = {
  'Check-In Instructions': 'Check-In Instructions',
  'Check-Out Instructions': 'Check-Out Instructions',
  'House Rules (jsonb)': 'House Rules',
  'WiFi Name': 'WiFi Network Name',
  'WiFi Password': 'WiFi Password',
  'Temperature Control': 'Temperature Control',
  'Security Features': 'Security Features',
  'Local Attractions': 'Local Attractions',
  'Parking Tips': 'Parking Tips',
  // ... add more as needed
};
```

#### 3.6 Create `ai-suggestions.css`

```css
/* AI Suggestions Modal Styles */
/* Following Split Lease design tokens from variables.css */

.ai-suggestions-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.ai-suggestions-modal {
  background: var(--bg-white);
  border-radius: 16px;
  max-width: 600px;
  width: 90%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
  animation: slideIn 0.3s ease;
  z-index: 10000;
}

.ai-suggestions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.ai-suggestions-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-suggestions-header-left h2 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-dark);
}

.ai-suggestions-badge {
  background: var(--accent-purple);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: var(--text-sm);
  font-weight: 500;
}

.ai-suggestions-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.ai-suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-suggestions-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.ai-suggestions-btn-primary {
  background: var(--gradient-purple-button);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-suggestions-btn-primary:hover {
  background: var(--gradient-purple-hover);
}

.ai-suggestions-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ai-suggestions-btn-secondary {
  background: var(--bg-light-gray);
  color: var(--text-dark);
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* Suggestion Card Styles */
.suggestion-card {
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
}

.suggestion-card--processing {
  opacity: 0.7;
  pointer-events: none;
}

.suggestion-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.suggestion-card-source {
  font-size: 18px;
}

.suggestion-card-field {
  font-weight: 600;
  color: var(--text-dark);
}

.suggestion-card-previous {
  background: #fef3c7; /* Amber highlight */
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.suggestion-card-previous-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: #92400e;
}

.suggestion-card-previous-text {
  margin: 8px 0 0;
  color: #78350f;
  font-size: var(--text-base);
}

.suggestion-card-textarea {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  font-family: inherit;
  font-size: var(--text-base);
  resize: none;
  background: var(--bg-light);
}

.suggestion-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.suggestion-card-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  font-size: var(--text-sm);
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.suggestion-card-btn--ignore {
  background: var(--bg-light-gray);
  color: var(--text-gray);
}

.suggestion-card-btn--combine {
  background: var(--info-indigo-hover);
  color: white;
}

.suggestion-card-btn--accept {
  background: var(--accent-purple);
  color: white;
}

.suggestion-card-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 640px) {
  .ai-suggestions-modal {
    width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .ai-suggestions-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
```

---

### Phase 4: Integration Points

#### 4.1 Usage in Page Components

```javascript
// Example: In HouseManualDashboard page
import AISuggestionsModal from '../shared/AISuggestions';

function HouseManualDashboard() {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { houseManualId } = useParams();

  return (
    <>
      <button onClick={() => setShowSuggestions(true)}>
        Review AI Suggestions
      </button>

      <AISuggestionsModal
        isOpen={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        houseManualId={houseManualId}
        onComplete={(results) => {
          // Refresh page data
          refetch();
        }}
      />
    </>
  );
}
```

#### 4.2 Integration with AITools Module

The `AISuggestions` component should work alongside the existing `AITools` module:

```javascript
// In AIToolsProvider or parent component
<AIToolsProvider initialData={manualData}>
  <InputMethodSelector />
  <FreeformTextInput />
  <AudioRecorder />
  {/* ... other input methods */}

  {/* After AI processes input, show suggestions */}
  <AISuggestionsModal
    isOpen={hasNewSuggestions}
    houseManualId={manualId}
    onClose={() => setHasNewSuggestions(false)}
  />
</AIToolsProvider>
```

---

### Phase 5: Testing & Validation

#### 5.1 Test Cases

1. **Modal Opening/Closing**
   - Open modal with ESC key handling
   - Close on backdrop click
   - Body scroll lock

2. **Suggestion Actions**
   - Accept single suggestion
   - Ignore single suggestion
   - Combine with editing
   - Accept all suggestions

3. **Real-time Updates**
   - Postgres subscription receives updates
   - UI reflects changes without refresh

4. **Error Handling**
   - Network errors show error state
   - Retry button functionality
   - Loading states

5. **Edge Cases**
   - Empty suggestions list
   - Reuse previous house manual
   - Very long content handling

#### 5.2 E2E Test Spec

```javascript
// tests/e2e/ai-suggestions.spec.js
test('AI Suggestions modal workflow', async ({ page }) => {
  // Navigate to house manual
  await page.goto('/host/house-manual/123');

  // Open suggestions modal
  await page.click('[data-testid="review-suggestions-btn"]');

  // Verify modal opened
  await expect(page.locator('.ai-suggestions-modal')).toBeVisible();

  // Accept first suggestion
  await page.click('.suggestion-card-btn--accept');

  // Verify suggestion removed from list
  await expect(page.locator('.suggestion-card')).toHaveCount(/* expected */);
});
```

---

## Files to Create/Modify

### New Files

| Path | Purpose |
|------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_add_ai_suggestions_tracking.sql` | Database migration |
| `supabase/functions/house-manual/handlers/getSuggestions.ts` | Get suggestions handler |
| `supabase/functions/house-manual/handlers/acceptSuggestion.ts` | Accept handler |
| `supabase/functions/house-manual/handlers/ignoreSuggestion.ts` | Ignore handler |
| `supabase/functions/house-manual/handlers/combineSuggestion.ts` | Combine handler |
| `supabase/functions/house-manual/handlers/acceptAllSuggestions.ts` | Bulk accept handler |
| `supabase/functions/house-manual/handlers/reusePrevious.ts` | Reuse from previous |
| `app/src/islands/shared/AISuggestions/index.js` | Module exports |
| `app/src/islands/shared/AISuggestions/AISuggestionsModal.jsx` | Main modal |
| `app/src/islands/shared/AISuggestions/SuggestionCard.jsx` | Suggestion item |
| `app/src/islands/shared/AISuggestions/TranscriptPopup.jsx` | Transcript viewer |
| `app/src/islands/shared/AISuggestions/CombineModal.jsx` | Combine editor |
| `app/src/islands/shared/AISuggestions/useAISuggestionsState.js` | State hook |
| `app/src/islands/shared/AISuggestions/aiSuggestionsService.js` | API service |
| `app/src/islands/shared/AISuggestions/constants.js` | Constants |
| `app/src/islands/shared/AISuggestions/ai-suggestions.css` | Styles |

### Modified Files

| Path | Change |
|------|--------|
| `supabase/functions/house-manual/index.ts` | Add new action routes |
| `app/src/styles/variables.css` | Add `--warning-amber` if needed |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Bubble sync conflicts | Use `sync_queue` with idempotency keys |
| Missing `decision` column | Add via migration before deployment |
| Column name mismatches | Map all columns explicitly in service layer |
| Real-time subscription limits | Use single channel per modal instance |
| Large suggestion content | Implement virtual scrolling if needed |

---

## Deployment Checklist

1. [ ] Apply database migration
2. [ ] Deploy updated `house-manual` Edge Function
3. [ ] Add new Edge Function handlers
4. [ ] Build and test frontend component locally
5. [ ] Deploy frontend to Cloudflare Pages
6. [ ] Verify Bubble sync for new columns
7. [ ] Monitor for errors in Supabase logs

---

## Summary

This implementation plan converts the Bubble AI Suggestions element to a Split Lease shared island component by:

1. **Adding database columns** for `decision` tracking and progress stages
2. **Creating 6 new Edge Function handlers** for suggestion actions
3. **Building a 7-file frontend module** following existing patterns
4. **Mapping CSS to design tokens** for visual consistency
5. **Integrating with existing AITools** infrastructure

The result will be a production-ready, type-documented, design-consistent AI suggestions review system.

---

## References

### Source Repository
- [github.com/splitleasesharath/ai-suggestions](https://github.com/splitleasesharath/ai-suggestions)

### Split Lease Codebase
- [AIImportAssistantModal.jsx](../../app/src/islands/shared/AIImportAssistantModal/AIImportAssistantModal.jsx) - Modal pattern reference
- [SuggestedProposalPopup.jsx](../../app/src/islands/shared/SuggestedProposals/SuggestedProposalPopup.jsx) - Suggestions UI pattern
- [AIToolsProvider.jsx](../../app/src/islands/shared/AITools/AIToolsProvider.jsx) - Context provider pattern
- [house-manual/index.ts](../../supabase/functions/house-manual/index.ts) - Edge Function router
- [variables.css](../../app/src/styles/variables.css) - Design tokens

### Database Tables
- `housemanual` - House manual storage
- `zat_aisuggestions` - AI suggestions storage
- `sync_queue` - Bubble sync queue
