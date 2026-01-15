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
import { createCanvas, loadImage } from "canvas";
import {
  OUTPUT_SIZE,
  PADDING,
  QR_DISPLAY_SIZE,
  LOGO_SIZE,
  LOGO_CIRCLE_SIZE,
  DEFAULT_BACKGROUND,
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
 * Uses Canvas API for image composition
 */
const composeImage = async (
  qrDataUrl: string,
  logoBuffer: ArrayBuffer,
  colors: QRColors,
  text?: string
): Promise<Uint8Array> => {
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
