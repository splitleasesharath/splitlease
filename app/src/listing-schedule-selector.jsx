/**
 * Listing Schedule Selector - Entry point for importing the component
 *
 * Usage in HTML pages:
 *
 * <script type="module">
 *   import { createRoot } from 'react-dom/client';
 *   import { createElement } from 'react';
 *   import ListingScheduleSelector from '/src/listing-schedule-selector.jsx';
 *
 *   const root = document.getElementById('schedule-selector-root');
 *   const reactRoot = createRoot(root);
 *
 *   reactRoot.render(
 *     createElement(ListingScheduleSelector, {
 *       listing: yourListingData,
 *       onScheduleSave: (selectedDays) => console.log('Saved:', selectedDays)
 *     })
 *   );
 * </script>
 */

export { default } from './islands/shared/ListingScheduleSelector.jsx';
export { DayButton } from './islands/shared/DayButton.jsx';
export { ErrorOverlay } from './islands/shared/ErrorOverlay.jsx';
export { PriceDisplay } from './islands/shared/PriceDisplay.jsx';
export { useScheduleSelector } from './islands/shared/useScheduleSelector.js';

// Re-export utilities for advanced usage
export * from './lib/scheduleSelector/dayHelpers.js';
export * from './lib/scheduleSelector/validators.js';
export * from './lib/scheduleSelector/nightCalculations.js';
export * from './lib/scheduleSelector/priceCalculations.js';
