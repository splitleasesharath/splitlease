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
