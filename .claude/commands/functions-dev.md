# Deploy Edge Functions to Development

Deploy Supabase Edge Functions to the development project. Can deploy all functions or a specific function by name.

## Purpose

Deploy Edge Functions to the development Supabase project while ensuring:
- Cannot run on main branch (blocked by branch guard)
- All local function changes are committed before deployment
- Functions are deployed to development Supabase project
- Changes are pushed to GitHub

## Variables

PROJECT_ROOT: /splitlease (git root directory)
SUPABASE_PROJECT_REF: qzsmhgyojmwvtjmnrdea (development: splitlease-backend-dev)
BRANCH_RESTRICTION: NOT main/master
FUNCTIONS_DIR: supabase/functions

## Arguments

- **No arguments**: Deploy all Edge Functions
- **`<function-name>`**: Deploy only the specified function (e.g., `auth-user`, `proposal`, `listing`)

## Instructions

### Pre-Deployment: Branch Check

0. Verify current branch:
   - This command should NOT run on main/master branch
   - If on main branch, fail with error message
   - Suggest using `/functions` for production deployment

### Pre-Deployment: Commit All Changes

1. Navigate to the project root:
   - Run `cd $(git rev-parse --show-toplevel)` to ensure you're in the git root

2. Check for uncommitted changes in supabase/functions:
   - Run `git status --porcelain supabase/functions`
   - If there are changes:
     - Stage changes: `git add supabase/functions`
     - Run `git diff --cached --stat` to see what will be committed
     - Generate a descriptive commit message based on the staged changes
     - Run `git commit -m "<commit_message>"`
     - Use present tense (e.g., "update", "fix", "add")
     - git pull changes from remote. Proceed further only when pull is run successfully
   - If no changes, skip this step

### Deployment Phase: Deploy Edge Functions

3. Determine deployment scope:
   - If user provided a function name argument:
     - Verify the function exists in `supabase/functions/<function-name>`
     - Deploy single function
   - If no argument provided:
     - Deploy all functions

4. Deploy to development:
   - **For single function**:
     - Run `supabase functions deploy <function-name> --project-ref qzsmhgyojmwvtjmnrdea`
   - **For all functions**:
     - Run `supabase functions deploy --project-ref qzsmhgyojmwvtjmnrdea`
   - Capture deployment output
   - Verify deployment succeeds (exit code 0)
   - If deployment fails:
     - Report the error to the user
     - Common issues:
       - Authentication: Run `supabase login`
       - Project access: Verify project permissions
       - Function errors: Check function code syntax
     - Stop execution (do not push to GitHub)

### Post-Deployment: Push to GitHub

5. Push commits to GitHub (if changes were committed):
   - Run `git push origin $(git branch --show-current)` to push current branch
   - Verify push succeeds
   - If push fails (e.g., rejected, no upstream):
     - Report the error to the user
     - Provide the command they need to run manually

## Environment

- Deploys to development Supabase project: `qzsmhgyojmwvtjmnrdea`
- BLOCKED on main/master branches
- Functions use development environment variables

## Report

Provide a summary with:
1. Branch check status
2. Functions deployed (all or specific function name)
3. Deployment status (success or failure)
4. GitHub push status (if applicable)

Example output (all functions):
```
Development Functions Deployment Summary:
✓ Branch guard passed (on: feature/new-feature)
✓ No uncommitted changes
✓ Deployed all functions to development (qzsmhgyojmwvtjmnrdea)
  - auth-user
  - proposal
  - listing
  - ai-gateway
  - bubble-proxy
  - messages
  - bubble_sync
✓ No push needed (no changes)
```

Example output (single function with changes):
```
Development Functions Deployment Summary:
✓ Branch guard passed (on: feature/update-auth)
✓ Committed function changes
✓ Deployed 'auth-user' function to development (qzsmhgyojmwvtjmnrdea)
✓ Pushed 1 commit to GitHub (branch: feature/update-auth)
```

If blocked on main branch:
```
Development Functions Deployment Failed:
✗ Cannot deploy to development from main branch
→ Switch to a development branch first
→ Or use /functions to deploy to production
```

## Testing Notes

💡 **Development Environment** - Safe space for testing
- Test function changes here before deploying to production
- Use `supabase functions serve <function-name>` for local testing first
- Development project mirrors production schema
- No impact on live users
