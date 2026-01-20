/**
 * AI Suggestions Module
 *
 * Provides a modal interface for reviewing and acting on AI-generated
 * suggestions for house manual content.
 *
 * @module AISuggestions
 */

export { default as AISuggestionsModal } from './AISuggestionsModal';
export { default as SuggestionCard } from './SuggestionCard';
export { default as TranscriptPopup } from './TranscriptPopup';
export { default as CombineModal } from './CombineModal';
export { useAISuggestionsState } from './useAISuggestionsState';
export { SOURCE_ICONS, PROGRESS_STAGES, FIELD_LABELS } from './constants';
