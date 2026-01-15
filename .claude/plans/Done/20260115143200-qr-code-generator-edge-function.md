# Implementation Plan: QR Code Generator Edge Function

## Overview

Implement a new Supabase Edge Function (`qr-generator`) that generates QR codes with the Split Lease logo embedded, optional text labels, and customizable colors. Returns a 1080x1080px PNG image ready for marketing materials, print, or digital distribution.

## Success Criteria

- [ ] Edge Function accepts POST requests with `{ action: "generate", payload: {...} }` pattern
- [ ] Required parameter `data` (string to encode) is validated
- [ ] Optional parameters: `text`, `back_color`, `invert_colors` work correctly
- [ ] QR code displays Split Lease logo centered with white circle background
- [ ] Default colors: white QR modules on purple (#31135D) background
- [ ] Output is 1080x1080px PNG with proper headers
- [ ] Error responses follow standard JSON format: `{ success: false, error: "message" }`
- [ ] CORS headers present on all responses
- [ ] Function registered in `config.toml`
- [ ] Health action returns function status

---

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/qr-generator/index.ts` | **NEW** - Main edge function entry point | Create with action routing |
| `supabase/functions/qr-generator/handlers/generate.ts` | **NEW** - QR generation handler | Create with image composition logic |
| `supabase/functions/qr-generator/lib/qrConfig.ts` | **NEW** - Configuration constants | Create with colors, sizes, logo URL |
| `supabase/functions/qr-generator/deno.json` | **NEW** - Import map for dependencies | Create with QR/image library imports |
| `supabase/config.toml` | Supabase configuration | Add `[functions.qr-generator]` section |
| `supabase/functions/_shared/cors.ts` | CORS headers | Reference only (no changes) |
| `supabase/functions/_shared/errors.ts` | Error classes | Reference only (no changes) |
| `supabase/functions/_shared/validation.ts` | Validation utilities | Reference only (no changes) |
| `supabase/functions/_shared/fp/result.ts` | Result type utilities | Reference only (no changes) |
| `supabase/functions/_shared/fp/orchestration.ts` | Request parsing utilities | Reference only (no changes) |
| `supabase/functions/_shared/fp/errorLog.ts` | Error logging utilities | Reference only (no changes) |
| `supabase/functions/_shared/slack.ts` | Slack error reporting | Reference only (no changes) |

### Related Documentation

- [supabase/CLAUDE.md](../../supabase/CLAUDE.md) - Edge Functions reference, action-based patterns
- [Deno QR libraries](https://jsr.io/search?q=qr) - JSR registry for Deno-compatible QR libraries

### Existing Patterns to Follow

1. **Action-Based Routing** (from `slack/index.ts`, `send-email/index.ts`):
   ```typescript
   const { action, payload } = body;
   validateAction(action, allowedActions);
   switch (action) {
     case 'generate': result = await handleGenerate(payload); break;
     case 'health': result = handleHealth(); break;
   }
   ```

2. **FP Orchestration Pattern** (from `send-email/index.ts`):
   ```typescript
   import { parseRequest, validateAction, formatSuccessResponse, formatErrorResponseHttp, formatCorsResponse, CorsPreflightSignal } from "../_shared/fp/orchestration.ts";
   import { createErrorLog, addError, setAction } from "../_shared/fp/errorLog.ts";
   import { reportErrorLog } from "../_shared/slack.ts";
   ```

3. **Inlined Dependencies Pattern** (from `slack/index.ts`):
   - For simpler functions, dependencies can be inlined to avoid bundling issues
   - For complex functions with external libs, use `deno.json` import map

4. **Binary Response Pattern** (no existing precedent, must implement):
   ```typescript
   return new Response(pngBuffer, {
     status: 200,
     headers: {
       ...corsHeaders,
       'Content-Type': 'image/png',
       'Content-Disposition': `attachment; filename="qr-${timestamp}.png"`,
     },
   });
   ```

---

## Implementation Steps

### Step 1: Create Directory Structure

**Files:**
- `supabase/functions/qr-generator/` (directory)
- `supabase/functions/qr-generator/handlers/` (directory)
- `supabase/functions/qr-generator/lib/` (directory)

**Purpose:** Establish the standard Edge Function folder structure

**Details:**
- Create main function directory at `supabase/functions/qr-generator/`
- Create `handlers/` subdirectory for action handlers
- Create `lib/` subdirectory for configuration and utilities

**Validation:** Directories exist and are empty

---

### Step 2: Create Configuration File (`lib/qrConfig.ts`)

**Files:** `supabase/functions/qr-generator/lib/qrConfig.ts`

**Purpose:** Centralize all QR code generation constants

**Details:**
```typescript
/**
 * QR Code Generator Configuration
 * Split Lease - Edge Functions
 *
 * Centralized constants for QR code generation
 */

// ─────────────────────────────────────────────────────────────
// Dimensions
// ─────────────────────────────────────────────────────────────

/** Final output image size in pixels */
export const OUTPUT_SIZE = 1080;

/** Padding around QR code in pixels */
export const PADDING = 72;

/** QR code display size (output - 2*padding) */
export const QR_DISPLAY_SIZE = OUTPUT_SIZE - (PADDING * 2); // 936

/** Logo size relative to QR display size */
export const LOGO_SIZE_RATIO = 0.25; // 1/4 of QR display

/** Logo size in pixels */
export const LOGO_SIZE = Math.floor(QR_DISPLAY_SIZE * LOGO_SIZE_RATIO); // ~234

/** White circle behind logo (multiplier of logo size) */
export const LOGO_CIRCLE_RATIO = 1.26;

/** White circle diameter */
export const LOGO_CIRCLE_SIZE = Math.floor(LOGO_SIZE * LOGO_CIRCLE_RATIO); // ~295

// ─────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────

/** Split Lease brand purple */
export const BRAND_PURPLE = '#31135D';

/** Default background color */
export const DEFAULT_BACKGROUND = BRAND_PURPLE;

/** Default QR module (dark) color */
export const DEFAULT_QR_DARK = '#FFFFFF';

/** Default QR module (light) color - same as background */
export const DEFAULT_QR_LIGHT = BRAND_PURPLE;

/** Color for "black" or "monotone" keyword */
export const MONOTONE_BACKGROUND = '#000000';

// ─────────────────────────────────────────────────────────────
// Logo
// ─────────────────────────────────────────────────────────────

/** Split Lease logo URL (S3) */
export const LOGO_URL = 'https://s3.amazonaws.com/appforest_uf/f1587601671931x294112149689599100/split%20lease%20purple%20circle.png';

// ─────────────────────────────────────────────────────────────
// Text
// ─────────────────────────────────────────────────────────────

/** Font size for optional text label */
export const TEXT_FONT_SIZE = 63;

/** Spacing between QR code and text */
export const TEXT_SPACING = 2;

// ─────────────────────────────────────────────────────────────
// QR Code Settings
// ─────────────────────────────────────────────────────────────

/** Error correction level (HIGH to accommodate logo) */
export const ERROR_CORRECTION = 'H';

/** QR code version (auto if undefined) */
export const QR_VERSION = undefined;
```

**Validation:** File compiles without TypeScript errors

---

### Step 3: Create Import Map (`deno.json`)

**Files:** `supabase/functions/qr-generator/deno.json`

**Purpose:** Configure Deno imports for QR and image libraries

**Details:**

After research, the recommended libraries for Deno are:
- **QR Code Generation**: `qrcode` npm package via esm.sh or `jsr:@nicolo/qrcode`
- **Image Manipulation**: `imagescript` (Deno-native image library) or Canvas API

```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2",
    "qrcode": "npm:qrcode@1.5.3",
    "imagescript": "https://deno.land/x/imagescript@1.3.0/mod.ts"
  }
}
```

**Alternative using JSR:**
```json
{
  "imports": {
    "@nicolo/qrcode": "jsr:@nicolo/qrcode@0.0.3"
  }
}
```

**Note:** The exact library choice should be validated during implementation. `qrcode` npm package is well-tested and supports:
- `toDataURL()` for base64 output
- `toBuffer()` for raw PNG buffer
- `errorCorrectionLevel: 'H'` for high error correction

**Validation:** `deno check` passes with import map

---

### Step 4: Create Generate Handler (`handlers/generate.ts`)

**Files:** `supabase/functions/qr-generator/handlers/generate.ts`

**Purpose:** Core QR code generation logic with image composition

**Details:**

```typescript
/**
 * QR Code Generate Handler
 * Split Lease - Edge Functions
 *
 * Generates QR codes with embedded Split Lease logo and optional text
 *
 * FP ARCHITECTURE:
 * - Pure functions for validation and configuration
 * - Side effects (fetch, image generation) isolated in handler
 * - Result type for error propagation
 */

import QRCode from "qrcode";
import {
  OUTPUT_SIZE,
  PADDING,
  QR_DISPLAY_SIZE,
  LOGO_SIZE,
  LOGO_CIRCLE_SIZE,
  DEFAULT_BACKGROUND,
  DEFAULT_QR_DARK,
  DEFAULT_QR_LIGHT,
  MONOTONE_BACKGROUND,
  LOGO_URL,
  TEXT_FONT_SIZE,
  TEXT_SPACING,
  ERROR_CORRECTION,
} from "../lib/qrConfig.ts";
import { ValidationError } from "../../_shared/errors.ts";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface GeneratePayload {
  /** String to encode in QR code (required) */
  data: string;
  /** Optional text to display below QR code (will be uppercased) */
  text?: string;
  /** Background color: hex code or "black"/"monotone" */
  back_color?: string;
  /** Invert QR code colors (default: false) */
  invert_colors?: boolean;
}

interface QRColors {
  background: string;
  qrDark: string;
  qrLight: string;
}

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Validate hex color format
 */
const isValidHexColor = (color: string): boolean =>
  /^#[0-9A-Fa-f]{6}$/.test(color);

/**
 * Resolve background color from input
 * Handles: hex codes, "black", "monotone" keywords
 */
const resolveBackgroundColor = (input?: string): string => {
  if (!input) return DEFAULT_BACKGROUND;

  const normalized = input.toLowerCase().trim();

  if (normalized === 'black' || normalized === 'monotone') {
    return MONOTONE_BACKGROUND;
  }

  // Ensure hex format
  const hexColor = normalized.startsWith('#') ? normalized : `#${normalized}`;

  if (!isValidHexColor(hexColor)) {
    throw new ValidationError(`Invalid color format: ${input}. Use hex (e.g., #31135D) or keywords: black, monotone`);
  }

  return hexColor;
};

/**
 * Calculate QR code colors based on options
 */
const calculateColors = (
  backColor?: string,
  invertColors: boolean = false
): QRColors => {
  const background = resolveBackgroundColor(backColor);

  if (invertColors) {
    return {
      background,
      qrDark: background,  // QR modules match background
      qrLight: '#FFFFFF',  // Light areas are white
    };
  }

  return {
    background,
    qrDark: '#FFFFFF',     // White QR modules (default)
    qrLight: background,   // Light areas match background
  };
};

/**
 * Validate generate payload
 */
const validatePayload = (payload: unknown): GeneratePayload => {
  if (!payload || typeof payload !== 'object') {
    throw new ValidationError('payload is required');
  }

  const p = payload as Record<string, unknown>;

  if (!p.data || typeof p.data !== 'string' || p.data.trim() === '') {
    throw new ValidationError('data is required and must be a non-empty string');
  }

  return {
    data: p.data.trim(),
    text: typeof p.text === 'string' ? p.text : undefined,
    back_color: typeof p.back_color === 'string' ? p.back_color : undefined,
    invert_colors: typeof p.invert_colors === 'boolean' ? p.invert_colors : false,
  };
};

// ─────────────────────────────────────────────────────────────
// Image Composition (Side Effects)
// ─────────────────────────────────────────────────────────────

/**
 * Fetch logo image from URL
 */
const fetchLogo = async (): Promise<ArrayBuffer> => {
  const response = await fetch(LOGO_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch logo: ${response.status} ${response.statusText}`);
  }
  return response.arrayBuffer();
};

/**
 * Generate QR code as data URL
 */
const generateQRDataUrl = async (
  data: string,
  colors: QRColors
): Promise<string> => {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: ERROR_CORRECTION,
    width: QR_DISPLAY_SIZE,
    margin: 0,
    color: {
      dark: colors.qrDark,
      light: colors.qrLight,
    },
  });
};

/**
 * Compose final image with QR code, logo, and optional text
 *
 * Uses Canvas API (available in Deno Deploy) or ImageScript for composition
 */
const composeImage = async (
  qrDataUrl: string,
  logoBuffer: ArrayBuffer,
  colors: QRColors,
  text?: string
): Promise<Uint8Array> => {
  // Note: Implementation depends on chosen image library
  // Using Canvas API approach (available in Deno Deploy):

  const { createCanvas, loadImage } = await import("https://deno.land/x/canvas@v1.4.1/mod.ts");

  // Create canvas with output dimensions
  const canvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  // Load and draw QR code (centered with padding)
  const qrImage = await loadImage(qrDataUrl);
  ctx.drawImage(qrImage, PADDING, PADDING, QR_DISPLAY_SIZE, QR_DISPLAY_SIZE);

  // Calculate logo position (center of QR code)
  const centerX = OUTPUT_SIZE / 2;
  const centerY = PADDING + (QR_DISPLAY_SIZE / 2);

  // Draw white circle behind logo
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(centerX, centerY, LOGO_CIRCLE_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();

  // Load and draw logo
  const logoImage = await loadImage(new Uint8Array(logoBuffer));
  ctx.drawImage(
    logoImage,
    centerX - (LOGO_SIZE / 2),
    centerY - (LOGO_SIZE / 2),
    LOGO_SIZE,
    LOGO_SIZE
  );

  // Draw optional text below QR code
  if (text) {
    const upperText = text.toUpperCase();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${TEXT_FONT_SIZE}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const textY = PADDING + QR_DISPLAY_SIZE + TEXT_SPACING;
    ctx.fillText(upperText, centerX, textY);
  }

  // Export as PNG
  return canvas.toBuffer('image/png');
};

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle QR code generation request
 * Returns PNG buffer for binary response
 */
export const handleGenerate = async (
  payload: unknown
): Promise<Uint8Array> => {
  console.log('[qr-generator] Starting QR code generation');

  // Validate input
  const validatedPayload = validatePayload(payload);
  console.log('[qr-generator] Payload validated:', {
    dataLength: validatedPayload.data.length,
    hasText: !!validatedPayload.text,
    backColor: validatedPayload.back_color,
    invertColors: validatedPayload.invert_colors,
  });

  // Calculate colors
  const colors = calculateColors(
    validatedPayload.back_color,
    validatedPayload.invert_colors
  );
  console.log('[qr-generator] Colors calculated:', colors);

  // Generate QR code
  const qrDataUrl = await generateQRDataUrl(validatedPayload.data, colors);
  console.log('[qr-generator] QR code generated');

  // Fetch logo
  const logoBuffer = await fetchLogo();
  console.log('[qr-generator] Logo fetched:', logoBuffer.byteLength, 'bytes');

  // Compose final image
  const pngBuffer = await composeImage(
    qrDataUrl,
    logoBuffer,
    colors,
    validatedPayload.text
  );
  console.log('[qr-generator] Image composed:', pngBuffer.length, 'bytes');

  return pngBuffer;
};
```

**Validation:**
- Handler exports correctly
- TypeScript compiles without errors
- Test with sample data locally

---

### Step 5: Create Main Entry Point (`index.ts`)

**Files:** `supabase/functions/qr-generator/index.ts`

**Purpose:** Edge function entry point with action routing and response handling

**Details:**

```typescript
/**
 * QR Code Generator - Edge Function
 * Split Lease
 *
 * Generates branded QR codes with the Split Lease logo
 *
 * Actions:
 * - generate: Create QR code image (returns PNG binary)
 * - health: Check function status
 *
 * NO AUTHENTICATION REQUIRED - Public endpoint
 *
 * FP ARCHITECTURE:
 * - Pure functions for validation, routing, and response formatting
 * - Side effects isolated to boundaries (entry/exit of handler)
 * - Result type for error propagation
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  ValidationError,
} from "../_shared/errors.ts";
import { Result, ok, err } from "../_shared/fp/result.ts";
import {
  parseRequest,
  validateAction,
  formatErrorResponseHttp,
  formatCorsResponse,
  CorsPreflightSignal,
} from "../_shared/fp/orchestration.ts";
import { createErrorLog, addError, setAction, ErrorLog } from "../_shared/fp/errorLog.ts";
import { reportErrorLog } from "../_shared/slack.ts";
import { corsHeaders } from "../_shared/cors.ts";

import { handleGenerate } from "./handlers/generate.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["generate", "health"] as const;
type Action = typeof ALLOWED_ACTIONS[number];

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Health check handler
 */
const handleHealth = (): { status: string; timestamp: string; actions: readonly string[] } => ({
  status: 'healthy',
  timestamp: new Date().toISOString(),
  actions: ALLOWED_ACTIONS,
});

/**
 * Format binary (PNG) response
 */
const formatBinaryResponse = (
  buffer: Uint8Array,
  filename: string
): Response =>
  new Response(buffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  });

/**
 * Format success JSON response
 */
const formatSuccessResponse = <T>(data: T): Response =>
  new Response(
    JSON.stringify({ success: true, data }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );

/**
 * Generate timestamped filename for download
 */
const generateFilename = (): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `splitlease-qr-${timestamp}.png`;
};

// ─────────────────────────────────────────────────────────────
// Effect Boundary
// ─────────────────────────────────────────────────────────────

console.log("[qr-generator] Edge Function started (FP mode)");

Deno.serve(async (req: Request) => {
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('qr-generator', 'unknown', correlationId);

  try {
    console.log(`[qr-generator] ========== REQUEST ==========`);
    console.log(`[qr-generator] Method: ${req.method}`);

    // Parse request (handles CORS preflight)
    const parseResult = await parseRequest(req);

    if (!parseResult.ok) {
      if (parseResult.error instanceof CorsPreflightSignal) {
        return formatCorsResponse();
      }
      throw parseResult.error;
    }

    const { action, payload } = parseResult.value;
    errorLog = setAction(errorLog, action);
    console.log(`[qr-generator] Action: ${action}`);

    // Validate action
    const actionResult = validateAction(ALLOWED_ACTIONS, action);
    if (!actionResult.ok) {
      throw actionResult.error;
    }

    // Route to handler
    switch (action) {
      case 'health': {
        const result = handleHealth();
        console.log(`[qr-generator] ========== SUCCESS (health) ==========`);
        return formatSuccessResponse(result);
      }

      case 'generate': {
        const pngBuffer = await handleGenerate(payload);
        const filename = generateFilename();
        console.log(`[qr-generator] ========== SUCCESS (generate) ==========`);
        return formatBinaryResponse(pngBuffer, filename);
      }

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = action;
        throw new ValidationError(`Unknown action: ${action}`);
      }
    }

  } catch (error) {
    console.error(`[qr-generator] ========== ERROR ==========`);
    console.error(`[qr-generator]`, error);

    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');
    reportErrorLog(errorLog);

    return formatErrorResponseHttp(error as Error);
  }
});
```

**Validation:**
- Function starts without errors
- OPTIONS request returns CORS headers
- Invalid action returns proper error JSON
- Health action returns JSON response

---

### Step 6: Register in config.toml

**Files:** `supabase/config.toml`

**Purpose:** Register the new Edge Function with Supabase

**Details:**
Add the following section after the existing function definitions (around line 446):

```toml
[functions.qr-generator]
enabled = true
verify_jwt = false
import_map = "./functions/qr-generator/deno.json"
entrypoint = "./functions/qr-generator/index.ts"
```

**Validation:** `supabase functions serve qr-generator` starts without errors

---

### Step 7: Test Locally

**Files:** N/A (testing commands)

**Purpose:** Verify function works correctly before deployment

**Details:**

```bash
# Start the function locally
supabase functions serve qr-generator

# Test health endpoint
curl -X POST http://localhost:54321/functions/v1/qr-generator \
  -H "Content-Type: application/json" \
  -d '{"action": "health"}'

# Test generate with minimal payload
curl -X POST http://localhost:54321/functions/v1/qr-generator \
  -H "Content-Type: application/json" \
  -d '{"action": "generate", "payload": {"data": "https://splitlease.com"}}' \
  --output test-qr.png

# Test generate with all options
curl -X POST http://localhost:54321/functions/v1/qr-generator \
  -H "Content-Type: application/json" \
  -d '{"action": "generate", "payload": {"data": "https://splitlease.com", "text": "SCAN ME", "back_color": "#000000", "invert_colors": false}}' \
  --output test-qr-custom.png

# Test error handling - missing data
curl -X POST http://localhost:54321/functions/v1/qr-generator \
  -H "Content-Type: application/json" \
  -d '{"action": "generate", "payload": {}}'

# Test error handling - invalid color
curl -X POST http://localhost:54321/functions/v1/qr-generator \
  -H "Content-Type: application/json" \
  -d '{"action": "generate", "payload": {"data": "test", "back_color": "invalid"}}'
```

**Validation:**
- [ ] Health endpoint returns `{ success: true, data: { status: "healthy", ... } }`
- [ ] Generate returns PNG file that opens correctly
- [ ] QR code is scannable
- [ ] Logo is centered with white circle background
- [ ] Custom colors work (black background, etc.)
- [ ] Text appears below QR code in uppercase
- [ ] Error responses are proper JSON with `success: false`

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| Empty `data` string | Return 400 ValidationError: "data is required and must be a non-empty string" |
| Very long `data` string | QR library may fail; let error propagate with descriptive message |
| Invalid hex color | Return 400 ValidationError with valid format examples |
| Logo fetch fails (S3 down) | Return 500 with "Failed to fetch logo" message |
| Canvas library unavailable | Return 500 with specific error; log to Slack |
| Very long text label | May overflow; accept as-is (canvas will clip) |
| Special characters in data | QR library handles encoding; pass through |

---

## Testing Considerations

### Unit Tests (if needed)
- `isValidHexColor()` - test various hex formats
- `resolveBackgroundColor()` - test keywords and hex values
- `calculateColors()` - test with/without invert
- `validatePayload()` - test required/optional fields

### Integration Tests
- Generate QR code and verify it's scannable
- Verify logo is properly centered
- Verify text rendering
- Verify color customization

### Manual Testing
- Open generated PNG in image viewer
- Scan QR code with phone
- Verify dimensions are exactly 1080x1080
- Verify branding matches design requirements

---

## Rollback Strategy

1. **If deployment fails:** Remove `[functions.qr-generator]` from `config.toml`
2. **If runtime errors:** Check Supabase logs, fix, and redeploy
3. **If image library incompatible:** Try alternative library (imagescript vs canvas)
4. **Complete rollback:** Delete `supabase/functions/qr-generator/` directory

---

## Dependencies & Blockers

### Dependencies
- **Canvas API or ImageScript**: Need Deno-compatible image composition library
- **QRCode library**: Need npm `qrcode` or JSR equivalent that supports Deno
- **Logo availability**: S3 URL must be publicly accessible

### Potential Blockers
1. **Canvas in Deno Deploy**: Canvas library may have limitations; test in production environment
2. **Memory limits**: Large image composition may hit Edge Function memory limits
3. **Cold start time**: Image library imports may increase cold start

### Alternatives if Canvas Fails
1. Use `imagescript` (pure TypeScript, no native dependencies)
2. Use `sharp` via npm (may require specific Deno config)
3. Generate SVG instead of PNG (smaller, but less compatible)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Canvas library incompatible with Deno Deploy | Medium | High | Test early; have imagescript as backup |
| Logo S3 URL changes | Low | High | Consider caching logo or using env var for URL |
| QR library version incompatible | Low | Medium | Pin specific version in deno.json |
| Memory limits exceeded | Low | Medium | Monitor function metrics; optimize if needed |
| Cold start too slow | Medium | Low | Accept tradeoff; consider keeping function warm |

---

## Deployment Reminder

After implementation and testing:

```bash
# Deploy the new function
supabase functions deploy qr-generator

# Verify deployment
curl -X POST https://<project-ref>.supabase.co/functions/v1/qr-generator \
  -H "Content-Type: application/json" \
  -d '{"action": "health"}'
```

**Remember:** Edge Functions require manual deployment. This function does not auto-deploy on git push.

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/qr-generator/index.ts` | Main entry point with action routing |
| `supabase/functions/qr-generator/handlers/generate.ts` | QR generation and image composition |
| `supabase/functions/qr-generator/lib/qrConfig.ts` | Configuration constants |
| `supabase/functions/qr-generator/deno.json` | Import map for dependencies |

### Files to Modify
| File | Change |
|------|--------|
| `supabase/config.toml` | Add `[functions.qr-generator]` section |

### Files to Reference (No Changes)
| File | Purpose |
|------|---------|
| `supabase/functions/_shared/cors.ts` | CORS headers pattern |
| `supabase/functions/_shared/errors.ts` | Error classes |
| `supabase/functions/_shared/validation.ts` | Validation utilities |
| `supabase/functions/_shared/fp/result.ts` | Result type |
| `supabase/functions/_shared/fp/orchestration.ts` | Request parsing |
| `supabase/functions/_shared/fp/errorLog.ts` | Error logging |
| `supabase/functions/_shared/slack.ts` | Slack reporting |

---

**Plan Version:** 1.0
**Created:** 2026-01-15
**Author:** Claude (Implementation Planner)
