/**
 * SearchScheduleSelector island mount point
 * Mounts the SearchScheduleSelector component into the DOM at specified element
 */

import { createRoot } from 'react-dom/client';
import { SearchScheduleSelector } from '../components/src/SearchScheduleSelector';
import type { SearchScheduleSelectorProps } from '../types/components';

/**
 * Mount SearchScheduleSelector component into DOM element
 * @param elementId - ID of the element to mount into
 * @param props - SearchScheduleSelector component props
 */
export function mountSearchSelector(
  elementId: string,
  props: SearchScheduleSelectorProps = {}
): void {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  const root = createRoot(element);
  root.render(<SearchScheduleSelector {...props} />);
}

/**
 * Auto-mount SearchScheduleSelector if element exists on page load
 */
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const searchElement = document.getElementById('search-selector-island');
    if (searchElement) {
      // Extract props from data attributes
      const disabled = searchElement.dataset.disabled === 'true';
      const valueData = searchElement.dataset.value;
      const value = valueData ? JSON.parse(valueData) : undefined;

      mountSearchSelector('search-selector-island', {
        value,
        disabled,
        onChange: (schedule) => {
          // Dispatch custom event for listening in vanilla JS
          const event = new CustomEvent('scheduleChange', {
            detail: schedule,
            bubbles: true,
          });
          searchElement.dispatchEvent(event);
        },
      });
    }
  });
}
