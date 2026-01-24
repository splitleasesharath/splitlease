/**
 * AmenityIcons
 *
 * Displays property amenities: bedrooms, bathrooms, beds, guests, space type.
 * Uses native Supabase field names.
 *
 * Icons: All icons from Feather Icons (https://feathericons.com)
 * - home: space type
 * - square (custom bed): bedrooms/beds (Feather doesn't have bed, using layout approach)
 * - droplet: bathrooms
 * - users: guests
 */

/**
 * Feather Icons SVG components
 * Source: https://feathericons.com
 * Styling: stroke-only, no fill, per Split Lease Design System
 */
const FeatherIcon = ({ children, className = '' }) => (
  <svg
    className={`sp-amenity-icon-svg ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

// Feather: home
const HomeIcon = () => (
  <FeatherIcon>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </FeatherIcon>
);

// Custom bed icon (Feather doesn't have bed, using simplified design following Feather principles)
const BedIcon = () => (
  <FeatherIcon>
    <path d="M2 4v16" />
    <path d="M2 8h18a2 2 0 0 1 2 2v10" />
    <path d="M2 17h20" />
    <path d="M6 8v9" />
  </FeatherIcon>
);

// Feather: droplet (for bathroom)
const DropletIcon = () => (
  <FeatherIcon>
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </FeatherIcon>
);

// Feather: users
const UsersIcon = () => (
  <FeatherIcon>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </FeatherIcon>
);

/**
 * Map space type ID to display label
 * 'Features - Type of Space' stores FK IDs to reference_table.zat_features_listingtype
 */
const SPACE_TYPE_ID_TO_LABEL = {
  '1569530159044x216130979074711000': 'Private Room',
  '1569530331984x152755544104023800': 'Entire Place',
  '1585742011301x719941865479153400': 'Shared Room',
  '1588063597111x228486447854442800': 'All Spaces',
};

/**
 * @param {Object} props
 * @param {Object} props.listing - Listing object with amenity fields
 */
export default function AmenityIcons({ listing = {} }) {
  const bedrooms = listing['Features - Qty Bedrooms'] || 0;
  const bathrooms = listing['Features - Qty Bathrooms'] || 0;
  const guests = listing['Features - Qty Guests'] || 0;

  // Resolve space type ID to display label
  // IDs look like '1569530331984x152755544104023800' - if we can't map it, use a generic fallback
  const spaceTypeId = listing['Features - Type of Space'];
  const isValidSpaceTypeLabel = spaceTypeId && !spaceTypeId.includes('x') && spaceTypeId.length < 20;
  const spaceType = SPACE_TYPE_ID_TO_LABEL[spaceTypeId]
    || (isValidSpaceTypeLabel ? spaceTypeId : null)
    || 'Space';

  return (
    <div className="sp-amenities">
      {/* Space type */}
      <div className="sp-amenity" title={spaceType}>
        <span className="sp-amenity-icon">
          <HomeIcon />
        </span>
        <span className="sp-amenity-text">{spaceType}</span>
      </div>

      {/* Bedrooms */}
      {bedrooms > 0 && (
        <div className="sp-amenity" title={`${bedrooms} bedroom${bedrooms !== 1 ? 's' : ''}`}>
          <span className="sp-amenity-icon">
            <BedIcon />
          </span>
          <span className="sp-amenity-text">{bedrooms} bed{bedrooms !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Bathrooms */}
      {bathrooms > 0 && (
        <div className="sp-amenity" title={`${bathrooms} bathroom${bathrooms !== 1 ? 's' : ''}`}>
          <span className="sp-amenity-icon">
            <DropletIcon />
          </span>
          <span className="sp-amenity-text">{bathrooms} bath{bathrooms !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Max guests */}
      {guests > 0 && (
        <div className="sp-amenity" title={`Up to ${guests} guest${guests !== 1 ? 's' : ''}`}>
          <span className="sp-amenity-icon">
            <UsersIcon />
          </span>
          <span className="sp-amenity-text">{guests} guest{guests !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
