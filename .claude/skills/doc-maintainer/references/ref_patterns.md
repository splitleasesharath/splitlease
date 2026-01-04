# Reference Extraction Patterns

Regex patterns for extracting file and function references from documentation.

## File Path Patterns

### Backtick-enclosed paths
```regex
`(app|supabase|public|\.claude)/[^`]+`
```

### Markdown link paths
```regex
\]\((\.\./)*(app|supabase|public|\.claude)/[^)]+\)
```

### Common path prefixes to validate
- `app/src/` - Frontend source
- `app/public/` - Static HTML files
- `supabase/functions/` - Edge Functions
- `.claude/` - Claude configuration

## Function Reference Patterns

### Hooks (useXxx)
```regex
\buse[A-Z][a-zA-Z]+\b
```
Examples: `useListingDashboardPageLogic`, `useAuth`, `useSearchFilters`

### Calculators (calculateXxx, getXxx)
```regex
\b(calculate|get)[A-Z][a-zA-Z]+\b
```
Examples: `calculateMonthlyPrice`, `getDayAvailability`, `getPricingBreakdown`

### Rules (isXxx, canXxx, shouldXxx)
```regex
\b(is|can|should)[A-Z][a-zA-Z]+\b
```
Examples: `isAvailableDay`, `canSubmitProposal`, `shouldShowPricing`

### Processors (processXxx, formatXxx, adaptXxx)
```regex
\b(process|format|adapt)[A-Z][a-zA-Z]+\b
```
Examples: `processProposalData`, `formatCurrency`, `adaptBubbleResponse`

### Workflows (*Workflow)
```regex
\b[a-zA-Z]+Workflow\b
```
Examples: `proposalCreationWorkflow`, `listingEditWorkflow`

## Combined Function Pattern

Single regex to match all function naming conventions:
```regex
\b(use|calculate|get|is|can|should|process|format|adapt)[A-Z][a-zA-Z]+\b|\b[a-zA-Z]+Workflow\b
```

## Exclusions

Skip these common false positives:
- `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef` (React built-ins)
- `useNavigate`, `useLocation`, `useParams` (Router built-ins)
- `isArray`, `isObject`, `isString` (Type checking utilities)
- `formatDate` when referring to date-fns (external library)

## Validation Commands

### Check file exists
```bash
# Use Glob tool
pattern: "app/src/islands/pages/SearchPage/**/*"
```

### Check function exists
```bash
# Use Grep tool
pattern: "function calculateMonthlyPrice|const calculateMonthlyPrice|export.*calculateMonthlyPrice"
```
