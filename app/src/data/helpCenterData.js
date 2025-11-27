/**
 * Help Center Data
 * Contains all categories, articles, and content for the help center
 */

export const helpCenterCategories = [
  {
    id: 'guests',
    title: 'For Guests',
    description: 'Complete guide for finding spaces, booking, pricing, and managing your Split Lease rental',
    icon: 'User',
    articleCount: 25,
    slug: 'guests'
  },
  {
    id: 'hosts',
    title: 'For Hosts',
    description: 'Information for property owners: how to list your space, manage bookings, and maximize your earnings',
    icon: 'Users',
    articleCount: 20,
    slug: 'hosts'
  },
  {
    id: 'about',
    title: 'About Split Lease',
    description: 'Learn about Split Lease, our mission, and how to contact us',
    icon: 'Info',
    articleCount: 2,
    slug: 'about'
  },
  {
    id: 'support',
    title: 'Support',
    description: 'Legal policies, terms of use, and support resources',
    icon: 'LifeBuoy',
    articleCount: 2,
    slug: 'support'
  },
  {
    id: 'knowledge-base',
    title: 'Knowledge Base',
    description: 'In-depth articles, guides, and stories about hybrid work and multi-local living',
    icon: 'BookOpen',
    articleCount: 15,
    slug: 'knowledge-base'
  }
];

export const helpCenterArticles = {
  guests: {
    title: 'For Guests',
    description: 'Complete guide for finding spaces, booking, pricing, and managing your Split Lease rental',
    icon: 'User',
    sections: [
      {
        title: 'Getting Started',
        articles: [
          { id: 'what-is-split-lease', title: 'What is Split Lease and what do you do?', slug: 'getting-started/what-is-split-lease' },
          { id: 'who-benefits', title: 'Who would benefit most from Split Lease?', slug: 'getting-started/who-benefits' },
          { id: 'how-to-get-started', title: "What's the easiest way to get started?", slug: 'getting-started/how-to-get-started' },
          { id: 'do-i-need-work-travel', title: 'Do I have to travel for work in order to use Split Lease?', slug: 'getting-started/do-i-need-work-travel' },
          { id: 'hybrid-worker-benefits', title: 'How do I benefit as a hybrid-work-commuter?', slug: 'getting-started/hybrid-worker-benefits' },
          { id: 'vs-airbnb', title: 'How is Split Lease different from Airbnb?', slug: 'getting-started/vs-airbnb' }
        ]
      },
      {
        title: 'Before You Book',
        articles: [
          { id: 'market-report', title: 'How can I get a market report?', slug: 'before-booking/market-report' },
          { id: 'customize-space', title: 'Can I customize my space? Rearrange furniture? Bring a monitor?', slug: 'before-booking/customize-space' },
          { id: 'contact-host', title: 'Can I contact the host to get more information?', slug: 'before-booking/contact-host' },
          { id: 'express-interest', title: 'Can I express interest without booking?', slug: 'before-booking/express-interest' },
          { id: 'store-things', title: 'Can I store my things at my Split Lease?', slug: 'before-booking/store-things' },
          { id: 'what-to-store', title: 'What things can I store at my rental?', slug: 'before-booking/what-to-store' },
          { id: 'verify-host', title: 'How does your site help me verify the host before booking?', slug: 'before-booking/verify-host' }
        ]
      },
      {
        title: 'Trial Nights',
        articles: [
          { id: 'trial-who-benefits', title: 'What kinds of people benefit most from trial nights?', slug: 'trial-nights/who-benefits' },
          { id: 'trial-how-it-works', title: 'How does a trial night work?', slug: 'trial-nights/how-it-works' },
          { id: 'trial-why', title: 'Why would I want/need a trial night?', slug: 'trial-nights/why-trial' },
          { id: 'trial-key-benefits', title: 'What are the key benefits?', slug: 'trial-nights/key-benefits' }
        ]
      },
      {
        title: 'Booking Process',
        articles: [
          { id: 'best-price', title: 'What are ways to get the best price and most available spaces?', slug: 'booking/best-price' },
          { id: 'approval-time', title: 'How long does a host have to approve my booking request?', slug: 'booking/approval-time' },
          { id: 'booking-timeline', title: 'How long does it take from interest to booking?', slug: 'booking/booking-timeline' },
          { id: 'periodic-tenancy', title: 'What is Periodic Tenancy?', slug: 'booking/periodic-tenancy' },
          { id: 'money-back-guarantee', title: 'What is the catch with the money-back guarantee?', slug: 'booking/money-back-guarantee' }
        ]
      },
      {
        title: 'Pricing & Payments',
        articles: [
          { id: 'save-money', title: 'How are you saving me money?', slug: 'pricing/save-money' },
          { id: 'credit-card-approval', title: "What if I can't get approved for a credit card?", slug: 'pricing/credit-card-approval' }
        ]
      },
      {
        title: 'During Your Stay',
        articles: [
          { id: 'self-cleaning', title: 'How can I save money with self cleaning?', slug: 'during-stay/self-cleaning' },
          { id: 'cancel-stay', title: 'What happens if I want to cancel during my stay?', slug: 'during-stay/cancel-stay' },
          { id: 'not-meeting-expectations', title: "What if the place doesn't meet my expectations?", slug: 'during-stay/not-meeting-expectations' }
        ]
      }
    ]
  },
  hosts: {
    title: 'For Hosts',
    description: 'Information for property owners: how to list your space, manage bookings, and maximize your earnings',
    icon: 'Users',
    sections: [
      {
        title: 'Getting Started with Split Lease',
        articles: [
          { id: 'listing-costs', title: 'What are the costs of listing my place on your site?', slug: 'getting-started/listing-costs' },
          { id: 'host-fees', title: 'What fees are there for hosts?', slug: 'getting-started/host-fees' },
          { id: 'rental-license', title: 'Can I list without a short-term rental license?', slug: 'getting-started/rental-license' },
          { id: 'advantages', title: 'What are the advantages to hosting the same guests part of the week?', slug: 'getting-started/advantages' }
        ]
      },
      {
        title: 'Listing Your Space',
        articles: [
          { id: 'multiple-properties', title: 'Can I list more than one property/room?', slug: 'listing/multiple-properties' },
          { id: 'live-in-listing', title: 'Can I list my place if I live in it and just have extra space?', slug: 'listing/live-in-listing' },
          { id: 'public-information', title: 'What information about my place is publicly visible?', slug: 'listing/public-information' },
          { id: 'storage-area', title: 'Do I have to provide a storage area for a guest?', slug: 'listing/storage-area' },
          { id: 'damage-deposit', title: 'Can I set my damage deposit later?', slug: 'listing/damage-deposit' }
        ]
      },
      {
        title: 'Legal, Taxes & Agreements',
        articles: [
          { id: 'legal-responsibilities', title: 'Is there an easy way to understand my legal responsibilities?', slug: 'legal/legal-responsibilities' },
          { id: 'tax-benefits', title: 'How is my rental profit not taxable?', slug: 'legal/tax-benefits' },
          { id: 'lease-agreements', title: 'How is Split Lease involved in lease agreements?', slug: 'legal/lease-agreements' },
          { id: 'tenant-rights', title: "I am worried about my guest gaining tenant's rights. What are my protections?", slug: 'legal/tenant-rights' }
        ]
      },
      {
        title: 'Managing Bookings & Guests',
        articles: [
          { id: 'see-renters', title: 'Will I be able to see who wants to rent my place?', slug: 'managing/see-renters' },
          { id: 'notifications', title: 'How will I be notified when a traveler has a question?', slug: 'managing/notifications' },
          { id: 'verify-traveler', title: 'How can I make sure the traveler is who they say they are?', slug: 'managing/verify-traveler' },
          { id: 'payments', title: 'How will I receive payment after booking?', slug: 'managing/payments' }
        ]
      },
      {
        title: 'Listing Management',
        articles: [
          { id: 'update-listing', title: 'How can I update/manage my listing after it is live?', slug: 'management/update-listing' },
          { id: 'listing-visibility', title: 'How does Split Lease decide which listings to show?', slug: 'management/listing-visibility' },
          { id: 'cancellation-policy', title: 'What does the cancellation policy look like?', slug: 'management/cancellation-policy' }
        ]
      }
    ]
  },
  about: {
    title: 'About Split Lease',
    description: 'Learn about Split Lease, our mission, and how to contact us',
    icon: 'Info',
    sections: [
      {
        title: 'About Us',
        articles: [
          { id: 'about-what-is', title: 'What is Split Lease and what do you do?', slug: 'what-is-split-lease' }
        ]
      },
      {
        title: 'Blog Posts',
        articles: [
          { id: 'craigslist-female-safety', title: "Hybrid worker homes are available on Craigslist, but if you're female read this first", slug: 'craigslist-female-safety', external: '/help-center-articles/knowledge-base/craigslist-female-safety.html' }
        ]
      }
    ],
    infoBoxes: [
      {
        type: 'success',
        icon: 'Heart',
        title: 'Our Mission',
        content: "Split Lease connects repeat guests with repeat rentals. We help multi-locals find, negotiate, and manage relationships in secondary addresses, like pied-a-terres. We're building a market network for recurring travel and multi-locality living."
      }
    ]
  },
  support: {
    title: 'Support',
    description: 'Legal policies, terms of use, and support resources',
    icon: 'LifeBuoy',
    sections: [
      {
        title: 'Policies & Legal',
        articles: [
          { id: 'terms-of-use', title: 'Terms of Use', slug: 'terms-of-use', external: 'https://split.lease/policies#terms-of-use' },
          { id: 'privacy-policy', title: 'Privacy Policy', slug: 'privacy-policy', external: 'https://split.lease/policies' }
        ]
      }
    ]
  },
  'knowledge-base': {
    title: 'Knowledge Base',
    description: 'In-depth articles, guides, and stories about hybrid work and multi-local living',
    icon: 'BookOpen',
    sections: [
      {
        title: 'Airbnb vs. Split Lease',
        articles: [
          { id: 'airbnb-vs-split-lease', title: 'Airbnb vs. Split Lease: Why Split Lease is the Better Solution for Hybrid Work Rentals', slug: 'airbnb-vs-split-lease' },
          { id: 'host-guide-airbnb-vs-split-lease', title: "Split Lease vs. Airbnb: A Host's Guide to Choosing the Right Platform", slug: 'host-guide-airbnb-vs-split-lease' },
          { id: 'why-airbnb-terrible-hybrid-workers', title: 'Why Airbnb is Terrible for Hybrid Workers', slug: 'why-airbnb-terrible-hybrid-workers' }
        ]
      },
      {
        title: 'Hybrid Work & Commuting',
        articles: [
          { id: 'commuting-winter', title: 'Commuting by car? Is it worth it in the winter?', slug: 'commuting-winter' },
          { id: 'live-anywhere-show-up-work', title: 'Good with computers? Live anywhere and show up for in-person work', slug: 'live-anywhere-show-up-work' },
          { id: 'month-to-month-losers', title: 'Losers Rent Month-to-Month, Winners Do This', slug: 'month-to-month-losers' }
        ]
      },
      {
        title: 'Success Stories',
        articles: [
          { id: 'brad-45-percent-off', title: 'Brad gets 45% off Airbnb Price', slug: 'brad-45-percent-off' },
          { id: 'two-homes-rich-people', title: 'I Thought Having Two Homes was for Rich People', slug: 'two-homes-rich-people' }
        ]
      },
      {
        title: 'Family & Lifestyle',
        articles: [
          { id: 'grandkids-two-places', title: "Need a place by your grandkids? Here's how you can avoid maintaining two places", slug: 'grandkids-two-places' },
          { id: 'craigslist-female-safety', title: "Hybrid worker homes are available on Craigslist, but if you're female read this first", slug: 'craigslist-female-safety' }
        ]
      },
      {
        title: 'Platform Insights',
        articles: [
          { id: 'why-not-download-ios-app', title: "Why you shouldn't download our iOS app", slug: 'why-not-download-ios-app' }
        ]
      },
      {
        title: 'Legal & Rental Fees',
        articles: [
          { id: 'landlord-application-fees', title: 'How Much Can Landlords Charge for Application Fees?', slug: 'landlord-application-fees' },
          { id: 'fee-vs-no-fee-apartments', title: "What's the Difference Between Fee and No-Fee Apartments?", slug: 'fee-vs-no-fee-apartments' }
        ]
      }
    ]
  }
};

/**
 * Search through all help center content
 * @param {string} query - Search query
 * @returns {Array} - Array of matching articles
 */
export function searchHelpCenter(query) {
  if (!query || query.trim().length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const results = [];

  Object.entries(helpCenterArticles).forEach(([categoryId, category]) => {
    category.sections.forEach(section => {
      section.articles.forEach(article => {
        const titleMatch = article.title.toLowerCase().includes(normalizedQuery);
        if (titleMatch) {
          results.push({
            ...article,
            categoryId,
            categoryTitle: category.title,
            sectionTitle: section.title
          });
        }
      });
    });
  });

  return results;
}

/**
 * Get category by slug
 * @param {string} slug - Category slug
 * @returns {Object|null} - Category object or null
 */
export function getCategoryBySlug(slug) {
  return helpCenterCategories.find(cat => cat.slug === slug) || null;
}

/**
 * Get articles for a category
 * @param {string} categoryId - Category ID
 * @returns {Object|null} - Category articles or null
 */
export function getArticlesByCategory(categoryId) {
  return helpCenterArticles[categoryId] || null;
}
