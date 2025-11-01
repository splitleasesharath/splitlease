/**
 * Islands Entry Point
 *
 * Exports all island mount functions for use in the homepage
 */

export { mountPopularListings } from './popular-listings';
export { mountScheduleSelector } from './schedule-selector';

/**
 * Mount all islands at once
 */
export function mountAllIslands() {
  import('./popular-listings').then(({ mountPopularListings }) => {
    mountPopularListings();
  });

  import('./schedule-selector').then(({ mountScheduleSelector }) => {
    mountScheduleSelector();
  });
}
