# Chore: Resolve the package.json merge conflicts

## Metadata
issue_number: `28`
adw_id: `21ddfa87`
issue_json: `{"number":28,"title":"Resolve the package.json merge conflicts","body":"adw_sdlc_iso\n\nUsing the instructions in the following document: \"C:\\Users\\igor\\splitleaseteam\\!Agent Context and Tools\\SL1\\TAC\\docs\\PACKAGE_CONFLICT_ROOT_CAUSE_ANALYSIS.md\"\n\nHelp solve the problematic merge conflicts. Also update the \"C:\\Users\\igor\\splitleaseteam\\!Agent Context and Tools\\SL1\\TAC\\README.md\" to reflect this new change."}`

## Chore Description

The project currently has merge conflicts in `app/split-lease/components/package-lock.json` due to the dual-package architecture where both the root app and components library maintain separate dependency trees. According to the root cause analysis document, the fundamental issue is an architectural anti-pattern where two separate npm projects with duplicate dependencies exist in the same Git repository without proper monorepo tooling.

This chore involves:
1. Resolving the current merge conflict in the components package-lock.json
2. Implementing dependency management tooling to prevent future package.json conflicts
3. Updating the README.md to document the new conflict resolution process

The root cause analysis recommends either merging into a single project or using npm workspaces. However, based on recent commits showing dependency management tooling has been added (commit 49c87ea), this chore focuses on utilizing those existing tools and documenting the process rather than a full architectural refactor.

## Relevant Files
Use these files to resolve the chore:

- **app/split-lease/components/package-lock.json** - Currently has merge conflicts that need to be resolved by regenerating the lock file
- **scripts/resolve-package-conflicts.sh** - Automated script to detect and resolve merge conflicts in package files; regenerates lock files via npm install
- **scripts/sort-package-deps.mjs** - Node.js script that sorts dependencies alphabetically in package.json files to minimize merge conflicts
- **docs/PACKAGE_CONFLICT_ROOT_CAUSE_ANALYSIS.md** - Comprehensive analysis explaining why conflicts occur and recommended solutions (architectural guidance)
- **docs/dependency-management.md** - Existing guide for managing dependencies and resolving conflicts; contains current best practices
- **README.md** - Project overview that needs to be updated to reference the new conflict resolution process and tooling

### New Files
No new files need to be created. All necessary tooling and documentation already exists from commit 49c87ea.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Resolve Current Package-Lock Conflict
- Navigate to the components directory: `cd app/split-lease/components`
- Delete the conflicted package-lock.json file to remove merge conflict markers
- Regenerate the lock file with a fresh npm install
- Verify the generated lock file has no conflict markers
- Stage the resolved lock file for commit

### Step 2: Run Automated Conflict Resolution Script
- Execute the automated resolution script: `./scripts/resolve-package-conflicts.sh`
- Verify the script successfully validates both package.json files (root and components)
- Verify the script confirms all package.json dependencies are sorted alphabetically
- Review the script output to ensure no errors occurred during validation
- Confirm all package files are now in a clean state with no conflicts

### Step 3: Update README.md Documentation
- Read the current README.md troubleshooting section on merge conflicts (lines 230-245)
- Update the "Merge Conflicts in package.json or package-lock.json" section to:
  - Reference the new automated script as the primary solution
  - Keep the manual resolution steps as a fallback
  - Add a reference to the dependency management guide for detailed instructions
  - Mention the new tooling added in recent commits (sort script, merge driver)
- Ensure the documentation is clear, concise, and follows the existing style
- Verify the file paths and commands referenced are accurate

### Step 4: Run Validation Commands
- Run all validation commands listed below to ensure zero regressions
- Fix any issues that arise during validation
- Confirm all tests pass before proceeding

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd app/split-lease/components && npm run typecheck` - Run TypeScript type checking to validate zero type errors
- `cd app/split-lease/components && npm run build` - Run component build to validate UMD bundle generation works
- `cd app/test-harness && npm test` - Run all component tests (contracts + diagnostics) to validate zero regressions
- `git status` - Verify only expected files are modified (package-lock.json and README.md)
- `node scripts/sort-package-deps.mjs --check` - Verify all package.json files are sorted correctly

## Notes

- The root cause analysis document explains this is an architectural anti-pattern (two separate npm projects without monorepo tooling), but recent commits show dependency management tooling has been added as a pragmatic solution
- The long-term solution would be either:
  - Solution 1: Single Project (merge components into main app)
  - Solution 2: npm Workspaces (proper monorepo with single lock file)
  - Solution 3: Advanced Monorepo tools like Turborepo (overkill for this project)
- For now, the focus is on utilizing the existing tooling (scripts/resolve-package-conflicts.sh, scripts/sort-package-deps.mjs) and documenting the process
- The dependency management guide already exists with comprehensive instructions; the README update should reference it rather than duplicate content
- After resolving this conflict, future developers should use the automated script to prevent and resolve package conflicts
- The git merge driver and sorting tools help reduce conflicts, but the fundamental issue (duplicate dependency trees) remains until a monorepo solution is implemented
