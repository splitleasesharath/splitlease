/**
 * Informational Texts Data Fetcher
 *
 * Infrastructure layer for fetching informational text content from Supabase.
 * This is NOT business logic - it's a data access utility.
 *
 * @module lib/informationalTextsFetcher
 * @category Infrastructure
 */

import { supabase } from './supabase.js'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const TABLE_CONFIG = Object.freeze({
  TABLE_NAME: 'informationaltexts',
  SELECT_FIELDS: '_id, "Information Tag-Title", "Desktop copy", "Mobile copy", "Desktop+ copy", "show more available?"'
})

const FIELD_NAMES = Object.freeze({
  TAG_TITLE: 'Information Tag-Title',
  DESKTOP: 'Desktop copy',
  MOBILE: 'Mobile copy',
  DESKTOP_PLUS: 'Desktop+ copy',
  SHOW_MORE: 'show more available?'
})

const LOG_PREFIX = '[informationalTextsFetcher]'

// ─────────────────────────────────────────────────────────────
// Pure Transformation Functions
// ─────────────────────────────────────────────────────────────

/**
 * Transform database item to text entry
 * @pure
 */
const transformToTextEntry = (item) =>
  Object.freeze({
    desktop: item[FIELD_NAMES.DESKTOP],
    mobile: item[FIELD_NAMES.MOBILE],
    desktopPlus: item[FIELD_NAMES.DESKTOP_PLUS],
    showMore: item[FIELD_NAMES.SHOW_MORE]
  })

/**
 * Transform database results to map keyed by tag title
 * @pure
 */
const transformToTextsMap = (data) =>
  data.reduce((acc, item) => {
    const tagTitle = item[FIELD_NAMES.TAG_TITLE]
    if (tagTitle) {
      acc[tagTitle] = transformToTextEntry(item)
    }
    return acc
  }, {})

// ─────────────────────────────────────────────────────────────
// Effectful Data Access Functions
// ─────────────────────────────────────────────────────────────

/**
 * Fetch informational texts from Supabase.
 *
 * Infrastructure layer - not business logic. Fetches CMS-style content
 * that provides contextual help and information throughout the application.
 * @effectful - makes network request
 * @returns {Promise<Object>} Map of informational texts keyed by tag title.
 *   Each entry contains: { desktop, mobile, desktopPlus, showMore }
 *
 * @example
 * const texts = await fetchInformationalTexts()
 * const howItWorksText = texts['How It Works']
 * console.log(howItWorksText.desktop) // Desktop copy
 * console.log(howItWorksText.mobile)  // Mobile copy
 */
export async function fetchInformationalTexts() {
  try {
    const { data, error } = await supabase
      .from(TABLE_CONFIG.TABLE_NAME)
      .select(TABLE_CONFIG.SELECT_FIELDS)

    if (error) throw error

    return transformToTextsMap(data || [])
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to fetch informational texts:`, error)
    return {}
  }
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  TABLE_CONFIG,
  FIELD_NAMES,
  LOG_PREFIX
}
