# Deploy to Development (Staging)

Build and deploy the Split Lease application to the development branch on Cloudflare Pages, with automatic build error fixing and GitHub push.

## Purpose

Deploy the application to the development environment while ensuring:
- Cannot run on main branch (blocked by branch guard)
- All local changes are committed before deployment
- Build succeeds using development Supabase project
- Application is successfully deployed to Cloudflare development branch
- All changes (including fixes) are pushed to GitHub

## Variables

PROJECT_ROOT: /splitlease (git root directory)
BUILD_TIMEOUT: 10 minutes
MAX_BUILD_ATTEMPTS: 3
BRANCH_RESTRICTION: NOT main/master

## Instructions

### Pre-Deployment: Branch Check

0. Verify current branch:
   - The `bun run deploy:dev` command has a built-in branch guard
   - It will automatically fail if you're on the main branch
   - If blocked, switch to a development branch first

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

### Build Phase: Build with Auto-Fix (Development Mode)

4. Run the development build:
   - Run `bun run deploy:dev` with timeout of BUILD_TIMEOUT
   - This will:
     - Check branch guard (fails if on main)
     - Build with `--mode development` (uses .env.development)
     - Deploy to Cloudflare development branch
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
       - Run `bun run build:dev` again
     - Repeat fix attempts up to MAX_BUILD_ATTEMPTS times
     - If all attempts fail, stop and report the final error to the user

### Deployment Phase: Deploy to Cloudflare Development

6. Deployment (handled by deploy:dev script):
   - Deploys to `--branch development` on Cloudflare Pages
   - This creates a preview deployment separate from production
   - Capture deployment output including the deployment URL
   - Verify deployment succeeds (exit code 0)
   - If deployment fails:
     - Report the error to the user
     - Stop execution (do not push to GitHub)

### Post-Deployment: Push to GitHub

7. Push all commits to GitHub:
   - Run `git push origin $(git branch --show-current)` to push current branch
   - Verify push succeeds
   - If push fails (e.g., rejected, no upstream):
     - Report the error to the user
     - Provide the command they need to run manually

## Environment

- Uses `.env.development` for Supabase configuration
- Deploys to development branch on Cloudflare (preview URL)
- BLOCKED on main/master branches

## Report

Provide a summary with:
1. Branch check status
2. Number of commits created (initial + any fixes)
3. Build status (success or failure after N attempts)
4. Deployment URL from Cloudflare (development preview)
5. GitHub push status (success or failure)

Example output:
```
Development Deployment Summary:
✓ Branch guard passed (on: feature/new-feature)
✓ Committed all local changes
✓ Build succeeded on attempt 1 (development mode)
✓ Deployed to Cloudflare Development: https://development.splitlease.pages.dev
✓ Pushed 1 commit to GitHub (branch: feature/new-feature)
```

If blocked on main:
```
Development Deployment Failed:
✗ Cannot deploy to development from main branch
→ Switch to a development branch first
→ Or use /ship to deploy to production
```
