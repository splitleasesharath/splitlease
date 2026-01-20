/**
 * Backfill Negotiation Summaries
 *
 * One-time migration script to backfill the negotiationsummary table
 * for suggested proposals that were created before the persistence fix.
 *
 * The AI summaries exist in SplitBot messages but were never saved to
 * the negotiationsummary table. This function extracts them and creates
 * the missing records.
 *
 * Usage: POST /backfill-negotiation-summaries
 * Body: { "dryRun": true } - Preview changes without committing
 *       { "dryRun": false } - Execute the backfill
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const SPLITBOT_USER_ID = "1634177189464x117577733821174320";

interface BackfillResult {
  proposalId: string;
  threadId: string | null;
  messageId: string | null;
  summaryExtracted: string | null;
  status: "created" | "skipped_exists" | "skipped_no_thread" | "skipped_no_message" | "error";
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCors(req);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to dry run for safety

    console.log(`[backfill] Starting negotiation summary backfill (dryRun: ${dryRun})`);

    // Step 1: Find all suggested proposals (status contains "Split Lease")
    const { data: suggestedProposals, error: proposalError } = await supabase
      .from("proposal")
      .select("_id, Status, Guest, Listing, \"Created Date\"")
      .like("Status", "%Split Lease%")
      .eq("Deleted", false)
      .order("Created Date", { ascending: false });

    if (proposalError) {
      throw new Error(`Failed to fetch proposals: ${proposalError.message}`);
    }

    console.log(`[backfill] Found ${suggestedProposals?.length || 0} suggested proposals`);

    if (!suggestedProposals || suggestedProposals.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No suggested proposals found",
          results: [],
          summary: { total: 0, created: 0, skipped: 0, errors: 0 }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Check which proposals already have negotiationsummary records
    const proposalIds = suggestedProposals.map(p => p._id);
    const { data: existingSummaries, error: summaryError } = await supabase
      .from("negotiationsummary")
      .select("\"Proposal associated\"")
      .in("Proposal associated", proposalIds);

    if (summaryError) {
      console.warn(`[backfill] Warning: Could not check existing summaries: ${summaryError.message}`);
    }

    const existingSummaryProposalIds = new Set(
      (existingSummaries || []).map(s => s["Proposal associated"])
    );

    console.log(`[backfill] ${existingSummaryProposalIds.size} proposals already have summaries`);

    // Step 3: Process each proposal that needs a summary
    const results: BackfillResult[] = [];
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const proposal of suggestedProposals) {
      const result: BackfillResult = {
        proposalId: proposal._id,
        threadId: null,
        messageId: null,
        summaryExtracted: null,
        status: "error",
      };

      try {
        // Skip if already has a summary
        if (existingSummaryProposalIds.has(proposal._id)) {
          result.status = "skipped_exists";
          skipped++;
          results.push(result);
          continue;
        }

        // Find the thread for this proposal
        const { data: thread, error: threadError } = await supabase
          .from("thread")
          .select("_id, \"-Guest User\"")
          .eq("Proposal", proposal._id)
          .single();

        if (threadError || !thread) {
          result.status = "skipped_no_thread";
          result.error = threadError?.message || "No thread found";
          skipped++;
          results.push(result);
          continue;
        }

        result.threadId = thread._id;

        // Find the first SplitBot message in this thread (the AI summary)
        const { data: splitBotMessage, error: messageError } = await supabase
          .from("_message")
          .select("_id, \"Message Body\", \"Created Date\"")
          .eq("Associated Thread/Conversation", thread._id)
          .eq("-Originator User", SPLITBOT_USER_ID)
          .eq("is Split Bot", true)
          .order("Created Date", { ascending: true })
          .limit(1)
          .single();

        if (messageError || !splitBotMessage) {
          result.status = "skipped_no_message";
          result.error = messageError?.message || "No SplitBot message found";
          skipped++;
          results.push(result);
          continue;
        }

        result.messageId = splitBotMessage._id;
        const messageBody = splitBotMessage["Message Body"];

        // Validate message body looks like an AI summary (not a generic CTA)
        if (!messageBody || messageBody.length < 50) {
          result.status = "skipped_no_message";
          result.error = "Message body too short to be AI summary";
          skipped++;
          results.push(result);
          continue;
        }

        result.summaryExtracted = messageBody;

        // Insert into negotiationsummary (unless dry run)
        if (!dryRun) {
          // Generate Bubble-compatible ID
          const { data: newId, error: idError } = await supabase.rpc("generate_bubble_id");
          if (idError) {
            throw new Error(`Failed to generate ID: ${idError.message}`);
          }

          const now = new Date().toISOString();
          const { error: insertError } = await supabase
            .from("negotiationsummary")
            .insert({
              _id: newId,
              "Proposal associated": proposal._id,
              "Created By": thread["-Guest User"] || proposal.Guest,
              "Created Date": splitBotMessage["Created Date"] || now,
              "Modified Date": now,
              summary: messageBody,
            });

          if (insertError) {
            result.status = "error";
            result.error = `Insert failed: ${insertError.message}`;
            errors++;
            results.push(result);
            continue;
          }
        }

        result.status = "created";
        created++;
        results.push(result);

      } catch (err) {
        result.status = "error";
        result.error = err instanceof Error ? err.message : String(err);
        errors++;
        results.push(result);
      }
    }

    const summary = {
      total: suggestedProposals.length,
      created,
      skipped,
      errors,
      dryRun,
    };

    console.log(`[backfill] Complete:`, summary);

    return new Response(
      JSON.stringify({
        success: true,
        message: dryRun
          ? `Dry run complete. Would create ${created} summaries.`
          : `Backfill complete. Created ${created} summaries.`,
        summary,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[backfill] Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
