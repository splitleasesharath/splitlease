# Preview
> Start the development server on port 5173 and open it in a browser for preview.

## Instructions

1. First, kill any existing processes using port 5173 on Windows:
   - Use `netstat -ano | findstr :5173` to find processes
   - Use `taskkill /PID <pid> /F` to kill any found processes

2. Start the dev server in the background:
   - Run `npm run dev` with port 5173
   - Wait for the server to be ready (check for "ready" or "Local:" in output)

