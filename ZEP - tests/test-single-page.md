# Single Page Test: /help-center

**Chunk**: CHUNK 8 - Replace .push() in helpCenterData.js:280
**Affected Page**: `/help-center`

## Test URLs

- **Live**: https://split.lease/help-center
- **Local Dev**: http://localhost:8000/help-center

## Manual Validation Steps

### 1. Visual Comparison
- [ ] Open both URLs side-by-side
- [ ] Check that layout is identical
- [ ] Check that all sections render the same
- [ ] Check that search functionality works on both

### 2. Search Functionality Test
- [ ] Search for "proposal" in both environments
- [ ] Verify same articles are returned
- [ ] Verify article order is the same
- [ ] Check that article metadata (category, section) displays correctly

### 3. Console Check
- [ ] Open DevTools console on both pages
- [ ] Verify no errors in either environment
- [ ] Check for any warnings or differences

### 4. Network Traffic
- [ ] Check that same API calls are made
- [ ] Verify response structures are identical
- [ ] Check for any failed requests

## Automated Test (Claude for Chrome)

```javascript
// Test script for Claude for Chrome
const pages = [
  {
    name: 'help-center',
    live: 'https://split.lease/help-center',
    local: 'http://localhost:8000/help-center',
    interactions: [
      'search:proposal',
      'click:first-article',
      'scroll:bottom'
    ]
  }
];

// Test each page
for (const page of pages) {
  console.log(`Testing: ${page.name}`);

  // Open both URLs
  await openBoth(page.live, page.dev);

  // Wait for page load
  await waitForLoad();

  // Compare DOM structure
  const domMatch = await compareDOMs();
  console.log(`DOM match: ${domMatch ? 'PASS' : 'FAIL'}`);

  // Compare console logs
  const consoleMatch = await compareConsoleLogs();
  console.log(`Console match: ${consoleMatch ? 'PASS' : 'FAIL'}`);

  // Test interactions
  for (const interaction of page.interactions) {
    await performInteraction(interaction);
    const interactionMatch = await compareAfterInteraction();
    console.log(`Interaction "${interaction}": ${interactionMatch ? 'PASS' : 'FAIL'}`);
  }
}
```

## Expected Result

✅ **PASS**: All tests should pass because CHUNK 8 only refactors internal implementation (`.push()` → `.flatMap()`). The output and behavior of `searchHelpArticles()` function is identical.

## Notes

- This is a **SAFE** chunk to test because it's a pure refactor
- No UI changes expected
- No API changes expected
- Only internal code structure changes

---

**Next Step**: If this test passes, we know the dual environment setup works correctly!
