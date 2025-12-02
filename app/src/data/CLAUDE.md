# Data - Static Content Data

**GENERATED**: 2025-11-26
**PARENT**: app/src/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Static content data for pages that don't require dynamic fetching
[PATTERN]: JavaScript data structures exported as constants

---

## ### FILE_INVENTORY ###

### helpCenterData.js
[INTENT]: Help center content structure with categories, articles, and navigation
[EXPORTS]: helpCenterCategories, helpCenterArticles
[CONSUMED_BY]: HelpCenterPage, HelpCenterCategoryPage

---

## ### DATA_SHAPE ###

```javascript
helpCenterCategories = [
  {
    id: 'guests',
    title: 'For Guests',
    description: 'Help for renters',
    subcategories: [
      { id: 'getting-started', title: 'Getting Started' },
      { id: 'booking', title: 'Booking' },
      ...
    ]
  },
  ...
]

helpCenterArticles = [
  {
    id: 'how-to-book',
    categoryId: 'guests',
    subcategoryId: 'booking',
    title: 'How to Book',
    content: '...'
  },
  ...
]
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { helpCenterCategories, helpCenterArticles } from 'data/helpCenterData'
[FILTERING]: Filter articles by categoryId/subcategoryId for display

---

**FILE_COUNT**: 1
