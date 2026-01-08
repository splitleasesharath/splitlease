/**
 * Upload File Handler for Rental Application
 * Split Lease - Supabase Edge Functions
 *
 * Handles file uploads to Supabase Storage for rental application documents.
 * Files are stored in the 'rental-applications' bucket with path: {userId}/{fileType}/{filename}
 *
 * Supports both:
 * - Supabase Auth users (UUID format)
 * - Legacy Bubble users (17-char alphanumeric) - uses service role for storage access
 *
 * FP PATTERN: Separates pure data builders from effectful storage operations
 * All data transformations are pure with @pure annotations
 * All storage operations are explicit with @effectful annotations
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * @module rental-application/handlers/upload
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";
import { decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[RentalApp:upload]'
const STORAGE_BUCKET = 'rental-applications'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILENAME_LENGTH = 100
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 365 // 1 year in seconds

// Valid file types that can be uploaded
const VALID_FILE_TYPES = [
  'employmentProof',
  'alternateGuarantee',
  'altGuarantee',
  'creditScore',
  'references',
  'stateIdFront',
  'stateIdBack',
  'governmentId',
] as const;

type FileType = typeof VALID_FILE_TYPES[number];

// Allowed MIME types
const ALLOWED_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface UploadPayload {
  readonly fileType: FileType;
  readonly fileName: string;
  readonly fileData: string; // Base64 encoded
  readonly mimeType: string;
}

interface UploadResult {
  readonly url: string;
  readonly path: string;
  readonly fileType: string;
}

// ─────────────────────────────────────────────────────────────
// Pure Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if file type is valid
 * @pure
 */
const isValidFileType = (fileType: string): fileType is FileType =>
  VALID_FILE_TYPES.includes(fileType as FileType)

/**
 * Check if MIME type is allowed
 * @pure
 */
const isAllowedMimeType = (mimeType: string): boolean =>
  ALLOWED_MIME_TYPES.includes(mimeType)

/**
 * Check if file size is within limit
 * @pure
 */
const isFileSizeValid = (size: number): boolean =>
  size <= MAX_FILE_SIZE

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Sanitize filename for storage
 * @pure
 */
const sanitizeFileName = (fileName: string): string =>
  fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, MAX_FILENAME_LENGTH)

/**
 * Build storage path
 * @pure
 */
const buildStoragePath = (userId: string, fileType: string, fileName: string): string => {
  const timestamp = Date.now();
  const sanitized = sanitizeFileName(fileName);
  return `${userId}/${fileType}/${timestamp}_${sanitized}`;
}

/**
 * Build success response
 * @pure
 */
const buildSuccessResponse = (url: string, path: string, fileType: string): UploadResult =>
  Object.freeze({
    url,
    path,
    fileType,
  })

/**
 * Format file size for display
 * @pure
 */
const formatFileSize = (bytes: number): string =>
  (bytes / 1024).toFixed(2)

// ─────────────────────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Validate upload payload
 * @pure - Throws ValidationError on invalid input
 */
const validateUploadPayload = (input: UploadPayload): void => {
  if (!input.fileType || !isValidFileType(input.fileType)) {
    throw new ValidationError(`Invalid file type: ${input.fileType}. Must be one of: ${VALID_FILE_TYPES.join(', ')}`);
  }

  if (!input.fileName || input.fileName.trim() === '') {
    throw new ValidationError('File name is required');
  }

  if (!input.fileData || input.fileData.trim() === '') {
    throw new ValidationError('File data is required');
  }

  if (!input.mimeType || !isAllowedMimeType(input.mimeType)) {
    throw new ValidationError(`Invalid MIME type: ${input.mimeType}. Must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }
}

/**
 * Decode and validate file data
 * @pure - Returns decoded bytes or throws ValidationError
 */
const decodeAndValidateFileData = (fileData: string): Uint8Array => {
  let fileBytes: Uint8Array;

  try {
    fileBytes = decode(fileData);
  } catch (_error) {
    throw new ValidationError('Invalid file data: could not decode base64');
  }

  if (!isFileSizeValid(fileBytes.length)) {
    const sizeMB = (fileBytes.length / 1024 / 1024).toFixed(2);
    throw new ValidationError(`File too large: ${sizeMB}MB. Maximum is 10MB`);
  }

  return fileBytes;
}

// ─────────────────────────────────────────────────────────────
// Storage Operations
// ─────────────────────────────────────────────────────────────

/**
 * Upload file to storage
 * @effectful - Storage write operation
 */
const uploadToStorage = async (
  supabase: SupabaseClient,
  storagePath: string,
  fileBytes: Uint8Array,
  mimeType: string
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBytes, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error(`${LOG_PREFIX} Upload failed:`, error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return data.path;
}

/**
 * Generate signed URL for file
 * @effectful - Storage read operation
 */
const generateSignedUrl = async (
  supabase: SupabaseClient,
  storagePath: string
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  if (error) {
    console.error(`${LOG_PREFIX} Signed URL generation failed:`, error);
    throw new Error(`Failed to generate file URL: ${error.message}`);
  }

  return data.signedUrl;
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle file upload to Supabase Storage
 * @effectful - Orchestrates storage operations
 *
 * @param payload - The upload payload containing file data
 * @param supabase - Supabase client (admin/service role)
 * @param userId - The user's ID (Bubble _id format)
 */
export async function handleUpload(
  payload: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string
): Promise<UploadResult> {
  console.log(`${LOG_PREFIX} Starting upload for user: ${userId}`);

  const input = payload as unknown as UploadPayload;

  // ================================================
  // VALIDATION
  // ================================================

  validateUploadPayload(input);

  console.log(`${LOG_PREFIX} Validated: ${input.fileType} - ${input.fileName} (${input.mimeType})`);

  // ================================================
  // DECODE AND VALIDATE FILE SIZE
  // ================================================

  const fileBytes = decodeAndValidateFileData(input.fileData);

  console.log(`${LOG_PREFIX} File size: ${formatFileSize(fileBytes.length)}KB`);

  // ================================================
  // GENERATE STORAGE PATH
  // ================================================

  const storagePath = buildStoragePath(userId, input.fileType, input.fileName);

  console.log(`${LOG_PREFIX} Storage path: ${storagePath}`);

  // ================================================
  // UPLOAD TO STORAGE
  // ================================================

  const uploadedPath = await uploadToStorage(supabase, storagePath, fileBytes, input.mimeType);

  console.log(`${LOG_PREFIX} File uploaded successfully:`, uploadedPath);

  // ================================================
  // GENERATE SIGNED URL
  // ================================================

  const signedUrl = await generateSignedUrl(supabase, storagePath);

  console.log(`${LOG_PREFIX} Complete, returning URL`);

  return buildSuccessResponse(signedUrl, storagePath, input.fileType);
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  STORAGE_BUCKET,
  MAX_FILE_SIZE,
  MAX_FILENAME_LENGTH,
  SIGNED_URL_EXPIRY,
  VALID_FILE_TYPES,
  ALLOWED_MIME_TYPES,

  // Pure Predicates
  isValidFileType,
  isAllowedMimeType,
  isFileSizeValid,

  // Pure Data Builders
  sanitizeFileName,
  buildStoragePath,
  buildSuccessResponse,
  formatFileSize,

  // Validation Helpers
  validateUploadPayload,
  decodeAndValidateFileData,

  // Storage Operations
  uploadToStorage,
  generateSignedUrl,

  // Main Handler
  handleUpload,
})
