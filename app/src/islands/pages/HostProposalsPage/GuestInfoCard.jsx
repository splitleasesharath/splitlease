/**
 * GuestInfoCard Component (V7 Design)
 *
 * Guest profile section with:
 * - Large avatar (56px)
 * - Guest name
 * - Bio text
 * - Verification badges (ID Verified, Work Verified, Reviews, Member since)
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';
import { CheckCircle, Briefcase, Star, Calendar } from 'lucide-react';

/**
 * Get guest display name
 * @param {Object} guest - The guest object
 * @returns {string} The display name
 */
function getGuestName(guest) {
  return guest?.name || guest?.full_name || guest?.first_name || 'Guest';
}

/**
 * Get guest bio
 * @param {Object} guest - The guest object
 * @returns {string} The bio text
 */
function getGuestBio(guest) {
  return guest?.bio || guest?.about || guest?.description || 'No bio available';
}

/**
 * Get member since year
 * @param {Object} guest - The guest object
 * @returns {string|null} Year string or null
 */
function getMemberSinceYear(guest) {
  const createdAt = guest?.created_at || guest?.Created_Date || guest?.member_since;
  if (!createdAt) return null;
  const year = new Date(createdAt).getFullYear();
  return isNaN(year) ? null : String(year);
}

/**
 * GuestInfoCard displays guest profile information
 *
 * @param {Object} props
 * @param {Object} props.guest - The guest object
 */
export function GuestInfoCard({ guest }) {
  if (!guest) return null;

  const name = getGuestName(guest);
  const bio = getGuestBio(guest);

  const isIdVerified = guest?.id_verified || guest?.is_verified || guest?.verified;
  const isWorkVerified = guest?.work_verified || guest?.employment_verified;
  const reviewCount = guest?.review_count || guest?.reviews_count || 0;
  const memberSince = getMemberSinceYear(guest);

  return (
    <div className="hp7-guest-info-card">
      <div className="hp7-guest-details">
        <div className="hp7-guest-name-large">{name}</div>
        <div className="hp7-guest-bio">{bio}</div>
        <div className="hp7-guest-badges">
          {isIdVerified && (
            <span className="hp7-guest-badge verified">
              <CheckCircle size={10} />
              ID Verified
            </span>
          )}
          {isWorkVerified && (
            <span className="hp7-guest-badge verified">
              <Briefcase size={10} />
              Work Verified
            </span>
          )}
          {reviewCount > 0 && (
            <span className="hp7-guest-badge">
              <Star size={10} />
              {reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'}
            </span>
          )}
          {reviewCount === 0 && (
            <span className="hp7-guest-badge">
              <Star size={10} />
              New to SL
            </span>
          )}
          {memberSince && (
            <span className="hp7-guest-badge">
              <Calendar size={10} />
              Member since {memberSince}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default GuestInfoCard;
