# Regression Guard System

Critical fixes are tracked via **git tags** with the `guard/` prefix. This ensures the guard list stays in sync with actual code history.

---

## Querying Guards

### List all guards
```bash
git tag -l "guard/*" --format="%(refname:short): %(contents:subject)"
```

### View guard details
```bash
git show guard/<name>           # Full commit with diff
git show guard/<name> --stat    # Commit with file summary
git log -1 guard/<name>         # Just the commit message
```

### Check if a domain has guards
```bash
git tag -l "guard/*" | grep -i "listing"
git tag -l "guard/*" | grep -i "proposal"
```

---

## Creating Guards

When you fix a critical bug that should NEVER regress, tag it:

### Step 1: Commit the fix
```bash
git commit -m "fix: filter listing updates to changed fields only

Sending unchanged FK fields (even null) causes 409 errors due to
PostgREST validation. Always diff formData against originalData."
```

### Step 2: Tag the commit
```bash
git tag -a "guard/409-fk-constraint" -m "CRITICAL: Always filter to changed fields only when updating listings.

PATTERN:
  const changedFields = {};
  for (const [key, value] of Object.entries(formData)) {
    if (value !== originalData[key]) changedFields[key] = value;
  }
  await updateListing(id, changedFields);

NEVER:
  await updateListing(id, formData);  // Causes 409 with null FKs"
```

### Naming Convention

```
guard/<domain>-<issue>
```

Examples:
- `guard/listing-fk-constraint`
- `guard/day-indexing-zero-based`
- `guard/proposal-sync-queue`
- `guard/auth-token-refresh`

---

## Tag Message Format

Use this structure for guard tag messages:

```
<ONE-LINE SUMMARY>

PATTERN:
  <correct code pattern>

NEVER:
  <anti-pattern to avoid>

CONTEXT:
  <why this matters, when it occurs>
```

---

## Guards to Create

Based on your CLAUDE.md, these known fixes need guard tags:

### 1. FK Constraint Pattern (listing updates)
```bash
git tag -a "guard/listing-fk-constraint" <commit-sha> -m "CRITICAL: Filter to changed fields only when updating listings.

PATTERN:
  const changedFields = {};
  for (const [key, value] of Object.entries(formData)) {
    if (value !== originalData[key]) changedFields[key] = value;
  }
  await updateListing(id, changedFields);

NEVER:
  await updateListing(id, formData);

CONTEXT:
  The listing table has 12 FK constraints. PostgREST validates ALL fields
  sent in PATCH requests, even unchanged ones. Sending null FK values
  triggers 409 errors with code 23503."
```

### 2. Day Indexing Convention
```bash
git tag -a "guard/day-indexing-zero-based" <commit-sha> -m "Day indices are 0-based (Sun=0, Sat=6). No conversion needed.

PATTERN:
  const dayIndex = date.getDay();  // Use directly

NEVER:
  const dayIndex = date.getDay() + 1;  // Don't convert

CONTEXT:
  Database stores days in JS-native 0-indexed format."
```

### 3. Info Text Click Targets
```bash
git tag -a "guard/info-text-click-targets" <commit-sha> -m "Make both label AND ? icon clickable, not just the icon.

PATTERN:
  <span onClick={openModal}>Label text <HelpIcon /></span>

NEVER:
  <span>Label text</span><HelpIcon onClick={openModal} />

CONTEXT:
  UX requirement - users expect the label to be clickable too."
```

---

## Integration with Claude

When Claude checks regression guards during planning:

1. Run: `git tag -l "guard/*" --format="%(refname:short): %(contents:subject)"`
2. For any relevant guard, run: `git show guard/<name>` to get full context
3. Verify the planned implementation complies with PATTERN
4. Verify it does NOT use any NEVER patterns

This is automated in the [context-router skill](SKILL.md).
