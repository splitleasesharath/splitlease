export const PRICE_TIERS = Object.freeze({
  UNDER_200: 'under-200',
  TIER_200_350: '200-350',
  TIER_350_500: '350-500',
  OVER_500: '500-plus',
  ALL: 'all'
});

export const VALID_PRICE_TIERS = Object.freeze(Object.values(PRICE_TIERS));

export const SORT_OPTIONS = Object.freeze({
  RECOMMENDED: 'recommended',
  PRICE_LOW: 'price-low',
  MOST_VIEWED: 'most-viewed',
  RECENT: 'recent'
});

export const VALID_SORT_OPTIONS = Object.freeze(Object.values(SORT_OPTIONS));

export const WEEK_PATTERNS = Object.freeze({
  EVERY_WEEK: 'every-week',
  ONE_ON_OFF: 'one-on-off',
  TWO_ON_OFF: 'two-on-off',
  ONE_THREE_OFF: 'one-three-off'
});

export const VALID_WEEK_PATTERNS = Object.freeze(Object.values(WEEK_PATTERNS));
