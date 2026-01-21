# AI Room Redesign Repository - Comprehensive Analysis

**Document Created**: January 21, 2026
**Purpose**: Complete analysis for migration into Split Lease React 18 + Vite Islands Architecture

---

## 1. Repository Overview

**Repository**: https://github.com/splitleasesharath/ai-room-redesign.git
**Package Name**: `@splitlease/ai-room-redesign`
**Version**: 1.0.0
**License**: MIT
**Description**: AI-powered room redesign component using Google Gemini Vision API

### Origin

This is a React implementation of a Bubble.io reusable element that was migrated to code. The original Bubble component allowed users to upload room images and receive AI-powered interior design suggestions.

---

## 2. Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | React | >=18.0.0 (peer dependency) |
| **Build Tool** | Vite | ^5.0.8 |
| **Language** | TypeScript | ^5.3.3 |
| **Styling** | Tailwind CSS | ^3.3.6 |
| **CSS Processing** | PostCSS + Autoprefixer | ^8.4.32 / ^10.4.16 |
| **Type Generation** | vite-plugin-dts | ^3.6.4 |
| **Testing** | Vitest | ^1.1.0 |
| **Linting** | ESLint | ^8.55.0 |

### Build Configurations

The project supports two build modes:
1. **Development Mode** (`npm run dev`) - Standard Vite development server
2. **Library Mode** (`npm run build:lib`) - Builds as ES/UMD library for npm distribution

---

## 3. Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@lottiefiles/react-lottie-player` | ^3.5.3 | Loading animation player |
| `clsx` | ^2.0.0 | Conditional class name utility |
| `react-dropzone` | ^14.2.3 | Drag-and-drop file upload |
| `react-hot-toast` | ^2.4.1 | Toast notification system |

### Peer Dependencies

| Package | Version | Notes |
|---------|---------|-------|
| `react` | >=18.0.0 | Required |
| `react-dom` | >=18.0.0 | Required |

---

## 4. Project Structure

```
ai-room-redesign/
├── src/
│   ├── api/
│   │   └── geminiApi.ts          # Gemini Vision API integration
│   ├── components/
│   │   ├── index.ts              # Component exports
│   │   ├── AIRoomRedesign.tsx    # Main popup component (287 lines)
│   │   ├── FileUploader.tsx      # Drag-and-drop file upload (160 lines)
│   │   ├── RoomStyleSelector.tsx # Style selection grid (94 lines)
│   │   ├── PhotoTypeDropdown.tsx # Room type dropdown (46 lines)
│   │   ├── LoadingOverlay.tsx    # Lottie loading animation (123 lines)
│   │   ├── ResultImageOverlay.tsx# Result display with comparison (166 lines)
│   │   └── Toast.tsx             # Toast notification system (139 lines)
│   ├── hooks/
│   │   ├── index.ts              # Hook exports
│   │   ├── useFileUpload.ts      # File handling hook (127 lines)
│   │   └── useRoomRedesign.ts    # Redesign state management (120 lines)
│   ├── types/
│   │   └── index.ts              # TypeScript type definitions (91 lines)
│   ├── utils/
│   │   └── fileUtils.ts          # File utilities (101 lines)
│   ├── data/
│   │   └── roomStyles.ts         # Default room styles data (99 lines)
│   ├── styles/
│   │   └── globals.css           # Tailwind + custom CSS (127 lines)
│   ├── index.ts                  # Library entry point
│   ├── main.tsx                  # Demo app entry point
│   ├── App.tsx                   # Demo application (153 lines)
│   └── vite-env.d.ts             # Vite type declarations
├── index.html                    # Demo HTML entry
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── postcss.config.js
└── README.md
```

---

## 5. Component Architecture

### 5.1 Main Component: AIRoomRedesign

**File**: `src/components/AIRoomRedesign.tsx`
**Type**: Popup/Modal component
**Purpose**: Main container that orchestrates the entire room redesign flow

**Props Interface**:
```typescript
interface AIRoomRedesignProps {
  isOpen: boolean;              // Controls popup visibility
  onClose: () => void;          // Callback when popup closes
  onRedesignComplete?: (imageUrl: string) => void;  // Success callback
  apiKey?: string;              // Google Gemini API key
  apiEndpoint?: string;         // Custom API endpoint (optional)
  customStyles?: RoomStyle[];   // Override default room styles
  defaultPhotoType?: PhotoType; // Pre-selected room type
  maxFileSizeMB?: number;       // Max upload size (default: 10)
  acceptedFileTypes?: string[]; // Accepted types (default: jpg, png, webp)
  className?: string;           // Additional CSS classes
}
```

**Component Hierarchy**:
```
AIRoomRedesign (Popup)
├── ToastProvider (react-hot-toast)
├── Backdrop (click-to-close overlay)
├── Popup Container
│   ├── Header (title + close button)
│   ├── Content (scrollable)
│   │   ├── FileUploader
│   │   ├── PhotoTypeDropdown
│   │   ├── RoomStyleSelector
│   │   └── Error Display
│   └── Footer Actions
│       ├── Cancel Button
│       └── Redesign Button
├── LoadingOverlay
└── ResultImageOverlay
```

### 5.2 FileUploader Component

**File**: `src/components/FileUploader.tsx`
**Purpose**: Drag-and-drop file upload with preview
**Dependencies**: `react-dropzone`

**Features**:
- Drag-and-drop support
- Click-to-upload
- Image preview after selection
- File size/type validation
- Remove image functionality
- Shake animation on error

### 5.3 RoomStyleSelector Component

**File**: `src/components/RoomStyleSelector.tsx`
**Purpose**: Grid display of design style options

**Features**:
- Responsive grid (2-4 columns based on screen size)
- Image thumbnails for each style
- Selection indicator (checkmark badge)
- Scrollable container (max-height: 256px)

### 5.4 PhotoTypeDropdown Component

**File**: `src/components/PhotoTypeDropdown.tsx`
**Purpose**: Room type selection dropdown

**Room Types**:
- Living Room
- Bedroom
- Kitchen
- Bathroom
- Dining Room
- Home Office
- Outdoor Space

### 5.5 LoadingOverlay Component

**File**: `src/components/LoadingOverlay.tsx`
**Purpose**: Full-screen loading indicator during API calls

**Features**:
- Backdrop blur effect
- Inline Lottie JSON animation (no external file dependency)
- Customizable loading message
- Bouncing dots indicator

### 5.6 ResultImageOverlay Component

**File**: `src/components/ResultImageOverlay.tsx`
**Purpose**: Display AI-generated result with comparison view

**Features**:
- Full-screen overlay display
- Side-by-side comparison (original vs redesigned)
- Download functionality
- Retry button
- Click-outside to close

### 5.7 Toast Component

**File**: `src/components/Toast.tsx`
**Purpose**: Notification system wrapping react-hot-toast

**Alert Types**:
- `error` - Red styling, 5s duration
- `success` - Green styling, 3s duration
- `warning` - Yellow styling, 4s duration
- `information` - Blue styling, 3s duration
- `empty` - Gray styling, 3s duration

---

## 6. Hooks

### 6.1 useFileUpload Hook

**File**: `src/hooks/useFileUpload.ts`
**Purpose**: Manages file upload state and validation

**Returns**:
```typescript
{
  file: File | null;
  preview: string | null;      // Data URL for preview
  base64: string | null;       // Base64 for API
  error: string | null;
  isValidating: boolean;
  handleFileSelect: (file: File) => Promise<void>;
  handleFileDrop: (files: File[]) => Promise<void>;
  clearFile: () => void;
}
```

### 6.2 useRoomRedesign Hook

**File**: `src/hooks/useRoomRedesign.ts`
**Purpose**: Manages redesign workflow state

**Returns**:
```typescript
{
  isLoading: boolean;
  base64OriginalImage: string | null;
  resultImage: string | null;
  selectedRoomStyle: RoomStyle | null;
  selectedPhotoType: PhotoType | null;
  uploadedFile: File | null;
  error: string | null;
  setSelectedStyle: (style: RoomStyle | null) => void;
  setSelectedPhotoType: (photoType: PhotoType | null) => void;
  setBase64Image: (base64: string | null) => void;
  setUploadedFile: (file: File | null) => void;
  generateRedesign: () => Promise<void>;
  reset: () => void;
  canGenerate: boolean;
}
```

---

## 7. API Integration

### Google Gemini Vision API

**File**: `src/api/geminiApi.ts`
**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`

**API Functions**:

1. **generateRoomRedesign(base64Image, style, photoType, config)**
   - Sends image + prompt to Gemini Vision API
   - Returns base64 result image or error
   - Uses `responseModalities: ['image', 'text']`
   - Response MIME type: `image/png`

2. **validateApiKey(apiKey)**
   - Basic format validation (30+ chars, alphanumeric)

3. **testApiConnection(apiKey, apiEndpoint)**
   - Tests API connectivity with simple prompt

**Prompt Generation**:
```typescript
const buildRedesignPrompt = (style: RoomStyle, photoType?: PhotoType | null): string => {
  const roomTypeText = photoType
    ? `This is a ${photoType.replace('-', ' ')}.`
    : 'This is a room.';

  return `${roomTypeText} ${style.prompt}

Please generate a photorealistic redesigned version of this room maintaining
the same perspective and room layout, but applying the requested style changes.
The result should look like a professional interior design rendering.`;
};
```

---

## 8. Data Structures

### Room Styles (12 default styles)

| ID | Name | Description |
|----|------|-------------|
| modern | Modern | Clean lines, minimalist furniture, neutral colors |
| scandinavian | Scandinavian | Light woods, cozy textiles, functional simplicity |
| industrial | Industrial | Exposed brick, metal accents, raw materials |
| bohemian | Bohemian | Eclectic patterns, vibrant colors, layered textiles |
| minimalist | Minimalist | Essential furniture only, monochromatic palette |
| traditional | Traditional | Classic furniture, rich colors, ornate details |
| coastal | Coastal | Beach-inspired colors, natural textures, relaxed vibe |
| mid-century-modern | Mid-Century Modern | Retro furniture, organic shapes, bold accents |
| farmhouse | Farmhouse | Rustic wood, shiplap walls, cozy country charm |
| art-deco | Art Deco | Geometric patterns, luxurious materials, glamorous |
| japandi | Japandi | Japanese minimalism meets Scandinavian warmth |
| mediterranean | Mediterranean | Warm terracotta, arched doorways, rustic elegance |

Each style includes:
- `id`: Unique identifier
- `name`: Display name
- `description`: Short description
- `imageUrl`: Unsplash thumbnail URL
- `prompt`: AI prompt for generating this style

---

## 9. Styling Approach

### Tailwind CSS Configuration

**Custom Colors** (`tailwind.config.js`):
```javascript
colors: {
  'room-bg': '#F9F9F9',      // Background
  'room-primary': '#4F46E5',  // Primary (indigo)
  'room-secondary': '#6366F1', // Secondary (lighter indigo)
  'room-success': '#10B981',   // Green
  'room-warning': '#F59E0B',   // Amber
  'room-error': '#EF4444',     // Red
  'room-info': '#3B82F6',      // Blue
}
```

**Custom Animations**:
- `shake` - Error feedback animation
- `fade-in` - Overlay entrance
- `slide-up` - Popup entrance

### CSS Features (`globals.css`):
- Custom scrollbar styling
- Shimmer loading placeholder
- Mobile touch improvements (`:active` states)
- Responsive typography (14px on mobile)
- Print styles
- Focus visible styles for accessibility

---

## 10. Environment Variables

**Required**:
- `GEMINI_API_KEY` - Google Gemini API key (passed as prop, not env var)

**No `.env` file is required** - API key is passed as a component prop.

---

## 11. Migration Considerations for Split Lease

### 11.1 Compatible Patterns

| Pattern | ai-room-redesign | Split Lease | Migration Effort |
|---------|------------------|-------------|------------------|
| React Version | 18+ | 18 | None |
| Build Tool | Vite | Vite | None |
| TypeScript | Yes | No (JSX) | Convert to JS or add TS |
| Tailwind CSS | Yes | Yes | Merge configs |
| State Management | Hooks | Hooks | Compatible |

### 11.2 Integration Points

**For Islands Architecture**:
1. Create new island page: `app/public/ai-room-redesign.html`
2. Create entry point: `app/src/ai-room-redesign.jsx`
3. Add to routes.config.js
4. Convert TypeScript to JavaScript (or enable TS)

**API Key Handling**:
- Current: Passed as prop, calls Gemini directly from frontend
- **Recommended**: Create Supabase Edge Function to proxy Gemini API
  - Keeps API key on server
  - Rate limiting
  - Usage tracking
  - Error handling

### 11.3 Dependencies to Add

```bash
# Already in Split Lease (likely):
# - clsx (check version)

# Need to add:
bun add @lottiefiles/react-lottie-player react-dropzone react-hot-toast
```

### 11.4 Files to Migrate

**Core Components** (convert TS to JS):
- `components/AIRoomRedesign.tsx` -> `islands/shared/AIRoomRedesign.jsx`
- `components/FileUploader.tsx` -> `islands/shared/FileUploader.jsx`
- `components/RoomStyleSelector.tsx` -> `islands/shared/RoomStyleSelector.jsx`
- `components/PhotoTypeDropdown.tsx` -> `islands/shared/PhotoTypeDropdown.jsx`
- `components/LoadingOverlay.tsx` -> `islands/shared/LoadingOverlay.jsx`
- `components/ResultImageOverlay.tsx` -> `islands/shared/ResultImageOverlay.jsx`
- `components/Toast.tsx` -> Use existing Split Lease toast system

**Hooks**:
- `hooks/useFileUpload.ts` -> `hooks/useFileUpload.js`
- `hooks/useRoomRedesign.ts` -> `hooks/useRoomRedesign.js`

**Utilities**:
- `utils/fileUtils.ts` -> `lib/fileUtils.js`

**Data**:
- `data/roomStyles.ts` -> `data/roomStyles.js`

**API** (convert to Edge Function):
- `api/geminiApi.ts` -> `supabase/functions/ai-room-redesign/index.ts`

### 11.5 Tailwind Config Merge

Add to `app/tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      'room-bg': '#F9F9F9',
      'room-primary': '#4F46E5',
      'room-secondary': '#6366F1',
      'room-success': '#10B981',
      'room-warning': '#F59E0B',
      'room-error': '#EF4444',
      'room-info': '#3B82F6',
    },
    animation: {
      'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
      'fade-in': 'fadeIn 0.3s ease-in-out',
      'slide-up': 'slideUp 0.3s ease-out',
    },
    // ... keyframes
  }
}
```

### 11.6 Edge Function Structure

Recommended structure for `supabase/functions/ai-room-redesign/index.ts`:

```typescript
// Action-based pattern (matching Split Lease conventions)
interface AIRoomRedesignPayload {
  action: 'generate' | 'test-connection';
  base64Image?: string;
  stylePrompt?: string;
  photoType?: string;
}

// Response follows existing pattern
interface AIRoomRedesignResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}
```

---

## 12. Summary

The `ai-room-redesign` repository is a well-structured React 18 + TypeScript component library designed for AI-powered room redesign. It uses modern patterns including:

- **Modular component architecture** with clear separation of concerns
- **Custom hooks** for state management
- **Tailwind CSS** for styling
- **Direct Gemini API integration** (should be moved to Edge Function)

**Migration Complexity**: Medium
- Components are clean and can be converted to JSX
- Main work is creating Edge Function proxy for API security
- Dependencies are minimal and compatible

**Recommended Migration Steps**:
1. Create Edge Function for Gemini API proxy
2. Convert TypeScript components to JavaScript
3. Add to Islands Architecture
4. Merge Tailwind configurations
5. Test with existing Split Lease styling

---

## Referenced Files

### Source Repository
- `C:/Users/Split Lease/My Drive/!Agent Context and Tools/SL3/Split Lease/.claude/temp/ai-room-redesign/`

### Split Lease Integration Points
- `app/src/routes.config.js` - Add new route
- `app/tailwind.config.js` - Merge styles
- `app/src/islands/shared/` - Component destination
- `supabase/functions/` - Edge function destination
