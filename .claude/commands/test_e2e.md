# E2E Test Runner

Execute end-to-end (E2E) tests using Playwright browser automation (MCP Server). If any errors occur and assertions fail mark the test as failed and explain exactly what went wrong.

## Variables

adw_id: $ARGUMENT if provided, otherwise generate a random 8 character hex string
agent_name: $ARGUMENT if provided, otherwise use 'test_e2e'
e2e_test_file: $ARGUMENT
application_url: $ARGUMENT if provided, otherwise use http://localhost:8000 (Split Lease Search Page server)

## Instructions

- If `application_url` was not provided, use default http://localhost:8000
- Verify the application is running (if server returns error, the test setup failed)
- Read the `e2e_test_file`
- Digest the `User Story` to first understand what we're validating
- IMPORTANT: Execute the `Test Steps` detailed in the `e2e_test_file` using Playwright browser automation
- Review the `Success Criteria` and if any of them fail, mark the test as failed and explain exactly what went wrong
- Review the steps that say '**Verify**...' and if they fail, mark the test as failed and explain exactly what went wrong
- Capture screenshots as specified
- IMPORTANT: Return results in the format requested by the `Output Format`
- Initialize Playwright browser in headed mode for visibility
- Use the determined `application_url`
- Allow time for async operations and element visibility (React Islands like SearchScheduleSelector, ContactHost, and AiSignup may take time to mount)
- IMPORTANT: After taking each screenshot, save it to `Screenshot Directory` with descriptive names. Use absolute paths to move the files to the `Screenshot Directory` with the correct name.
- Capture and report any errors encountered
- Ultra think about the `Test Steps` and execute them in order
- If you encounter an error, mark the test as failed immediately and explain exactly what went wrong and on what step it occurred. For example: '(Step 1 ❌) Failed to find element with selector ".header" on page "http://localhost:8000"'
- Use `pwd` or equivalent to get the absolute path to the codebase for writing and displaying the correct paths to the screenshots

## Setup

Before running E2E tests, ensure the Split Lease Search Page application is prepared:

1. **Install Dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Build React Components** (if not already built):
   ```bash
   npm run build:components
   ```
   This builds the ScheduleSelector React component to `dist/schedule-selector.js`

3. **Start Development Server**:
   ```bash
   python -m http.server 8000
   ```
   OR use the Python server script:
   ```bash
   npm start
   ```

4. **Verify Server is Running**:
   - Navigate to http://localhost:8000 and ensure the page loads
   - Check that React components mount correctly:
     - Schedule Selector (7-day picker at top of filters)
     - Contact Host Modal
     - AI Signup Modal
   - Verify Google Maps loads with property markers
   - Confirm Supabase data loads (boroughs and neighborhoods populate in dropdowns)

## Screenshot Directory

<absolute path to codebase>/agents/<adw_id>/<agent_name>/img/<directory name based on test file name>/*.png

Each screenshot should be saved with a descriptive name that reflects what is being captured. The directory structure ensures that:
- Screenshots are organized by ADW ID (workflow run)
- They are stored under the specified agent name (e.g., e2e_test_runner_0, e2e_test_resolver_iter1_0)
- Each test has its own subdirectory based on the test file name (e.g., test_basic_query → basic_query/)

## Report

- Exclusively return the JSON output as specified in the test file
- Capture any unexpected errors
- IMPORTANT: Ensure all screenshots are saved in the `Screenshot Directory`

### Output Format

```json
{
  "test_name": "Test Name Here",
  "status": "passed|failed",
  "screenshots": [
    "<absolute path to codebase>/agents/<adw_id>/<agent_name>/img/<test name>/01_<descriptive name>.png",
    "<absolute path to codebase>/agents/<adw_id>/<agent_name>/img/<test name>/02_<descriptive name>.png",
    "<absolute path to codebase>/agents/<adw_id>/<agent_name>/img/<test name>/03_<descriptive name>.png"
  ],
  "error": null
}
```