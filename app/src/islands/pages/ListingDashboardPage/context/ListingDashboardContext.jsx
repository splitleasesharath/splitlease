import { createContext, useContext } from 'react';
import useListingDashboardPageLogic from '../useListingDashboardPageLogic.js';

const ListingDashboardContext = createContext(null);

export function ListingDashboardProvider({ children }) {
  const logic = useListingDashboardPageLogic();
  return (
    <ListingDashboardContext.Provider value={logic}>
      {children}
    </ListingDashboardContext.Provider>
  );
}

export function useListingDashboard() {
  const context = useContext(ListingDashboardContext);
  if (!context) {
    throw new Error('useListingDashboard must be used within ListingDashboardProvider');
  }
  return context;
}
