# Deploy Edge Functions to Production

Deploy Supabase Edge Functions to the production project. Can deploy all functions or a specific function by name.

## Purpose

Deploy Edge Functions to the production Supabase project while ensuring:
- All local function changes are committed before deployment
- Functions are deployed to production Supabase project
- Changes are pushed to GitHub

## Variables

PROJECT_ROOT: /splitlease (git root directory)
SUPABASE_PROJECT_REF: qcfifybkaddcoimjroca (production: splitlease-backend-live)
FUNCTIONS_DIR: supabase/functions

## Arguments

- **No arguments**: Deploy all Edge Functions
- **`<function-name>`**: Deploy only the specified function (e.g., `auth-user`, `proposal`, `listing`)

## Instructions

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

4. Deploy to production:
   - **For single function**:
     - Run `supabase functions deploy <function-name> --project-ref qcfifybkaddcoimjroca`
   - **For all functions**:
     - Run `supabase functions deploy --project-ref qcfifybkaddcoimjroca`
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

- Deploys to production Supabase project: `qcfifybkaddcoimjroca`
- Can run on any branch
- Functions use production environment variables

## Report

Provide a summary with:
1. Current branch
2. Functions deployed (all or specific function name)
3. Deployment status (success or failure)
4. GitHub push status (if applicable)

Example output (all functions):
```
Production Functions Deployment Summary:
✓ Current branch: main
✓ No uncommitted changes
✓ Deployed all functions to production (qcfifybkaddcoimjroca)
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
Production Functions Deployment Summary:
✓ Current branch: feature/update-auth
✓ Committed function changes
✓ Deployed 'proposal' function to production (qcfifybkaddcoimjroca)
✓ Pushed 1 commit to GitHub (branch: feature/update-auth)
```

## Safety Notes

⚠️ **Production Deployment** - This deploys to the live production Supabase project
- Edge Functions are deployed immediately and affect live users
- Test functions locally with `supabase functions serve` first
- Consider using `/functions-dev` to test in development environment first
