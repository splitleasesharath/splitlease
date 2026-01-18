# DOMAIN_INDEX Entry Templates

Templates for adding new documentation entries to DOMAIN_INDEX.md.

## Entry Format

```markdown
| [Item Name] | `[Domain]/[FILENAME].md` | [Related docs if any] |
```

## Domain-Specific Templates

### Pages Domain

```markdown
| [Page Name] | `Pages/[PAGE_NAME]_QUICK_REFERENCE.md` | |
```

For pages with additional context:
```markdown
| [Page Name] | `Pages/[PAGE_NAME]_PAGE_CONTEXT.md` | `Pages/[PAGE_NAME]_QUICK_REFERENCE.md` |
```

### Backend Domain (Edge Functions)

```markdown
| [function-name] | `Backend(EDGE - Functions)/[FUNCTION_NAME].md` | |
```

For functions with related sync:
```markdown
| [function-name] | `Backend(EDGE - Functions)/[FUNCTION_NAME].md` | `Backend(EDGE - Functions)/BUBBLE_SYNC.md` |
```

### Database Domain

```markdown
| [Concern] | `Database/[CONCERN_NAME].md` | |
```

Common concerns:
- Table schemas → `DATABASE_TABLES_DETAILED.md`
- FK constraints → `REFERENCE_TABLES_FK_FIELDS.md`
- Relations → `DATABASE_RELATIONS.md`
- Junction tables → `JUNCTIONS_SCHEMA_CONVENTION.md`
- Option sets → `OPTION_SETS_DETAILED.md`

### Auth Domain

```markdown
| [Flow] | `Auth/[FLOW_NAME].md` | `Auth/AUTH_GUIDE.md` |
```

### Architecture Domain

```markdown
| [Pattern] | `Architecture/[PATTERN_NAME].md` | |
```

### External Integrations

```markdown
| [Integration] | `External/[INTEGRATION_NAME]_IMPLEMENTATION.md` | |
```

## Auto-Generated Entry Example

When a new doc file `Pages/NEW_PAGE_QUICK_REFERENCE.md` is detected:

```markdown
| New Page | `Pages/NEW_PAGE_QUICK_REFERENCE.md` | |
```

The entry name is derived from the filename:
1. Remove `_QUICK_REFERENCE.md` or `_PAGE_CONTEXT.md` suffix
2. Replace underscores with spaces
3. Title case the result

## Section Placement

New entries should be added to the appropriate section in DOMAIN_INDEX.md:

| Doc Path Prefix | DOMAIN_INDEX Section |
|-----------------|---------------------|
| `Pages/` | `## Pages Domain` |
| `Backend(EDGE - Functions)/` | `## Backend Domain (Edge Functions)` |
| `Database/` | `## Database Domain` |
| `Auth/` | `## Auth Domain` |
| `Architecture/` | `## Architecture Domain` |
| `External/` | `## External Integrations` |
| `Routing/` | `## Architecture Domain` |
