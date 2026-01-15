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
import { Image, decode } from "imagescript";
import {
  OUTPUT_SIZE,
  PADDING,
  QR_DISPLAY_SIZE,
  LOGO_SIZE,
  LOGO_CIRCLE_SIZE,
  DEFAULT_BACKGROUND,
  MONOTONE_BACKGROUND,
  LOGO_URL,
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
 * Convert hex color to RGBA number for imagescript
 * Format: 0xRRGGBBAA
 */
const hexToRgba = (hex: string, alpha: number = 255): number => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return ((r << 24) | (g << 16) | (b << 8) | alpha) >>> 0;
};

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
 * Uses imagescript for Deno Deploy compatibility (pure TypeScript)
 * Note: Text rendering not supported in pure imagescript without font files
 */
const composeImage = async (
  qrDataUrl: string,
  logoBuffer: ArrayBuffer,
  colors: QRColors,
  _text?: string  // Reserved for future font-based implementation
): Promise<Uint8Array> => {
  // Create base image with background color
  const canvas = new Image(OUTPUT_SIZE, OUTPUT_SIZE);
  canvas.fill(hexToRgba(colors.background));

  // Decode QR code from data URL (strip base64 prefix)
  const qrBase64 = qrDataUrl.split(',')[1];
  const qrBytes = Uint8Array.from(atob(qrBase64), c => c.charCodeAt(0));
  const qrImage = await decode(qrBytes);

  // Resize QR code to fit display area
  const qrResized = qrImage.resize(QR_DISPLAY_SIZE, QR_DISPLAY_SIZE);

  // Composite QR code onto canvas at padding offset
  canvas.composite(qrResized, PADDING, PADDING);

  // Calculate logo position (center of QR code)
  const centerX = Math.floor(OUTPUT_SIZE / 2);
  const centerY = Math.floor(PADDING + (QR_DISPLAY_SIZE / 2));

  // Draw white circle behind logo
  const circleRadius = Math.floor(LOGO_CIRCLE_SIZE / 2);
  drawFilledCircle(canvas, centerX, centerY, circleRadius, hexToRgba('#FFFFFF'));

  // Decode and resize logo
  const logoImage = await decode(new Uint8Array(logoBuffer));
  const logoResized = logoImage.resize(LOGO_SIZE, LOGO_SIZE);

  // Composite logo at center
  const logoX = Math.floor(centerX - (LOGO_SIZE / 2));
  const logoY = Math.floor(centerY - (LOGO_SIZE / 2));
  canvas.composite(logoResized, logoX, logoY);

  // Note: Text rendering requires font file loading
  // For now, text parameter is accepted but not rendered
  // TODO: Implement text rendering with embedded font or external font fetch

  // Export as PNG
  return canvas.encode();
};

/**
 * Draw a filled circle on an image (imagescript doesn't have built-in circle fill)
 */
const drawFilledCircle = (
  image: Image,
  cx: number,
  cy: number,
  radius: number,
  color: number
): void => {
  const radiusSq = radius * radius;

  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (x * x + y * y <= radiusSq) {
        const px = cx + x;
        const py = cy + y;
        if (px >= 0 && px < image.width && py >= 0 && py < image.height) {
          image.setPixelAt(px + 1, py + 1, color); // imagescript uses 1-based indexing
        }
      }
    }
  }
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
