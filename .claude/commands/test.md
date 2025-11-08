# Application Validation Test Suite

Execute comprehensive validation tests for the Split Lease Search Page application, returning results in a standardized JSON format for automated processing.

## Purpose

Proactively identify and fix issues in the Split Lease Search Page application before they impact users or developers. By running this comprehensive test suite, you can:
- Detect TypeScript type errors in React components
- Identify broken builds or invalid component bundles
- Verify React component builds succeed
- Ensure JavaScript modules load without errors
- Validate configuration files are properly formatted
- Ensure the application is in a healthy state

## Variables

TEST_COMMAND_TIMEOUT: 5 minutes

## Instructions

- Execute each test in the sequence provided below
- Capture the result (passed/failed) and any error messages
- IMPORTANT: Return ONLY the JSON array with test results
  - IMPORTANT: Do not include any additional text, explanations, or markdown formatting
  - We'll immediately run JSON.parse() on the output, so make sure it's valid JSON
- If a test passes, omit the error field
- If a test fails, include the error message in the error field
- Execute all tests even if some fail
- Error Handling:
  - If a command returns non-zero exit code, mark as failed and immediately stop processing tests
  - Capture stderr output for error field
  - Timeout commands after `TEST_COMMAND_TIMEOUT`
  - IMPORTANT: If a test fails, stop processing tests and return the results thus far
- Test execution order is important - dependencies should be validated first
- All file paths are relative to the project root
- Always run `pwd` and `cd` before each test to ensure you're operating in the correct directory for the given test

## Test Execution Sequence

### Split Lease Search Page Tests

1. **Dependencies Installation**
   - Preparation Command: None
   - Command: `npm install`
   - test_name: "dependencies_install"
   - test_purpose: "Ensures all npm dependencies are installed correctly, including React, TypeScript, Vite, Playwright, styled-components, and framer-motion"

2. **TypeScript Type Check**
   - Preparation Command: None
   - Command: `npx tsc --noEmit`
   - test_name: "typescript_check"
   - test_purpose: "Validates TypeScript type correctness for React components (ScheduleSelector, ContactHost, AiSignup) without generating output files, catching type errors, missing imports, and incorrect function signatures"

3. **React Component Build**
   - Preparation Command: None
   - Command: `npm run build:components`
   - test_name: "react_component_build"
   - test_purpose: "Builds React components using Vite, compiling ScheduleSelector TypeScript component to dist/schedule-selector.js, ensuring successful bundle generation"

4. **Built Component Validation**
   - Preparation Command: None
   - Command: `test -f dist/schedule-selector.js && echo "Schedule selector bundle exists"`
   - test_name: "built_component_validation"
   - test_purpose: "Verifies that the compiled schedule-selector.js bundle exists in the dist/ directory after build"

5. **JavaScript Syntax Check**
   - Preparation Command: None
   - Command: `node -c js/app.js && node -c js/supabase-api.js && node -c js/filter-config.js`
   - test_name: "javascript_syntax_check"
   - test_purpose: "Validates JavaScript syntax for core application files (app.js, supabase-api.js, filter-config.js) to catch syntax errors before runtime"

6. **Configuration File Validation**
   - Preparation Command: None
   - Command: `node -c js/config.js`
   - test_name: "config_validation"
   - test_purpose: "Verifies that configuration files are syntactically correct and can be loaded without errors"

7. **HTML Validation**
   - Preparation Command: None
   - Command: `grep -q 'schedule-selector-root' index.html && echo "HTML structure valid"`
   - test_name: "html_structure_validation"
   - test_purpose: "Checks that index.html contains required mount points for React components (schedule-selector-root, info-text-root)"

## Report

- IMPORTANT: Return results exclusively as a JSON array based on the `Output Structure` section below.
- Sort the JSON array with failed tests (passed: false) at the top
- Include all tests in the output, both passed and failed
- The execution_command field should contain the exact command that can be run to reproduce the test
- This allows subsequent agents to quickly identify and resolve errors

### Output Structure

```json
[
  {
    "test_name": "string",
    "passed": boolean,
    "execution_command": "string",
    "test_purpose": "string",
    "error": "optional string"
  },
  ...
]
```

### Example Output

```json
[
  {
    "test_name": "component_build",
    "passed": false,
    "execution_command": "cd app/split-lease/components && npm run build",
    "test_purpose": "Validates the complete component build process, compiling React components to UMD bundles via Vite",
    "error": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'"
  },
  {
    "test_name": "component_contract_tests",
    "passed": true,
    "execution_command": "cd app/test-harness && npx playwright test --grep \"contract\"",
    "test_purpose": "Validates component contracts using Playwright browser tests, ensuring components render without errors"
  }
]
```