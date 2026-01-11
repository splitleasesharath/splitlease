# Deploy to Production (Ship It!)

Build and deploy the Split Lease application to production on Cloudflare Pages, with automatic build error fixing and GitHub push.

## Purpose

Deploy the application to production on Cloudflare Pages while ensuring:
- Can ONLY run on main branch (blocked by branch guard on other branches)
- All local changes are committed before deployment
- Build succeeds using production Supabase project
- Application is successfully deployed to Cloudflare production
- All changes (including fixes) are pushed to GitHub
- When a build fails, DO NOT PUSH STALE/Outdated Builds. Fix and run build again

## Variables

PROJECT_ROOT: /splitlease (git root directory)
BUILD_TIMEOUT: 10 minutes
MAX_BUILD_ATTEMPTS: 3
BRANCH_RESTRICTION: ONLY main/master

## Instructions

### Pre-Deployment: Branch Check

0. Verify current branch:
   - The `bun run deploy` command has a built-in branch guard
   - It will automatically fail if you're NOT on the main branch
   - If blocked, merge to main first or use `/stage` for development deployment

### Pre-Deployment: Commit All Changes

1. Kill all existing bun/npm servers

2. Navigate to the project root:
   - Run `cd $(git rev-parse --show-toplevel)` to ensure you're in the git root

3. Stage and commit all current changes:
   - Run `git add -A` to stage all changes
   - Run `git diff --cached --stat` to see what will be committed
   - If there are changes:
     - Generate a descriptive commit message based on the staged changes
     - Run `git commit -m "<commit_message>"`
     - Use present tense (e.g., "update", "fix", "add")
     - git pull changes from remote. Proceed further only when pull is run successfully
   - If no changes, skip this step

### Build Phase: Build with Auto-Fix (Production Mode)

4. Run the production build:
   - Run `bun run deploy` with timeout of BUILD_TIMEOUT
   - This will:
     - Check branch guard (fails if NOT on main)
     - Build with production mode (uses .env.production)
     - Deploy to Cloudflare production
   - Capture both stdout and stderr output

5. Check build result:
   - If build succeeds (exit code 0):
     - Verify that `app/dist` directory exists and contains files
     - Proceed to Deployment Phase
   - If build fails (non-zero exit code):
     - Parse error messages to identify the specific issues
     - Attempt to fix the error:
       - Read the relevant files mentioned in the error
       - Implement a targeted fix for the specific error
       - Commit the fix individually with message: "fix: resolve build error - <brief description>"
       - Run `bun run build` again (production mode)
     - Repeat fix attempts up to MAX_BUILD_ATTEMPTS times
     - If all attempts fail, stop and report the final error to the user

### Deployment Phase: Deploy to Cloudflare Production

6. Deployment (handled by deploy script):
   - Deploys to production on Cloudflare Pages
   - Capture deployment output including the deployment URL
   - Verify deployment succeeds (exit code 0)
   - If deployment fails:
     - Report the error to the user
     - Stop execution (do not push to GitHub)

### Post-Deployment: Push to GitHub

7. Push all commits to GitHub:
   - Run `git push origin main` to push main branch
   - Verify push succeeds
   - If push fails (e.g., rejected, no upstream):
     - Report the error to the user
     - Provide the command they need to run manually

## Environment

- Uses `.env.production` for Supabase configuration
- Deploys to production on Cloudflare (live URL)
- ONLY allowed on main/master branches

## Report

Provide a summary with:
1. Branch check status
2. Number of commits created (initial + any fixes)
3. Build status (success or failure after N attempts)
4. Deployment URL from Cloudflare (production)
5. GitHub push status (success or failure)

Example output:
```
Production Deployment Summary:
✓ Branch guard passed (on: main)
✓ Committed all local changes
✓ Build succeeded on attempt 1 (production mode)
✓ Deployed to Cloudflare Production: https://splitlease.pages.dev
✓ Pushed 1 commit to GitHub (branch: main)
```

If there were build fixes:
```
Production Deployment Summary:
✓ Branch guard passed (on: main)
✓ Committed all local changes
✓ Build succeeded on attempt 2 (1 fix applied)
  - fix: resolve build error - missing import in components/Header.tsx
✓ Deployed to Cloudflare Production: https://splitlease.pages.dev
✓ Pushed 2 commits to GitHub (branch: main)
```

If blocked on non-main branch:
```
Production Deployment Failed:
✗ Cannot deploy to production from development branch
→ Merge to main first, or use /stage for development deployment
```

## Safety Notes

⚠️ **Production Deployment** - This deploys to the live production environment
- Double-check your changes before deploying
- Ensure all tests pass
- Consider using `/stage` first to preview changes
