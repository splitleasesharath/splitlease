/**
 * AI Tools Service
 * Split Lease - Frontend API Client
 *
 * Client for the ai-tools Edge Function
 * Handles HeyGen deepfake, ElevenLabs narration, and jingle generation
 *
 * NO FALLBACK PRINCIPLE: Errors are thrown, not hidden
 */

import { supabase } from './supabase.js';

/**
 * Call the ai-tools Edge Function with action-based routing
 * @param {string} action - The action to perform
 * @param {Object} payload - The payload for the action
 * @returns {Promise<Object>} The response data
 * @throws {Error} If the request fails
 */
const callAiToolsFunction = async (action, payload) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tools`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, payload }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `AI Tools API error: ${response.status}`);
  }

  if (!result.success) {
    throw new Error(result.error || 'AI Tools operation failed');
  }

  return result.data;
};

/**
 * AI Tools Service - API Methods
 */
export const aiToolsService = {
  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  /**
   * Get house manuals for the current user
   */
  getHouseManuals: () => callAiToolsFunction('get_house_manuals', {}),

  /**
   * Get deepfakes for a house manual
   * @param {string} houseManualId - The house manual ID
   */
  getDeepfakes: (houseManualId) =>
    callAiToolsFunction('get_deepfakes', { houseManualId }),

  /**
   * Get narrations for a house manual
   * @param {string} houseManualId - The house manual ID
   */
  getNarrations: (houseManualId) =>
    callAiToolsFunction('get_narrations', { houseManualId }),

  /**
   * Get jingles for a house manual
   * @param {string} houseManualId - The house manual ID
   */
  getJingles: (houseManualId) =>
    callAiToolsFunction('get_jingles', { houseManualId }),

  /**
   * Get available narrators list
   */
  getNarrators: () => callAiToolsFunction('get_narrators', {}),

  // ==========================================================================
  // HEYGEN DEEPFAKE
  // ==========================================================================

  /**
   * Create a deepfake record
   * @param {string} houseManualId - The house manual ID
   */
  createDeepfake: (houseManualId) =>
    callAiToolsFunction('create_deepfake', { houseManualId }),

  /**
   * Generate a script for deepfake video using AI
   * @param {string} houseManualId - The house manual ID
   */
  generateDeepfakeScript: (houseManualId) =>
    callAiToolsFunction('generate_deepfake_script', { houseManualId }),

  /**
   * Generate a deepfake video using HeyGen API
   * @param {string} houseManualId - The house manual ID
   * @param {string} videoId - HeyGen video/avatar ID
   * @param {string} voiceId - HeyGen voice ID
   * @param {string} script - The script to speak
   */
  generateDeepfakeVideo: (houseManualId, videoId, voiceId, script) =>
    callAiToolsFunction('generate_deepfake_video', {
      houseManualId,
      videoId,
      voiceId,
      script,
    }),

  /**
   * Check the status of a deepfake video generation
   * @param {string} videoToken - HeyGen video token
   */
  checkDeepfakeStatus: (videoToken) =>
    callAiToolsFunction('check_deepfake_status', { videoToken }),

  /**
   * Get the final URL of a completed deepfake video
   * @param {string} deepfakeId - The deepfake record ID
   */
  getDeepfakeUrl: (deepfakeId) =>
    callAiToolsFunction('get_deepfake_url', { deepfakeId }),

  /**
   * Attach a deepfake video to a house manual
   * @param {string} deepfakeId - The deepfake record ID
   * @param {string} houseManualId - The house manual ID
   */
  attachDeepfake: (deepfakeId, houseManualId) =>
    callAiToolsFunction('attach_deepfake', { deepfakeId, houseManualId }),

  // ==========================================================================
  // ELEVENLABS NARRATION
  // ==========================================================================

  /**
   * Generate a narration script using AI
   * @param {string} houseManualId - The house manual ID
   * @param {string} [visitId] - Optional visit ID for personalization
   * @param {string} narratorId - The narrator voice ID
   */
  generateNarrationScript: (houseManualId, visitId, narratorId) =>
    callAiToolsFunction('generate_narration_script', {
      houseManualId,
      visitId,
      narratorId,
    }),

  /**
   * Generate a narration audio using ElevenLabs
   * @param {string} houseManualId - The house manual ID
   * @param {string} [visitId] - Optional visit ID
   * @param {string} narratorId - The narrator voice ID
   * @param {string} script - The script to narrate
   */
  generateNarration: (houseManualId, visitId, narratorId, script) =>
    callAiToolsFunction('generate_narration', {
      houseManualId,
      visitId,
      narratorId,
      script,
    }),

  /**
   * Attach a narration to a visit
   * @param {string} narrationId - The narration record ID
   * @param {string} visitId - The visit ID
   */
  attachNarration: (narrationId, visitId) =>
    callAiToolsFunction('attach_narration', { narrationId, visitId }),

  // ==========================================================================
  // JINGLE CREATION
  // ==========================================================================

  /**
   * Generate jingle lyrics using AI
   * @param {string} houseManualId - The house manual ID
   * @param {string} [visitId] - Optional visit ID
   * @param {string} melodyPreference - Melody style preference
   * @param {string[]} contentPreferences - Content to include
   */
  generateJingleLyrics: (houseManualId, visitId, melodyPreference, contentPreferences) =>
    callAiToolsFunction('generate_jingle_lyrics', {
      houseManualId,
      visitId,
      melodyPreference,
      contentPreferences,
    }),

  /**
   * Create a jingle audio
   * @param {string} houseManualId - The house manual ID
   * @param {string} [visitId] - Optional visit ID
   * @param {string} lyrics - The jingle lyrics
   * @param {string} melodyPreference - Melody style
   * @param {string[]} contentPreferences - Content included
   */
  createJingle: (houseManualId, visitId, lyrics, melodyPreference, contentPreferences) =>
    callAiToolsFunction('create_jingle', {
      houseManualId,
      visitId,
      lyrics,
      melodyPreference,
      contentPreferences,
    }),

  /**
   * Attach a jingle to a house manual
   * @param {string} jingleId - The jingle/narration record ID
   * @param {string} houseManualId - The house manual ID
   */
  attachJingle: (jingleId, houseManualId) =>
    callAiToolsFunction('attach_jingle', { jingleId, houseManualId }),
};

export default aiToolsService;
