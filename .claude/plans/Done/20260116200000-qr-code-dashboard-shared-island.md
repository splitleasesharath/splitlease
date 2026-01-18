# QR Code Dashboard - Shared Island Component Implementation Plan

**Date:** 2026-01-16
**Type:** Feature Implementation (BUILD)
**Estimated Complexity:** Medium-High
**Source Repository:** https://github.com/splitleasesharath/qr-code-dashboard

---

## Executive Summary

This plan details the implementation of a QR Code Dashboard shared island component by adapting the external repository to Split Lease's architecture patterns, database schema, and code conventions.

---

## Part 1: Analysis of Source Repository

### 1.1 Repository Structure

```
src/
├── components/
│   ├── QRCodeDashboard.tsx    # Main container (state management)
│   ├── QRCodeGrid.tsx         # Grid display of QR codes
│   ├── QRCodeForm.tsx         # Create/Edit form with live preview
│   ├── PrintPreview.tsx       # Print preview with batch selection
│   └── Toast.tsx              # Notification system
├── types/
│   └── qrcode.types.ts        # TypeScript interfaces
├── styles/
│   └── *.css                  # Component stylesheets
├── App.tsx
└── main.tsx
```

### 1.2 Source Type Definitions

```typescript
// From repository
interface QRCode {
  id: string;
  title: string;
  content: string;           // URL/text to encode
  useCaseId: string;
  useCaseName: string;
  houseManualId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UseCase {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface HouseManual {
  id: string;
  name: string;
  propertyAddress: string;
  qrCodes: QRCode[];
}

type DashboardMode = 'view' | 'edit' | 'create' | 'preview';
```

### 1.3 Features in Source Repository

| Feature | Description |
|---------|-------------|
| Grid View | 4-column responsive grid displaying QR code cards |
| Multi-select | Checkbox selection for batch operations |
| Create/Edit Form | Form with live QR preview, validation |
| Print Preview | Selected QR codes formatted for printing |
| Use Case System | 8 predefined categories (WiFi, Check-in, etc.) |
| Toast Notifications | User feedback system |

---

## Part 2: Split Lease Database Schema Mapping

### 2.1 Database Tables Involved

| Split Lease Table | Row Count | Relevant Columns |
|-------------------|-----------|------------------|
| `qrcodes` | 177 | `_id`, `Use Case`, `Long URL`, `Short URL`, `QR Image`, `House Manual` |
| `housemanual` | 195 | `_id`, `House manual Name`, `Listing`, `QR Codes` (jsonb) |
| `listing` | 318 | `_id`, `Name`, `House manual` |

### 2.2 Schema Comparison Table

| Repository Field | Split Lease Column | Type | Transformation Required |
|------------------|-------------------|------|------------------------|
| `id` | `_id` | text | Direct mapping (Bubble ID format) |
| `title` | `Use Case` | text | Maps to use case name |
| `content` | `Long URL` | text | Direct mapping |
| `useCaseId` | N/A | - | **Not stored** - derive from `Use Case` |
| `useCaseName` | `Use Case` | text | Direct mapping |
| `houseManualId` | `House Manual` | text | FK reference |
| `createdAt` | `Created Date` | timestamptz | Direct mapping |
| `updatedAt` | `Modified Date` | timestamptz | Direct mapping |
| N/A | `Short URL` | text | **Additional** - pythonanywhere shortener |
| N/A | `QR Image` | text | **Additional** - CDN URL to image |
| N/A | `Host` | text | **Additional** - host user reference |
| N/A | `Guest` | text | **Additional** - guest user reference |

### 2.3 Use Case Mapping

**Repository Use Cases (predefined):**
```javascript
const USE_CASES = [
  { id: 'wifi', name: 'WiFi Connection', description: '...', category: 'Connectivity' },
  { id: 'house-rules', name: 'House Rules', description: '...', category: 'Guidelines' },
  { id: 'emergency', name: 'Emergency Info', description: '...', category: 'Safety' },
  { id: 'check-in', name: 'Check-In Instructions', description: '...', category: 'Arrival' },
  { id: 'recommendations', name: 'Local Recommendations', description: '...', category: 'Exploration' },
  { id: 'appliances', name: 'Appliance Guides', description: '...', category: 'Usage' },
  { id: 'parking', name: 'Parking Instructions', description: '...', category: 'Logistics' },
  { id: 'checkout', name: 'Checkout Checklist', description: '...', category: 'Departure' }
];
```

**Split Lease Database Use Cases (from qrcodes table):**
```
- Check In (20 records)
- Check Out (12 records)
- Entertainment System (6 records)
- Check Out & Review (5 records)
- Emergency Lock Out (4 records)
- Instructions for Kitchen (4 records)
- Instructions for Laundry (4 records)
- Instructions for Trash (3 records)
- Review (2 records)
```

**Mapping Strategy:**
| Repository Use Case | Split Lease `Use Case` Column |
|---------------------|------------------------------|
| WiFi Connection | WiFi (new) |
| House Rules | House Rules (new) |
| Emergency Info | Emergency Lock Out |
| Check-In Instructions | Check In |
| Local Recommendations | Local Recommendations (new) |
| Appliance Guides | Instructions for Kitchen / Instructions for Laundry |
| Parking Instructions | Parking (new) |
| Checkout Checklist | Check Out |

---

## Part 3: Identified Inconsistencies & Required Fixes

### 3.1 TypeScript → JavaScript Conversion

| Issue | Impact | Fix |
|-------|--------|-----|
| `.tsx` extensions | Split Lease uses `.jsx` | Convert all components to `.jsx` |
| Type annotations | Not used in Split Lease | Remove TypeScript types, add PropTypes |
| Interface definitions | N/A in JavaScript | Convert to JSDoc comments |

### 3.2 Component Architecture Inconsistencies

| Repository Pattern | Split Lease Pattern | Adaptation Required |
|-------------------|---------------------|---------------------|
| Single file components | Hollow Components | Extract logic to `useQRCodeDashboardLogic.js` |
| Inline state management | Custom hooks | Create service layer for API calls |
| Direct localStorage | Supabase backend | Replace with Edge Function calls |
| TypeScript Props | PropTypes | Add PropTypes validation |

### 3.3 Styling Inconsistencies

| Issue | Fix |
|-------|-----|
| Separate CSS files per component | Consolidate to `QRCodeDashboard.css` |
| CSS custom properties naming | Align with Split Lease design tokens |
| No dark mode support | Add dark mode variables (optional) |
| Print styles inline | Move to print-specific stylesheet |

### 3.4 Data Flow Inconsistencies

| Repository Approach | Split Lease Approach | Required Change |
|--------------------|----------------------|-----------------|
| Local state only | Database persistence | Add CRUD via `qrcodes` table |
| Generate QR in browser | Server-side generation | Use existing QR infrastructure or browser fallback |
| No URL shortening | `Short URL` field | Integrate pythonanywhere shortener or skip |
| Frontend-only print | Server or client print | Keep client-side printing |

### 3.5 Missing Backend Integration

The repository is frontend-only. Split Lease requires:

1. **Fetch QR codes**: Query `qrcodes` table by `House Manual` ID
2. **Create QR code**: Insert into `qrcodes` with proper FK references
3. **Update QR code**: Update existing row
4. **Delete QR code**: Delete from `qrcodes` (soft delete or hard delete?)
5. **Fetch House Manual**: Get `housemanual` record for context

---

## Part 4: Implementation Architecture

### 4.1 File Structure

```
app/src/islands/shared/QRCodeDashboard/
├── QRCodeDashboard.jsx              # Hollow component (UI only)
├── useQRCodeDashboardLogic.js       # All state & business logic
├── qrCodeDashboardService.js        # API calls (Edge Functions)
├── components/
│   ├── QRCodeGrid.jsx               # Grid display
│   ├── QRCodeCard.jsx               # Single QR card
│   ├── QRCodeForm.jsx               # Create/Edit form
│   └── PrintPreview.jsx             # Print layout
├── QRCodeDashboard.css              # All styles
└── index.js                         # Barrel export
```

### 4.2 Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│ QRCodeDashboard (Hollow)                                        │
│   Props: houseManualId, listingId, isVisible, onClose          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ useQRCodeDashboardLogic                                  │   │
│  │   - qrCodes (state)                                      │   │
│  │   - houseManual (state)                                  │   │
│  │   - mode: 'view' | 'create' | 'edit' | 'preview'        │   │
│  │   - selectedIds: Set<string>                            │   │
│  │   - handleCreate(), handleEdit(), handleDelete()        │   │
│  │   - handleSelect(), handleSelectAll()                   │   │
│  │   - handlePrint()                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ QRCodeGrid       │  │ QRCodeForm       │                   │
│  │  └─ QRCodeCard[] │  │  (live preview)  │                   │
│  └──────────────────┘  └──────────────────┘                   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PrintPreview (conditional, for print mode)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Data Adapter Layer

```javascript
// Adapter: Database row → Component model
const adaptQRCodeFromDB = (row) => ({
  id: row._id,
  title: row['Use Case'] || 'Untitled',
  content: row['Long URL'] || '',
  shortUrl: row['Short URL'] || null,
  qrImageUrl: row['QR Image'] || null,
  useCaseName: row['Use Case'] || '',
  houseManualId: row['House Manual'] || null,
  hostId: row['Host'] || null,
  guestId: row['Guest'] || null,
  createdAt: row['Created Date'],
  updatedAt: row['Modified Date'],
  isScanned: row['QR codes scanned?'] || false
});

// Adapter: Component model → Database row (for create/update)
const adaptQRCodeToDB = (qrCode, houseManualId, hostId) => ({
  'Use Case': qrCode.useCaseName,
  'Long URL': qrCode.content,
  'House Manual': houseManualId,
  'Host': hostId,
  'Modified Date': new Date().toISOString()
});
```

### 4.4 Service Layer

```javascript
// qrCodeDashboardService.js
import { supabase } from '../../../lib/supabase.js';

const qrCodeDashboardService = {
  // Fetch QR codes for a house manual
  async fetchQRCodes(houseManualId) {
    const { data, error } = await supabase
      .from('qrcodes')
      .select('*')
      .eq('House Manual', houseManualId)
      .order('Created Date', { ascending: false });

    if (error) throw error;
    return data.map(adaptQRCodeFromDB);
  },

  // Fetch house manual with listing context
  async fetchHouseManual(houseManualId) {
    const { data, error } = await supabase
      .from('housemanual')
      .select('_id, "House manual Name", "Listing", "Host"')
      .eq('_id', houseManualId)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new QR code
  async createQRCode(qrCode, houseManualId, hostId) {
    const row = adaptQRCodeToDB(qrCode, houseManualId, hostId);
    row['Created Date'] = new Date().toISOString();
    row['Created By'] = hostId;
    row['_id'] = generateBubbleStyleId(); // or let Supabase handle

    const { data, error } = await supabase
      .from('qrcodes')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return adaptQRCodeFromDB(data);
  },

  // Update QR code
  async updateQRCode(qrCodeId, updates) {
    const { data, error } = await supabase
      .from('qrcodes')
      .update({
        'Use Case': updates.useCaseName,
        'Long URL': updates.content,
        'Modified Date': new Date().toISOString()
      })
      .eq('_id', qrCodeId)
      .select()
      .single();

    if (error) throw error;
    return adaptQRCodeFromDB(data);
  },

  // Delete QR code
  async deleteQRCode(qrCodeId) {
    const { error } = await supabase
      .from('qrcodes')
      .delete()
      .eq('_id', qrCodeId);

    if (error) throw error;
    return true;
  }
};

export default qrCodeDashboardService;
```

---

## Part 5: Use Case Configuration

Define use cases as a configuration object (matching both repo and DB values):

```javascript
// config/qrCodeUseCases.js
export const QR_CODE_USE_CASES = [
  {
    id: 'check-in',
    name: 'Check In',
    description: 'Instructions for guest arrival and property access',
    category: 'Arrival',
    icon: 'key'
  },
  {
    id: 'check-out',
    name: 'Check Out',
    description: 'Departure checklist and key return instructions',
    category: 'Departure',
    icon: 'logout'
  },
  {
    id: 'wifi',
    name: 'WiFi Connection',
    description: 'Network name and password for internet access',
    category: 'Connectivity',
    icon: 'wifi'
  },
  {
    id: 'emergency',
    name: 'Emergency Lock Out',
    description: 'Emergency contact and lockout assistance info',
    category: 'Safety',
    icon: 'alert'
  },
  {
    id: 'kitchen',
    name: 'Instructions for Kitchen',
    description: 'How to use kitchen appliances and equipment',
    category: 'Appliances',
    icon: 'kitchen'
  },
  {
    id: 'laundry',
    name: 'Instructions for Laundry',
    description: 'Washer/dryer usage and laundry guidelines',
    category: 'Appliances',
    icon: 'laundry'
  },
  {
    id: 'trash',
    name: 'Instructions for Trash',
    description: 'Garbage disposal and recycling instructions',
    category: 'Guidelines',
    icon: 'trash'
  },
  {
    id: 'entertainment',
    name: 'Entertainment System',
    description: 'TV, streaming, and audio system instructions',
    category: 'Appliances',
    icon: 'tv'
  },
  {
    id: 'review',
    name: 'Review',
    description: 'Link to leave a guest review',
    category: 'Feedback',
    icon: 'star'
  },
  {
    id: 'house-rules',
    name: 'House Rules',
    description: 'Property rules and guest guidelines',
    category: 'Guidelines',
    icon: 'rules'
  },
  {
    id: 'parking',
    name: 'Parking Instructions',
    description: 'Parking location and permit information',
    category: 'Logistics',
    icon: 'car'
  },
  {
    id: 'local',
    name: 'Local Recommendations',
    description: 'Nearby restaurants, attractions, and services',
    category: 'Exploration',
    icon: 'map'
  }
];

export const getUseCaseById = (id) =>
  QR_CODE_USE_CASES.find(uc => uc.id === id);

export const getUseCaseByName = (name) =>
  QR_CODE_USE_CASES.find(uc => uc.name === name);
```

---

## Part 6: Key Implementation Decisions

### 6.1 QR Code Generation

**Option A: Client-side generation (qrcode.react)**
- Pros: No server dependency, instant preview
- Cons: No persistent image URL

**Option B: Server-side generation (existing infrastructure)**
- Pros: Persistent `QR Image` URL, consistent with existing data
- Cons: Requires API call, slight delay

**Decision:** Use **Option A** for preview, with optional server generation on save if CDN URL is needed.

### 6.2 URL Shortening

**Current State:** Some QR codes have `Short URL` via pythonanywhere
**Decision:** Skip URL shortening for initial implementation. Keep `Long URL` as primary. Can add shortening later via Edge Function if needed.

### 6.3 Print Implementation

**Decision:** Keep client-side printing using `react-to-print` library (matching repository approach). No need for server-side PDF generation.

### 6.4 Toast Notifications

**Decision:** Use Split Lease's existing `Toast` component (`useToast` hook) instead of repository's custom Toast.

---

## Part 7: Implementation Steps

### Step 1: Create Directory Structure
```bash
mkdir -p app/src/islands/shared/QRCodeDashboard/components
```

### Step 2: Create Service Layer
- Create `qrCodeDashboardService.js` with CRUD operations
- Add data adapters for DB ↔ component model

### Step 3: Create Logic Hook
- Create `useQRCodeDashboardLogic.js`
- Implement state management, handlers, and API integration
- Follow Hollow Component pattern

### Step 4: Create Sub-Components
- `QRCodeGrid.jsx` - Grid layout with selection
- `QRCodeCard.jsx` - Individual card with actions
- `QRCodeForm.jsx` - Create/Edit form with live preview
- `PrintPreview.jsx` - Print-optimized layout

### Step 5: Create Main Component
- `QRCodeDashboard.jsx` - Hollow component, UI only
- Wire up logic hook
- Add PropTypes validation

### Step 6: Create Styles
- `QRCodeDashboard.css` - All styles in one file
- Align with Split Lease design tokens

### Step 7: Install Dependencies
```bash
cd app && bun add qrcode.react react-to-print
```

### Step 8: Integration Points
- Integrate with ListingDashboardPage (if needed)
- Add route if standalone page required
- Connect to House Manual context

---

## Part 8: Props Interface

```javascript
// QRCodeDashboard.jsx
QRCodeDashboard.propTypes = {
  // Required: House manual to manage QR codes for
  houseManualId: PropTypes.string.isRequired,

  // Optional: Listing context for display
  listingId: PropTypes.string,

  // Visibility control (for modal usage)
  isVisible: PropTypes.bool,

  // Callback when dashboard closes
  onClose: PropTypes.func,

  // Callback when QR codes are modified
  onQRCodesChanged: PropTypes.func,

  // Initial mode
  initialMode: PropTypes.oneOf(['view', 'create', 'edit', 'preview'])
};

QRCodeDashboard.defaultProps = {
  isVisible: true,
  initialMode: 'view'
};
```

---

## Part 9: Testing Checklist

- [ ] Fetch QR codes for a house manual
- [ ] Display empty state when no QR codes
- [ ] Create new QR code with all use cases
- [ ] Edit existing QR code
- [ ] Delete QR code with confirmation
- [ ] Select single QR code
- [ ] Select all / deselect all
- [ ] Print preview with selected codes
- [ ] Print functionality works
- [ ] Toast notifications show correctly
- [ ] Mobile responsive layout
- [ ] Error handling for failed API calls

---

## Part 10: Files Referenced

### Source Repository Files
- `src/components/QRCodeDashboard.tsx`
- `src/components/QRCodeGrid.tsx`
- `src/components/QRCodeForm.tsx`
- `src/components/PrintPreview.tsx`
- `src/components/Toast.tsx`
- `src/types/qrcode.types.ts`

### Split Lease Files to Reference
- [Toast.jsx](../../../app/src/islands/shared/Toast.jsx) - Existing toast system
- [HostReviewGuest.jsx](../../../app/src/islands/shared/HostReviewGuest/HostReviewGuest.jsx) - Shared island pattern example
- [ListingDashboardContext.jsx](../../../app/src/islands/pages/ListingDashboardPage/context/ListingDashboardContext.jsx) - Context pattern
- [useListingData.js](../../../app/src/islands/pages/ListingDashboardPage/hooks/useListingData.js) - Service pattern

### Database Tables
- `qrcodes` - QR code storage
- `housemanual` - House manual (parent)
- `listing` - Listing context

---

## Part 11: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| QR image CDN URLs not generated | Medium | Low | Use client-side QR generation |
| Missing house manual data | Low | Medium | Validate inputs, show helpful errors |
| Print styling breaks | Low | Low | Test across browsers |
| Database FK constraints | Low | High | Use soft references (text IDs) |

---

## Approval Checklist

- [ ] Plan reviewed for completeness
- [ ] Database schema mapping verified
- [ ] Architecture aligns with Split Lease patterns
- [ ] Dependencies identified (qrcode.react, react-to-print)
- [ ] No breaking changes to existing code
- [ ] Ready for implementation

---

**Ready for implementation upon approval.**
