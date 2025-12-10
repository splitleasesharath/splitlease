# Preview
> Start the development server on port 8000 and open it in a browser for preview.

## Instructions

1. First, kill any existing processes using port 8000 on Windows:
   - Use `netstat -ano | findstr :8000` to find processes
   - Use `taskkill /PID <pid> /F` to kill any found processes

2. Start the dev server in the background:
   - Run `bun run dev` with port 8000
   - Wait for the server to be ready (check for "ready" or "Local:" in output)

3. Use the mcp-tool-specialist subagent to:
   - Navigate to http://localhost:8000 using Playwright MCP
   - Take a snapshot to verify the page loaded correctly
   - Keep the browser session open for the user to interact with

4. Report the status to the user:
   - Confirm the server is running
   - Confirm the browser opened successfully
   - Provide the URL for reference
