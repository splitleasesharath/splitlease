/**
 * URL Parameter Synchronization Utility
 * Handles bidirectional sync between UI filters and URL parameters
 */

class URLParamManager {
    constructor() {
        this.paramNames = {
            borough: 'borough',
            weekPattern: 'weekly-frequency',
            priceTier: 'pricetier',
            sortBy: 'sort',
            neighborhoods: 'neighborhoods', // Comma-separated IDs
            daysSelected: 'days-selected' // Handled by schedule-selector-integration.js
        };
    }

    /**
     * Get all filter values from URL parameters
     * @returns {Object} Filter values from URL
     */
    getFiltersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);

        const filters = {
            borough: urlParams.get(this.paramNames.borough) || null,
            weekPattern: urlParams.get(this.paramNames.weekPattern) || null,
            priceTier: urlParams.get(this.paramNames.priceTier) || null,
            sortBy: urlParams.get(this.paramNames.sortBy) || null,
            neighborhoods: this.parseNeighborhoodsParam(urlParams.get(this.paramNames.neighborhoods)),
            daysSelected: this.parseDaysParam(urlParams.get(this.paramNames.daysSelected))
        };

        console.log('📖 Read filters from URL:', filters);
        return filters;
    }

    /**
     * Update URL parameters with current filter values
     * @param {Object} filters - Current filter values from UI
     */
    updateURLParams(filters) {
        const urlParams = new URLSearchParams(window.location.search);

        // Update borough parameter
        if (filters.borough) {
            urlParams.set(this.paramNames.borough, filters.borough);
        } else {
            urlParams.delete(this.paramNames.borough);
        }

        // Update week pattern parameter
        if (filters.weekPattern) {
            urlParams.set(this.paramNames.weekPattern, filters.weekPattern);
        } else {
            urlParams.delete(this.paramNames.weekPattern);
        }

        // Update price tier parameter
        if (filters.priceTier && filters.priceTier !== 'all') {
            urlParams.set(this.paramNames.priceTier, filters.priceTier);
        } else {
            urlParams.delete(this.paramNames.priceTier);
        }

        // Update sort parameter
        if (filters.sortBy) {
            urlParams.set(this.paramNames.sortBy, filters.sortBy);
        } else {
            urlParams.delete(this.paramNames.sortBy);
        }

        // Update neighborhoods parameter
        if (filters.neighborhoods && filters.neighborhoods.length > 0) {
            urlParams.set(this.paramNames.neighborhoods, filters.neighborhoods.join(','));
        } else {
            urlParams.delete(this.paramNames.neighborhoods);
        }

        // Note: daysSelected is handled by schedule-selector-integration.js

        // Update URL without page reload
        const newURL = urlParams.toString()
            ? `${window.location.pathname}?${urlParams.toString()}`
            : window.location.pathname;

        window.history.replaceState({}, '', newURL);
        console.log('🔗 Updated URL:', newURL);
    }

    /**
     * Parse neighborhoods parameter (comma-separated IDs)
     * @param {string|null} param - URL parameter value
     * @returns {Array<string>} Array of neighborhood IDs
     */
    parseNeighborhoodsParam(param) {
        if (!param) return [];
        return param.split(',')
            .map(id => id.trim())
            .filter(id => id.length > 0);
    }

    /**
     * Parse days-selected parameter (comma-separated 1-based numbers)
     * @param {string|null} param - URL parameter value
     * @returns {Array<number>} Array of 0-based day indices
     */
    parseDaysParam(param) {
        if (!param) return null;
        try {
            return param.split(',')
                .map(s => parseInt(s.trim(), 10))
                .filter(n => Number.isInteger(n) && n >= 1 && n <= 7)
                .map(n => n - 1); // Convert 1-based to 0-based
        } catch (e) {
            console.warn('⚠️ Failed to parse days-selected parameter:', e);
            return null;
        }
    }

    /**
     * Apply URL parameters to UI elements
     * @param {Object} filters - Filter values from URL
     */
    applyURLToUI(filters) {
        console.log('🎨 Applying URL parameters to UI:', filters);

        // Apply borough
        const boroughSelect = document.getElementById('boroughSelect');
        if (boroughSelect && filters.borough) {
            // Try to find matching option
            const option = Array.from(boroughSelect.options).find(
                opt => opt.value === filters.borough
            );
            if (option) {
                boroughSelect.value = filters.borough;
                console.log(`✅ Set borough to: ${filters.borough}`);
            } else {
                console.warn(`⚠️ Borough "${filters.borough}" not found in options`);
            }
        }

        // Apply week pattern
        const weekPattern = document.getElementById('weekPattern');
        if (weekPattern && filters.weekPattern) {
            weekPattern.value = filters.weekPattern;
            console.log(`✅ Set week pattern to: ${filters.weekPattern}`);
        }

        // Apply price tier
        const priceTier = document.getElementById('priceTier');
        if (priceTier && filters.priceTier) {
            priceTier.value = filters.priceTier;
            console.log(`✅ Set price tier to: ${filters.priceTier}`);
        }

        // Apply sort by
        const sortBy = document.getElementById('sortBy');
        if (sortBy && filters.sortBy) {
            sortBy.value = filters.sortBy;
            console.log(`✅ Set sort by to: ${filters.sortBy}`);
        }

        // Apply neighborhoods (check checkboxes)
        if (filters.neighborhoods && filters.neighborhoods.length > 0) {
            filters.neighborhoods.forEach(neighborhoodId => {
                const checkbox = document.querySelector(
                    `.neighborhood-list input[type="checkbox"][value="${neighborhoodId}"]`
                );
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
            console.log(`✅ Set ${filters.neighborhoods.length} neighborhoods`);
        }

        // Days are handled by schedule-selector-integration.js
    }

    /**
     * Get current filter values from UI
     * @returns {Object} Current filter values
     */
    getFiltersFromUI() {
        return {
            borough: document.getElementById('boroughSelect')?.value || null,
            weekPattern: document.getElementById('weekPattern')?.value || null,
            priceTier: document.getElementById('priceTier')?.value || null,
            sortBy: document.getElementById('sortBy')?.value || null,
            neighborhoods: Array.from(
                document.querySelectorAll('.neighborhood-list input[type="checkbox"]:checked')
            ).map(cb => cb.value)
        };
    }
}

// Create global instance
window.URLParamManager = new URLParamManager();
