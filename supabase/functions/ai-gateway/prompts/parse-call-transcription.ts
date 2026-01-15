/**
 * Parse Call Transcription Prompt
 * Split Lease - AI Gateway
 *
 * Extracts structured guest information from call transcriptions/notes.
 * Used by internal agents to quickly populate guest profile fields
 * from phone call notes or conversation transcripts.
 */

import { registerPrompt } from "./_registry.ts";

// ─────────────────────────────────────────────────────────────
// PROMPT CONFIGURATION
// ─────────────────────────────────────────────────────────────

registerPrompt({
  key: "parse-call-transcription",
  name: "Parse Call Transcription",
  description:
    "Extracts structured guest information from call transcriptions or notes",

  systemPrompt: `You are an assistant that extracts structured information from phone call transcriptions or notes about potential rental guests.

Your task is to analyze the transcription and extract three specific pieces of information:

1. **aboutMe**: A brief bio about the guest - who they are, their occupation, background, lifestyle. Focus on personal details that help a host understand who this person is.

2. **needForSpace**: Why the guest needs the rental space - their reason for moving, what they're looking for, their housing situation. This helps hosts understand the guest's motivation.

3. **specialNeeds**: Any specific requirements, preferences, or accommodations the guest needs - pet-friendly, accessibility needs, parking, quiet environment, specific amenities, move-in timeline, budget constraints.

EXTRACTION RULES:
- Extract ONLY information that is explicitly stated or strongly implied in the transcription
- Do NOT invent or assume information not present in the text
- If a field has no relevant information, return an empty string for that field
- Write in third person (e.g., "She is a nurse..." not "I am a nurse...")
- Keep each field concise (2-4 sentences max)
- Use professional, friendly language suitable for a rental application
- Summarize and paraphrase rather than quoting verbatim

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact structure:
{
  "aboutMe": "string",
  "needForSpace": "string",
  "specialNeeds": "string"
}`,

  userPromptTemplate: `Please extract guest information from this call transcription/notes:

---
{{transcription}}
---

Extract the aboutMe, needForSpace, and specialNeeds fields. If any field has no relevant information in the transcription, return an empty string for that field.`,

  defaults: {
    model: "gpt-4o-mini",
    temperature: 0.3, // Lower temperature for more consistent extraction
    maxTokens: 800,
  },

  responseFormat: "json",
});
