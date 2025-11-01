/**
 * Schedule Selector Island Mount Script
 *
 * Hydrates the SearchScheduleSelector component on the homepage
 */

import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import SearchScheduleSelector from '../components/src/SearchScheduleSelector';
import type { Day } from '../components/src/SearchScheduleSelector/types';

/**
 * Schedule Selector Island Component
 *
 * Manages schedule selection state and navigation
 */
function ScheduleSelectorIsland() {
  const [selectedDays, setSelectedDays] = useState<Day[]>([]);

  const handleSelectionChange = useCallback((days: Day[]) => {
    setSelectedDays(days);

    // Update URL parameters with selected days
    if (days.length > 0) {
      const dayIndices = days.map(d => d.index).join(',');
      const url = new URL(window.location.href);
      url.searchParams.set('days', dayIndices);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleError = useCallback((error: string) => {
    console.error('Schedule selection error:', error);
  }, []);

  return (
    <SearchScheduleSelector
      onSelectionChange={handleSelectionChange}
      onError={handleError}
      minDays={2}
      maxDays={5}
      requireContiguous={true}
      initialSelection={[]}
    />
  );
}

/**
 * Mount the Schedule Selector island
 */
export function mountScheduleSelector() {
  const mountPoint = document.getElementById('search-selector');

  if (!mountPoint) {
    console.warn('Schedule selector mount point not found');
    return;
  }

  const root = createRoot(mountPoint);
  root.render(<ScheduleSelectorIsland />);
}

// Auto-mount when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountScheduleSelector);
  } else {
    mountScheduleSelector();
  }
}
