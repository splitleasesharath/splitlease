# AI Room Redesign - Migration Plan

**Created**: January 21, 2026
**Status**: Ready for Implementation
**Source Repository**: https://github.com/splitleasesharath/ai-room-redesign.git
**Classification**: BUILD

---

## Executive Summary

This plan migrates the standalone `ai-room-redesign` React/TypeScript library into Split Lease's Islands Architecture. The migration requires:

1. **Converting TypeScript to JavaScript** (matching Split Lease convention)
2. **Creating a dedicated Edge Function** for Gemini API calls (security)
3. **Integrating with existing AITools ecosystem**
4. **Adapting to Split Lease's Toast system** (no new dependency)
5. **Adding missing npm dependencies** (2 packages)

**Estimated Complexity**: Medium
**Files to Create/Modify**: ~15 files

---

## 1. Architecture Decisions

### 1.1 Where to Place the Component

| Option | Recommendation |
|--------|----------------|
| Standalone page (`/ai-room-redesign`) | **NO** - Not a standalone feature |
| Under `AITools/` shared folder | **YES** - Aligns with existing AI tooling |
| New `AIRoomRedesign/` shared folder | **YES** - Clean separation, clear ownership |

**Decision**: Create `app/src/islands/shared/AIRoomRedesign/` folder alongside other AI tools.

### 1.2 API Architecture

**Current (ai-room-redesign repo)**: Frontend calls Gemini directly with API key passed as prop
**Split Lease Standard**: Edge Functions proxy all external APIs

**Decision**: Create new Edge Function `supabase/functions/ai-room-redesign/` that:
- Receives base64 image + style/room type
- Calls Gemini Vision API server-side
- Returns redesigned image (base64)
- Uses existing `_shared/` utilities

### 1.3 Toast System

**ai-room-redesign uses**: `react-hot-toast` (separate dependency)
**Split Lease has**: Custom `Toast.jsx` with `useToast()` hook

**Decision**: Adapt component to use existing `useToast()` instead of adding `react-hot-toast`.

---

## 2. Discrepancies & Required Fixes

### 2.1 TypeScript to JavaScript Conversion

| Source File (TypeScript) | Target File (JavaScript) |
|--------------------------|--------------------------|
| `src/components/AIRoomRedesign.tsx` | `islands/shared/AIRoomRedesign/AIRoomRedesign.jsx` |
| `src/components/FileUploader.tsx` | `islands/shared/AIRoomRedesign/FileUploader.jsx` |
| `src/components/RoomStyleSelector.tsx` | `islands/shared/AIRoomRedesign/RoomStyleSelector.jsx` |
| `src/components/PhotoTypeDropdown.tsx` | `islands/shared/AIRoomRedesign/PhotoTypeDropdown.jsx` |
| `src/components/LoadingOverlay.tsx` | `islands/shared/AIRoomRedesign/LoadingOverlay.jsx` |
| `src/components/ResultImageOverlay.tsx` | `islands/shared/AIRoomRedesign/ResultImageOverlay.jsx` |
| `src/hooks/useFileUpload.ts` | `islands/shared/AIRoomRedesign/useFileUpload.js` |
| `src/hooks/useRoomRedesign.ts` | `islands/shared/AIRoomRedesign/useRoomRedesign.js` |
| `src/utils/fileUtils.ts` | `islands/shared/AIRoomRedesign/fileUtils.js` |
| `src/data/roomStyles.ts` | `islands/shared/AIRoomRedesign/roomStyles.js` |

**Conversion Notes**:
- Remove all TypeScript type annotations (`: string`, `: number`, `interface`, `type`)
- Remove `.tsx` extensions from imports
- Keep JSDoc comments for documentation
- Preserve PropTypes if desired (optional)

### 2.2 API Integration Changes

**Original (`src/api/geminiApi.ts`)**:
```typescript
// Direct frontend call to Gemini
const response = await fetch(
  `${apiEndpoint}?key=${apiKey}`,
  { method: 'POST', body: JSON.stringify(requestBody) }
);
```

**Split Lease Pattern**:
```javascript
// Call Edge Function instead
const response = await fetch('/api/ai-room-redesign', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    action: 'generate',
    payload: { base64Image, stylePrompt, photoType }
  })
});
```

### 2.3 Toast System Adaptation

**Original**:
```typescript
import toast from 'react-hot-toast';
toast.error('Upload failed');
```

**Split Lease**:
```javascript
import { useToast } from '../Toast';

const { showToast } = useToast();
showToast({ title: 'Upload Failed', content: 'Please try again.', type: 'error' });
```

### 2.4 Lottie Animation Player

**Original uses**: `@lottiefiles/react-lottie-player`
**Split Lease has**: `lottie-react` (already installed)

**Decision**: Adapt `LoadingOverlay.jsx` to use `lottie-react` instead:

```javascript
// Original
import { Player } from '@lottiefiles/react-lottie-player';
<Player src={animationData} autoplay loop />

// Split Lease adaptation
import Lottie from 'lottie-react';
<Lottie animationData={animationData} loop autoPlay />
```

### 2.5 File Upload Component

**Original uses**: `react-dropzone`
**Split Lease**: No existing dropzone - **NEED TO ADD**

```bash
bun add react-dropzone
```

### 2.6 Tailwind CSS Color Palette

**Original custom colors**:
```javascript
colors: {
  'room-bg': '#F9F9F9',
  'room-primary': '#4F46E5',
  'room-secondary': '#6366F1',
  'room-success': '#10B981',
  'room-warning': '#F59E0B',
  'room-error': '#EF4444',
  'room-info': '#3B82F6',
}
```

**Split Lease approach**: Use existing Tailwind defaults + `sl-purple` brand colors.

**Decision**: Convert `room-*` classes to standard Tailwind equivalents:
- `room-primary` → `indigo-600`
- `room-secondary` → `indigo-500`
- `room-success` → `green-500`
- `room-warning` → `amber-500`
- `room-error` → `red-500`
- `room-info` → `blue-500`
- `room-bg` → `gray-50`

### 2.7 CSS Animations

**Original adds** (`tailwind.config.js`):
```javascript
animation: {
  'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
  'fade-in': 'fadeIn 0.3s ease-in-out',
  'slide-up': 'slideUp 0.3s ease-out',
}
```

**Decision**: Add animations to Split Lease's `tailwind.config.js` OR use Framer Motion (already installed).

**Recommendation**: Use Framer Motion for consistency:
```javascript
import { motion, AnimatePresence } from 'framer-motion';

// shake → use motion.div with x animation
// fade-in → <AnimatePresence><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} /></AnimatePresence>
// slide-up → <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} />
```

---

## 3. Edge Function Design

### 3.1 File Structure

```
supabase/functions/ai-room-redesign/
├── index.ts           # Main entry point (action router)
├── handlers/
│   └── generate.ts    # Gemini Vision API handler
├── prompts/
│   └── room-redesign.ts  # Prompt templates by style
└── deno.json          # Deno configuration
```

### 3.2 Action-Based API

**Request**:
```typescript
{
  action: 'generate',
  payload: {
    base64Image: string,      // Base64 encoded image
    styleId: string,          // e.g., 'modern', 'scandinavian'
    photoType: string | null  // e.g., 'living-room', 'bedroom'
  }
}
```

**Response**:
```typescript
{
  success: true,
  imageUrl: string  // Data URL of redesigned image (base64 PNG)
}
// OR
{
  success: false,
  error: string
}
```

### 3.3 Environment Variables

```bash
# Required in Supabase Edge Function secrets
GEMINI_API_KEY=your-google-gemini-api-key
```

---

## 4. Dependency Changes

### 4.1 New Dependencies to Add

```bash
cd app && bun add react-dropzone
```

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `react-dropzone` | ^14.2.3 | Drag-and-drop file upload | New dependency |

### 4.2 Existing Dependencies (No Action)

| Package | Required Version | Split Lease Has | Status |
|---------|------------------|-----------------|--------|
| `react` | >=18.0.0 | ^18.2.0 | OK |
| `clsx` | ^2.0.0 | ^2.1.1 | OK |
| `lottie-react` | - | ^2.4.1 | OK (replaces @lottiefiles) |
| `framer-motion` | - | ^12.23.24 | OK (for animations) |

### 4.3 NOT Adding (Use Existing)

| Package | Reason |
|---------|--------|
| `@lottiefiles/react-lottie-player` | Use existing `lottie-react` |
| `react-hot-toast` | Use existing `Toast.jsx` |

---

## 5. File-by-File Migration Plan

### Phase 1: Edge Function (Backend)

| Step | Action | File |
|------|--------|------|
| 1.1 | Create Edge Function folder | `supabase/functions/ai-room-redesign/` |
| 1.2 | Create main entry point | `supabase/functions/ai-room-redesign/index.ts` |
| 1.3 | Create generate handler | `supabase/functions/ai-room-redesign/handlers/generate.ts` |
| 1.4 | Create prompt templates | `supabase/functions/ai-room-redesign/prompts/room-redesign.ts` |
| 1.5 | Create deno.json config | `supabase/functions/ai-room-redesign/deno.json` |
| 1.6 | Add GEMINI_API_KEY secret | Supabase Dashboard |

### Phase 2: Frontend Components

| Step | Action | File |
|------|--------|------|
| 2.1 | Create folder | `app/src/islands/shared/AIRoomRedesign/` |
| 2.2 | Convert main component | `AIRoomRedesign.jsx` |
| 2.3 | Convert FileUploader | `FileUploader.jsx` |
| 2.4 | Convert RoomStyleSelector | `RoomStyleSelector.jsx` |
| 2.5 | Convert PhotoTypeDropdown | `PhotoTypeDropdown.jsx` |
| 2.6 | Convert LoadingOverlay | `LoadingOverlay.jsx` (use `lottie-react`) |
| 2.7 | Convert ResultImageOverlay | `ResultImageOverlay.jsx` |
| 2.8 | Convert useFileUpload hook | `useFileUpload.js` |
| 2.9 | Convert useRoomRedesign hook | `useRoomRedesign.js` |
| 2.10 | Convert file utilities | `fileUtils.js` |
| 2.11 | Convert room styles data | `roomStyles.js` |
| 2.12 | Create index export | `index.js` |
| 2.13 | Add component CSS | `ai-room-redesign.css` |

### Phase 3: Integration

| Step | Action | File |
|------|--------|------|
| 3.1 | Install react-dropzone | `app/package.json` |
| 3.2 | Add shake animation (if not using Framer Motion) | `app/tailwind.config.js` |
| 3.3 | Export from AITools index (optional) | `app/src/islands/shared/AITools/index.js` |

### Phase 4: Testing & Documentation

| Step | Action | Notes |
|------|--------|-------|
| 4.1 | Test Edge Function locally | `supabase functions serve ai-room-redesign` |
| 4.2 | Test component in isolation | Create test page or Storybook |
| 4.3 | Test integration with real images | Various room types and styles |
| 4.4 | Update documentation | Add to relevant CLAUDE.md sections |

---

## 6. Integration Points

### 6.1 How to Use the Component

```jsx
import { AIRoomRedesign } from '../islands/shared/AIRoomRedesign';

function SomePage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Redesign Room
      </button>

      <AIRoomRedesign
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onRedesignComplete={(imageUrl) => {
          console.log('Redesigned image:', imageUrl);
          // Save to listing, display in UI, etc.
        }}
        defaultPhotoType="living-room"
      />
    </>
  );
}
```

### 6.2 Props Interface (JavaScript)

```javascript
/**
 * @typedef {Object} AIRoomRedesignProps
 * @property {boolean} isOpen - Controls popup visibility
 * @property {() => void} onClose - Callback when popup closes
 * @property {(imageUrl: string) => void} [onRedesignComplete] - Success callback with result URL
 * @property {Object[]} [customStyles] - Override default room styles
 * @property {string} [defaultPhotoType] - Pre-selected room type
 * @property {number} [maxFileSizeMB=10] - Max upload size in MB
 * @property {string[]} [acceptedFileTypes=['image/jpeg', 'image/png', 'image/webp']] - Accepted MIME types
 * @property {string} [className] - Additional CSS classes
 */
```

---

## 7. Potential Integration Locations

Where might AIRoomRedesign be used in Split Lease?

| Location | Use Case |
|----------|----------|
| **Listing Dashboard** | Host uploads room photo, gets AI redesign suggestion |
| **Self-Listing Flow** | During photo upload step, offer "AI Redesign" option |
| **House Manual** | Visualize room improvements for guests |
| **Marketing Pages** | Demo the AI capability to attract hosts |

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Gemini API rate limits | Medium | Medium | Implement rate limiting in Edge Function |
| Large image uploads slow | Medium | Low | Client-side resize before upload |
| API key exposure | Low | High | Edge Function handles all API calls |
| TypeScript conversion errors | Low | Medium | Careful testing of converted files |

---

## 9. Success Criteria

- [ ] Edge Function deploys and responds to requests
- [ ] Component renders without errors
- [ ] File upload works (drag-drop and click)
- [ ] Style selection works (12 styles visible)
- [ ] Room type dropdown works
- [ ] Loading animation displays during API call
- [ ] Result overlay shows original vs redesigned comparison
- [ ] Download button works
- [ ] Toast notifications display correctly
- [ ] Mobile responsive behavior works

---

## 10. Referenced Files

### Source Repository (ai-room-redesign)
- `src/components/AIRoomRedesign.tsx` - Main component (287 lines)
- `src/components/FileUploader.tsx` - Upload component (160 lines)
- `src/components/RoomStyleSelector.tsx` - Style grid (94 lines)
- `src/components/PhotoTypeDropdown.tsx` - Room type dropdown (46 lines)
- `src/components/LoadingOverlay.tsx` - Loading animation (123 lines)
- `src/components/ResultImageOverlay.tsx` - Result display (166 lines)
- `src/hooks/useFileUpload.ts` - Upload hook (127 lines)
- `src/hooks/useRoomRedesign.ts` - Redesign state hook (120 lines)
- `src/api/geminiApi.ts` - Gemini API calls
- `src/data/roomStyles.ts` - Style definitions (99 lines)
- `src/utils/fileUtils.ts` - File utilities (101 lines)

### Split Lease Target Files
- [app/src/islands/shared/AITools/](app/src/islands/shared/AITools/) - Existing AI tools reference
- [app/src/islands/shared/Toast.jsx](app/src/islands/shared/Toast.jsx) - Toast system to use
- [supabase/functions/ai-gateway/index.ts](supabase/functions/ai-gateway/index.ts) - Edge Function pattern reference
- [app/tailwind.config.js](app/tailwind.config.js) - Tailwind config to extend
- [app/package.json](app/package.json) - Dependencies to update
- [app/src/routes.config.js](app/src/routes.config.js) - Routes (if standalone page needed)

### Documentation
- [.claude/plans/Documents/20260121091500-ai-room-redesign-analysis.md](.claude/plans/Documents/20260121091500-ai-room-redesign-analysis.md) - Full repository analysis

---

## Appendix A: Gemini Vision API Reference

**Model**: `gemini-2.0-flash-exp`
**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`

**Request Format**:
```json
{
  "contents": [{
    "parts": [
      { "text": "Redesign prompt here..." },
      { "inlineData": { "mimeType": "image/jpeg", "data": "base64..." } }
    ]
  }],
  "generationConfig": {
    "responseModalities": ["image", "text"],
    "responseMimeType": "image/png"
  }
}
```

---

## Appendix B: Room Styles Data

12 default styles with prompts:

1. **Modern** - Clean lines, minimalist furniture, neutral colors
2. **Scandinavian** - Light woods, cozy textiles, functional simplicity
3. **Industrial** - Exposed brick, metal accents, raw materials
4. **Bohemian** - Eclectic patterns, vibrant colors, layered textiles
5. **Minimalist** - Essential furniture only, monochromatic palette
6. **Traditional** - Classic furniture, rich colors, ornate details
7. **Coastal** - Beach-inspired colors, natural textures, relaxed vibe
8. **Mid-Century Modern** - Retro furniture, organic shapes, bold accents
9. **Farmhouse** - Rustic wood, shiplap walls, cozy country charm
10. **Art Deco** - Geometric patterns, luxurious materials, glamorous
11. **Japandi** - Japanese minimalism meets Scandinavian warmth
12. **Mediterranean** - Warm terracotta, arched doorways, rustic elegance

---

**Plan Status**: Ready for execution
**Next Step**: Implement Phase 1 (Edge Function)
