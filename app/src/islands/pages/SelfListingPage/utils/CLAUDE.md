# SelfListingPage Utils - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Service modules for fetching lookup data from Supabase

---

## QUICK_STATS

[TOTAL_FILES]: 3
[PRIMARY_LANGUAGE]: TypeScript
[KEY_PATTERNS]: Async service functions, Supabase queries, Error handling

---

## FILES

### amenitiesService.ts
[INTENT]: Fetch amenity options from Supabase database
[EXPORTS]: getAllAmenitiesByType, getAllInUnitAmenities, getAllBuildingAmenities, getCommonAmenitiesByType, getCommonInUnitAmenities, getCommonBuildingAmenities, Amenity (interface)
[TABLE]: zat_features_amenity
[USAGE]: Section 2 (Features) populates amenity checkboxes

### neighborhoodService.ts
[INTENT]: Fetch neighborhood data by ZIP code
[EXPORTS]: getNeighborhoodByZipCode, extractZipCode, Neighborhood (interface)
[TABLE]: zat_geo_hood_mediumlevel (via RPC function)
[USAGE]: Section 1 (Space Snapshot) auto-fills neighborhood from address

### safetyService.ts
[INTENT]: Fetch safety feature options from Supabase database
[EXPORTS]: getCommonSafetyFeatures, SafetyFeature (interface)
[TABLE]: zfut_safetyfeatures
[USAGE]: Section 7 (Review) populates safety feature checkboxes

---

## AMENITIES_SERVICE

### getAllAmenitiesByType(type)
[INTENT]: Fetch all amenities for a given category
[PARAMETERS]: type (string) - "In Unit" or "In Building"
[RETURNS]: Promise<string[]> - Array of amenity names
[QUERY]: SELECT Name WHERE "Type - Amenity Categories" = type AND pending = false
[ORDER]: Alphabetical by Name
[ERROR_HANDLING]: Returns empty array on error

### getAllInUnitAmenities()
[INTENT]: Convenience wrapper for getAllAmenitiesByType('In Unit')
[RETURNS]: Promise<string[]>

### getAllBuildingAmenities()
[INTENT]: Convenience wrapper for getAllAmenitiesByType('In Building')
[RETURNS]: Promise<string[]>

### getCommonAmenitiesByType(type)
[INTENT]: Fetch only pre-set (common) amenities for a category
[PARAMETERS]: type (string) - "In Unit", "In Building", or "In Room"
[RETURNS]: Promise<string[]> - Array of amenity names
[QUERY]: SELECT Name WHERE "pre-set?" = true AND "Type - Amenity Categories" = type
[DIFFERENCE]: Filters to only pre-defined options (excludes custom/rare amenities)
[ORDER]: Alphabetical by Name
[ERROR_HANDLING]: Returns empty array on error

### getCommonInUnitAmenities()
[INTENT]: Convenience wrapper for getCommonAmenitiesByType('In Unit')
[RETURNS]: Promise<string[]>

### getCommonBuildingAmenities()
[INTENT]: Convenience wrapper for getCommonAmenitiesByType('In Building')
[RETURNS]: Promise<string[]>

### Amenity Interface
```typescript
interface Amenity {
  _id: string;
  Name: string;
  'Type - Amenity Categories': string;
  Icon?: string;
  'pre-set?'?: boolean;
}
```

---

## NEIGHBORHOOD_SERVICE

### getNeighborhoodByZipCode(zipCode)
[INTENT]: Fetch neighborhood information for a given ZIP code
[PARAMETERS]: zipCode (string) - 5-digit ZIP code (e.g., "11109")
[RETURNS]: Promise<Neighborhood | null>
[RPC_FUNCTION]: get_neighborhood_by_zip (Supabase RPC)
[WHY_RPC]: Bypasses issues with Supabase JS client's JSONB array handling
[QUERY_LOGIC]: Searches zat_geo_hood_mediumlevel.Zips JSONB array for matching ZIP
[RETURN_FIELDS]: Display (neighborhood name), 'Neighborhood Description', Zips (array)
[ERROR_HANDLING]: Returns null on error or no match
[CONSOLE_LOGGING]: Logs warnings for empty input or no results

### extractZipCode(address)
[INTENT]: Extract 5-digit ZIP code from full address string
[PARAMETERS]: address (string) - Full address text
[RETURNS]: string - ZIP code or empty string if not found
[REGEX]: /\b(\d{5})(-\d{4})?\b/ (matches 5-digit ZIP with optional +4 extension)
[EXAMPLE]: "123 Main St, Queens, NY 11109-1234" → "11109"

### Neighborhood Interface
```typescript
interface Neighborhood {
  neighborhood_name: string;
  description: string;
  zips: string[];
}
```

---

## SAFETY_SERVICE

### getCommonSafetyFeatures()
[INTENT]: Fetch pre-defined safety feature options
[RETURNS]: Promise<string[]> - Array of safety feature names
[QUERY]: SELECT Name WHERE "pre-set?" = true
[ORDER]: Alphabetical by Name
[ERROR_HANDLING]: Returns empty array on error
[CONSOLE_LOGGING]: Logs query response and warnings

### SafetyFeature Interface
```typescript
interface SafetyFeature {
  _id: string;
  Name: string;
  Icon?: string;
  'pre-set?'?: boolean;
}
```

---

## DATA_SOURCE_TABLES

### zat_features_amenity
[COLUMNS]: _id, Name, 'Type - Amenity Categories', Icon, 'pre-set?', pending
[CATEGORIES]: "In Unit", "In Building", "In Room"
[PRE_SET]: Boolean flag indicating common/standard amenities
[PENDING]: Boolean flag indicating awaiting approval

### zat_geo_hood_mediumlevel
[COLUMNS]: Display, 'Neighborhood Description', Zips (JSONB array)
[LOOKUP_METHOD]: RPC function get_neighborhood_by_zip
[JSONB_FIELD]: Zips contains array of ZIP codes as strings

### zfut_safetyfeatures
[COLUMNS]: _id, Name, Icon, 'pre-set?'
[PRE_SET]: Boolean flag indicating common safety features

---

## USAGE_PATTERNS

### In Section Components
```typescript
import { getAllInUnitAmenities } from './utils/amenitiesService';

useEffect(() => {
  const fetchAmenities = async () => {
    const amenities = await getAllInUnitAmenities();
    setAmenityOptions(amenities);
  };
  fetchAmenities();
}, []);
```

### Auto-Fill Neighborhood
```typescript
import { getNeighborhoodByZipCode, extractZipCode } from './utils/neighborhoodService';

const handleAddressChange = async (fullAddress) => {
  const zipCode = extractZipCode(fullAddress);
  if (zipCode) {
    const neighborhood = await getNeighborhoodByZipCode(zipCode);
    if (neighborhood) {
      updateSpaceSnapshot({
        ...formData.spaceSnapshot,
        address: {
          ...formData.spaceSnapshot.address,
          neighborhood: neighborhood.neighborhood_name
        }
      });
    }
  }
};
```

### Safety Features
```typescript
import { getCommonSafetyFeatures } from './utils/safetyService';

useEffect(() => {
  const fetchFeatures = async () => {
    const features = await getCommonSafetyFeatures();
    setSafetyOptions(features);
  };
  fetchFeatures();
}, []);
```

---

## ERROR_HANDLING_STRATEGY

### Console Warnings
[PATTERN]: console.warn for empty inputs or no results
[EXAMPLE]: 'No ZIP code provided for neighborhood lookup'
[PURPOSE]: Help debugging without throwing errors

### Console Errors
[PATTERN]: console.error for database or network errors
[EXAMPLE]: 'Error fetching amenities:', error
[PURPOSE]: Log unexpected failures

### Graceful Degradation
[PATTERN]: Return empty array or null instead of throwing
[BENEFIT]: UI remains functional even if data fetch fails
[EXAMPLE]: Failed amenity fetch → empty checkbox list instead of crash

---

## SUPABASE_QUERY_PATTERNS

### Column Name Quoting
[ISSUE]: Columns with special characters need quoting
[SOLUTION]: Use double quotes: .eq('"pre-set?"', true)
[EXAMPLE]: .eq('"Type - Amenity Categories"', type)

### Boolean Filtering
[PATTERN]: .eq('pending', false) or .eq('"pre-set?"', true)
[PURPOSE]: Filter to active/approved/common items only

### Ordering
[PATTERN]: .order('Name', { ascending: true })
[PURPOSE]: Alphabetical presentation in UI

### RPC Function Usage
[PATTERN]: await supabase.rpc('function_name', { param: value })
[WHY]: Complex queries or JSONB operations easier in SQL function

---

## INTEGRATION_POINTS

### Section1SpaceSnapshot
[USES]: neighborhoodService.getNeighborhoodByZipCode
[TRIGGER]: After address geocoding completes
[PURPOSE]: Auto-fill neighborhood field

### Section2Features
[USES]: amenitiesService.getAllInUnitAmenities, getAllBuildingAmenities
[TRIGGER]: Component mount
[PURPOSE]: Populate amenity checkboxes

### Section7Review
[USES]: safetyService.getCommonSafetyFeatures
[TRIGGER]: Component mount
[PURPOSE]: Populate safety feature checkboxes

---

## PERFORMANCE_CONSIDERATIONS

### Caching Strategy
[CURRENT]: No caching, fetches on every component mount
[IMPROVEMENT]: Could cache results in memory or localStorage
[TRADEOFF]: Simplicity vs avoiding redundant queries

### Query Optimization
[CURRENT]: Selects only needed columns (Name primarily)
[BENEFIT]: Minimal data transfer
[FILTER]: Excludes pending/unapproved items at database level

### Network Calls
[TIMING]: All fetches occur on component mount via useEffect
[ASYNC]: Non-blocking, UI renders immediately with loading state

---

## DATABASE_FIELD_NAMING

### Convention Issues
[PROBLEM]: Bubble.io field names use spaces and special characters
[EXAMPLES]: "Type - Amenity Categories", "pre-set?", "Neighborhood Description"
[SOLUTION]: Quote field names in Supabase queries
[TYPESCRIPT]: Interface properties also use quoted names

---

## TESTING_CONSIDERATIONS

### Mocking Supabase
[PATTERN]: Mock supabase client for unit tests
[EXAMPLE]: Mock .from().select() chain

### Test Data
[EXAMPLE_ZIP]: "11109" (Queens neighborhood)
[EXAMPLE_TYPE]: "In Unit" (amenity category)

### Error Scenarios
[TEST_CASE_1]: Empty string inputs
[TEST_CASE_2]: Invalid ZIP codes
[TEST_CASE_3]: Database connection failure
[TEST_CASE_4]: No matching results

---

## FUTURE_ENHANCEMENTS

### Potential Improvements
[CACHING]: Add in-memory or localStorage cache for reference data
[BATCH_FETCHING]: Fetch all lookup data in parallel on page load
[OFFLINE_SUPPORT]: Include fallback static data if database unavailable
[TYPE_SAFETY]: Add runtime validation with Zod or similar

---

**FILE_COUNT**: 3
**FUNCTION_COUNT**: 10
**TOTAL_LINES**: 175
