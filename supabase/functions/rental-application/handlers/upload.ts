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
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";
import { decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

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

// Max file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

interface UploadPayload {
  fileType: FileType;
  fileName: string;
  fileData: string; // Base64 encoded
  mimeType: string;
}

interface UploadResult {
  url: string;
  path: string;
  fileType: string;
}

/**
 * Handle file upload to Supabase Storage
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
  console.log(`[RentalApp:upload] Starting upload for user: ${userId}`);

  const input = payload as unknown as UploadPayload;

  // ================================================
  // VALIDATION
  // ================================================

  // Validate file type
  if (!input.fileType || !VALID_FILE_TYPES.includes(input.fileType as FileType)) {
    throw new ValidationError(`Invalid file type: ${input.fileType}. Must be one of: ${VALID_FILE_TYPES.join(', ')}`);
  }

  // Validate file name
  if (!input.fileName || input.fileName.trim() === '') {
    throw new ValidationError('File name is required');
  }

  // Validate file data
  if (!input.fileData || input.fileData.trim() === '') {
    throw new ValidationError('File data is required');
  }

  // Validate MIME type
  if (!input.mimeType || !ALLOWED_MIME_TYPES.includes(input.mimeType)) {
    throw new ValidationError(`Invalid MIME type: ${input.mimeType}. Must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  console.log(`[RentalApp:upload] Validated: ${input.fileType} - ${input.fileName} (${input.mimeType})`);

  // ================================================
  // DECODE AND VALIDATE FILE SIZE
  // ================================================

  let fileBytes: Uint8Array;
  try {
    fileBytes = decode(input.fileData);
  } catch (error) {
    console.error(`[RentalApp:upload] Base64 decode failed:`, error);
    throw new ValidationError('Invalid file data: could not decode base64');
  }

  if (fileBytes.length > MAX_FILE_SIZE) {
    throw new ValidationError(`File too large: ${(fileBytes.length / 1024 / 1024).toFixed(2)}MB. Maximum is 10MB`);
  }

  console.log(`[RentalApp:upload] File size: ${(fileBytes.length / 1024).toFixed(2)}KB`);

  // ================================================
  // GENERATE STORAGE PATH
  // ================================================

  // Sanitize filename - remove special characters, keep extension
  const sanitizedFileName = input.fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100); // Limit filename length

  // Add timestamp to prevent collisions
  const timestamp = Date.now();
  const storagePath = `${userId}/${input.fileType}/${timestamp}_${sanitizedFileName}`;

  console.log(`[RentalApp:upload] Storage path: ${storagePath}`);

  // ================================================
  // UPLOAD TO STORAGE
  // ================================================

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('rental-applications')
    .upload(storagePath, fileBytes, {
      contentType: input.mimeType,
      upsert: false, // Don't overwrite existing files
    });

  if (uploadError) {
    console.error(`[RentalApp:upload] Upload failed:`, uploadError);
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  console.log(`[RentalApp:upload] File uploaded successfully:`, uploadData.path);

  // ================================================
  // GENERATE SIGNED URL (valid for 1 year)
  // ================================================

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('rental-applications')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year expiry

  if (signedUrlError) {
    console.error(`[RentalApp:upload] Signed URL generation failed:`, signedUrlError);
    throw new Error(`Failed to generate file URL: ${signedUrlError.message}`);
  }

  console.log(`[RentalApp:upload] Complete, returning URL`);

  return {
    url: signedUrlData.signedUrl,
    path: storagePath,
    fileType: input.fileType,
  };
}
