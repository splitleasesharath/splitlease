# Proposal House Rules Selection - Implementation Plan

**Created**: 2025-12-06
**Status**: Pending Implementation
**Complexity**: Medium
**Estimated Effort**: 4-6 hours

---

## Overview

Implement a house rules selection feature in the proposal creation flow that allows guests to:
1. View all available house rules from `zat_features_houserule` table
2. Select/deselect house rules during proposal creation
3. Store selected rule IDs in the proposal's `House Rules` JSONB field
4. Edit their selection later during proposal negotiation

---

## Current State Analysis

### Database Structure

**`zat_features_houserule` table (28 rows)**:
| Column | Type | Description |
|--------|------|-------------|
| `_id` | text | Bubble-format ID (e.g., `1560258089836x428000737556366600`) |
| `Name` | text | Display name (e.g., "No Smoking Inside") |
| `Icon` | text | Icon identifier |
| `pre-set?` | boolean | 5 rules are pre-set defaults |
| `Created Date` | timestamp | Creation timestamp |

**Pre-set House Rules** (auto-selected for new listings):
- Lock Doors
- No Food In Sink
- No Smoking Inside
- Take Out Trash
- Wash Your Dishes

**`proposal` table - `House Rules` field**:
- Type: JSONB
- Current format: Array of `_id` strings from `zat_features_houserule`
- Example: `["1560258089836x428000737556366600", "1556151848468x314854653954062850"]`

### Frontend Components

**Existing House Rules Implementation (Listing Creation)**:
- Location: `app/src/islands/pages/SelfListingPage/sections/Section5Rules.tsx`
- Uses hardcoded `HOUSE_RULES` constant (30 items) from `listing.types.ts`
- Does NOT fetch from database - **gap to address**
- Simple checkbox toggle pattern

**Proposal Creation Flow**:
- Location: `app/src/islands/shared/CreateProposalFlowV2.jsx`
- Sections: Review → User Details → Move-in → Days Selection
- **No house rules section currently exists**
- House Rules inherited from listing automatically (line 279 in `create.ts`)

**Existing Service**:
- Location: `app/src/islands/shared/EditListingDetails/services/houseRulesService.js`
- Only fetches pre-set rules by NAME (not IDs)
- Needs enhancement to return full rule objects with IDs

### Backend (Edge Function)

**`proposal/actions/create.ts`** (line 279):
```typescript
"House Rules": listingData["Features - House Rules"],
```
Currently copies house rules from the listing. Needs modification to accept guest-selected rules.

---

## Implementation Plan

### Phase 1: Database & Service Layer

#### 1.1 Enhance House Rules Service

**File**: `app/src/lib/services/houseRulesService.js` (new location for shared service)

```javascript
/**
 * House Rules Service
 * Fetches house rules from zat_features_houserule table
 */
import { supabase } from '../supabase.js';

/**
 * Fetch all house rules
 * @returns {Promise<Array<{_id: string, name: string, icon: string, isPreset: boolean}>>}
 */
export async function getAllHouseRules() {
  const { data, error } = await supabase
    .from('zat_features_houserule')
    .select('_id, Name, Icon, "pre-set?"')
    .order('Name', { ascending: true });

  if (error) {
    console.error('[houseRulesService] Error fetching house rules:', error);
    throw error;
  }

  return data.map(rule => ({
    _id: rule._id,
    name: rule.Name,
    icon: rule.Icon,
    isPreset: rule['pre-set?'] || false
  }));
}

/**
 * Fetch pre-set house rules only
 * @returns {Promise<Array<{_id: string, name: string, icon: string}>>}
 */
export async function getPresetHouseRules() {
  const { data, error } = await supabase
    .from('zat_features_houserule')
    .select('_id, Name, Icon')
    .eq('"pre-set?"', true)
    .order('Name', { ascending: true });

  if (error) {
    console.error('[houseRulesService] Error fetching preset house rules:', error);
    throw error;
  }

  return data.map(rule => ({
    _id: rule._id,
    name: rule.Name,
    icon: rule.Icon
  }));
}

/**
 * Get house rule names from IDs
 * @param {string[]} ids - Array of house rule IDs
 * @returns {Promise<Array<{_id: string, name: string, icon: string}>>}
 */
export async function getHouseRulesByIds(ids) {
  if (!ids || ids.length === 0) return [];

  const { data, error } = await supabase
    .from('zat_features_houserule')
    .select('_id, Name, Icon')
    .in('_id', ids);

  if (error) {
    console.error('[houseRulesService] Error fetching house rules by IDs:', error);
    throw error;
  }

  return data.map(rule => ({
    _id: rule._id,
    name: rule.Name,
    icon: rule.Icon
  }));
}
```

### Phase 2: Reusable Hook

#### 2.1 Create House Rules Selection Hook

**File**: `app/src/hooks/useHouseRulesSelection.js`

```javascript
/**
 * Hook for managing house rules selection
 * Handles fetching options, selection state, and persistence
 */
import { useState, useEffect, useCallback } from 'react';
import { getAllHouseRules, getHouseRulesByIds } from '../lib/services/houseRulesService.js';

/**
 * @param {string[]} initialSelectedIds - Pre-selected house rule IDs
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoLoadPresets - Auto-select preset rules if no initial selection
 */
export function useHouseRulesSelection(initialSelectedIds = [], options = {}) {
  const [allRules, setAllRules] = useState([]);
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all available house rules on mount
  useEffect(() => {
    const fetchRules = async () => {
      try {
        setIsLoading(true);
        const rules = await getAllHouseRules();
        setAllRules(rules);

        // Auto-select presets if no initial selection and option enabled
        if (options.autoLoadPresets && initialSelectedIds.length === 0) {
          const presetIds = rules.filter(r => r.isPreset).map(r => r._id);
          setSelectedIds(presetIds);
        }
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRules();
  }, []);

  // Toggle a single rule
  const toggle = useCallback((ruleId) => {
    setSelectedIds(prev =>
      prev.includes(ruleId)
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  }, []);

  // Check if a rule is selected
  const isSelected = useCallback((ruleId) => {
    return selectedIds.includes(ruleId);
  }, [selectedIds]);

  // Select multiple rules at once
  const selectMany = useCallback((ruleIds) => {
    setSelectedIds(prev => [...new Set([...prev, ...ruleIds])]);
  }, []);

  // Clear all selections
  const clearAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Load preset rules
  const loadPresets = useCallback(() => {
    const presetIds = allRules.filter(r => r.isPreset).map(r => r._id);
    selectMany(presetIds);
  }, [allRules, selectMany]);

  // Get selected rules with full details
  const selectedRules = allRules.filter(rule => selectedIds.includes(rule._id));

  return {
    // Data
    allRules,
    selectedIds,
    selectedRules,

    // State
    isLoading,
    error,

    // Actions
    toggle,
    isSelected,
    selectMany,
    clearAll,
    loadPresets,
    setSelectedIds
  };
}
```

### Phase 3: UI Component

#### 3.1 Create House Rules Selector Component

**File**: `app/src/islands/shared/HouseRulesSelector/HouseRulesSelector.jsx`

```jsx
/**
 * HouseRulesSelector Component
 * Displays house rules as checkboxes with preset loading option
 */
import { useHouseRulesSelection } from '../../../hooks/useHouseRulesSelection.js';
import './HouseRulesSelector.css';

export default function HouseRulesSelector({
  selectedIds = [],
  onChange,
  showLoadPresets = true,
  maxColumns = 2,
  compact = false
}) {
  const {
    allRules,
    selectedRules,
    isLoading,
    error,
    toggle,
    isSelected,
    loadPresets
  } = useHouseRulesSelection(selectedIds);

  // Sync with parent when selection changes
  const handleToggle = (ruleId) => {
    toggle(ruleId);
    const newSelection = isSelected(ruleId)
      ? selectedIds.filter(id => id !== ruleId)
      : [...selectedIds, ruleId];
    onChange(newSelection);
  };

  const handleLoadPresets = () => {
    loadPresets();
    const presetIds = allRules.filter(r => r.isPreset).map(r => r._id);
    const merged = [...new Set([...selectedIds, ...presetIds])];
    onChange(merged);
  };

  if (isLoading) {
    return <div className="house-rules-loading">Loading house rules...</div>;
  }

  if (error) {
    return <div className="house-rules-error">Failed to load house rules</div>;
  }

  return (
    <div className={`house-rules-selector ${compact ? 'compact' : ''}`}>
      {showLoadPresets && (
        <div className="house-rules-header">
          <span className="selected-count">
            {selectedIds.length} rule{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <button
            type="button"
            className="load-presets-btn"
            onClick={handleLoadPresets}
          >
            Load common rules
          </button>
        </div>
      )}

      <div
        className="house-rules-grid"
        style={{ gridTemplateColumns: `repeat(${maxColumns}, 1fr)` }}
      >
        {allRules.map(rule => (
          <label key={rule._id} className="house-rule-item">
            <input
              type="checkbox"
              checked={isSelected(rule._id)}
              onChange={() => handleToggle(rule._id)}
            />
            <span className="rule-icon">{rule.icon}</span>
            <span className="rule-name">{rule.name}</span>
            {rule.isPreset && <span className="preset-badge">Common</span>}
          </label>
        ))}
      </div>
    </div>
  );
}
```

#### 3.2 Component Styles

**File**: `app/src/islands/shared/HouseRulesSelector/HouseRulesSelector.css`

```css
.house-rules-selector {
  width: 100%;
}

.house-rules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.selected-count {
  font-size: 14px;
  color: #666;
}

.load-presets-btn {
  background: none;
  border: none;
  color: var(--color-primary, #31135d);
  cursor: pointer;
  font-size: 14px;
  text-decoration: underline;
}

.house-rules-grid {
  display: grid;
  gap: 12px;
}

.house-rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.house-rule-item:hover {
  border-color: var(--color-primary, #31135d);
  background: #f9f9ff;
}

.house-rule-item input[type="checkbox"] {
  accent-color: var(--color-primary, #31135d);
}

.rule-icon {
  font-size: 16px;
}

.rule-name {
  flex: 1;
  font-size: 14px;
}

.preset-badge {
  font-size: 10px;
  background: #e8f5e9;
  color: #2e7d32;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Compact mode for modals */
.house-rules-selector.compact .house-rules-grid {
  gap: 8px;
}

.house-rules-selector.compact .house-rule-item {
  padding: 6px 10px;
}

.house-rules-selector.compact .rule-name {
  font-size: 13px;
}
```

### Phase 4: Integration into Proposal Flow

#### 4.1 Add House Rules Section to CreateProposalFlowV2

**Option A**: Add as new section (Section 5)
**Option B**: Add to existing UserDetailsSection (recommended - keeps flow simpler)

**File to modify**: `app/src/islands/shared/CreateProposalFlowV2Components/UserDetailsSection.jsx`

Add house rules selection after the "unique requirements" field:

```jsx
import HouseRulesSelector from '../HouseRulesSelector/HouseRulesSelector.jsx';

// In the component, add:
<div className="form-section">
  <h3>House Rules Agreement</h3>
  <p className="section-description">
    Select the house rules you agree to follow during your stay.
    These are pre-populated from the listing but you can adjust them.
  </p>
  <HouseRulesSelector
    selectedIds={data.houseRules || []}
    onChange={(ids) => updateData('houseRules', ids)}
    showLoadPresets={true}
    compact={true}
  />
</div>
```

#### 4.2 Update Proposal Data State

**File**: `app/src/islands/shared/CreateProposalFlowV2.jsx`

Add `houseRules` to the proposalData state:

```javascript
const [proposalData, setProposalData] = useState({
  // ... existing fields

  // House Rules - initialized from listing
  houseRules: listing?.['Features - House Rules'] || [],

  // ... rest of fields
});
```

#### 4.3 Update ReviewSection to Display House Rules

**File**: `app/src/islands/shared/CreateProposalFlowV2Components/ReviewSection.jsx`

Add house rules display:

```jsx
<div className="review-section">
  <div className="section-header">
    <h4>House Rules</h4>
    <button onClick={onEditHouseRules}>Edit</button>
  </div>
  <div className="house-rules-summary">
    {data.houseRulesDetails?.map(rule => (
      <span key={rule._id} className="rule-chip">{rule.name}</span>
    ))}
  </div>
</div>
```

### Phase 5: Backend Update

#### 5.1 Update Proposal Create Action

**File**: `supabase/functions/proposal/actions/create.ts`

Modify to accept house rules from payload instead of only from listing:

```typescript
// Line ~279, change from:
"House Rules": listingData["Features - House Rules"],

// To:
"House Rules": input.house_rules || listingData["Features - House Rules"],
```

#### 5.2 Update Input Types

**File**: `supabase/functions/proposal/lib/types.ts`

Add to `CreateProposalInput`:

```typescript
export interface CreateProposalInput {
  // ... existing fields

  /** Optional: Guest-selected house rules (overrides listing defaults) */
  house_rules?: string[];
}
```

### Phase 6: Edit Proposal Flow

#### 6.1 Add House Rules to Edit Modal

**File**: `app/src/islands/modals/GuestEditingProposalModal.jsx`

Add `HouseRulesSelector` component to allow editing house rules during negotiation.

---

## Testing Checklist

### Unit Tests
- [ ] `useHouseRulesSelection` hook - toggle, select, clear operations
- [ ] `houseRulesService` - fetch all, fetch by IDs, error handling
- [ ] `HouseRulesSelector` - renders options, handles selection

### Integration Tests
- [ ] Proposal creation saves selected house rules to database
- [ ] House rules persist across proposal draft saves
- [ ] Edit modal loads existing house rules
- [ ] Changes to house rules save correctly

### Manual Testing
- [ ] Create proposal with default house rules
- [ ] Create proposal with custom selection
- [ ] Edit house rules in negotiation
- [ ] Verify IDs stored correctly in database
- [ ] Test mobile responsiveness

---

## File References

### Files to Create
| Path | Purpose |
|------|---------|
| `app/src/lib/services/houseRulesService.js` | Database service |
| `app/src/hooks/useHouseRulesSelection.js` | Selection hook |
| `app/src/islands/shared/HouseRulesSelector/HouseRulesSelector.jsx` | UI component |
| `app/src/islands/shared/HouseRulesSelector/HouseRulesSelector.css` | Styles |
| `app/src/islands/shared/HouseRulesSelector/index.js` | Barrel export |

### Files to Modify
| Path | Change |
|------|--------|
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | Add houseRules to state |
| `app/src/islands/shared/CreateProposalFlowV2Components/UserDetailsSection.jsx` | Add selector UI |
| `app/src/islands/shared/CreateProposalFlowV2Components/ReviewSection.jsx` | Display selected rules |
| `supabase/functions/proposal/actions/create.ts` | Accept house_rules from input |
| `supabase/functions/proposal/lib/types.ts` | Add house_rules to interface |

### Reference Files (Read-Only)
| Path | Relevance |
|------|-----------|
| `app/src/islands/pages/SelfListingPage/sections/Section5Rules.tsx` | Existing house rules UI pattern |
| `app/src/islands/pages/SelfListingPage/types/listing.types.ts` | HOUSE_RULES constant reference |
| `app/src/islands/shared/EditListingDetails/services/houseRulesService.js` | Existing service (to consolidate) |

---

## Migration Notes

### Data Compatibility
- No database migration required - `House Rules` field already supports JSONB arrays
- Existing proposals with house rules will continue to work
- Frontend needs to handle both ID arrays (new) and name arrays (legacy) during transition

### Backward Compatibility
- Keep `HOUSE_RULES` constant in `listing.types.ts` for listing creation
- Gradually migrate listing creation to use database-fetched rules
- Consider adding a utility to convert names → IDs for legacy data

---

## Success Criteria

1. Guest can see all 28 house rules during proposal creation
2. Guest can select/deselect rules with checkbox UI
3. "Load common rules" button selects the 5 preset rules
4. Selected rule IDs are saved to proposal's `House Rules` field
5. Review section displays selected rules by name
6. Guest can edit house rules later in the proposal flow
7. No performance regression (rules fetched once and cached)

---

**Document Version**: 1.0
**Last Updated**: 2025-12-06
