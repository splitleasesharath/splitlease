# Playwright MCP Task: Console Error Check for Production Listings

## Objective
Use Playwright MCP to systematically check console errors for all 4 hardcoded listings

## Listings to Check
1. **One Platt Studio**: /view-split-lease/1586447992720x748691103167545300
2. **Pied-à-Terre**: /view-split-lease/1701107772942x447054126943830000
3. **Furnished 1BR**: /view-split-lease/1701115344294x620453327586984000
4. **Furnished Studio**: /view-split-lease/1701196985127x160157906679627780

## Required Actions for EACH Listing

### 1. Navigation
- Navigate to the URL
- Wait for page to load completely (wait for network idle or key elements)

### 2. Console Error Capture
- Capture ALL console errors (errors, warnings, logs)
- Specifically identify: "column account_host.Name - First does not exist" error
- Note any other Supabase-related errors
- Record any JavaScript errors or network failures

### 3. Visual Verification
- Take a snapshot of the page state
- Check if host information displays correctly:
  - Host name visible?
  - Host photo visible?
  - Any placeholder/fallback content showing?

### 4. Data Collection
For each listing, record:
- URL tested
- All console errors (with timestamps if available)
- Presence/absence of the specific Supabase error
- Host display status (name, photo)
- Any other anomalies

## Success Criteria
Return a structured comparison showing:
1. **Error Comparison**: Which listings had the Supabase "account_host.Name - First" error?
2. **Error Patterns**: Are the errors identical across all listings or different?
3. **Visual State**: Does host information display correctly on each page?
4. **Hypothesis Testing**:
   - Did ALL 4 listings have the same Supabase error (unreported)?
   - OR only the first listing had the error?

## Output Format
Provide a structured report with:
- Individual listing results (URL, errors, visual state)
- Comparative analysis (which had errors, which didn't)
- Pattern identification (same error across all vs. isolated)
- Recommendations based on findings

## Technical Notes
- Use Playwright MCP browser automation
- Implement proper wait strategies for dynamic content
- Capture full console output, not just errors
- Take screenshots for visual verification
- Close browser properly after completion
