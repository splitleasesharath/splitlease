# Generic JSONB Reference Array Pattern

**Created**: 2025-12-06
**Status**: Reference Document
**Purpose**: Reusable pattern for implementing multi-select fields that reference lookup tables

---

## Overview

This document describes a pattern for implementing a **many-to-many style relationship** using a JSONB array field, where:

- **Table A** (e.g., `proposal`) has a JSONB field storing an array of IDs
- **Table B** (e.g., `zat_features_houserule`) is a lookup/reference table
- Users can select multiple items from Table B
- Selected item IDs are stored in Table A's JSONB field

This is the Bubble.io pattern for "List of Things" fields, adapted for Supabase/PostgreSQL.

---

## When to Use This Pattern

**Use when:**
- You have a fixed set of options (lookup table)
- Users can select multiple options
- Selection order doesn't matter
- You don't need metadata per selection (e.g., "selected on date X")
- The option list is relatively small (< 100 items)

**Don't use when:**
- You need to query "all records using option X" frequently → Use junction table
- You need metadata per selection → Use junction table
- Options are user-generated and unlimited → Use junction table
- You need enforced referential integrity at database level → Use junction table

---

## Database Structure

### Table A: Main Table (stores the selection)

```sql
-- Example: proposal table
CREATE TABLE table_a (
  _id text PRIMARY KEY,
  -- ... other fields
  "Reference Field" jsonb,  -- Stores array of IDs from Table B
  -- ... other fields
);

-- Example data:
-- "Reference Field": ["id1", "id2", "id3"]
```

### Table B: Lookup Table (source of options)

```sql
-- Example: zat_features_houserule table
CREATE TABLE table_b (
  _id text PRIMARY KEY,
  "Name" text NOT NULL,
  "Icon" text,
  "pre-set?" boolean DEFAULT false,  -- Optional: marks default selections
  "Created Date" timestamptz NOT NULL DEFAULT now()
);
```

### Optional: Database Validation Trigger

Add a trigger to validate that all IDs in the JSONB array exist in the reference table:

```sql
-- Create validation function
CREATE OR REPLACE FUNCTION validate_reference_array()
RETURNS TRIGGER AS $$
DECLARE
  field_name text := TG_ARGV[0];  -- e.g., 'House Rules'
  ref_table text := TG_ARGV[1];   -- e.g., 'zat_features_houserule'
  ref_array jsonb;
  invalid_count integer;
BEGIN
  -- Get the JSONB array from the specified field
  EXECUTE format('SELECT ($1).%I', field_name) INTO ref_array USING NEW;

  -- Allow NULL
  IF ref_array IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check all IDs exist in reference table
  EXECUTE format(
    'SELECT COUNT(*) FROM jsonb_array_elements_text($1) AS elem
     WHERE elem NOT IN (SELECT _id FROM %I)',
    ref_table
  ) INTO invalid_count USING ref_array;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Invalid IDs in % field: % ID(s) not found in %',
      field_name, invalid_count, ref_table;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to specific table/field
CREATE TRIGGER check_reference_field
BEFORE INSERT OR UPDATE ON table_a
FOR EACH ROW
EXECUTE FUNCTION validate_reference_array('Reference Field', 'table_b');
```

---

## Service Layer

### Generic Reference Service

**File**: `app/src/lib/services/referenceService.js`

```javascript
/**
 * Generic Reference Service
 * Fetches options from any lookup table
 */
import { supabase } from '../supabase.js';

/**
 * Create a reference service for a specific lookup table
 * @param {string} tableName - Supabase table name
 * @param {Object} fieldMap - Map of standard fields to actual column names
 */
export function createReferenceService(tableName, fieldMap = {}) {
  const fields = {
    id: fieldMap.id || '_id',
    name: fieldMap.name || 'Name',
    icon: fieldMap.icon || 'Icon',
    isPreset: fieldMap.isPreset || '"pre-set?"'
  };

  return {
    /**
     * Fetch all options from the lookup table
     */
    async getAll() {
      const selectFields = `${fields.id}, ${fields.name}, ${fields.icon}, ${fields.isPreset}`;

      const { data, error } = await supabase
        .from(tableName)
        .select(selectFields)
        .order(fields.name, { ascending: true });

      if (error) {
        console.error(`[referenceService:${tableName}] Error fetching:`, error);
        throw error;
      }

      return data.map(item => ({
        _id: item[fields.id] || item._id,
        name: item[fields.name] || item.Name,
        icon: item[fields.icon] || item.Icon,
        isPreset: item[fields.isPreset] || item['pre-set?'] || false
      }));
    },

    /**
     * Fetch options by IDs
     */
    async getByIds(ids) {
      if (!ids || ids.length === 0) return [];

      const { data, error } = await supabase
        .from(tableName)
        .select(`${fields.id}, ${fields.name}, ${fields.icon}`)
        .in(fields.id, ids);

      if (error) {
        console.error(`[referenceService:${tableName}] Error fetching by IDs:`, error);
        throw error;
      }

      return data.map(item => ({
        _id: item[fields.id] || item._id,
        name: item[fields.name] || item.Name,
        icon: item[fields.icon] || item.Icon
      }));
    },

    /**
     * Fetch only preset options
     */
    async getPresets() {
      const { data, error } = await supabase
        .from(tableName)
        .select(`${fields.id}, ${fields.name}, ${fields.icon}`)
        .eq(fields.isPreset, true)
        .order(fields.name, { ascending: true });

      if (error) {
        console.error(`[referenceService:${tableName}] Error fetching presets:`, error);
        throw error;
      }

      return data.map(item => ({
        _id: item[fields.id] || item._id,
        name: item[fields.name] || item.Name,
        icon: item[fields.icon] || item.Icon
      }));
    }
  };
}

// Pre-configured services for common tables
export const houseRulesService = createReferenceService('zat_features_houserule');
export const amenitiesService = createReferenceService('zat_features_amenity');
// Add more as needed
```

---

## Selection Hook

### Generic Multi-Select Hook

**File**: `app/src/hooks/useReferenceSelection.js`

```javascript
/**
 * Generic hook for managing multi-select reference fields
 */
import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * @param {Object} service - Reference service with getAll(), getByIds(), getPresets()
 * @param {string[]} initialSelectedIds - Pre-selected IDs
 * @param {Object} options - Configuration
 */
export function useReferenceSelection(service, initialSelectedIds = [], options = {}) {
  const {
    autoLoadPresets = false,
    onSelectionChange = null
  } = options;

  const [allOptions, setAllOptions] = useState([]);
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const options = await service.getAll();
        setAllOptions(options);

        // Auto-select presets if enabled and no initial selection
        if (autoLoadPresets && initialSelectedIds.length === 0) {
          const presetIds = options.filter(o => o.isPreset).map(o => o._id);
          setSelectedIds(presetIds);
          onSelectionChange?.(presetIds);
        }
      } catch (err) {
        setError(err);
        console.error('[useReferenceSelection] Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOptions();
  }, [service]);

  // Toggle selection
  const toggle = useCallback((id) => {
    setSelectedIds(prev => {
      const newSelection = prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id];
      onSelectionChange?.(newSelection);
      return newSelection;
    });
  }, [onSelectionChange]);

  // Check if selected
  const isSelected = useCallback((id) => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  // Bulk operations
  const selectAll = useCallback(() => {
    const allIds = allOptions.map(o => o._id);
    setSelectedIds(allIds);
    onSelectionChange?.(allIds);
  }, [allOptions, onSelectionChange]);

  const clearAll = useCallback(() => {
    setSelectedIds([]);
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  const loadPresets = useCallback(() => {
    const presetIds = allOptions.filter(o => o.isPreset).map(o => o._id);
    const merged = [...new Set([...selectedIds, ...presetIds])];
    setSelectedIds(merged);
    onSelectionChange?.(merged);
  }, [allOptions, selectedIds, onSelectionChange]);

  const setSelection = useCallback((ids) => {
    setSelectedIds(ids);
    onSelectionChange?.(ids);
  }, [onSelectionChange]);

  // Derived state
  const selectedOptions = useMemo(() => {
    return allOptions.filter(o => selectedIds.includes(o._id));
  }, [allOptions, selectedIds]);

  const presetOptions = useMemo(() => {
    return allOptions.filter(o => o.isPreset);
  }, [allOptions]);

  return {
    // Data
    allOptions,
    selectedIds,
    selectedOptions,
    presetOptions,

    // State
    isLoading,
    error,

    // Actions
    toggle,
    isSelected,
    selectAll,
    clearAll,
    loadPresets,
    setSelection
  };
}
```

---

## UI Component

### Generic Multi-Select Component

**File**: `app/src/islands/shared/ReferenceSelector/ReferenceSelector.jsx`

```jsx
/**
 * Generic Reference Selector Component
 * Displays options from a lookup table as checkboxes
 */
import './ReferenceSelector.css';

export default function ReferenceSelector({
  // Data
  options = [],
  selectedIds = [],

  // Callbacks
  onToggle,
  onLoadPresets,

  // State
  isLoading = false,
  error = null,

  // Config
  columns = 2,
  showPresetButton = true,
  showCount = true,
  showIcons = true,
  compact = false,

  // Labels
  loadPresetsLabel = 'Load common options',
  emptyLabel = 'No options available',
  loadingLabel = 'Loading options...',
  errorLabel = 'Failed to load options'
}) {
  if (isLoading) {
    return <div className="reference-selector-loading">{loadingLabel}</div>;
  }

  if (error) {
    return <div className="reference-selector-error">{errorLabel}</div>;
  }

  if (options.length === 0) {
    return <div className="reference-selector-empty">{emptyLabel}</div>;
  }

  return (
    <div className={`reference-selector ${compact ? 'compact' : ''}`}>
      {(showPresetButton || showCount) && (
        <div className="reference-selector-header">
          {showCount && (
            <span className="selected-count">
              {selectedIds.length} selected
            </span>
          )}
          {showPresetButton && onLoadPresets && (
            <button
              type="button"
              className="load-presets-btn"
              onClick={onLoadPresets}
            >
              {loadPresetsLabel}
            </button>
          )}
        </div>
      )}

      <div
        className="reference-selector-grid"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {options.map(option => (
          <label key={option._id} className="reference-option">
            <input
              type="checkbox"
              checked={selectedIds.includes(option._id)}
              onChange={() => onToggle(option._id)}
            />
            {showIcons && option.icon && (
              <span className="option-icon">{option.icon}</span>
            )}
            <span className="option-name">{option.name}</span>
            {option.isPreset && (
              <span className="preset-badge">Default</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
```

### Connected Component (with hook)

```jsx
/**
 * Connected Reference Selector
 * Combines ReferenceSelector with useReferenceSelection hook
 */
import { useReferenceSelection } from '../../../hooks/useReferenceSelection.js';
import ReferenceSelector from './ReferenceSelector.jsx';

export default function ConnectedReferenceSelector({
  service,
  initialSelectedIds = [],
  onChange,
  ...props
}) {
  const {
    allOptions,
    selectedIds,
    isLoading,
    error,
    toggle,
    loadPresets
  } = useReferenceSelection(service, initialSelectedIds, {
    onSelectionChange: onChange
  });

  return (
    <ReferenceSelector
      options={allOptions}
      selectedIds={selectedIds}
      onToggle={toggle}
      onLoadPresets={loadPresets}
      isLoading={isLoading}
      error={error}
      {...props}
    />
  );
}
```

---

## Usage Examples

### Example 1: House Rules in Proposal

```jsx
import ConnectedReferenceSelector from '../shared/ReferenceSelector/ConnectedReferenceSelector.jsx';
import { houseRulesService } from '../../lib/services/referenceService.js';

function ProposalForm({ proposal, onUpdate }) {
  return (
    <div>
      <h3>House Rules</h3>
      <ConnectedReferenceSelector
        service={houseRulesService}
        initialSelectedIds={proposal.houseRules || []}
        onChange={(ids) => onUpdate('houseRules', ids)}
        showPresetButton={true}
        loadPresetsLabel="Load common house rules"
        columns={2}
      />
    </div>
  );
}
```

### Example 2: Amenities in Listing

```jsx
import ConnectedReferenceSelector from '../shared/ReferenceSelector/ConnectedReferenceSelector.jsx';
import { amenitiesService } from '../../lib/services/referenceService.js';

function ListingForm({ listing, onUpdate }) {
  return (
    <div>
      <h3>Amenities</h3>
      <ConnectedReferenceSelector
        service={amenitiesService}
        initialSelectedIds={listing.amenities || []}
        onChange={(ids) => onUpdate('amenities', ids)}
        showPresetButton={false}
        columns={3}
      />
    </div>
  );
}
```

### Example 3: Custom Service

```jsx
import { createReferenceService } from '../../lib/services/referenceService.js';

// Create custom service for a different table
const customService = createReferenceService('my_lookup_table', {
  id: 'id',
  name: 'display_name',
  icon: 'icon_url',
  isPreset: 'is_default'
});

function MyForm({ data, onUpdate }) {
  return (
    <ConnectedReferenceSelector
      service={customService}
      initialSelectedIds={data.selectedOptions || []}
      onChange={(ids) => onUpdate('selectedOptions', ids)}
    />
  );
}
```

---

## Backend Integration

### Edge Function Pattern

```typescript
// In your Edge Function action handler

interface CreateRecordInput {
  // ... other fields
  selected_references?: string[];  // Array of IDs from lookup table
}

export async function handleCreate(
  payload: CreateRecordInput,
  supabase: SupabaseClient
): Promise<Response> {
  // Validate reference IDs exist (optional - can rely on trigger)
  if (payload.selected_references?.length) {
    const { data: validRefs } = await supabase
      .from('lookup_table')
      .select('_id')
      .in('_id', payload.selected_references);

    const validIds = new Set(validRefs?.map(r => r._id) || []);
    const invalidIds = payload.selected_references.filter(id => !validIds.has(id));

    if (invalidIds.length > 0) {
      throw new ValidationError(`Invalid reference IDs: ${invalidIds.join(', ')}`);
    }
  }

  // Create record with reference array
  const recordData = {
    // ... other fields
    "Reference Field": payload.selected_references || [],
  };

  const { data, error } = await supabase
    .from('main_table')
    .insert(recordData)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

## Querying Patterns

### Get Records with Reference Details

```javascript
// Frontend: Get proposal with house rules details
async function getProposalWithRules(proposalId) {
  // Get proposal
  const { data: proposal } = await supabase
    .from('proposal')
    .select('*, "House Rules"')
    .eq('_id', proposalId)
    .single();

  // Get house rule details
  const ruleIds = proposal['House Rules'] || [];
  const { data: rules } = await supabase
    .from('zat_features_houserule')
    .select('_id, Name, Icon')
    .in('_id', ruleIds);

  return {
    ...proposal,
    houseRulesDetails: rules
  };
}
```

### Query Records Containing Specific Reference

```sql
-- Find all proposals that include a specific house rule
SELECT * FROM proposal
WHERE "House Rules" @> '["1560258089836x428000737556366600"]'::jsonb;

-- Find all proposals with ANY of these house rules
SELECT * FROM proposal
WHERE "House Rules" ?| ARRAY['id1', 'id2', 'id3'];
```

---

## Migration Checklist

When implementing this pattern for a new table pair:

### 1. Database Setup
- [ ] Verify lookup table exists with `_id`, `Name`, `Icon` columns
- [ ] Verify main table has JSONB field (or create migration to add)
- [ ] Optional: Add validation trigger

### 2. Service Layer
- [ ] Create service using `createReferenceService()` or copy pattern
- [ ] Export from central location (`lib/services/index.js`)

### 3. Frontend
- [ ] Import `ConnectedReferenceSelector` or create custom
- [ ] Add to form component with appropriate props
- [ ] Handle `onChange` to update parent state

### 4. Backend
- [ ] Update Edge Function to accept reference array in payload
- [ ] Add validation (optional if using trigger)
- [ ] Update TypeScript types

### 5. Testing
- [ ] Unit test service methods
- [ ] Integration test full flow
- [ ] Verify data in Supabase dashboard

---

## Comparison: JSONB Array vs Junction Table

| Aspect | JSONB Array | Junction Table |
|--------|-------------|----------------|
| **Schema** | Single field | Separate table |
| **Reads** | Fast (no join) | Requires join |
| **Writes** | Replace entire array | Insert/delete rows |
| **Query "items with X"** | Possible but slow | Fast with index |
| **Selection metadata** | Not supported | Supported |
| **Referential integrity** | Via trigger (optional) | Via foreign key |
| **Max selections** | Practical limit ~1000 | Unlimited |
| **Best for** | Small option sets, no metadata | Large sets, metadata needed |

---

## File Template Structure

```
app/src/
├── lib/
│   └── services/
│       ├── referenceService.js      # Generic factory
│       └── index.js                 # Barrel exports
├── hooks/
│   └── useReferenceSelection.js     # Generic hook
└── islands/
    └── shared/
        └── ReferenceSelector/
            ├── ReferenceSelector.jsx
            ├── ReferenceSelector.css
            ├── ConnectedReferenceSelector.jsx
            └── index.js
```

---

**Document Version**: 1.0
**Last Updated**: 2025-12-06
**Related**: `PROPOSAL_HOUSE_RULES_SELECTION_PLAN.md`
