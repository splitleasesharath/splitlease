/**
 * Account Profile Page - Island Hydration
 *
 * This file mounts the shared Header, Footer, and SearchScheduleSelector components as React islands
 * The page content is static HTML for maximum performance
 */

import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import Header from './islands/shared/Header.jsx';
import Footer from './islands/shared/Footer.jsx';
import SearchScheduleSelector from './islands/shared/SearchScheduleSelector.jsx';
import { getAuthToken } from './lib/auth.js';

// Mount Header island with autoShowLogin if user is not authenticated
const headerRoot = document.getElementById('header-root');
if (headerRoot) {
  const token = getAuthToken();
  const showLoginModal = !token; // Show login modal if no token
  createRoot(headerRoot).render(<Header autoShowLogin={showLoginModal} />);
}

// Mount Footer island
const footerRoot = document.getElementById('footer-root');
if (footerRoot) {
  createRoot(footerRoot).render(<Footer />);
}

// Schedule Selector wrapper component to handle data sync with HTML page
function ScheduleSelectorWrapper() {
  const [selectedDays, setSelectedDays] = useState([]);

  // Convert day names from database to day indices (0-6)
  const dayMap = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
  };

  // Reverse map for saving back to database
  const indexToDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Load initial selection from user data (stored in window by the HTML page's JS)
  useEffect(() => {
    // Wait for the HTML page's JS to load user data into window
    const checkUserData = setInterval(() => {
      if (window.userProfileData && window.userProfileData['Recent Days Selected']) {
        const dayNames = window.userProfileData['Recent Days Selected'];
        const dayIndices = dayNames.map(name => dayMap[name]).filter(idx => idx !== undefined);
        setSelectedDays(dayIndices);
        clearInterval(checkUserData);
      }
    }, 100);

    // Cleanup after 5 seconds if no data found
    setTimeout(() => clearInterval(checkUserData), 5000);

    return () => clearInterval(checkUserData);
  }, []);

  // Handle selection changes - expose to HTML page for saving
  const handleSelectionChange = (days) => {
    // Convert day objects back to indices
    const dayIndices = days.map(day => day.index);
    setSelectedDays(dayIndices);

    // Convert indices to day names for database storage
    const dayNames = dayIndices.map(idx => indexToDayName[idx]);

    // Expose to HTML page's save function
    if (window.updateRecentDaysSelected) {
      window.updateRecentDaysSelected(dayNames);
    }
  };

  return (
    <SearchScheduleSelector
      initialSelection={selectedDays}
      onSelectionChange={handleSelectionChange}
      minDays={2}
      requireContiguous={true}
      updateUrl={false}
    />
  );
}

// Mount Schedule Selector island
const scheduleSelectorRoot = document.getElementById('schedule-selector-root');
if (scheduleSelectorRoot) {
  createRoot(scheduleSelectorRoot).render(<ScheduleSelectorWrapper />);
}
