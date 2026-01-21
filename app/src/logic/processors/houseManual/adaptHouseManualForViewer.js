/**
 * House Manual Data Adapter for Guest Viewer
 *
 * Transforms Edge Function response data into the format expected by
 * the VisitReviewerHouseManual component.
 *
 * NO FALLBACK PRINCIPLE: Missing required data throws errors.
 *
 * @module logic/processors/houseManual/adaptHouseManualForViewer
 */

/**
 * @typedef {Object} ManualSection
 * @property {string} id - Unique section identifier
 * @property {string} title - Display title
 * @property {string} type - Section type (text, wifi, rules, checklist, contacts)
 * @property {*} content - Section content (structure varies by type)
 * @property {number} order - Display order
 */

/**
 * @typedef {Object} VisitData
 * @property {string} id - Visit ID
 * @property {string} guestId - Guest user ID
 * @property {string|null} arrivalDate - Check-in date
 * @property {string|null} language - Guest language preference
 * @property {string|null} shortUrl - Short URL for sharing
 * @property {boolean} hasReviewed - Whether guest has submitted a review
 * @property {boolean} linkSaw - Whether guest has viewed the link
 * @property {boolean} mapSaw - Whether guest has viewed the map
 * @property {boolean} narrationHeard - Whether guest has heard narration
 */

/**
 * @typedef {Object} HouseManualData
 * @property {string} id - House manual ID
 * @property {string} title - Manual title
 * @property {string|null} hostName - Host's name
 * @property {string|null} propertyAddress - Property address
 * @property {ManualSection[]} sections - Manual sections
 */

/**
 * @typedef {Object} AdaptedManualData
 * @property {HouseManualData} houseManual - House manual data
 * @property {VisitData} visit - Visit data
 * @property {boolean} canReview - Whether guest can submit a review
 * @property {number} sectionCount - Number of sections with content
 */

/**
 * Adapt Edge Function response to viewer format.
 *
 * @param {Object} params - Named parameters
 * @param {Object} params.response - Edge Function response from get_visit_manual
 * @returns {AdaptedManualData} Adapted data for the viewer component
 * @throws {Error} If required data is missing
 *
 * @example
 * const adapted = adaptHouseManualForViewer({ response: edgeFunctionResponse });
 * // Returns { houseManual: {...}, visit: {...}, canReview: true, sectionCount: 8 }
 */
export function adaptHouseManualForViewer({ response }) {
  if (!response) {
    throw new Error('Response data is required');
  }

  const { houseManual, visit } = response;

  if (!houseManual) {
    throw new Error('House manual data is required');
  }

  if (!visit) {
    throw new Error('Visit data is required');
  }

  // Validate required fields
  if (!houseManual.id) {
    throw new Error('House manual ID is required');
  }

  if (!visit.id) {
    throw new Error('Visit ID is required');
  }

  // Count sections with content
  const sectionCount = (houseManual.sections || []).length;

  // Determine if guest can submit a review
  const canReview = !visit.hasReviewed;

  return {
    houseManual: {
      id: houseManual.id,
      title: houseManual.title || 'House Manual',
      hostName: houseManual.hostName || null,
      propertyAddress: houseManual.propertyAddress || null,
      sections: houseManual.sections || [],
    },
    visit: {
      id: visit.id,
      guestId: visit.guestId,
      arrivalDate: visit.arrivalDate || null,
      language: visit.language || null,
      shortUrl: visit.shortUrl || null,
      hasReviewed: Boolean(visit.hasReviewed),
      linkSaw: Boolean(visit.linkSaw),
      mapSaw: Boolean(visit.mapSaw),
      narrationHeard: Boolean(visit.narrationHeard),
    },
    canReview,
    sectionCount,
  };
}

/**
 * Group sections by category for organized display.
 *
 * @param {Object} params - Named parameters
 * @param {ManualSection[]} params.sections - Array of manual sections
 * @returns {Object} Sections grouped by category
 *
 * @example
 * const grouped = groupSectionsByCategory({ sections });
 * // Returns { essentials: [...], living: [...], local: [...], other: [...] }
 */
export function groupSectionsByCategory({ sections }) {
  if (!Array.isArray(sections)) {
    return {
      essentials: [],
      living: [],
      local: [],
      other: [],
    };
  }

  const essentialIds = ['wifi', 'checkin', 'checkout', 'emergency'];
  const livingIds = ['rules', 'kitchen', 'laundry', 'hvac', 'parking', 'trash', 'checklist'];
  const localIds = ['local', 'notes'];

  return {
    essentials: sections.filter(s => essentialIds.includes(s.id)),
    living: sections.filter(s => livingIds.includes(s.id)),
    local: sections.filter(s => localIds.includes(s.id)),
    other: sections.filter(s =>
      !essentialIds.includes(s.id) &&
      !livingIds.includes(s.id) &&
      !localIds.includes(s.id)
    ),
  };
}

/**
 * Format section content for display based on section type.
 *
 * @param {Object} params - Named parameters
 * @param {ManualSection} params.section - Section to format
 * @returns {Object} Formatted content ready for rendering
 */
export function formatSectionContent({ section }) {
  if (!section || !section.content) {
    return null;
  }

  const { type, content } = section;

  switch (type) {
    case 'wifi':
      return {
        networkName: content.networkName || null,
        password: content.password || null,
        photo: content.photo || null,
        hasCredentials: Boolean(content.networkName || content.password),
      };

    case 'rules':
      // Rules can be an array or a string
      if (Array.isArray(content)) {
        return { rules: content, isArray: true };
      }
      return { text: content, isArray: false };

    case 'checklist':
      // Checklist is typically an array of items
      if (Array.isArray(content)) {
        return { items: content, isArray: true };
      }
      return { text: content, isArray: false };

    case 'contacts':
      // Contacts can be structured or text
      if (Array.isArray(content)) {
        return { contacts: content, isArray: true };
      }
      return { text: content, isArray: false };

    case 'text':
    default:
      // Plain text content
      return { text: content };
  }
}

/**
 * Check if a section has displayable content.
 *
 * @param {Object} params - Named parameters
 * @param {ManualSection} params.section - Section to check
 * @returns {boolean} True if section has content to display
 */
export function hasSectionContent({ section }) {
  if (!section || !section.content) {
    return false;
  }

  const { type, content } = section;

  if (type === 'wifi') {
    return Boolean(content.networkName || content.password || content.photo);
  }

  if (Array.isArray(content)) {
    return content.length > 0;
  }

  if (typeof content === 'string') {
    return content.trim().length > 0;
  }

  if (typeof content === 'object') {
    return Object.keys(content).length > 0;
  }

  return Boolean(content);
}

export default adaptHouseManualForViewer;
