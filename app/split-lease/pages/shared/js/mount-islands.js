/**
 * Island mounting helper
 * Automatically mounts React component islands into the DOM
 */

/**
 * Mount all islands on the page
 * This function should be called after the DOM is loaded
 */
export async function mountAllIslands() {
  console.log('🏝️ Mounting React component islands...');

  const islands = [
    { id: 'header-island', module: 'header' },
    { id: 'footer-island', module: 'footer' },
    { id: 'search-selector-island', module: 'search-selector' },
    { id: 'listing-image-grid-island', module: 'listing-image-grid' },
    { id: 'proposal-menu-island', module: 'proposal-menu' },
  ];

  for (const island of islands) {
    const element = document.getElementById(island.id);

    if (element) {
      try {
        // Dynamically import the island module
        const islandModule = await import(`../../../islands/${island.module}.js`);

        // Extract props from data attributes
        const props = extractPropsFromElement(element);

        // Mount the island
        const mountFunction = Object.values(islandModule)[0];
        if (typeof mountFunction === 'function') {
          mountFunction(island.id, props);
          console.log(`✅ Mounted ${island.id}`);
        }
      } catch (error) {
        console.error(`❌ Failed to mount ${island.id}:`, error);
      }
    }
  }

  console.log('🎉 Island mounting complete!');
}

/**
 * Extract props from element data attributes
 * @param {Element} element - DOM element
 * @returns {Object} Props object
 */
function extractPropsFromElement(element) {
  const props = {};
  const dataset = element.dataset;

  for (const key in dataset) {
    try {
      // Try to parse JSON values
      props[key] = JSON.parse(dataset[key]);
    } catch {
      // Keep as string if not valid JSON
      props[key] = dataset[key];
    }
  }

  return props;
}

/**
 * Mount a specific island by ID
 * @param {string} islandId - Island element ID
 * @param {string} moduleName - Island module name
 */
export async function mountIsland(islandId, moduleName) {
  const element = document.getElementById(islandId);

  if (!element) {
    console.error(`Element with id "${islandId}" not found`);
    return;
  }

  try {
    const islandModule = await import(`../../../islands/${moduleName}.js`);
    const props = extractPropsFromElement(element);
    const mountFunction = Object.values(islandModule)[0];

    if (typeof mountFunction === 'function') {
      mountFunction(islandId, props);
      console.log(`✅ Mounted ${islandId}`);
    }
  } catch (error) {
    console.error(`❌ Failed to mount ${islandId}:`, error);
  }
}

/**
 * Initialize island mounting on DOM ready
 */
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAllIslands);
  } else {
    // DOM is already loaded
    mountAllIslands();
  }
}
