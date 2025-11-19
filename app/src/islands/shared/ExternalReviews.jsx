/**
 * ExternalReviews Component
 *
 * Displays verified reviews from Airbnb, VRBO, etc.
 * Shows platform badge, reviewer info, rating, and truncated description
 *
 * Used in: HostProfileModal
 * Based on: GUEST-PROPOSALS-IMPLEMENTATION-PLAN.md Phase 2.1
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';

export default function ExternalReviews({ listingId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!listingId) return;

    async function loadReviews() {
      try {
        const { data, error } = await supabase
          .from('external_reviews')
          .select('*')
          .eq('listing_id', listingId)
          .order('review_date', { ascending: false })
          .limit(10);

        if (error) throw error;
        setReviews(data || []);
      } catch (err) {
        console.error('Error loading external reviews:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadReviews();
  }, [listingId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error || reviews.length === 0) {
    return null; // Don't show section if no reviews
  }

  // Group reviews by platform
  const groupedReviews = reviews.reduce((acc, review) => {
    if (!acc[review.platform]) acc[review.platform] = [];
    acc[review.platform].push(review);
    return acc;
  }, {});

  // Platform badge colors
  const platformColors = {
    'Airbnb': 'bg-red-100 text-red-700',
    'VRBO': 'bg-blue-100 text-blue-700',
    'Booking.com': 'bg-green-100 text-green-700',
  };

  // Truncate description to 200 chars
  function truncate(text, maxLength = 200) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  // Format date
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  }

  // Render star rating
  function renderStars(rating) {
    // Convert to 5-star scale if needed (assuming rating is 0-10 or 0-5)
    const normalizedRating = rating > 5 ? rating / 2 : rating;
    const stars = Math.round(normalizedRating);

    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${i < stars ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  }

  return (
    <div className="border-t pt-4 mt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-4">
        External Reviews ({reviews.length})
      </h4>

      <div className="space-y-4">
        {Object.entries(groupedReviews).map(([platform, platformReviews]) => (
          <div key={platform} className="space-y-3">
            {/* Platform Header */}
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs font-medium rounded ${platformColors[platform] || 'bg-gray-100 text-gray-700'}`}>
                {platform}
              </span>
              <span className="text-xs text-gray-500">
                {platformReviews.length} {platformReviews.length === 1 ? 'review' : 'reviews'}
              </span>
            </div>

            {/* Reviews */}
            {platformReviews.slice(0, 3).map((review) => (
              <div key={review.id} className="bg-gray-50 rounded-lg p-3">
                {/* Reviewer Info */}
                <div className="flex items-start gap-3 mb-2">
                  {review.reviewer_photo ? (
                    <img
                      src={review.reviewer_photo}
                      alt={review.reviewer_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                      {review.reviewer_name.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {review.reviewer_name}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatDate(review.review_date)}
                      </span>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-sm text-gray-700 leading-relaxed">
                  {truncate(review.description, 200)}
                </p>

                {/* Original Link */}
                {review.original_url && (
                  <a
                    href={review.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-purple-600 hover:text-purple-700"
                  >
                    View on {platform}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            ))}

            {/* Show More Link */}
            {platformReviews.length > 3 && (
              <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                Show {platformReviews.length - 3} more {platform} reviews
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
