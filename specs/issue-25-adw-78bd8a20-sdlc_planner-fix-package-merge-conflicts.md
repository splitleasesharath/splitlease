# Chore: Fix Persistent Package Merge Conflicts

## Metadata
issue_number: `25`
adw_id: `78bd8a20`
issue_json: `{"number":25,"title":"Persistent Merge conflict for package.json, package-lock.json on each new pull request","body":"adw_sdlc_iso\n\nI'm receiving persistent merge conflicts for the package.json, package-lock.json on each new pull request. I investigated this and according to ChatGPT Codex Cloud code reviewer, the following is the reason. Can you take a look and help troubleshoot.\n\nWhy package manifests keep conflicting\nThis repository actually contains two separate Node projects: the main Islands app (app/split-lease) and the standalone components package (app/split-lease/components). Each has its own package.json and package-lock.json, and both define overlapping dependencies and scripts. [app/split-lease/package.jsonL1-L58](https://github.com/splitleasesharath/splitlease/blob/e2498aa8bd8b577aa4d0d6b12bec81c60664d800/app/split-lease/package.json#L1-L58) [app/split-lease/components/package.jsonL1-L52](https://github.com/splitleasesharath/splitlease/blob/e2498aa8bd8b577aa4d0d6b12bec81c60664d800/app/split-lease/components/package.json#L1-L52)\nEvery feature branch that adds or upgrades a dependency, script, or tooling touchpoint ends up editing the same dependencies / devDependencies blocks. Those sections are dense and unsorted, so even a single insertion lands on the exact lines that other branches also change, leading Git to mark a merge conflict rather than auto-merging. [app/split-lease/package.jsonL23-L53](https://github.com/splitleasesharath/splitlease/blob/e2498aa8bd8b577aa4d0d6b12bec81c60664d800/app/split-lease/package.json#L23-L53)\nThe lock files are machine-generated snapshots with lockfileVersion 3, and they expand each dependency into hundreds of nested entries. When any branch runs npm install (or when CI regenerates the lock), large chunks of packages get rewritten. Two concurrently updated locks rarely line up exactly, so Git again surfaces conflicts at the top-level metadata and inside the dependency trees. [app/split-lease/package-lock.jsonL1-L60](https://github.com/splitleasesharath/splitlease/blob/e2498aa8bd8b577aa4d0d6b12bec81c60664d800/app/split-lease/package-lock.json#L1-L60) [app/split-lease/components/package-lock.jsonL1-L60](https://github.com/splitleasesharath/splitlease/blob/e2498aa8bd8b577aa4d0d6b12bec81c60664d800/app/split-lease/components/package-lock.json#L1-L60)\nHow to minimize the pain\nUpdate from main frequently. Rebase or merge main into your feature branch before committing new dependency work so you resolve conflicts incrementally rather than all at once.\nIsolate dependency edits. If you must add or upgrade packages, do it in a dedicated commit so it's easier to reconcile and reviewers can spot intentional changes.\nAvoid mixing installs. Run npm install only in the project you're modifying (either the app root or the components package). Regenerating the wrong lock file introduces noise that other branches don't expect.\nUse the same npm version as the repo. The manifests specify Node ≥18 and npm ≥9; using a newer npm can rewrite the lock file layout, creating conflicts even without dependency changes. [app/split-lease/package.jsonL55-L58](https://github.com/splitleasesharath/splitlease/blob/e2498aa8bd8b577aa4d0d6b12bec81c60664d800/app/split-lease/package.json#L55-L58) [app/split-lease/package-lock.jsonL1-L45](https://github.com/splitleasesharath/splitlease/blob/e2498aa8bd8a77aa4d0d6b12bec81c60664d800/app/split-lease/package-lock.json#L1-L45)\nFollowing those practices keeps the generated lock files aligned across branches and cuts down on recurring merge conflicts."}`

## Chore Description

The repository contains two separate Node.js projects with overlapping dependencies and package files that cause persistent merge conflicts on every pull request:

1. **Root app project**: `app/split-lease/` with its own `package.json` and `package-lock.json`
2. **Components library**: `app/split-lease/components/` with its own `package.json` and `package-lock.json`

The problem occurs because:
- Both projects define overlapping dependencies (react, react-dom, styled-components, framer-motion, TypeScript, Vite, etc.)
- Dependencies and devDependencies blocks are dense and unsorted
- Lock files (lockfileVersion 3) are machine-generated with hundreds of nested entries
- Multiple feature branches modify the same dependency lines simultaneously
- Running `npm install` in one project can inadvertently regenerate lock files with different npm versions or timing

This chore will implement technical solutions to minimize merge conflicts by:
1. Establishing a `.gitattributes` file with custom merge strategies for package files
2. Sorting dependencies alphabetically in both package.json files to reduce line conflicts
3. Creating documentation and automation to enforce consistent npm versions
4. Adding pre-commit hooks to validate package file consistency
5. Creating helper scripts to safely resolve package conflicts when they occur

## Relevant Files

Use these files to resolve the chore:

- **app/split-lease/package.json** - Root app package manifest with unsorted dependencies that need alphabetical sorting
- **app/split-lease/components/package.json** - Component library package manifest with unsorted dependencies that need alphabetical sorting
- **app/split-lease/package-lock.json** - Root app lock file that conflicts frequently (machine-generated, needs git merge strategy)
- **app/split-lease/components/package-lock.json** - Components lock file that conflicts frequently (machine-generated, needs git merge strategy)
- **README.md** - Project documentation that should be updated with dependency management best practices

### New Files

- **.gitattributes** - Git attributes file to define custom merge strategies for package-lock.json files
- **scripts/sort-package-deps.js** - Node script to alphabetically sort dependencies in package.json files
- **scripts/resolve-package-conflicts.sh** - Bash script to help developers resolve package merge conflicts safely
- **.nvmrc** - Node Version Manager configuration to lock Node.js version across the team
- **.npmrc** - npm configuration to lock npm behavior and version requirements
- **docs/dependency-management.md** - Developer documentation for managing dependencies and resolving conflicts

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create Git merge strategy for package-lock.json files

- Create `.gitattributes` file in repository root
- Configure `package-lock.json` files to use union merge strategy or specify they should be regenerated on conflict
- Add pattern: `**/package-lock.json merge=ours` to prefer current branch during conflicts (forces manual npm install after merge)
- Document this strategy clearly since lock files should be regenerated, not manually merged

### Step 2: Lock Node.js and npm versions across the project

- Create `.nvmrc` file specifying exact Node.js version (e.g., `18.20.0` or latest LTS)
- Create `.npmrc` file with `engine-strict=true` to enforce version requirements
- Update both `package.json` files to specify exact or narrow version ranges in engines field
- Ensure consistency between root app and components package for Node/npm versions

### Step 3: Sort dependencies alphabetically in package.json files

- Create `scripts/sort-package-deps.js` Node script that:
  - Reads package.json files
  - Alphabetically sorts `dependencies`, `devDependencies`, `peerDependencies`, and `scripts` keys
  - Writes sorted JSON back with consistent formatting (2-space indentation)
  - Preserves all other fields in original order
- Run the script on both `app/split-lease/package.json` and `app/split-lease/components/package.json`
- Verify the sorting is correct and no data is lost

### Step 4: Create conflict resolution helper script

- Create `scripts/resolve-package-conflicts.sh` bash script that:
  - Detects if package.json or package-lock.json files have merge conflicts
  - For package.json: runs the sort script and shows diff for manual review
  - For package-lock.json: removes conflicted lock files and runs `npm install` in the correct directory
  - Validates that post-resolution builds still work
  - Provides clear instructions to developer on what was done
- Make script executable: `chmod +x scripts/resolve-package-conflicts.sh`
- Test script in a safe environment

### Step 5: Update root package.json dependencies

- Apply the sort script to `app/split-lease/package.json`
- Regenerate `app/split-lease/package-lock.json` by running `cd app/split-lease && npm install`
- Verify no dependencies were lost or changed unintentionally
- Commit sorted package.json and regenerated lock file

### Step 6: Update components package.json dependencies

- Apply the sort script to `app/split-lease/components/package.json`
- Regenerate `app/split-lease/components/package-lock.json` by running `cd app/split-lease/components && npm install`
- Verify no dependencies were lost or changed unintentionally
- Resolve the current zod version conflict (root has zod ^3.23.8, components has zod ^4.1.12 - align to latest stable)
- Commit sorted package.json and regenerated lock file

### Step 7: Create developer documentation

- Create `docs/dependency-management.md` with:
  - Explanation of the dual-package structure
  - Best practices for adding/updating dependencies
  - Instructions for using the conflict resolution script
  - npm version requirements and how to check/install correct version
  - Workflow for updating dependencies in feature branches
  - Guidance on when to update root vs components dependencies
- Update main `README.md` with link to dependency management docs
- Add troubleshooting section for common merge conflict scenarios

### Step 8: Resolve current merge conflicts

- Check current git status for any outstanding package file conflicts
- If conflicts exist in `app/split-lease/components/package.json` or `package-lock.json`:
  - Accept the changes from current branch
  - Run the sort script on package.json
  - Delete package-lock.json and regenerate with `npm install`
- Verify the resolved state is clean

### Step 9: Run validation commands

- Execute all validation commands listed below to ensure zero regressions
- Fix any issues that arise before marking this step complete
- Ensure all builds pass and no type errors exist

## Validation Commands

Execute every command to validate the chore is complete with zero regressions.

- `node --version && npm --version` - Verify Node.js and npm versions match project requirements
- `cd app/split-lease/components && npm run typecheck` - Run TypeScript type checking to validate zero type errors
- `cd app/split-lease/components && npm run build` - Run component build to validate UMD bundle generation works
- `cd app/split-lease/components && npm test` - Run component tests to validate zero test failures
- `cd app/split-lease && npm run type-check` - Run root app type checking
- `cd app/split-lease && npm run build` - Run root app build to ensure it works
- `node scripts/sort-package-deps.js --check` - Verify all package.json files are sorted (add --check flag to script)
- `git status` - Verify no unexpected file changes and working tree is clean

## Notes

- **Zod version conflict**: The root app specifies zod ^3.23.8 while components specify zod ^4.1.12. This needs to be resolved - recommend aligning both to the same major version to avoid runtime conflicts
- **Dependency overlap**: Both projects share many dependencies (react, react-dom, styled-components, framer-motion, TypeScript, Vite, vitest). Consider documenting which dependencies should be kept in sync
- **Lock file strategy**: Using `merge=ours` for lock files is intentional - lock files should never be manually merged, always regenerated with `npm install`
- **Monorepo consideration**: If conflicts persist, consider migrating to a monorepo tool (npm workspaces, pnpm, or yarn workspaces) to manage the dual-package structure with a single lock file
- **CI/CD impact**: Ensure CI workflows install dependencies in the correct directories and use the specified Node/npm versions
- **Team communication**: After implementing these changes, communicate the new workflow to all developers to ensure consistent usage
