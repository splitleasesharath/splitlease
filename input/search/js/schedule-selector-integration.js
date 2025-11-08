/**
 * Schedule Selector Integration Script
 *
 * This script bridges the React Schedule Selector component with the existing
 * vanilla JavaScript application. It mounts the component and wires up callbacks
 * to integrate with the app's day selection logic.
 */

(function() {
    'use strict';

    console.log('🔗 Loading Schedule Selector integration...');

    /**
     * Map 0-based day indices to full day names
     * This is the canonical mapping used throughout the application
     */
    const DAY_INDEX_TO_NAME = [
        'Sunday',    // 0
        'Monday',    // 1
        'Tuesday',   // 2
        'Wednesday', // 3
        'Thursday',  // 4
        'Friday',    // 5
        'Saturday'   // 6
    ];

    /**
     * Parse URL parameter for days-selected
     * Format: ?days-selected=1,2,3 (1-based: 1=Sunday)
     * Returns 0-based indices for component: [0,1,2] (0=Sunday)
     */
    function parseDaysFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const daysParam = urlParams.get('days-selected');

        if (!daysParam) {
            return null;
        }

        try {
            // Parse comma-separated 1-based day numbers
            const daysArray = daysParam
                .split(',')
                .map(s => parseInt(s.trim(), 10))
                .filter(n => Number.isInteger(n) && n >= 1 && n <= 7)
                .map(n => n - 1); // Convert 1-based to 0-based

            if (daysArray.length > 0) {
                console.log(`🔗 Parsed days from URL: ${daysParam} → [${daysArray.join(', ')}] (0-based)`);
                return daysArray;
            }
        } catch (e) {
            console.warn('⚠️ Failed to parse days-selected URL parameter:', e);
        }

        return null;
    }

    /**
     * Update URL parameter when days selection changes
     * Format: ?days-selected=1,2,3 (1-based: 1=Sunday)
     */
    function updateDaysInURL(selectedIndices) {
        const urlParams = new URLSearchParams(window.location.search);

        if (selectedIndices.length > 0) {
            // Convert 0-based to 1-based for URL
            const daysParam = selectedIndices.map(i => i + 1).join(',');
            urlParams.set('days-selected', daysParam);
        } else {
            urlParams.delete('days-selected');
        }

        // Update URL without page reload
        const newURL = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.replaceState({}, '', newURL);
    }

    /**
     * Initialize the Schedule Selector React component
     */
    function initScheduleSelector() {
        // Check if the mount function is available
        if (typeof window.ScheduleSelector === 'undefined' ||
            typeof window.ScheduleSelector.mount !== 'function') {
            console.error('❌ Schedule Selector mount function not found. Make sure the component script is loaded.');
            return;
        }

        console.log('✅ Schedule Selector mount function found');

        // Get initial selection from URL, fallback to default
        const urlDays = parseDaysFromURL();
        const initialSelection = urlDays || [1, 2, 3, 4, 5]; // Default: Monday-Friday

        // Initialize global selectedDayNames with day name strings
        if (urlDays) {
            window.selectedDayNames = urlDays.map(idx => DAY_INDEX_TO_NAME[idx]).filter(name => name !== undefined);
        } else {
            window.selectedDayNames = initialSelection.map(idx => DAY_INDEX_TO_NAME[idx]).filter(name => name !== undefined);
        }

        console.log(`📅 Initial selection: [${initialSelection.join(', ')}]`);
        console.log(`📅 Initial day names: [${window.selectedDayNames.join(', ')}]`);

        // Mount the component with callbacks
        const root = window.ScheduleSelector.mount('schedule-selector-root', {
            initialSelection: initialSelection,
            minDays: 2,
            maxDays: 5,
            requireContiguous: true,

            // Callback fired when selection changes
            onSelectionChange: (selectedDaysArray) => {
                console.log('🔄 Selection changed:', selectedDaysArray);

                // Convert selected day indices to day names immediately
                const selectedDayNames = selectedDaysArray
                    .map(d => DAY_INDEX_TO_NAME[d.index])
                    .filter(name => name !== undefined);

                // Store day names as the canonical format
                window.selectedDayNames = selectedDayNames.length > 0 ? selectedDayNames : [];

                // Enhanced logging for debugging
                console.log(`✅ Updated selectedDayNames: [${selectedDayNames.join(', ')}]`);
                console.log(`   → Will filter for listings with ALL of these days`);

                // Update URL parameter (still uses indices for brevity)
                const selectedIndices = selectedDaysArray.map(d => d.index);
                updateDaysInURL(selectedIndices);

                // Call existing app.js functions to update the UI
                if (typeof window.updateAllDisplayedPrices === 'function') {
                    window.updateAllDisplayedPrices();
                }

                if (typeof window.applyFilters === 'function') {
                    window.applyFilters();
                }

                // Update check-in/check-out display if function exists
                if (typeof window.updateCheckinCheckout === 'function') {
                    window.updateCheckinCheckout();
                }
            },

            // Callback fired when validation error occurs
            onError: (errorMessage) => {
                console.warn('⚠️ Schedule selector validation error:', errorMessage);
                // The component already displays the error, so we just log it
            }
        });

        if (root) {
            console.log('✅ Schedule Selector mounted successfully');
        } else {
            console.error('❌ Failed to mount Schedule Selector');
        }
    }

    /**
     * Wait for dependencies to load, then initialize
     */
    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkAndInit);
        } else {
            checkAndInit();
        }
    }

    /**
     * Check if all dependencies are loaded
     */
    let checkAttempts = 0;
    const MAX_CHECK_ATTEMPTS = 50; // 5 seconds max (50 * 100ms)

    function checkAndInit() {
        console.log('🔍 Checking Schedule Selector dependencies...');

        // Increment attempt counter
        checkAttempts++;

        // Check for timeout
        if (checkAttempts > MAX_CHECK_ATTEMPTS) {
            console.error('❌ Schedule Selector failed to load after 5 seconds');
            console.error('💡 Possible causes:');
            console.error('   - CORS policy blocking ES module loading (use HTTP server instead of file://)');
            console.error('   - Component script not built (run: npm run build:components)');
            console.error('   - Script path incorrect in index.html');
            console.error('   - Build errors (process.env not defined, etc.)');
            console.error('   - Missing dependencies (React, ReactDOM, styled-components, framer-motion)');
            console.error('⚠️ Schedule Selector component failed to load. Check build configuration.');
            return;
        }

        // Check if React is loaded
        if (typeof React === 'undefined') {
            console.log('⏳ Waiting for React to load...');
            setTimeout(checkAndInit, 100);
            return;
        }
        console.log('✅ React loaded');

        // Check if ReactDOM is loaded
        if (typeof ReactDOM === 'undefined') {
            console.log('⏳ Waiting for ReactDOM to load...');
            setTimeout(checkAndInit, 100);
            return;
        }
        console.log('✅ ReactDOM loaded');

        // Check if Styled Components is loaded
        if (typeof styled === 'undefined') {
            console.warn('⚠️ Styled Components may not be loaded');
        } else {
            console.log('✅ Styled Components loaded');
        }

        // Check if Framer Motion is loaded
        if (typeof FramerMotion === 'undefined' && typeof window.FramerMotion === 'undefined') {
            console.warn('⚠️ Framer Motion may not be loaded (this is normal for bundled builds)');
        } else {
            console.log('✅ Framer Motion loaded');
        }

        // Check if the component script is loaded
        // If not loaded yet, wait a bit and retry
        if (typeof window.ScheduleSelector === 'undefined') {
            console.log(`⏳ Waiting for Schedule Selector component to load... (attempt ${checkAttempts}/${MAX_CHECK_ATTEMPTS})`);
            setTimeout(checkAndInit, 100);
            return;
        }

        // All dependencies loaded, initialize the component
        initScheduleSelector();
    }

    // Start initialization
    init();
})();
