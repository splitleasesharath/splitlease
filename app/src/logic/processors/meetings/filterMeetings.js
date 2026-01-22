/**
 * Meeting Filter Processor
 * Pure functions for filtering and processing meeting data
 *
 * These functions handle:
 * - Filtering meetings by various criteria
 * - Extracting unique values for filter dropdowns
 * - Formatting meeting data for display
 */

/**
 * Filter meetings based on provided filter criteria
 *
 * @param {Array} meetings - Array of meeting objects
 * @param {Object} filters - Filter criteria
 * @param {string} filters.guestSearch - Search text for guest name/email
 * @param {string} filters.hostId - Filter by host ID
 * @param {string} filters.proposalId - Filter by proposal ID
 * @param {Object|null} filters.dateRange - Date range { start, end }
 * @returns {Array} Filtered meetings
 */
export function filterMeetings(meetings, filters = {}) {
  if (!Array.isArray(meetings)) return [];

  const {
    guestSearch = '',
    hostId = '',
    proposalId = '',
    dateRange = null
  } = filters;

  return meetings.filter(meeting => {
    // Guest search (name or email)
    if (guestSearch) {
      const searchLower = guestSearch.toLowerCase();
      const guestName = getFullName(meeting.guest).toLowerCase();
      const guestEmail = (meeting.guest?.email || '').toLowerCase();

      const matchesGuest = guestName.includes(searchLower) ||
                          guestEmail.includes(searchLower);

      if (!matchesGuest) return false;
    }

    // Host filter
    if (hostId) {
      const meetingHostId = meeting.host?.id || meeting.host?._id;
      if (meetingHostId !== hostId) return false;
    }

    // Proposal ID filter
    if (proposalId) {
      const meetingProposalId = meeting.proposal_unique_id || '';
      if (!meetingProposalId.toLowerCase().includes(proposalId.toLowerCase())) {
        return false;
      }
    }

    // Date range filter
    if (dateRange?.start && dateRange?.end) {
      const meetingDate = meeting.booked_date || meeting.created_at;
      if (meetingDate) {
        const date = new Date(meetingDate);
        if (date < dateRange.start || date > dateRange.end) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Extract unique hosts from meetings for dropdown options
 *
 * @param {Array} meetings - Array of meeting objects
 * @returns {Array<{id: string, name: string, email: string}>}
 */
export function extractUniqueHosts(meetings) {
  if (!Array.isArray(meetings)) return [];

  const hostMap = new Map();

  meetings.forEach(meeting => {
    if (!meeting.host) return;

    const hostId = meeting.host.id || meeting.host._id;
    if (!hostId || hostMap.has(hostId)) return;

    hostMap.set(hostId, {
      id: hostId,
      name: getFullName(meeting.host),
      email: meeting.host.email || '',
      avatarUrl: meeting.host.avatar_url || meeting.host.profile_photo_url
    });
  });

  // Sort by name
  return Array.from(hostMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Extract unique guests from meetings for dropdown options
 *
 * @param {Array} meetings - Array of meeting objects
 * @returns {Array<{id: string, name: string, email: string}>}
 */
export function extractUniqueGuests(meetings) {
  if (!Array.isArray(meetings)) return [];

  const guestMap = new Map();

  meetings.forEach(meeting => {
    if (!meeting.guest) return;

    const guestId = meeting.guest.id || meeting.guest._id;
    if (!guestId || guestMap.has(guestId)) return;

    guestMap.set(guestId, {
      id: guestId,
      name: getFullName(meeting.guest),
      email: meeting.guest.email || ''
    });
  });

  return Array.from(guestMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Get full name from user object
 *
 * @param {Object|null} user - User object with name fields
 * @returns {string}
 */
export function getFullName(user) {
  if (!user) return 'Unknown';

  const firstName = user.name_first || user.first_name || '';
  const lastName = user.name_last || user.last_name || '';

  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || user.email || 'Unknown';
}

/**
 * Format meeting for display
 *
 * @param {Object} meeting - Raw meeting object
 * @returns {Object} Formatted meeting for UI
 */
export function formatMeetingForDisplay(meeting) {
  if (!meeting) return null;

  return {
    id: meeting._id || meeting.id,
    status: meeting.status || 'unknown',
    guestName: getFullName(meeting.guest),
    guestEmail: meeting.guest?.email || '',
    guestPhone: meeting.guest?.phone_number || '',
    guestTimezone: meeting.guest?.timezone || 'America/New_York',
    hostName: getFullName(meeting.host),
    hostEmail: meeting.host?.email || '',
    hostTimezone: meeting.host?.timezone || 'America/New_York',
    proposalId: meeting.proposal_unique_id || '',
    listingAddress: formatListingAddress(meeting.listing),
    suggestedDates: formatSuggestedDates(meeting.suggested_dates_and_times),
    bookedDate: meeting.booked_date ? formatBookedDate(meeting.booked_date) : null,
    meetingLink: meeting.meeting_link || null,
    createdAt: meeting.created_at,
    formattedCreatedAt: formatRelativeTime(meeting.created_at)
  };
}

/**
 * Format listing address for display
 *
 * @param {Object|null} listing - Listing object
 * @returns {string}
 */
export function formatListingAddress(listing) {
  if (!listing) return 'Unknown Listing';

  const parts = [
    listing.street_address,
    listing.unit_apt,
    listing.neighborhood_1
  ].filter(Boolean);

  return parts.join(', ') || listing.title || 'Unknown Listing';
}

/**
 * Format suggested dates array for display
 *
 * @param {Array<string>} dates - Array of date strings
 * @returns {Array<{raw: string, formatted: string}>}
 */
export function formatSuggestedDates(dates) {
  if (!Array.isArray(dates)) return [];

  return dates.map(dateStr => ({
    raw: dateStr,
    formatted: formatDateTimeForDisplay(dateStr)
  }));
}

/**
 * Format a booked date for display
 *
 * @param {string} dateStr - ISO date string
 * @returns {Object} { raw, formatted, relative }
 */
export function formatBookedDate(dateStr) {
  if (!dateStr) return null;

  return {
    raw: dateStr,
    formatted: formatDateTimeForDisplay(dateStr),
    relative: formatRelativeTime(dateStr)
  };
}

/**
 * Format ISO date string for display
 *
 * @param {string} dateStr - ISO date string
 * @returns {string}
 */
export function formatDateTimeForDisplay(dateStr) {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format date as relative time (e.g., "2 days ago")
 *
 * @param {string|Date} date - Date to format
 * @returns {string}
 */
export function formatRelativeTime(date) {
  if (!date) return '';

  try {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return then.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '';
  }
}

/**
 * Sort meetings by a specific field
 *
 * @param {Array} meetings - Array of meeting objects
 * @param {string} field - Field to sort by
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted meetings
 */
export function sortMeetings(meetings, field = 'created_at', order = 'desc') {
  if (!Array.isArray(meetings)) return [];

  return [...meetings].sort((a, b) => {
    let aVal = getNestedValue(a, field);
    let bVal = getNestedValue(b, field);

    // Handle dates
    if (field.includes('date') || field.includes('_at')) {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    }

    // Handle strings
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Get nested value from object using dot notation
 *
 * @param {Object} obj - Object to search
 * @param {string} path - Dot-notation path (e.g., 'guest.name')
 * @returns {any}
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Group meetings by status
 *
 * @param {Array} meetings - Array of meeting objects
 * @returns {Object} { new_request: [], confirmed: [], completed: [], cancelled: [] }
 */
export function groupMeetingsByStatus(meetings) {
  if (!Array.isArray(meetings)) {
    return { new_request: [], confirmed: [], completed: [], cancelled: [] };
  }

  return meetings.reduce((groups, meeting) => {
    const status = meeting.status || 'new_request';
    if (!groups[status]) groups[status] = [];
    groups[status].push(meeting);
    return groups;
  }, { new_request: [], confirmed: [], completed: [], cancelled: [] });
}
