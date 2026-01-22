/**
 * Get House Manuals Handler
 * AI Tools Edge Function
 */

import { HandlerContext } from "../index.ts";

export async function handleGetHouseManuals(context: HandlerContext) {
  const { supabaseClient, userId } = context;

  // First, get the user's Bubble ID from the user table
  const { data: userData, error: userError } = await supabaseClient
    .from("user")
    .select("_id")
    .eq("supabase_user_id", userId)
    .maybeSingle();

  if (userError) {
    console.error("[ai-tools:getHouseManuals] User lookup error:", userError);
  }

  const hostId = userData?._id || userId;

  // Fetch house manuals for this host
  const { data, error } = await supabaseClient
    .from("housemanual")
    .select("_id, Display, Host, Audience")
    .eq("Host", hostId)
    .order("Created Date", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch house manuals: ${error.message}`);
  }

  return data || [];
}
