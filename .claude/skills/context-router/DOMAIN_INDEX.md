# Domain Index

This file maps problem domains to their authoritative documentation files.

---

## Pages Domain

When a task affects a specific page, load its documentation:

| Page | Primary Doc | Secondary Docs |
|------|-------------|----------------|
| Listing Dashboard | `Pages/LISTING_DASHBOARD_PAGE_CONTEXT.md` | `Pages/LISTING_DASHBOARD_QUICK_REFERENCE.md` |
| Search | `Pages/SEARCH_QUICK_REFERENCE.md` | |
| View Split Lease | `Pages/VIEW_SPLIT_LEASE_QUICK_REFERENCE.md` | |
| Guest Proposals | `Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md` | |
| Self Listing | `Pages/SELF_LISTING_QUICK_REFERENCE.md` | |
| Rental Application | `Pages/RENTAL_APPLICATION_QUICK_REFERENCE.md` | |
| Messaging | `Pages/MESSAGING_PAGE_REFERENCE.md` | |
| Account Profile | `Pages/ACCOUNT_PROFILE_QUICK_REFERENCE.md` | |
| Favorite Listings | `Pages/FAVORITE_LISTINGS_QUICK_REFERENCE.md` | |
| Host Overview | `Pages/HOST_OVERVIEW_QUICK_REFERENCE.md` | |
| Home | `Pages/HOME_QUICK_REFERENCE.md` | |
| FAQ | `Pages/FAQ_QUICK_REFERENCE.md` | |
| Help Center | `Pages/HELP_CENTER_QUICK_REFERENCE.md` | |
| 404 (Not Found) | `Pages/404_QUICK_REFERENCE.md` | |
| About Us | `Pages/ABOUT_US_QUICK_REFERENCE.md` | |
| Careers | `Pages/CAREERS_QUICK_REFERENCE.md` | |
| Guest Success | `Pages/GUEST_SUCCESS_QUICK_REFERENCE.md` | |
| Host Success | `Pages/HOST_SUCCESS_QUICK_REFERENCE.md` | |
| Index Dev | `Pages/INDEX_DEV_QUICK_REFERENCE.md` | |
| List With Us | `Pages/LIST_WITH_US_QUICK_REFERENCE.md` | |
| Policies | `Pages/POLICIES_QUICK_REFERENCE.md` | |
| Search Test | `Pages/SEARCH_TEST_QUICK_REFERENCE.md` | |
| Why Split Lease | `Pages/WHY_SPLIT_LEASE_QUICK_REFERENCE.md` | |

---

## Backend Domain (Edge Functions)

When a task affects an Edge Function, load its documentation:

| Function | Primary Doc | Related Docs |
|----------|-------------|--------------|
| listing | `Backend(EDGE - Functions)/LISTING.md` | `Database/REFERENCE_TABLES_FK_FIELDS.md` |
| proposal | `Backend(EDGE - Functions)/PROPOSAL.md` | `Backend(EDGE - Functions)/BUBBLE_SYNC.md` |
| auth-user | `Backend(EDGE - Functions)/AUTH_USER.md` | `Auth/AUTH_GUIDE.md` |
| bubble-proxy | `Backend(EDGE - Functions)/BUBBLE_PROXY.md` | |
| bubble_sync | `Backend(EDGE - Functions)/BUBBLE_SYNC.md` | |
| ai-gateway | `Backend(EDGE - Functions)/AI_GATEWAY.md` | |
| messages | (needs documentation) | |
| Shared utilities | `Backend(EDGE - Functions)/SHARED_UTILITIES.md` | |

**Always load**: `Backend(EDGE - Functions)/QUICK_REFERENCE.md` for any Edge Function work.

---

## Database Domain

When a task affects database operations:

| Concern | Primary Doc | Secondary Docs |
|---------|-------------|----------------|
| Table schemas | `Database/DATABASE_TABLES_DETAILED.md` | |
| FK constraints | `Database/REFERENCE_TABLES_FK_FIELDS.md` | |
| Relations | `Database/DATABASE_RELATIONS.md` | |
| Junction tables | `Database/JUNCTIONS_SCHEMA_CONVENTION.md` | |
| Option sets | `Database/OPTION_SETS_DETAILED.md` | `Database/DATABASE_OPTION_SETS_QUICK_REFERENCE.md` |

---

## Auth Domain

When a task affects authentication:

| Flow | Primary Doc | Secondary Docs |
|------|-------------|----------------|
| Login | `Auth/LOGIN_FLOW.md` | `Auth/AUTH_GUIDE.md` |
| Signup | `Auth/SIGNUP_FLOW.md` | `Auth/AUTH_GUIDE.md` |
| General auth | `Auth/AUTH_GUIDE.md` | `Backend(EDGE - Functions)/AUTH_USER.md` |

---

## Architecture Domain

When a task affects architecture patterns:

| Pattern | Primary Doc |
|---------|-------------|
| Islands architecture | `Architecture/ARCHITECTURE_GUIDE_ESM_REACT_ISLAND.md` |
| Directory structure | `Architecture/DIRECTORY_STRUCTURE.md` |
| Routing | `Routing/ROUTING_GUIDE.md` |

---

## External Integrations

| Integration | Primary Doc |
|-------------|-------------|
| Google Maps | `External/GOOGLE_MAPS_API_IMPLEMENTATION.md` |
| Hotjar | `External/HOTJAR_IMPLEMENTATION.md` |
| Email/SMS | `Backend(EDGE - Functions)/Endpoints/SEND_EMAIL_USAGE.md`, `SEND_SMS_USAGE.md` |

---

## TODO(human): Add Cross-Domain Mappings

Some tasks span multiple domains. Add common task patterns and their required documentation bundles:

Example format:
```
### Task Pattern: [Pattern Name]
**Trigger keywords**: keyword1, keyword2, keyword3
**Required docs**:
- doc1.md (reason)
- doc2.md (reason)
- doc3.md (reason)
```

YOUR CROSS-DOMAIN MAPPINGS HERE:

<!--
Consider adding patterns like:
- "Create new listing field" → listing.md + DATABASE_TABLES + FK_FIELDS
- "Add proposal status" → proposal.md + OPTION_SETS + BUBBLE_SYNC
- "New page creation" → ROUTING_GUIDE + ARCHITECTURE_GUIDE + page template
-->
