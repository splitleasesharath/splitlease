/**
 * ProposalMenu island mount point
 * Mounts the ProposalMenu component into the DOM at specified element
 */

import { createRoot } from 'react-dom/client';
import { ProposalMenu } from '../components/src/ProposalMenu';
import type { ProposalMenuProps } from '../types/components';

/**
 * Mount ProposalMenu component into DOM element
 * @param elementId - ID of the element to mount into
 * @param props - ProposalMenu component props
 */
export function mountProposalMenu(elementId: string, props: ProposalMenuProps): void {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  const root = createRoot(element);
  root.render(<ProposalMenu {...props} />);
}

/**
 * Auto-mount ProposalMenu if element exists on page load
 */
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const proposalElement = document.getElementById('proposal-menu-island');
    if (proposalElement) {
      // Extract props from data attributes
      const listingData = proposalElement.dataset.listing;
      const isAuthenticated = proposalElement.dataset.authenticated === 'true';
      const userId = proposalElement.dataset.userId;

      if (!listingData) {
        console.error('Listing data is required for ProposalMenu');
        return;
      }

      try {
        const listing = JSON.parse(listingData);

        mountProposalMenu('proposal-menu-island', {
          listing,
          isAuthenticated,
          userId,
          onSubmitProposal: (proposal) => {
            // Dispatch custom event for listening in vanilla JS
            const event = new CustomEvent('proposalSubmit', {
              detail: proposal,
              bubbles: true,
            });
            proposalElement.dispatchEvent(event);
          },
        });
      } catch (error) {
        console.error('Failed to parse listing data:', error);
      }
    }
  });
}
