// Mount Islands for View Split Lease Page

(function() {
  'use strict';

  // Wait for React, ReactDOM, and components to be available
  function waitForDependencies(callback) {
    if (
      typeof React !== 'undefined' &&
      typeof ReactDOM !== 'undefined' &&
      typeof SplitLeaseComponents !== 'undefined'
    ) {
      callback();
    } else {
      setTimeout(() => waitForDependencies(callback), 50);
    }
  }

  function mountIslands() {
    const { ListingImageGrid, ProposalMenu } = SplitLeaseComponents;

    // Sample image data
    const sampleImages = [
      {
        url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
        alt: 'Modern living room with furniture',
        thumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop'
      },
      {
        url: 'https://images.unsplash.com/photo-1556912167-f556f1f39faa?w=800&h=600&fit=crop',
        alt: 'Spacious bedroom with bed',
        thumbnail: 'https://images.unsplash.com/photo-1556912167-f556f1f39faa?w=400&h=300&fit=crop'
      },
      {
        url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
        alt: 'Modern kitchen area',
        thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop'
      },
      {
        url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&h=600&fit=crop',
        alt: 'Clean bathroom',
        thumbnail: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=300&fit=crop'
      }
    ];

    // Mount ListingImageGrid
    const imageGridRoot = document.getElementById('listing-images');
    if (imageGridRoot) {
      const imageGridReactRoot = ReactDOM.createRoot(imageGridRoot);
      imageGridReactRoot.render(
        React.createElement(ListingImageGrid, {
          images: sampleImages,
          onImageClick: (image, index) => {
            console.log('Image clicked:', index, image);
          }
        })
      );
      console.log('ListingImageGrid mounted successfully');
    } else {
      console.error('ListingImageGrid mount point not found');
    }

    // Mount ProposalMenu
    const proposalMenuRoot = document.getElementById('proposal-menu');
    if (proposalMenuRoot) {
      const proposalMenuReactRoot = ReactDOM.createRoot(proposalMenuRoot);
      proposalMenuReactRoot.render(
        React.createElement(ProposalMenu, {
          pricing: {
            perNight: 434.07
          },
          hostPreferences: {
            minWeeks: 6,
            maxWeeks: 26,
            idealDays: 3
          },
          initialMoveInDate: '11/10/2025',
          initialSelectedDays: [1, 2, 3, 4], // Monday through Thursday
          initialReservationSpan: 20,
          onProposalChange: (proposal) => {
            console.log('Proposal changed:', proposal);
          }
        })
      );
      console.log('ProposalMenu mounted successfully');
    } else {
      console.error('ProposalMenu mount point not found');
    }
  }

  // Wait for dependencies and mount
  waitForDependencies(mountIslands);
})();
