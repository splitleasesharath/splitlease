import { useState, useEffect } from 'react';
import { initializeLookups, isInitialized } from '../lib/dataLookups.js';

/**
 * Hook to ensure data lookups are initialized before rendering
 * Returns true when lookups are ready, false while loading
 *
 * @returns {boolean} Whether lookups are initialized and ready
 *
 * @app\.env.example
 * function SearchPage() {
 *   const lookupsReady = useDataLookups();
 *   if (!lookupsReady) return <LoadingSpinner />;
 *   // ... rest of component
 * }
 */
export function useDataLookups() {
  const [isReady, setIsReady] = useState(isInitialized());

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!isInitialized()) {
        // Use logger after CHUNK 3 is implemented
        console.log('Initializing data lookups...');
        await initializeLookups();
        if (mounted) {
          setIsReady(true);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  return isReady;
}

export default useDataLookups;
