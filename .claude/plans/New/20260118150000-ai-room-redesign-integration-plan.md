# AI Room Redesign Integration Plan

**Date:** 2026-01-18
**Type:** Feature Integration
**Priority:** Medium
**Status:** Planning

---

## Executive Summary

This plan outlines the integration of the [ai-room-redesign](https://github.com/splitleasesharath/ai-room-redesign.git) repository into the Split Lease codebase. The external repository provides a React component for AI-powered room redesign using Google Gemini Vision API. This integration will adapt the component to fit our islands architecture, Supabase Edge Functions backend, and established coding patterns.

---

## Source Repository Analysis

### Tech Stack (External Repo)
| Aspect | Implementation |
|--------|----------------|
| **Framework** | React 18 + TypeScript |
| **Build** | Vite 5 |
| **Styling** | Tailwind CSS 3.3 |
| **AI API** | Google Gemini 2.0 Flash Vision API |
| **Image Upload** | react-dropzone |
| **Notifications** | react-hot-toast |
| **Animations** | @lottiefiles/react-lottie-player |

### Core Features
1. **Image Upload** - Drag-drop or click, base64 conversion, preview
2. **Room Type Selection** - 7 room types (living-room, bedroom, kitchen, etc.)
3. **Style Selection** - 12 design styles with thumbnails (Modern, Scandinavian, Bohemian, etc.)
4. **AI Generation** - Sends image + prompt to Gemini Vision API
5. **Result Display** - Before/after comparison, download capability

### API Flow
```
User Upload → Base64 Encoding → Gemini Vision API → Generated Image → Display
```

---

## Architecture Conflicts & Required Modifications

### 🔴 Critical Breaking Points

| Issue | External Repo | Split Lease Pattern | Resolution |
|-------|---------------|---------------------|------------|
| **API Key Exposure** | `apiKey` prop passed to frontend component | API keys MUST stay server-side | Create Supabase Edge Function as proxy |
| **Styling System** | Tailwind CSS classes | CSS Variables + BEM | Convert to Split Lease CSS variables |
| **Toast System** | react-hot-toast | Custom Toast.jsx component | Use existing Toast component |
| **TypeScript** | Full TypeScript | JSX with JSDoc | Convert to JSX with comprehensive JSDoc |
| **Direct API Calls** | Frontend calls Gemini directly | Edge Functions proxy all AI calls | Route through new edge function |
| **Component Structure** | Single monolithic modal | Hollow component + logic hook | Split into AiRoomRedesign.jsx + useAiRoomRedesignLogic.js |

### 🟡 Medium Breaking Points

| Issue | External Repo | Split Lease Pattern | Resolution |
|-------|---------------|---------------------|------------|
| **Dependencies** | Lottie player, react-dropzone | Minimal dependencies | Evaluate keeping Lottie, implement dropzone natively |
| **Loading States** | Lottie animation | CSS spinner + text | Use existing spinner pattern from WifiPhotoExtractor |
| **Modal Pattern** | Self-managed `isOpen` | Controlled modal (parent manages state) | Adapt to controlled pattern |
| **Image Preview** | Data URLs only | Could store in Supabase Storage | Store results optionally for user's listings |

### 🟢 Minor Adjustments

| Issue | External Repo | Split Lease Pattern | Resolution |
|-------|---------------|---------------------|------------|
| **File validation** | Built-in | Similar pattern exists | Reuse validation from existing components |
| **Icons** | Embedded SVGs | Inline SVGs | Keep SVGs, ensure consistent style |
| **Class naming** | `room-*` prefixes | BEM naming | Rename to `ai-room-redesign__*` |

---

## Proposed Architecture

### File Structure

```
app/src/islands/shared/AiRoomRedesign/
├── index.js                          # Barrel export
├── AiRoomRedesign.jsx               # Main component (hollow)
├── useAiRoomRedesignLogic.js        # All business logic
├── AiRoomRedesign.css               # Scoped styles
├── components/
│   ├── ImageUploader.jsx            # Drag-drop upload
│   ├── RoomTypeSelector.jsx         # Room type dropdown
│   ├── DesignStyleGrid.jsx          # Style selection grid
│   ├── ResultOverlay.jsx            # Before/after display
│   └── LoadingOverlay.jsx           # Processing state
└── data/
    └── designStyles.js              # Style definitions + prompts

supabase/functions/ai-room-redesign/
├── index.ts                          # Edge function entry
├── handlers/
│   └── generate.ts                   # Gemini API handler
└── prompts/
    └── room-redesign.ts             # Prompt templates
```

### Component Hierarchy

```
AiRoomRedesign (Modal - controlled)
├── Header (Title + Close button)
├── Content
│   ├── ImageUploader
│   │   ├── DropZone
│   │   └── Preview
│   ├── RoomTypeSelector (optional)
│   └── DesignStyleGrid
├── Footer
│   ├── Cancel Button
│   └── Generate Button
├── LoadingOverlay (conditional)
└── ResultOverlay (conditional)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React Island)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User uploads image → FileReader → base64 + preview                     │
│  2. User selects room type (optional) + design style                        │
│  3. User clicks "Redesign Room"                                            │
│  4. Frontend sends to Edge Function:                                        │
│     { action: "generate", payload: { image, roomType, style } }            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       EDGE FUNCTION (ai-room-redesign)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Validate request (image present, valid style)                          │
│  2. Build prompt from template + user selections                           │
│  3. Call Gemini Vision API (API key from env, never exposed)               │
│  4. Return generated image as base64                                       │
│                                                                             │
│  Response: { success: true, data: { imageUrl: "data:image/png;base64,..." }}│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Result Display)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Show ResultOverlay with original + redesigned side-by-side             │
│  2. Allow download of redesigned image                                      │
│  3. Allow retry with different style                                        │
│  4. Optional: Save to listing photos (future enhancement)                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Edge Function (Backend First)

**Step 1.1: Create Edge Function Structure**
```
supabase/functions/ai-room-redesign/
├── index.ts
├── handlers/generate.ts
└── prompts/room-redesign.ts
```

**Step 1.2: Implement Gemini API Integration**
- Use FP patterns from existing `ai-gateway` function
- Store `GEMINI_API_KEY` in Supabase secrets
- Build prompt from room type + design style
- Return base64 image or structured error

**Step 1.3: Add Rate Limiting (Optional)**
- Track usage per user
- Limit to X generations per day/hour

### Phase 2: Frontend Component

**Step 2.1: Create Directory Structure**
```bash
mkdir -p app/src/islands/shared/AiRoomRedesign/components
mkdir -p app/src/islands/shared/AiRoomRedesign/data
```

**Step 2.2: Port and Adapt Styles**
- Convert Tailwind classes to CSS variables
- Follow BEM naming convention (`ai-room-redesign__*`)
- Match Split Lease color palette (purple primary)

**Step 2.3: Create Logic Hook**
```javascript
// useAiRoomRedesignLogic.js
export function useAiRoomRedesignLogic({ onComplete, onClose }) {
  const [state, setState] = useState({
    uploadedImage: null,      // File object
    imagePreview: null,       // Data URL for preview
    base64Image: null,        // Pure base64 for API
    selectedRoomType: null,   // Optional room type
    selectedStyle: null,      // Required design style
    isLoading: false,
    error: null,
    resultImage: null,        // Generated image data URL
  });

  const canGenerate = state.base64Image && state.selectedStyle && !state.isLoading;

  const handleGenerate = async () => { /* call edge function */ };
  const handleDownload = () => { /* trigger file download */ };
  const handleReset = () => { /* clear state for retry */ };

  return {
    ...state,
    canGenerate,
    handleImageSelect,
    handleStyleSelect,
    handleRoomTypeSelect,
    handleGenerate,
    handleDownload,
    handleReset,
    handleClose: onClose,
  };
}
```

**Step 2.4: Create Hollow Component**
```javascript
// AiRoomRedesign.jsx
export default function AiRoomRedesign({ isOpen, onClose, onComplete }) {
  const logic = useAiRoomRedesignLogic({ onComplete, onClose });

  if (!isOpen) return null;

  return (
    <div className="ai-room-redesign">
      {/* Pure rendering - no logic */}
    </div>
  );
}
```

**Step 2.5: Create Sub-Components**
- `ImageUploader.jsx` - Based on existing WifiPhotoExtractor pattern
- `RoomTypeSelector.jsx` - Dropdown with room type options
- `DesignStyleGrid.jsx` - Grid of clickable style cards with previews
- `ResultOverlay.jsx` - Side-by-side comparison + download
- `LoadingOverlay.jsx` - Processing state with spinner

### Phase 3: Integration & Testing

**Step 3.1: Add to Page(s)**
- ViewSplitLeasePage: "Redesign this room" button
- ListingDashboardPage: "AI Room Redesign" feature card
- PreviewSplitLeasePage: Optional enhancement

**Step 3.2: Environment Setup**
```bash
# Add to Supabase secrets
supabase secrets set GEMINI_API_KEY=your_key_here
```

**Step 3.3: Testing**
- Test image upload (various formats, sizes)
- Test API response handling
- Test error states (API failure, rate limit)
- Test download functionality

---

## CSS Variable Mapping

### Color Mapping (Tailwind → Split Lease)

| Tailwind Class | CSS Variable |
|----------------|--------------|
| `bg-indigo-600` | `var(--secondary-purple)` |
| `bg-indigo-700` | `var(--primary-purple)` |
| `text-gray-600` | `var(--text-gray)` |
| `text-gray-900` | `var(--text-dark)` |
| `bg-gray-50` | `var(--bg-light-gray)` |
| `bg-white` | `var(--bg-white)` |
| `border-gray-200` | `var(--border-color)` |
| `shadow-lg` | `var(--shadow-lg)` |
| `rounded-lg` | `var(--rounded-lg)` |

### Example Conversion

```css
/* BEFORE (Tailwind) */
.room-style-card {
  @apply bg-white rounded-lg shadow-md border border-gray-200 p-4 cursor-pointer
         hover:shadow-lg hover:border-indigo-500 transition-all;
}

/* AFTER (Split Lease CSS) */
.ai-room-redesign__style-card {
  background: var(--bg-white);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  padding: var(--spacing-lg);
  cursor: pointer;
  transition: all var(--transition-base) var(--easing-ease);
}

.ai-room-redesign__style-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--secondary-purple);
}
```

---

## Design Styles Data Structure

```javascript
// data/designStyles.js
export const DESIGN_STYLES = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean lines, minimal ornamentation, neutral colors',
    imageUrl: 'https://images.unsplash.com/photo-modern-interior...',
    prompt: 'Transform this room into a Modern style with clean lines, minimal furniture, neutral color palette, and contemporary fixtures. Emphasize open space and geometric shapes.'
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    description: 'Light, airy, functional with natural materials',
    imageUrl: 'https://images.unsplash.com/photo-scandi-interior...',
    prompt: 'Redesign this room in Scandinavian style with light wood tones, white walls, minimal decor, cozy textiles, and emphasis on natural light and functionality.'
  },
  // ... 10 more styles
];

export const ROOM_TYPES = [
  { id: 'living-room', label: 'Living Room' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'bathroom', label: 'Bathroom' },
  { id: 'dining-room', label: 'Dining Room' },
  { id: 'office', label: 'Home Office' },
  { id: 'outdoor', label: 'Outdoor Space' },
];
```

---

## Edge Function Implementation

### Request/Response Contract

```typescript
// Request
{
  "action": "generate",
  "payload": {
    "image": "base64EncodedImageString",
    "mimeType": "image/jpeg",
    "roomType": "bedroom",  // optional
    "styleId": "modern"     // required
  }
}

// Success Response
{
  "success": true,
  "data": {
    "imageUrl": "data:image/png;base64,generatedImageBase64",
    "style": "Modern",
    "generatedAt": "2026-01-18T15:00:00Z"
  }
}

// Error Response
{
  "success": false,
  "error": "Human-readable error message"
}
```

### Prompt Template

```typescript
// prompts/room-redesign.ts
export function buildRoomRedesignPrompt(roomType: string | null, style: DesignStyle): string {
  const roomContext = roomType
    ? `This is a ${roomType.replace('-', ' ')}. `
    : '';

  return `${roomContext}${style.prompt}

IMPORTANT: Generate a photorealistic redesigned version of this room. Maintain the same room dimensions and basic layout, but completely transform the style, furniture, colors, and decor to match the requested aesthetic. The result should look like a professional interior design rendering.`;
}
```

---

## Risk Assessment

### High Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini API costs | Could be expensive with heavy usage | Add rate limiting, optional user authentication |
| Large image payloads | Slow uploads, Edge Function timeouts | Client-side compression, max file size limit |
| API key leak | Security breach | API key only in Edge Function, never frontend |

### Medium Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| Style mismatch | Doesn't match Split Lease look | Thorough CSS conversion, design review |
| Poor generation quality | User disappointment | Clear expectations, allow retry with different style |
| Lottie dependency | Bundle size increase | Evaluate necessity, use CSS spinner if acceptable |

### Low Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| File type support | Some images rejected | Clear validation messages |
| Mobile responsiveness | Poor mobile UX | Responsive CSS from start |

---

## Dependencies to Install

### Frontend (app/)
```bash
# None required - can implement with native APIs
# Optional: @lottiefiles/react-lottie-player (if we want fancy loading animation)
```

### Edge Function (supabase/functions/)
```bash
# No new dependencies - uses native fetch for Gemini API
```

---

## Environment Variables Required

| Variable | Location | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Supabase Secrets | Google Gemini Vision API authentication |

**Setup Command:**
```bash
supabase secrets set GEMINI_API_KEY=your_api_key_here
```

---

## Files to Create

### New Files
| Path | Purpose |
|------|---------|
| `app/src/islands/shared/AiRoomRedesign/index.js` | Barrel export |
| `app/src/islands/shared/AiRoomRedesign/AiRoomRedesign.jsx` | Main modal component |
| `app/src/islands/shared/AiRoomRedesign/useAiRoomRedesignLogic.js` | Business logic hook |
| `app/src/islands/shared/AiRoomRedesign/AiRoomRedesign.css` | Component styles |
| `app/src/islands/shared/AiRoomRedesign/components/ImageUploader.jsx` | File upload sub-component |
| `app/src/islands/shared/AiRoomRedesign/components/RoomTypeSelector.jsx` | Room type dropdown |
| `app/src/islands/shared/AiRoomRedesign/components/DesignStyleGrid.jsx` | Style selection grid |
| `app/src/islands/shared/AiRoomRedesign/components/ResultOverlay.jsx` | Result display |
| `app/src/islands/shared/AiRoomRedesign/components/LoadingOverlay.jsx` | Loading state |
| `app/src/islands/shared/AiRoomRedesign/data/designStyles.js` | Style definitions |
| `supabase/functions/ai-room-redesign/index.ts` | Edge function entry |
| `supabase/functions/ai-room-redesign/handlers/generate.ts` | Gemini API handler |
| `supabase/functions/ai-room-redesign/prompts/room-redesign.ts` | Prompt templates |

### Files to Modify
| Path | Change |
|------|--------|
| `app/src/styles/main.css` | Import AiRoomRedesign.css |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Add "Redesign Room" button |
| `app/src/islands/pages/ListingDashboardPage.jsx` | Add AI Room Redesign section |

---

## Success Criteria

1. ✅ User can upload room photo via drag-drop or click
2. ✅ User can select room type (optional) and design style (required)
3. ✅ AI generates redesigned room image in <30 seconds
4. ✅ User can view before/after comparison
5. ✅ User can download generated image
6. ✅ API key never exposed to frontend
7. ✅ Component follows hollow pattern + logic hook
8. ✅ Styling matches Split Lease design system
9. ✅ Works on mobile and desktop
10. ✅ Graceful error handling with user-friendly messages

---

## Timeline Estimate

| Phase | Tasks | Estimate |
|-------|-------|----------|
| **Phase 1** | Edge Function implementation | 2-3 hours |
| **Phase 2** | Frontend component creation | 4-5 hours |
| **Phase 3** | Integration & testing | 2-3 hours |
| **Total** | | **8-11 hours** |

---

## References

### External Repository
- Repository: https://github.com/splitleasesharath/ai-room-redesign.git
- Key files: `src/api/geminiApi.ts`, `src/components/AIRoomRedesign.tsx`, `src/data/roomStyles.ts`

### Internal References
- [WifiPhotoExtractor.jsx](../../app/src/islands/shared/AITools/WifiPhotoExtractor.jsx) - Similar image upload pattern
- [ai-gateway/index.ts](../../supabase/functions/ai-gateway/index.ts) - AI Edge Function pattern
- [SubmitListingPhotos.jsx](../../app/src/islands/shared/SubmitListingPhotos/SubmitListingPhotos.jsx) - File upload reference
- [variables.css](../../app/src/styles/variables.css) - Design tokens
- [Toast.jsx](../../app/src/islands/shared/Toast.jsx) - Toast notification system

### External APIs
- [Google Gemini Vision API](https://ai.google.dev/gemini-api/docs/vision)
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`

---

## Approval Checklist

- [ ] Architecture approach approved
- [ ] Design system alignment confirmed
- [ ] API cost implications understood
- [ ] Rate limiting strategy agreed
- [ ] Testing requirements clear
- [ ] Integration points identified

---

**Author:** Claude (AI Assistant)
**Version:** 1.0
**Last Updated:** 2026-01-18
