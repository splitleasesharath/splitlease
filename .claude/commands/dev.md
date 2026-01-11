# Start Development Server

Start the local Vite development server for the Split Lease application.

## Purpose

Start the development server with hot module replacement for local development. Always uses the development Supabase project configuration.

## Variables

PROJECT_ROOT: /splitlease (git root directory)
DEV_PORT: 8000
DEV_URL: http://localhost:8000

## Instructions

### Pre-Start Checks

1. Navigate to the project root:
   - Run `cd $(git rev-parse --show-toplevel)` to ensure you're in the git root

2. Kill any existing development servers:
   - Kill any processes running on port 8000
   - This prevents port conflicts

### Start Server

3. Start the development server:
   - Run `bun run dev` from the project root
   - This will:
     - Install dependencies if needed
     - Start Vite dev server on port 8000
     - Enable hot module replacement (HMR)
     - Use development Supabase project (.env.development)

4. Verify server started:
   - Check that server is running on http://localhost:8000
   - Confirm no error messages in output
   - If errors occur, report them to the user

## Environment

- Uses `.env.development` for Supabase configuration
- Always uses development Supabase project (regardless of git branch)
- Changes are reflected immediately via HMR

## Report

Provide a summary with:
1. Server status (running or failed)
2. URL where the app is accessible
3. Any warnings or errors encountered

Example output:
```
Development Server Started:
✓ Server running at http://localhost:8000
✓ Using development Supabase project
✓ Hot module replacement enabled
```

If there are errors:
```
Development Server Failed:
✗ Port 8000 is already in use
→ Kill existing process or use a different port
```
