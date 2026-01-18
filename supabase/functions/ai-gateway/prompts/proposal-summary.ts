/**
 * Proposal Summary Generator Prompt
 * Split Lease - AI Gateway
 *
 * Generates a concise summary of a proposal for host notification
 * Mirrors Bubble workflow Step 24 (core-create-summary-of-proposal)
 */

import { registerPrompt, registerLoader } from "./_registry.ts";
import { DataLoaderContext } from "../../_shared/aiTypes.ts";

// ─────────────────────────────────────────────────────────────
// PROMPT CONFIGURATION
// ─────────────────────────────────────────────────────────────

registerPrompt({
  key: "proposal-summary",
  name: "Proposal Summary Generator",
  description:
    "Generates a concise summary of a proposal for host notification emails",

  systemPrompt: `You are an assistant that creates clear, professional summaries of rental proposals for Split Lease hosts.

Your task is to create a brief, informative summary that helps the host quickly understand:
1. Who is interested in their property
2. What dates/schedule they're requesting
3. Key financial details

IMPORTANT RULES:
- Keep the summary concise (3-5 sentences)
- Use a warm but professional tone
- Highlight the most important details for the host
- Include the guest's flexibility level if mentioned
- Format prices with dollar signs and commas (e.g., $1,500)
- Use day names (Monday, Tuesday) not numbers
- Do not make up information not provided`,

  userPromptTemplate: `Please create a summary for this proposal:

Guest Name: {{guestName}}
Guest Flexibility: {{guestFlexibility}}
Listing Name: {{listingName}}
Move-in Date Range: {{moveInStart}} to {{moveInEnd}}
Duration: {{durationWeeks}} weeks
Nights per Week: {{nightsPerWeek}}
Days Selected: {{daysSelected}}
Nightly Price: ${{nightlyPrice}}
Total Price: ${{totalPrice}}
Guest Message: {{guestComment}}

Generate a brief summary suitable for a notification email to the host. Start with "You have a new proposal from..." and end with an encouragement to review and respond.`,

  defaults: {
    model: "gpt-4o-mini",
    temperature: 0.6,
    maxTokens: 300,
  },

  responseFormat: "text",

  // Data loaders for auto-fetching proposal data
  requiredLoaders: ["proposal-data"],
});

// ─────────────────────────────────────────────────────────────
// DATA LOADER FOR PROPOSAL DATA
// ─────────────────────────────────────────────────────────────

registerLoader({
  key: "proposal-data",
  name: "Proposal Data Loader",
  async load(context: DataLoaderContext): Promise<Record<string, unknown>> {
    const { variables, supabaseClient } = context;
    const proposalId = variables?.proposal_id as string;

    if (!proposalId) {
      console.warn("[Loader:proposal-data] No proposal_id provided");
      return { loaded: false, error: "No proposal_id provided" };
    }

    try {
      // Fetch proposal
      const { data: proposal, error: proposalError } = await supabaseClient
        .from("proposal")
        .select(`
          _id,
          "Guest",
          "Listing",
          "Move in range start",
          "Move in range end",
          "Reservation Span (Weeks)",
          "nights per week (num)",
          "Days Selected",
          "proposal nightly price",
          "Total Price for Reservation (guest)",
          "Guest flexibility",
          "Comment"
        `)
        .eq("_id", proposalId)
        .single();

      if (proposalError || !proposal) {
        console.error(`[Loader:proposal-data] Proposal error: ${proposalError?.message}`);
        return { loaded: false, error: proposalError?.message || "Proposal not found" };
      }

      // Fetch guest
      let guestName = "Guest";
      if (proposal.Guest) {
        const { data: guest } = await supabaseClient
          .from("user")
          .select(`"Name - Full", "Name - First"`)
          .eq("_id", proposal.Guest)
          .single();

        if (guest) {
          guestName = guest["Name - Full"] || guest["Name - First"] || "Guest";
        }
      }

      // Fetch listing
      let listingName = "Property";
      if (proposal.Listing) {
        const { data: listing } = await supabaseClient
          .from("listing")
          .select("Name")
          .eq("_id", proposal.Listing)
          .single();

        if (listing) {
          listingName = listing.Name || "Property";
        }
      }

      // Convert day indices to names
      const dayNames = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const daysSelected = (proposal["Days Selected"] as number[] || [])
        .map((d: number) => dayNames[d] || "")
        .filter(Boolean)
        .join(", ");

      return {
        loaded: true,
        proposalId: proposal._id,
        guestName,
        listingName,
        moveInStart: proposal["Move in range start"],
        moveInEnd: proposal["Move in range end"],
        durationWeeks: proposal["Reservation Span (Weeks)"],
        nightsPerWeek: proposal["nights per week (num)"],
        daysSelected,
        nightlyPrice: proposal["proposal nightly price"],
        totalPrice: proposal["Total Price for Reservation (guest)"],
        guestFlexibility: proposal["Guest flexibility"],
        guestComment: proposal["Comment"] || "No message provided",
      };
    } catch (error) {
      console.error(`[Loader:proposal-data] Error: ${error}`);
      return { loaded: false, error: String(error) };
    }
  },
});
