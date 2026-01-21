/**
 * VisitReviewerHouseManual Island Component
 *
 * A guest-facing house manual viewer with review submission capability.
 * Requires authentication - only the visit's assigned guest can access.
 *
 * Features:
 * - House manual content with collapsible sections
 * - Guest review form with star ratings
 * - Engagement tracking (link_saw, map_saw, narration_heard)
 * - Access control via magic link tokens
 *
 * @example
 * // In page component:
 * import VisitReviewerHouseManual from '@/islands/shared/VisitReviewerHouseManual';
 *
 * <VisitReviewerHouseManual visitId={visitId} token={accessToken} />
 */

export { default } from './VisitReviewerHouseManual.jsx';
export { default as VisitReviewerHouseManual } from './VisitReviewerHouseManual.jsx';
export { useVisitReviewerHouseManualLogic } from './useVisitReviewerHouseManualLogic.js';
export * from './visitReviewerService.js';
