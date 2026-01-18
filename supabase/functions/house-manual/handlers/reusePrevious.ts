/**
 * Reuse Previous Handler
 *
 * Copies suggestions from a previous house manual to the current one.
 * Useful when a host has created suggestions for one listing and wants
 * to apply similar content to another.
 *
 * @module house-manual/handlers/reusePrevious
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

interface ReusePreviousPayload {
  targetHouseManualId: string;
  sourceHouseManualId: string;
  fieldsToReuse?: string[]; // Optional: specific fields to copy
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: ReusePreviousPayload;
}

interface ReusePreviousResult {
  success: boolean;
  targetHouseManualId: string;
  sourceHouseManualId: string;
  suggestionsCreated: number;
  fields: string[];
}

// Fields that can be reused from house manuals
const REUSABLE_FIELDS = [
  "Check-In Instructions",
  "Check-Out Instructions",
  "House Rules (jsonb)",
  "WiFi Name",
  "WiFi Password",
  "Temperature Control",
  "Security Features",
  "Parking Tips",
  "Local Attractions",
  "Emergency Contacts (jsonb)",
  "Appliance Instructions",
  "Additional Notes",
];

/**
 * Generate a Bubble-compatible ID (mimics their ID format)
 */
function generateBubbleId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}x${randomPart}`;
}

/**
 * Reuse content from a previous house manual as suggestions
 *
 * 1. Validate source and target house manuals exist
 * 2. Fetch content from source house manual
 * 3. Create suggestions for each field with content
 */
export async function handleReusePrevious(
  context: HandlerContext
): Promise<ReusePreviousResult> {
  const { supabaseClient, payload, userId } = context;
  const { targetHouseManualId, sourceHouseManualId, fieldsToReuse } = payload;

  // Validate input
  if (!targetHouseManualId || typeof targetHouseManualId !== "string") {
    throw new ValidationError("targetHouseManualId is required and must be a string");
  }

  if (!sourceHouseManualId || typeof sourceHouseManualId !== "string") {
    throw new ValidationError("sourceHouseManualId is required and must be a string");
  }

  if (targetHouseManualId === sourceHouseManualId) {
    throw new ValidationError("Source and target house manuals must be different");
  }

  // Determine which fields to reuse
  const fieldsToCheck = fieldsToReuse && fieldsToReuse.length > 0
    ? fieldsToReuse.filter(f => REUSABLE_FIELDS.includes(f))
    : REUSABLE_FIELDS;

  console.log(`[reusePrevious] Reusing from ${sourceHouseManualId} to ${targetHouseManualId}`);
  console.log(`[reusePrevious] Fields to check: ${fieldsToCheck.join(", ")}`);

  // Verify target house manual exists
  const { data: targetManual, error: targetError } = await supabaseClient
    .from("housemanual")
    .select("_id")
    .eq("_id", targetHouseManualId)
    .single();

  if (targetError || !targetManual) {
    throw new ValidationError(`Target house manual not found: ${targetHouseManualId}`);
  }

  // Fetch source house manual with all reusable fields
  const { data: sourceManual, error: sourceError } = await supabaseClient
    .from("housemanual")
    .select("*")
    .eq("_id", sourceHouseManualId)
    .single();

  if (sourceError || !sourceManual) {
    throw new ValidationError(`Source house manual not found: ${sourceHouseManualId}`);
  }

  // Fetch existing content from target to set as "Previous Content"
  const { data: targetContent } = await supabaseClient
    .from("housemanual")
    .select("*")
    .eq("_id", targetHouseManualId)
    .single();

  // Create suggestions for fields with content
  const suggestionsToCreate = [];
  const now = new Date().toISOString();

  for (const field of fieldsToCheck) {
    const sourceValue = sourceManual[field];

    // Skip empty fields
    if (!sourceValue || (typeof sourceValue === "string" && sourceValue.trim() === "")) {
      continue;
    }

    // Handle JSON fields
    const contentValue = typeof sourceValue === "object"
      ? JSON.stringify(sourceValue)
      : sourceValue;

    // Get existing content from target (if any) for comparison
    const previousContent = targetContent?.[field]
      ? (typeof targetContent[field] === "object"
          ? JSON.stringify(targetContent[field])
          : targetContent[field])
      : null;

    suggestionsToCreate.push({
      _id: generateBubbleId(),
      Content: contentValue,
      "Previous Content": previousContent,
      "Field suggested house manual": field,
      "House Manual": targetHouseManualId,
      "being processed?": false,
      decision: "pending",
      "from call?": false,
      "from audio?": false,
      "from PDF?": false,
      "from google doc?": false,
      "from listing?": false,
      "from free text form?": false,
      "Created By": userId,
      "Created Date": now,
      "Modified Date": now,
    });
  }

  if (suggestionsToCreate.length === 0) {
    console.log(`[reusePrevious] No content found in source to reuse`);
    return {
      success: true,
      targetHouseManualId,
      sourceHouseManualId,
      suggestionsCreated: 0,
      fields: [],
    };
  }

  // Insert suggestions
  const { error: insertError } = await supabaseClient
    .from("zat_aisuggestions")
    .insert(suggestionsToCreate);

  if (insertError) {
    console.error(`[reusePrevious] Failed to create suggestions:`, insertError);
    throw new Error(`Failed to create suggestions: ${insertError.message}`);
  }

  const reusedFields = suggestionsToCreate.map(s => s["Field suggested house manual"]);

  console.log(`[reusePrevious] Created ${suggestionsToCreate.length} suggestions`);
  console.log(`[reusePrevious] Fields: ${reusedFields.join(", ")}`);

  return {
    success: true,
    targetHouseManualId,
    sourceHouseManualId,
    suggestionsCreated: suggestionsToCreate.length,
    fields: reusedFields,
  };
}

export default handleReusePrevious;
