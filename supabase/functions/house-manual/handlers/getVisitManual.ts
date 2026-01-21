/**
 * Get Visit Manual Handler
 *
 * Fetches house manual data for guest viewing, with authentication via:
 * 1. Supabase Auth (authenticated user is the guest of the visit)
 * 2. Magic link access token (validates token, user must still be authenticated)
 *
 * NO ANONYMOUS ACCESS: User must be authenticated as the visit's guest.
 *
 * @module house-manual/handlers/getVisitManual
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, AuthenticationError } from "../../_shared/errors.ts";

interface GetVisitManualPayload {
  visitId: string;
  accessToken?: string;
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: GetVisitManualPayload;
}

interface ManualSection {
  id: string;
  title: string;
  type: string;
  content: unknown;
  order: number;
}

interface VisitManualResult {
  visit: {
    id: string;
    guestId: string;
    arrivalDate: string | null;
    language: string | null;
    shortUrl: string | null;
    hasReviewed: boolean;
    linkSaw: boolean;
    mapSaw: boolean;
    narrationHeard: boolean;
  };
  houseManual: {
    id: string;
    title: string;
    hostName: string | null;
    propertyAddress: string | null;
    sections: ManualSection[];
  };
}

/**
 * Build sections from flat house manual database row
 */
function buildManualSections(dbRow: Record<string, unknown>): ManualSection[] {
  const sections: ManualSection[] = [];
  let order = 1;

  // WiFi Section
  if (dbRow["WiFi Name"] || dbRow["WiFi Password"]) {
    sections.push({
      id: "wifi",
      title: "WiFi & Internet",
      type: "wifi",
      content: {
        networkName: dbRow["WiFi Name"],
        password: dbRow["WiFi Password"],
        photo: dbRow["WiFi Photo"],
      },
      order: order++,
    });
  }

  // Check-In Section
  if (dbRow["Check-In Instructions"]) {
    sections.push({
      id: "checkin",
      title: "Check-In Instructions",
      type: "text",
      content: dbRow["Check-In Instructions"],
      order: order++,
    });
  }

  // Check-Out Section
  if (dbRow["Check-Out Instructions"]) {
    sections.push({
      id: "checkout",
      title: "Check-Out Instructions",
      type: "text",
      content: dbRow["Check-Out Instructions"],
      order: order++,
    });
  }

  // House Rules Section
  if (dbRow["House Rules"]) {
    sections.push({
      id: "rules",
      title: "House Rules",
      type: "rules",
      content: dbRow["House Rules"],
      order: order++,
    });
  }

  // Departure Checklist Section
  if (dbRow["Departure Checklist"]) {
    sections.push({
      id: "checklist",
      title: "Departure Checklist",
      type: "checklist",
      content: dbRow["Departure Checklist"],
      order: order++,
    });
  }

  // Parking Section
  if (dbRow["Parking Instructions"]) {
    sections.push({
      id: "parking",
      title: "Parking",
      type: "text",
      content: dbRow["Parking Instructions"],
      order: order++,
    });
  }

  // Trash & Recycling Section
  if (dbRow["Trash & Recycling"]) {
    sections.push({
      id: "trash",
      title: "Trash & Recycling",
      type: "text",
      content: dbRow["Trash & Recycling"],
      order: order++,
    });
  }

  // HVAC / Heating & Cooling Section
  if (dbRow["HVAC Instructions"] || dbRow["Heating & Cooling"]) {
    sections.push({
      id: "hvac",
      title: "Heating & Cooling",
      type: "text",
      content: dbRow["HVAC Instructions"] || dbRow["Heating & Cooling"],
      order: order++,
    });
  }

  // Kitchen Section
  if (dbRow["Kitchen Instructions"]) {
    sections.push({
      id: "kitchen",
      title: "Kitchen",
      type: "text",
      content: dbRow["Kitchen Instructions"],
      order: order++,
    });
  }

  // Laundry Section
  if (dbRow["Laundry Instructions"]) {
    sections.push({
      id: "laundry",
      title: "Laundry",
      type: "text",
      content: dbRow["Laundry Instructions"],
      order: order++,
    });
  }

  // Emergency Contacts Section
  if (dbRow["Emergency Contacts"]) {
    sections.push({
      id: "emergency",
      title: "Emergency Contacts",
      type: "contacts",
      content: dbRow["Emergency Contacts"],
      order: order++,
    });
  }

  // Local Recommendations Section
  if (dbRow["Local Recommendations"]) {
    sections.push({
      id: "local",
      title: "Local Recommendations",
      type: "text",
      content: dbRow["Local Recommendations"],
      order: order++,
    });
  }

  // Additional Notes Section
  if (dbRow["Additional Notes"]) {
    sections.push({
      id: "notes",
      title: "Additional Notes",
      type: "text",
      content: dbRow["Additional Notes"],
      order: order++,
    });
  }

  return sections;
}

/**
 * Extract address text from geo field
 */
function extractAddressText(geoField: unknown): string | null {
  if (!geoField) return null;

  // If it's a string, return as-is
  if (typeof geoField === "string") return geoField;

  // If it's an object with address property
  if (typeof geoField === "object" && geoField !== null) {
    const geo = geoField as Record<string, unknown>;
    if (geo.address) return String(geo.address);
    if (geo.formatted_address) return String(geo.formatted_address);
  }

  return null;
}

/**
 * Fetch house manual for guest viewing
 *
 * SECURITY: Only the guest associated with the visit can access the manual.
 * Magic link tokens provide a second layer of validation but user must be authenticated.
 */
export async function handleGetVisitManual(
  context: HandlerContext
): Promise<VisitManualResult> {
  const { userId, supabaseClient, payload } = context;
  const { visitId, accessToken } = payload;

  // Validate input
  if (!visitId || typeof visitId !== "string") {
    throw new ValidationError("visitId is required");
  }

  console.log(`[getVisitManual] Fetching manual for visit: ${visitId}, user: ${userId}`);

  // Step 1: Fetch the visit with house manual join
  const { data: visit, error: visitError } = await supabaseClient
    .from("visit")
    .select(`
      _id,
      "User shared with (guest)",
      "Arrival/Checkin Date",
      "Language",
      "Short URL",
      "Review from Guest",
      "link saw?",
      "map saw?",
      "narration heard?",
      "access_token",
      "token_expires_at",
      "token_used_at",
      "review_submitted_at",
      "house manual"
    `)
    .eq("_id", visitId)
    .single();

  if (visitError || !visit) {
    console.error(`[getVisitManual] Visit not found:`, visitError);
    throw new ValidationError(`Visit not found: ${visitId}`);
  }

  // Step 2: Verify the authenticated user is the guest of this visit
  // We need to look up the user table to match supabase auth user to guest ID
  const { data: userData, error: userError } = await supabaseClient
    .from("user")
    .select("_id, supabase_user_id")
    .eq("supabase_user_id", userId)
    .single();

  if (userError || !userData) {
    console.error(`[getVisitManual] User not found for supabase ID:`, userError);
    throw new AuthenticationError("User not found");
  }

  const guestId = visit["User shared with (guest)"];

  // Verify user is the guest of this visit
  if (userData._id !== guestId) {
    console.error(`[getVisitManual] Access denied. User ${userData._id} is not guest ${guestId}`);
    throw new AuthenticationError("You are not authorized to view this house manual");
  }

  // Step 3: If access token provided, validate it
  if (accessToken) {
    const storedToken = visit["access_token"];
    const expiresAt = visit["token_expires_at"];

    if (!storedToken || storedToken !== accessToken) {
      throw new AuthenticationError("Invalid access token");
    }

    if (expiresAt && new Date(expiresAt) < new Date()) {
      throw new AuthenticationError("Access token has expired");
    }

    // Update token_used_at if not already set
    if (!visit["token_used_at"]) {
      await supabaseClient
        .from("visit")
        .update({
          "token_used_at": new Date().toISOString(),
        })
        .eq("_id", visitId);
    }
  }

  // Step 4: Fetch the house manual
  const houseManualId = visit["house manual"];

  if (!houseManualId) {
    throw new ValidationError("No house manual associated with this visit");
  }

  const { data: houseManual, error: hmError } = await supabaseClient
    .from("housemanual")
    .select("*")
    .eq("_id", houseManualId)
    .single();

  if (hmError || !houseManual) {
    console.error(`[getVisitManual] House manual not found:`, hmError);
    throw new ValidationError(`House manual not found: ${houseManualId}`);
  }

  console.log(`[getVisitManual] Successfully retrieved manual for visit ${visitId}`);

  // Build response
  return {
    visit: {
      id: visit._id,
      guestId: guestId,
      arrivalDate: visit["Arrival/Checkin Date"],
      language: visit["Language"],
      shortUrl: visit["Short URL"],
      hasReviewed: Boolean(visit["Review from Guest"] || visit["review_submitted_at"]),
      linkSaw: Boolean(visit["link saw?"]),
      mapSaw: Boolean(visit["map saw?"]),
      narrationHeard: Boolean(visit["narration heard?"]),
    },
    houseManual: {
      id: houseManual._id,
      title: houseManual["House manual Name"] || "House Manual",
      hostName: houseManual["Host Name"],
      propertyAddress: extractAddressText(houseManual["Address (geo)"]),
      sections: buildManualSections(houseManual),
    },
  };
}

export default handleGetVisitManual;
