# Generate LLM-Optimized Documentation

Generate documentation files optimized for **LLM semantic searchability** and **digestibility** - NOT for human reading.

## Arguments

$ARGUMENTS - What to document. Can be:
- `codebase` - Full codebase structure and file intents
- `architecture` - Architecture patterns and design decisions
- `api` - API endpoints, functions, and interfaces
- `config` - Configuration files and environment setup
- `directory:/path` - Specific directory deep-dive
- `file:/path` - Single file detailed documentation

## Purpose

Create documentation that maximizes:
1. **Semantic Searchability (target: 85+)** - Perfect for RAG/vector retrieval
2. **Digestibility (target: 85+)** - Token-efficient, unambiguous, parseable

## Output Location

Generated files go to: `docs/` directory with naming convention:
- `CODEBASE_LLM_REFERENCE.md` for codebase
- `ARCHITECTURE_LLM_REFERENCE.md` for architecture
- `API_LLM_REFERENCE.md` for api
- `CONFIG_LLM_REFERENCE.md` for config
- `{DIRNAME}_LLM_REFERENCE.md` for directory scans

## Document Structure Template

Every generated document MUST follow this structure:

```markdown
# {Title} - LLM Reference

**GENERATED**: {date}
**SCOPE**: {what is covered}
**OPTIMIZATION**: Semantic Searchability + Digestibility

---

## QUICK_STATS

[TOTAL_FILES]: {count}
[TOTAL_DIRECTORIES]: {count}
[PRIMARY_LANGUAGE]: {language}
[KEY_PATTERNS]: {comma-separated list}

---

## SECTION_NAME

### path/to/file.ext
[INTENT]: {One clear sentence describing what this file does}
[EXPORTS]: {What it exports, if applicable}
[DEPENDS_ON]: {Key dependencies}
[USED_BY]: {What uses this file}

### path/to/another.ext
[INTENT]: {Purpose}
...
```

## Formatting Rules

### MUST DO:

1. **Use `[KEY]:` prefixes** for every piece of information
   ```
   [INTENT]: Handles user authentication via JWT tokens
   [EXPORTS]: login(), logout(), validateToken()
   [DEPENDS_ON]: lib/api.js, lib/storage.js
   ```

2. **One file = One entry** - No grouping multiple files
   ```
   ### src/lib/auth.js
   [INTENT]: ...

   ### src/lib/api.js
   [INTENT]: ...
   ```

3. **Flat hierarchy** - Maximum 3 heading levels (`#`, `##`, `###`)

4. **Explicit paths** - Always use full relative paths from project root

5. **Self-contained entries** - Each entry must be understandable without reading others

6. **Stats at top** - Summary statistics before detailed content

7. **No prose paragraphs** - Use lists, tables, or key-value pairs only

### MUST NOT DO:

1. **No vague descriptions**
   - BAD: `[INTENT]: Configuration file`
   - GOOD: `[INTENT]: Vite build configuration with React plugin and path aliases`

2. **No cross-references that require context**
   - BAD: `[INTENT]: See auth.js for details`
   - GOOD: `[INTENT]: Validates JWT tokens using jsonwebtoken library`

3. **No deep nesting**
   - BAD: Section > Subsection > Sub-subsection > Entry
   - GOOD: Section > Entry

4. **No markdown formatting inside values**
   - BAD: `[INTENT]: Handles **important** auth`
   - GOOD: `[INTENT]: Handles critical authentication flows`

5. **No empty or placeholder entries**
   - Skip files that have no meaningful intent (e.g., `.gitkeep`)

## Instructions

### Phase 1: Scan

1. Based on $ARGUMENTS, identify all relevant files/directories
2. For `codebase`: Scan entire project excluding node_modules, dist, .git
3. For `directory:/path`: Scan specified directory recursively
4. For `file:/path`: Deep-dive single file

### Phase 2: Analyze

For each file, determine:
- Primary intent (what problem does it solve?)
- Exports (functions, classes, constants)
- Dependencies (imports)
- Consumers (what imports this file?)

### Phase 3: Generate

Create the document following the template exactly.

Order entries by:
1. Entry points first (index.js, main.js, app.js)
2. Then alphabetically by path

### Phase 4: Validate

Before saving, verify:
- [ ] Every file has `[INTENT]:` tag
- [ ] No entries have vague/generic descriptions
- [ ] Stats section is accurate
- [ ] No prose paragraphs exist
- [ ] Maximum heading depth is 3

### Phase 5: Save

Save to `docs/{TYPE}_LLM_REFERENCE.md`

## Example Output

For `/generate-llm-docs directory:app/src/lib`:

```markdown
# app/src/lib - LLM Reference

**GENERATED**: 2025-11-26
**SCOPE**: Utility libraries and shared functions
**OPTIMIZATION**: Semantic Searchability + Digestibility

---

## QUICK_STATS

[TOTAL_FILES]: 15
[PRIMARY_LANGUAGE]: JavaScript
[KEY_PATTERNS]: API clients, utilities, constants, authentication

---

## CORE_UTILITIES

### app/src/lib/auth.js
[INTENT]: Authentication functions for login, logout, session validation via Edge Functions
[EXPORTS]: checkAuthStatus(), loginUser(), logoutUser(), validateTokenAndFetchUser()
[DEPENDS_ON]: lib/supabase.js, lib/secureStorage.js
[USED_BY]: islands/shared/SignUpLoginModal.jsx, islands/shared/LoggedInAvatar.jsx

### app/src/lib/constants.js
[INTENT]: Application-wide constants including API URLs, feature flags, default values
[EXPORTS]: BUBBLE_API_URL, DEFAULT_DAYS, PRICE_TIERS, USER_TYPES
[DEPENDS_ON]: None
[USED_BY]: Multiple components across islands/

### app/src/lib/supabase.js
[INTENT]: Supabase client initialization with anon key from environment
[EXPORTS]: supabase (client instance)
[DEPENDS_ON]: @supabase/supabase-js
[USED_BY]: lib/auth.js, lib/dataLookups.js, lib/listingDataFetcher.js
```

## Argument Examples

| Command | Result |
|---------|--------|
| `/generate-llm-docs codebase` | Full project documentation |
| `/generate-llm-docs architecture` | Patterns, layers, conventions |
| `/generate-llm-docs directory:app/src/logic` | Logic layer deep-dive |
| `/generate-llm-docs file:app/src/lib/auth.js` | Single file detailed doc |
