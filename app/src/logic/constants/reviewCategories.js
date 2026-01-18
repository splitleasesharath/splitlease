/**
 * Review category constants.
 * Defines the 12 behavioral dimensions for guest reviews.
 */

export const REVIEW_CATEGORY_COUNT = 12;

export const REVIEW_CATEGORIES = [
  {
    id: 'check_in_out',
    title: 'Check-in/Check-out Etiquette',
    question: 'How well did the guest respect check-in and check-out times?'
  },
  {
    id: 'communication',
    title: 'Communication',
    question: 'How responsive and clear was the guest in communication?'
  },
  {
    id: 'cleanliness',
    title: 'Cleanliness',
    question: 'How clean was the property left after the stay?'
  },
  {
    id: 'payment',
    title: 'Payment Reliability',
    question: 'How reliable was the guest with payments?'
  },
  {
    id: 'house_rules',
    title: 'House Rules Compliance',
    question: 'How well did the guest follow house rules?'
  },
  {
    id: 'noise',
    title: 'Noise Consideration',
    question: 'How considerate was the guest regarding noise levels?'
  },
  {
    id: 'amenity_usage',
    title: 'Amenity Usage',
    question: 'How responsibly did the guest use amenities?'
  },
  {
    id: 'trash',
    title: 'Trash & Recycling',
    question: 'How well did the guest handle trash and recycling?'
  },
  {
    id: 'neighbor_respect',
    title: 'Neighbor Respect',
    question: 'How respectful was the guest to neighbors?'
  },
  {
    id: 'property_care',
    title: 'Property Care',
    question: 'How well did the guest care for the property?'
  },
  {
    id: 'guest_behavior',
    title: 'Guest Behavior',
    question: 'How appropriate was the guest\'s overall behavior?'
  },
  {
    id: 'recommendation',
    title: 'Would Recommend',
    question: 'Would you recommend this guest to other hosts?'
  }
];

export const RATING_SCALE_LABELS = [
  '', // Index 0 unused
  'Very poor',
  'Poor',
  'Average',
  'Good',
  'Excellent'
];
