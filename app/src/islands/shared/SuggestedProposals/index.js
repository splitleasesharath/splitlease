/**
 * SuggestedProposals - Main Export File
 *
 * Export all components, hooks, and services for the suggested proposals feature.
 */

// Main Components
export { default as SuggestedProposalPopup } from './SuggestedProposalPopup.jsx';
export { default as SuggestedProposalTrigger } from './SuggestedProposalTrigger.jsx';

// Hook
export { useSuggestedProposals, default } from './useSuggestedProposals.js';

// Service
export {
  fetchSuggestedProposals,
  markProposalInterested,
  dismissProposal,
  getSuggestedProposal
} from './suggestedProposalService.js';

// Sub-components (for custom compositions)
export { default as ImageGallery } from './components/ImageGallery.jsx';
export { default as AmenityIcons } from './components/AmenityIcons.jsx';
export { default as PriceDisplay } from './components/PriceDisplay.jsx';
export { default as ActionButtons } from './components/ActionButtons.jsx';
export { default as MapSection } from './components/MapSection.jsx';
export { default as WhyThisProposal } from './components/WhyThisProposal.jsx';
