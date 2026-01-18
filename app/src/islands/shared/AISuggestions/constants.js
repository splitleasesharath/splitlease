/**
 * Constants for AI Suggestions Component
 *
 * @module AISuggestions/constants
 */

/**
 * Source icons for different suggestion origins
 * @type {Record<string, string>}
 */
export const SOURCE_ICONS = {
  call: '📞',
  audio: '🎙️',
  pdf: '📄',
  googleDoc: '📝',
  listing: '🏠',
  freeText: '✍️',
  default: '🤖',
};

/**
 * Progress stage labels for processing state
 * @type {Record<string, string>}
 */
export const PROGRESS_STAGES = {
  idle: 'Waiting to start...',
  transcribing: 'Transcribing audio...',
  analyzing: 'Analyzing content...',
  generating: 'Generating suggestions...',
  ready: 'Ready for review',
  complete: 'All done!',
  error: 'An error occurred',
};

/**
 * Human-readable field labels
 * Maps database field names to display labels
 * @type {Record<string, string>}
 */
export const FIELD_LABELS = {
  'Check-In Instructions': 'Check-In Instructions',
  'Check-Out Instructions': 'Check-Out Instructions',
  'House Rules (jsonb)': 'House Rules',
  'WiFi Name': 'WiFi Network Name',
  'WiFi Password': 'WiFi Password',
  'Temperature Control': 'Temperature Control',
  'Security Features': 'Security Features',
  'Local Attractions': 'Local Attractions',
  'Parking Tips': 'Parking Tips',
  'Emergency Contacts (jsonb)': 'Emergency Contacts',
  'Appliance Instructions': 'Appliance Instructions',
  'Additional Notes': 'Additional Notes',
  'Guest Greeting': 'Guest Greeting',
  'Quiet Hours': 'Quiet Hours',
  'Trash Collection': 'Trash & Recycling',
};

/**
 * Get the appropriate source icon for a suggestion
 * @param {Object} suggestion - The suggestion object
 * @returns {string} The emoji icon for the source
 */
export function getSourceIcon(suggestion) {
  if (suggestion['from call?']) return SOURCE_ICONS.call;
  if (suggestion['from audio?']) return SOURCE_ICONS.audio;
  if (suggestion['from PDF?']) return SOURCE_ICONS.pdf;
  if (suggestion['from google doc?']) return SOURCE_ICONS.googleDoc;
  if (suggestion['from listing?']) return SOURCE_ICONS.listing;
  if (suggestion['from free text form?']) return SOURCE_ICONS.freeText;
  return SOURCE_ICONS.default;
}

/**
 * Get the human-readable source label
 * @param {Object} suggestion - The suggestion object
 * @returns {string} The source label
 */
export function getSourceLabel(suggestion) {
  if (suggestion['from call?']) return 'From Phone Call';
  if (suggestion['from audio?']) return 'From Audio Recording';
  if (suggestion['from PDF?']) return 'From PDF Document';
  if (suggestion['from google doc?']) return 'From Google Doc';
  if (suggestion['from listing?']) return 'From Listing';
  if (suggestion['from free text form?']) return 'From Text Input';
  return 'AI Generated';
}
