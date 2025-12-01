# [Directory Name] Map

**TYPE**: BRANCH NODE
**PARENT**: [parent/path/]

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: One sentence summary of this directory's role
[PATTERN]: Architecture pattern name (e.g., Four-Layer Logic, Hollow Component)
[LAYER]: If applicable, which layer in architecture (Layer 1/2/3/4)

---

## ### SUB-MODULES ###

- **[SubdirA](./subdirA/CLAUDE.md)**: Brief description of subdirA
- **[SubdirB](./subdirB/CLAUDE.md)**: Brief description of subdirB
- **[SubdirC](./subdirC/CLAUDE.md)**: Brief description of subdirC

---

## ### KEY_EXPORTS ###

[FROM_SUBDIR_A]: exportA, exportB
[FROM_SUBDIR_B]: exportC, exportD
[BARREL]: index.js re-exports all

---

## ### SHARED_CONVENTIONS ###

[CRITICAL]: Any rule that applies to ALL subfolders
[NAMING]: Function/file naming convention
[TESTING]: Testing requirements
[NO_FALLBACK]: Throw errors, don't mask problems

---

## ### DEPENDENCY_FLOW ###

```
Higher Layer (imports from)
    │
    ▼
This Directory
    │
    ▼
Lower Layer (this imports)
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { x } from 'path/to/this'
[CONSUMED_BY]: List of consumers

---

**SUBDIRECTORY_COUNT**: N
**TOTAL_FILES**: M
