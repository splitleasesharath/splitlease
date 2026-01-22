/**
 * AI Tools Type Definitions
 * Split Lease - AI Tools Page
 *
 * JSDoc type definitions for AI tools data structures
 */

/**
 * @typedef {'pending' | 'processing' | 'completed' | 'failed'} DeepfakeStatus
 */

/**
 * @typedef {Object} HouseManual
 * @property {string} _id - Bubble ID
 * @property {string} Display - Display name
 * @property {string} Host - Host user ID
 * @property {string} [Audience] - Target audience
 */

/**
 * @typedef {Object} Visit
 * @property {string} _id - Bubble ID
 * @property {string} [Display] - Display name
 * @property {string} [Guest] - Guest user ID
 * @property {string} [House_Manual] - Associated house manual ID
 */

/**
 * @typedef {Object} Deepfake
 * @property {string} id - UUID
 * @property {string} [bubble_id] - Bubble sync ID
 * @property {string} house_manual_id - FK to housemanual
 * @property {string} [video_id] - HeyGen video template ID
 * @property {string} [voice_id] - HeyGen voice ID
 * @property {string} [script] - Generated script
 * @property {string} [video_token] - HeyGen job token
 * @property {string} [video_url] - Final video URL
 * @property {DeepfakeStatus} status - Current status
 * @property {string} [error_message] - Error details
 * @property {string} created_by - Creator user ID
 * @property {boolean} attached_to_manual - Whether attached
 * @property {string} created_at - ISO timestamp
 * @property {string} updated_at - ISO timestamp
 */

/**
 * @typedef {Object} Narration
 * @property {string} _id - Bubble ID
 * @property {string} House_Manual - FK to house manual
 * @property {string} [Visit] - FK to visit
 * @property {string} [Narration_Script] - Generated script
 * @property {string} [Narration_Audio] - Audio URL
 * @property {string} [Narrator_data] - Narrator voice ID
 * @property {boolean} [is_it_narration] - Is narration type
 * @property {boolean} [is_it_jingle] - Is jingle type
 * @property {string} [Melody_Preferences] - Jingle melody preference
 * @property {string} [Content_preference] - Content preferences JSON
 */

/**
 * @typedef {Object} Narrator
 * @property {string} id - Voice ID
 * @property {string} name - Display name
 * @property {string} description - Voice description
 * @property {string} [preview_url] - Preview audio URL
 */

/**
 * Melody preference options for jingles
 * @type {Object.<string, string>}
 */
export const MELODY_PREFERENCES = {
  'morning-melody': 'Morning Melody - Bright and uplifting',
  'gentle-nighttime': 'Gentle Nighttime - Calm and soothing',
  'optimistic-commercial': 'Optimistic Commercial - Energetic and positive',
  'cozy-acoustic': 'Cozy Acoustic - Warm and intimate',
  'modern-electronic': 'Modern Electronic - Contemporary and fresh',
};

/**
 * Content preference options for jingles
 * @type {Object.<string, string>}
 */
export const CONTENT_PREFERENCES = {
  'host-name': 'Host Name',
  'property-name': 'Property Name',
  'neighborhood': 'Neighborhood',
  'house-rules': 'House Rules',
  'amenities': 'Key Amenities',
  'welcome-message': 'Welcome Message',
  'check-in-info': 'Check-in Information',
};

/**
 * @typedef {Object} DeepfakeFormState
 * @property {string} videoId - Selected HeyGen video ID
 * @property {string} voiceId - Selected HeyGen voice ID
 * @property {string} script - Generated or edited script
 */

/**
 * @typedef {Object} StatusState
 * @property {boolean} loading - Is operation in progress
 * @property {string|null} error - Error message if any
 * @property {string|null} message - Success message if any
 */

export default {};
