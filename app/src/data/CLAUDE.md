# Data Directory - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Static content data modules for Split Lease frontend
**OPTIMIZATION**: Semantic Searchability + Digestibility

---

## QUICK_STATS

[TOTAL_FILES]: 1
[PRIMARY_LANGUAGE]: JavaScript
[KEY_PATTERNS]: Static exports, Search utilities, Category navigation

---

## DIRECTORY_INTENT

[PURPOSE]: Static content data for pages that don't require dynamic fetching
[PATTERN]: JavaScript data structures exported as constants
[CONSUMED_BY]: Help Center pages, FAQ pages
[DATA_TYPE]: Help center articles, categories, navigation structures

---

## FILES

### helpCenterData.js
[INTENT]: Provides complete help center content structure with categories, articles, and search functionality
[EXPORTS]: helpCenterCategories (array), helpCenterArticles (object), searchHelpCenter (function), getCategoryBySlug (function), getArticlesByCategory (function)
[DEPENDS_ON]: None (pure data module)
[USED_BY]: HelpCenterPage, HelpCenterCategoryPage
[DATA_SHAPE]: Categories array with metadata, nested articles by category with sections
[SEARCH_CAPABILITY]: Text-based search across all article titles
[CATEGORIES]: guests, hosts, about, support, knowledge-base

---

## DATA_STRUCTURES

### helpCenterCategories
[TYPE]: Array of category objects
[FIELDS]: id, title, description, icon, articleCount, slug
[PURPOSE]: Top-level navigation for help center
[TOTAL_CATEGORIES]: 5

### helpCenterArticles
[TYPE]: Object keyed by category ID
[STRUCTURE]: Each category contains title, description, icon, sections array
[SECTIONS]: Each section contains title and articles array
[ARTICLES]: Each article has id, title, slug, optional external URL
[TOTAL_ARTICLES]: 69+ articles across all categories

---

## EXPORTED_FUNCTIONS

### searchHelpCenter(query)
[INTENT]: Search through all help center content by article title
[PARAMS]: query (string, minimum 2 characters)
[RETURNS]: Array of matching articles with category and section metadata
[ALGORITHM]: Normalized lowercase string matching on article titles

### getCategoryBySlug(slug)
[INTENT]: Find category object by URL slug
[PARAMS]: slug (string)
[RETURNS]: Category object or null
[USE_CASE]: Route-based category lookup

### getArticlesByCategory(categoryId)
[INTENT]: Get all articles and sections for a specific category
[PARAMS]: categoryId (string)
[RETURNS]: Category articles object or null
[USE_CASE]: Category page rendering

---

## CATEGORY_BREAKDOWN

### guests (25 articles)
[SECTIONS]: Getting Started, Before You Book, Trial Nights, Booking Process, Pricing & Payments, During Your Stay
[TARGET_AUDIENCE]: Renters looking for Split Lease properties
[KEY_TOPICS]: What is Split Lease, booking process, pricing, trial nights, storage

### hosts (20 articles)
[SECTIONS]: Getting Started with Split Lease, Listing Your Space, Legal Taxes & Agreements, Managing Bookings & Guests, Listing Management
[TARGET_AUDIENCE]: Property owners listing spaces
[KEY_TOPICS]: Costs, fees, rental licenses, lease agreements, tenant rights, payments

### about (7 articles)
[SECTIONS]: About Us, Blog Posts
[TARGET_AUDIENCE]: Users wanting to learn about Split Lease
[KEY_TOPICS]: Company mission, blog content, external links to knowledge base
[SPECIAL_FEATURE]: infoBoxes array with mission statement

### support (2 articles)
[SECTIONS]: Policies & Legal
[TARGET_AUDIENCE]: Users seeking legal information
[KEY_TOPICS]: Terms of Use, Privacy Policy
[EXTERNAL_LINKS]: Links to /policies page

### knowledge-base (15 articles)
[SECTIONS]: Airbnb vs Split Lease, Hybrid Work & Commuting, Success Stories, Family & Lifestyle, Platform Insights, Legal & Rental Fees
[TARGET_AUDIENCE]: Users researching hybrid work solutions
[KEY_TOPICS]: Platform comparisons, hybrid work guides, success stories, safety

---

## USAGE_PATTERNS

### Import Examples
```javascript
// Import all exports
import {
  helpCenterCategories,
  helpCenterArticles,
  searchHelpCenter,
  getCategoryBySlug,
  getArticlesByCategory
} from 'data/helpCenterData'

// Get category for navigation
const guestCategory = getCategoryBySlug('guests')

// Get articles for rendering
const guestArticles = getArticlesByCategory('guests')

// Search functionality
const results = searchHelpCenter('booking')
```

### Common Operations
[CATEGORY_NAVIGATION]: Use helpCenterCategories for homepage grid
[ARTICLE_RENDERING]: Use getArticlesByCategory(categoryId) for category pages
[SEARCH]: Use searchHelpCenter(query) for search results
[ROUTING]: Use getCategoryBySlug(slug) for URL-based category lookup

---

## ARTICLE_METADATA

[ID]: Unique identifier for article (kebab-case)
[TITLE]: Display title for article
[SLUG]: URL-friendly slug for routing
[EXTERNAL]: Optional external URL (for blog posts on separate pages)
[CATEGORY_ID]: Parent category identifier
[SECTION_TITLE]: Section within category

---

## DESIGN_PATTERNS

[PATTERN]: Static data module with pure exports
[NO_SIDE_EFFECTS]: No API calls, no state, no DOM manipulation
[TREE_SHAKABLE]: Named exports allow selective importing
[TYPE_SAFETY]: Consistent object shapes for categories and articles
[SEARCH_OPTIMIZATION]: Normalized string matching for fuzzy search

---

## MAINTENANCE_NOTES

[ADD_CATEGORY]: Add to helpCenterCategories array and helpCenterArticles object
[ADD_ARTICLE]: Add to appropriate sections array in helpCenterArticles
[UPDATE_COUNTS]: Manually update articleCount in helpCenterCategories when adding/removing articles
[EXTERNAL_LINKS]: Use external field for articles hosted on separate HTML pages
[ICONS]: Icon names reference Lucide icon library (User, Users, Info, LifeBuoy, BookOpen)

---

## RELATED_FILES

[PAGES]: app/src/islands/pages/HelpCenterPage.jsx
[PAGES]: app/src/islands/pages/HelpCenterCategoryPage.jsx
[ROUTES]: app/help-center.jsx (entry point)
[ROUTES]: app/help-center-category.jsx (entry point)

---

**VERSION**: 1.0
**LAST_UPDATED**: 2025-12-11
