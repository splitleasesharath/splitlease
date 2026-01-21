/**
 * adaptLeaseFromSupabase - Transform raw Supabase lease data to frontend model
 *
 * Handles the mapping between Bubble.io's column naming conventions
 * (spaces, mixed case) and our frontend's camelCase conventions.
 *
 * @param {Object} row - Raw row from bookings_leases table
 * @returns {Object} Adapted lease object for frontend use
 */

/**
 * Map Bubble.io lease status values to normalized strings
 * @param {string} rawStatus - Raw status from database
 * @returns {string} Normalized status
 */
function mapLeaseStatus(rawStatus) {
  if (!rawStatus) return 'unknown';

  const statusMap = {
    'Active': 'active',
    'active': 'active',
    'Completed': 'completed',
    'completed': 'completed',
    'Cancelled': 'cancelled',
    'cancelled': 'cancelled',
    'Pending': 'pending',
    'pending': 'pending',
    'Draft': 'draft',
    'draft': 'draft',
  };

  return statusMap[rawStatus] || rawStatus.toLowerCase();
}

/**
 * Safely parse a date string
 * @param {string|null} dateStr - Date string or null
 * @returns {Date|null} Parsed Date or null
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Adapt a single lease record from Supabase format
 * @param {Object} row - Raw bookings_leases row with joins
 * @returns {Object} Frontend-friendly lease object
 */
export function adaptLeaseFromSupabase(row) {
  if (!row) return null;

  return {
    // Core identifiers
    id: row._id,
    bubbleId: row.bubble_id,
    agreementNumber: row['Agreement Number'] || null,

    // Status
    status: mapLeaseStatus(row['Lease Status']),
    leaseSigned: row['Lease signed?'] || false,

    // Dates
    startDate: parseDate(row['Reservation Period : Start']),
    endDate: parseDate(row['Reservation Period : End']),
    createdAt: parseDate(row['Created Date']),
    modifiedAt: parseDate(row['Modified Date']),
    firstPaymentDate: parseDate(row['First Payment Date']),

    // Financial
    totalRent: parseFloat(row['Total Rent']) || 0,
    totalCompensation: parseFloat(row['Total Compensation']) || 0,
    paidToDate: parseFloat(row['Paid to Date from Guest']) || 0,

    // Week tracking
    currentWeekNumber: parseInt(row['current week number']) || null,
    totalWeekCount: parseInt(row['total week count']) || null,

    // Related entities (adapted from joins)
    guest: row.guest ? adaptUserFromSupabase(row.guest) : null,
    host: row.host ? adaptUserFromSupabase(row.host) : null,
    listing: row.listing ? adaptListingFromSupabase(row.listing) : null,
    proposal: row.proposal ? { id: row.proposal._id } : null,

    // Stays (from join or JSONB)
    stays: Array.isArray(row.stays)
      ? row.stays.map(adaptStayFromSupabase)
      : parseJsonbArray(row['List of Stays']),

    // Documents (if attached)
    documents: row.documents || [],

    // Other fields
    thread: row.Thread || null,
    cancellationPolicy: row['Cancellation Policy'] || null,
    hostPayoutSchedule: row['Host Payout Schedule'] || null,
    wereDocumentsGenerated: row['were documents generated?'] || false,

    // Throttling flags
    throttling: {
      guestCanCreateRequests: row['Throttling - guest ability to create requests?'] ?? true,
      hostCanCreateRequests: row['Throttling- host ability to create requests?'] ?? true,
      guestShowWarning: !row['Throttling - guest NOT show warning popup'],
      hostShowWarning: !row['Throttling - host NOT show warning popup'],
    },

    // Reputation
    guestReputationScore: parseInt(row['Reputation Score (GUEST)']) || null,
    hostReputationScore: parseInt(row['Reputation Score (HOST)']) || null,

    // Sync status
    pending: row.pending || false,
  };
}

/**
 * Adapt user data from Supabase join
 */
function adaptUserFromSupabase(user) {
  if (!user) return null;

  return {
    id: user._id,
    email: user.email || user.Email || null,
    firstName: user['First Name'] || user.first_name || null,
    lastName: user['Last Name'] || user.last_name || null,
    phone: user.Phone || user.phone || null,
    avatarUrl: user['Profile Photo'] || user.avatar_url || null,
  };
}

/**
 * Adapt listing data from Supabase join
 */
function adaptListingFromSupabase(listing) {
  if (!listing) return null;

  return {
    id: listing._id,
    name: listing['Listing Title'] || listing.name || 'Unnamed Listing',
    address: listing.Address || listing.address || null,
    neighborhood: listing.Neighborhood || listing.neighborhood || null,
    city: listing.City || listing.city || null,
    state: listing.State || listing.state || null,
    zipCode: listing['Zip Code'] || listing.zip_code || null,
    imageUrl: listing['Primary Image'] || listing.image_url || null,
  };
}

/**
 * Adapt stay data from Supabase join
 */
function adaptStayFromSupabase(stay) {
  if (!stay) return null;

  return {
    id: stay._id,
    status: stay['Stay Status'] || 'unknown',
    checkIn: parseDate(stay['Check In (night)']),
    checkOut: parseDate(stay['Check-out day']),
    lastNight: parseDate(stay['Last Night (night)']),
    weekNumber: parseInt(stay['Week Number']) || null,
    amount: parseFloat(stay.Amount) || 0,
    firstIndex: parseInt(stay['first index']) || null,
    lastIndex: parseInt(stay['last index']) || null,
    nights: parseJsonbArray(stay.Nights),
  };
}

/**
 * Safely parse JSONB array field
 */
function parseJsonbArray(jsonbField) {
  if (Array.isArray(jsonbField)) return jsonbField;
  if (typeof jsonbField === 'string') {
    try {
      return JSON.parse(jsonbField);
    } catch {
      return [];
    }
  }
  return [];
}

export default adaptLeaseFromSupabase;
