/**
 * Proposal Summary Generator Prompt
 * Split Lease - AI Gateway
 *
 * Generates a concise summary of a proposal for host notification
 * Mirrors Bubble workflow Step 24 (core-create-summary-of-proposal)
 *
 * @module ai-gateway/prompts/proposal-summary
 */

import { registerPrompt, registerLoader } from "./_registry.ts";
import { DataLoaderContext } from "../../_shared/aiTypes.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[Loader:proposal-data]'
const DEFAULT_GUEST_NAME = 'Guest'
const DEFAULT_LISTING_NAME = 'Property'
const DEFAULT_COMMENT = 'No message provided'
const DAYS_SEPARATOR = ', '

/**
 * Day names for converting indices (1-based Bubble format)
 * Index 0 is empty since Bubble uses 1-7 for days
 * @immutable
 */
const DAY_NAMES = Object.freeze([
  '', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
] as const)

/**
 * Proposal select fields
 * @immutable
 */
const PROPOSAL_SELECT_FIELDS = `
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
`

/**
 * Guest select fields
 * @immutable
 */
const GUEST_SELECT_FIELDS = `"Name - Full", "Name - First"`

/**
 * Listing select fields
 * @immutable
 */
const LISTING_SELECT_FIELDS = 'Name'

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is truthy
 * @pure
 */
const isTruthy = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined

/**
 * Check if string is non-empty
 * @pure
 */
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

// ─────────────────────────────────────────────────────────────
// Data Transformers
// ─────────────────────────────────────────────────────────────

/**
 * Convert day index to name
 * @pure
 */
const getDayName = (index: number): string =>
  DAY_NAMES[index] || ''

/**
 * Convert array of day indices to comma-separated names
 * @pure
 */
const formatDaysSelected = (days: ReadonlyArray<number> | null | undefined): string =>
  (days ?? [])
    .map(getDayName)
    .filter(isNonEmptyString)
    .join(DAYS_SEPARATOR)

/**
 * Get guest name with fallback
 * @pure
 */
const getGuestName = (guest: Record<string, unknown> | null): string => {
  if (!isTruthy(guest)) return DEFAULT_GUEST_NAME
  return (guest['Name - Full'] as string) || (guest['Name - First'] as string) || DEFAULT_GUEST_NAME
}

/**
 * Get listing name with fallback
 * @pure
 */
const getListingName = (listing: Record<string, unknown> | null): string => {
  if (!isTruthy(listing)) return DEFAULT_LISTING_NAME
  return (listing.Name as string) || DEFAULT_LISTING_NAME
}

// ─────────────────────────────────────────────────────────────
// Result Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build error result
 * @pure
 */
const buildErrorResult = (errorMessage: string): Record<string, unknown> =>
  Object.freeze({ loaded: false, error: errorMessage })

/**
 * Build proposal data result
 * @pure
 */
const buildProposalDataResult = (
  proposal: Record<string, unknown>,
  guestName: string,
  listingName: string
): Record<string, unknown> => Object.freeze({
  loaded: true,
  proposalId: proposal._id,
  guestName,
  listingName,
  moveInStart: proposal['Move in range start'],
  moveInEnd: proposal['Move in range end'],
  durationWeeks: proposal['Reservation Span (Weeks)'],
  nightsPerWeek: proposal['nights per week (num)'],
  daysSelected: formatDaysSelected(proposal['Days Selected'] as number[] | null),
  nightlyPrice: proposal['proposal nightly price'],
  totalPrice: proposal['Total Price for Reservation (guest)'],
  guestFlexibility: proposal['Guest flexibility'],
  guestComment: (proposal.Comment as string) || DEFAULT_COMMENT,
})

// ─────────────────────────────────────────────────────────────
// PROMPT CONFIGURATION
// ─────────────────────────────────────────────────────────────

/**
 * Proposal summary prompt configuration
 * @immutable
 */
const PROPOSAL_SUMMARY_PROMPT = Object.freeze({
  key: "proposal-summary",
  name: "Proposal Summary Generator",
  description: "Generates a concise summary of a proposal for host notification emails",

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

  defaults: Object.freeze({
    model: "gpt-4o-mini",
    temperature: 0.6,
    maxTokens: 300,
  }),

  responseFormat: "text",

  requiredLoaders: ["proposal-data"],
})

registerPrompt(PROPOSAL_SUMMARY_PROMPT);

// ─────────────────────────────────────────────────────────────
// DATA LOADER FOR PROPOSAL DATA
// ─────────────────────────────────────────────────────────────

registerLoader({
  key: "proposal-data",
  name: "Proposal Data Loader",
  /**
   * Load proposal data with guest and listing info
   * @effectful (database I/O, console logging)
   */
  async load(context: DataLoaderContext): Promise<Record<string, unknown>> {
    const { variables, supabaseClient } = context;
    const proposalId = variables?.proposal_id as string;

    if (!isNonEmptyString(proposalId)) {
      console.warn(`${LOG_PREFIX} No proposal_id provided`);
      return buildErrorResult('No proposal_id provided');
    }

    try {
      // Fetch proposal
      const { data: proposal, error: proposalError } = await supabaseClient
        .from("proposal")
        .select(PROPOSAL_SELECT_FIELDS)
        .eq("_id", proposalId)
        .single();

      if (proposalError || !isTruthy(proposal)) {
        console.error(`${LOG_PREFIX} Proposal error: ${proposalError?.message}`);
        return buildErrorResult(proposalError?.message || 'Proposal not found');
      }

      // Fetch guest (if available)
      let guestName = DEFAULT_GUEST_NAME;
      if (isTruthy(proposal.Guest)) {
        const { data: guest } = await supabaseClient
          .from("user")
          .select(GUEST_SELECT_FIELDS)
          .eq("_id", proposal.Guest)
          .single();

        guestName = getGuestName(guest);
      }

      // Fetch listing (if available)
      let listingName = DEFAULT_LISTING_NAME;
      if (isTruthy(proposal.Listing)) {
        const { data: listing } = await supabaseClient
          .from("listing")
          .select(LISTING_SELECT_FIELDS)
          .eq("_id", proposal.Listing)
          .single();

        listingName = getListingName(listing);
      }

      return buildProposalDataResult(proposal, guestName, listingName);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error: ${error}`);
      return buildErrorResult(String(error));
    }
  },
});

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
  DEFAULT_GUEST_NAME,
  DEFAULT_LISTING_NAME,
  DEFAULT_COMMENT,
  DAYS_SEPARATOR,
  DAY_NAMES,
  PROPOSAL_SELECT_FIELDS,
  GUEST_SELECT_FIELDS,
  LISTING_SELECT_FIELDS,
  PROPOSAL_SUMMARY_PROMPT,

  // Predicates
  isTruthy,
  isNonEmptyString,

  // Transformers
  getDayName,
  formatDaysSelected,
  getGuestName,
  getListingName,

  // Result builders
  buildErrorResult,
  buildProposalDataResult,
})
