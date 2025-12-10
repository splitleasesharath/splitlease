# Deploy to Cloudflare

Build and deploy the Split Lease application to Cloudflare Pages, with automatic build error fixing and GitHub push.

## Purpose

Deploy the application to production on Cloudflare Pages while ensuring:
- All local changes are committed before deployment
- Build succeeds (with automatic fix attempts if it fails)
- Application is successfully deployed to Cloudflare
- All changes (including fixes) are pushed to GitHub
- When a build fails, DO NOT PUSH STALE/Outdated Builds. Fix and run build again

## Variables

PROJECT_ROOT: /splitlease (git root directory)
BUILD_TIMEOUT: 10 minutes
MAX_BUILD_ATTEMPTS: 3

## Instructions

### Pre-Deployment: Commit All Changes

0. Kill all existing bun/npm servers

1. Navigate to the project root:
   - Run `cd $(git rev-parse --show-toplevel)` to ensure you're in the git root

2. Stage and commit all current changes:
   - Run `git add -A` to stage all changes
   - Run `git diff --cached --stat` to see what will be committed
   - If there are changes:
     - Generate a descriptive commit message based on the staged changes
     - Run `git commit -m "<commit_message>"`
     - Use present tense (e.g., "update", "fix", "add")
     - git pull changes from remote. Proceed further only when pull is run successfully
   - If no changes, skip this step

### Build Phase: Build with Auto-Fix

3. Run the build:
   - Run `bun run build` with timeout of BUILD_TIMEOUT
   - Capture both stdout and stderr output

4. Check build result:
   - If build succeeds (exit code 0):
     - Verify that `app/dist` directory exists and contains files
     - Proceed to Deployment Phase
   - If build fails (non-zero exit code):
     - Parse error messages to identify the specific issues
     - Attempt to fix the error:
       - Read the relevant files mentioned in the error
       - Implement a targeted fix for the specific error
       - Commit the fix individually with message: "fix: resolve build error - <brief description>"
       - Run `bun run build` again
     - Repeat fix attempts up to MAX_BUILD_ATTEMPTS times
     - If all attempts fail, stop and report the final error to the user

### Deployment Phase: Deploy to Cloudflare

5. Deploy to Cloudflare Pages:
   - Run `npx wrangler pages deploy app/dist --project-name splitlease`
   - Capture deployment output including the deployment URL
   - Verify deployment succeeds (exit code 0)
   - If deployment fails:
     - Report the error to the user
     - Stop execution (do not push to GitHub)

### Post-Deployment: Push to GitHub

6. Push all commits to GitHub:
   - Run `git push origin $(git branch --show-current)` to push current branch
   - Verify push succeeds
   - If push fails (e.g., rejected, no upstream):
     - Report the error to the user
     - Provide the command they need to run manually

## Report

Provide a summary with:
1. Number of commits created (initial + any fixes)
2. Build status (success or failure after N attempts)
3. Deployment URL from Cloudflare
4. GitHub push status (success or failure)

Example output:
```
Deployment Summary:
✓ Committed all local changes
✓ Build succeeded on attempt 1
✓ Deployed to Cloudflare: https://splitlease.pages.dev
✓ Pushed 1 commit to GitHub (branch: development)
```

If there were build fixes:
```
Deployment Summary:
✓ Committed all local changes
✓ Build succeeded on attempt 2 (1 fix applied)
  - fix: resolve build error - missing import in components/Header.tsx
✓ Deployed to Cloudflare: https://splitlease.pages.dev
✓ Pushed 2 commits to GitHub (branch: development)
```
