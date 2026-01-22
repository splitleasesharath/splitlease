/**
 * Handler: Get Narrators
 * Returns list of available ElevenLabs narrator voices
 *
 * NOTE: This is a static list. For dynamic ElevenLabs voice discovery,
 * we would call the ElevenLabs API, but that requires the API key and
 * additional rate limit management.
 */

import { HandlerContext } from "../index.ts";

// Static narrator list (commonly used ElevenLabs voices)
const NARRATORS = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    description: "Calm, professional female voice",
    preview_url: null,
  },
  {
    id: "AZnzlk1XvdvUeBnXmlld",
    name: "Domi",
    description: "Strong, confident female voice",
    preview_url: null,
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    description: "Soft, gentle female voice",
    preview_url: null,
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    description: "Well-rounded male voice",
    preview_url: null,
  },
  {
    id: "VR6AewLTigWG4xSOukaG",
    name: "Arnold",
    description: "Crisp, authoritative male voice",
    preview_url: null,
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    description: "Deep, engaging male voice",
    preview_url: null,
  },
  {
    id: "yoZ06aMxZJJ28mfd3POQ",
    name: "Sam",
    description: "Dynamic, energetic male voice",
    preview_url: null,
  },
  {
    id: "TX3LPaxmHKxFdv7VOQHJ",
    name: "Elli",
    description: "Youthful, enthusiastic female voice",
    preview_url: null,
  },
  {
    id: "ThT5KcBeYPX3keUQqHPh",
    name: "David Attenborough (Custom)",
    description: "Nature documentary style narration",
    preview_url: null,
  },
];

export async function handleGetNarrators(_context: HandlerContext) {
  console.log(`[ai-tools:get_narrators] Returning ${NARRATORS.length} narrator voices`);

  return {
    narrators: NARRATORS,
    count: NARRATORS.length,
  };
}
