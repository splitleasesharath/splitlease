# FP Refactor Testing - Quick Start Guide

## Local Dev + Live Testing Workflow

This workflow lets you test your functional programming refactors **locally** (no Cloudflare deployments needed) against the live production site.

---

## Prerequisites

1. **Live site running**: https://split.lease
2. **Local dev server**: `bun run dev` at http://localhost:8000
3. **Audit file**: `.claude/plans/New/20260111132021_fp_refactor_plan.md` (or latest)

---

## Step-by-Step Workflow

### Step 1: Start Your Dev Server

```bash
cd "C:\Users\Split Lease\Documents\Split Lease - Dev"
bun run dev
```

✅ **Verify**: http://localhost:8000 loads correctly

---

### Step 2: Choose Chunks to Refactor

Pick a small bundle of chunks (1-5 at a time). Start with safe chunks that only affect a single page.

**Recommended first chunk**: CHUNK 8 (only affects `/help-center`)

```bash
# See which pages are affected by CHUNK 8
node scripts/extract-affected-pages.js .claude/plans/New/20260111132021_fp_refactor_plan.md 8
```

**Output**:
```
📍 AFFECTED PAGES:
/help-center
  Chunks: 8

🌐 TEST URLS:
Page: /help-center
  Live:  https://split.lease/help-center
  Local: http://localhost:8000/help-center
```

---

### Step 3: Test BEFORE Refactoring (Baseline)

Before making ANY changes, verify both environments are identical:

1. Open both URLs in separate tabs:
   - Live: https://split.lease/help-center
   - Local: http://localhost:8000/help-center

2. **Visual Check**:
   - [ ] Do they look identical?
   - [ ] Any layout differences?

3. **Console Check** (F12 → Console tab):
   - [ ] Any errors on either site?
   - [ ] Any warnings or differences?

4. **Interaction Test**:
   - [ ] Try searching for "proposal" on both
   - [ ] Click on an article on both
   - [ ] Verify results are identical

**✅ PASS**: Both sites should be IDENTICAL (because you haven't refactored yet)

---

### Step 4: Refactor the Code

**CHUNK 8 Example**: Replace `.push()` in `helpCenterData.js:280`

**File**: `app/src/data/helpCenterData.js`

**Before** (lines 299-323):
```javascript
export function searchHelpArticles(query) {
  if (!query || query.trim().length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const results = [];

  Object.entries(helpCenterArticles).forEach(([categoryId, category]) => {
    category.sections.forEach(section => {
      section.articles.forEach(article => {
        const titleMatch = article.title.toLowerCase().includes(normalizedQuery);
        if (titleMatch) {
          results.push({
            ...article,
            categoryId,
            categoryTitle: category.title,
            sectionTitle: section.title
          });
        }
      });
    });
  });

  return results;
}
```

**After** (functional refactor):
```javascript
export function searchHelpArticles(query) {
  if (!query || query.trim().length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();

  return Object.entries(helpCenterArticles).flatMap(([categoryId, category]) =>
    category.sections.flatMap(section =>
      section.articles
        .filter(article => article.title.toLowerCase().includes(normalizedQuery))
        .map(article => ({
          ...article,
          categoryId,
          categoryTitle: category.title,
          sectionTitle: section.title
        }))
    )
  );
}
```

**Save the file** - the dev server should auto-reload.

---

### Step 5: Test AFTER Refactoring

1. **Refresh local dev**: http://localhost:8000/help-center

2. **Compare again**:
   - Live: https://split.lease/help-center
   - Local: http://localhost:8000/help-center

3. **Same checks as Step 3**:
   - [ ] Visual: Still identical?
   - [ ] Console: No new errors?
   - [ ] Search: Same results?
   - [ ] Interaction: Works the same?

**✅ EXPECTED**: Should STILL be identical (pure refactor doesn't change behavior)

---

### Step 6: Repeat for Next Chunk

If Step 5 passes, move to the next chunk in your bundle:

```bash
# Test chunks 8-12 (a small bundle)
node scripts/extract-affected-pages.js .claude/plans/New/20260111132021_fp_refactor_plan.md 8-12
```

Refactor each chunk, test affected pages, verify, move on.

---

## Fast Iteration Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    FAST ITERATION LOOP                          │
└─────────────────────────────────────────────────────────────────┘

1. Extract affected pages for chunk bundle
   → node scripts/extract-affected-pages.js <audit-file> <chunks>

2. Refactor chunk(s) in code
   → Edit source files with FP patterns

3. Check affected pages (auto-reload with bun run dev)
   → Compare http://localhost:8000/<page> vs https://split.lease/<page>

4. Verify no differences
   → Visual, console, interactions

5. If PASS → Move to next bundle
   If FAIL → Debug and fix

6. Commit when bundle complete
   → git add . && git commit -m "Refactor: Chunks 8-12 (help center, search)"
```

**Speed**: ~5-10 minutes per chunk (no Cloudflare deploy wait!)

---

## Tips for Fast Verification

### Quick Visual Check
Open both URLs side-by-side and flip between tabs rapidly. Visual differences will "pop" out.

### Console Diff
1. Open DevTools console on BOTH tabs
2. Perform same action on both (e.g., search)
3. Compare console output - should be identical

### Network Diff
1. Open DevTools Network tab on BOTH tabs
2. Perform same action
3. Check that same API calls are made with same payloads

### Pro Tip: Use Chrome Profiles
Create two Chrome profiles:
- **Profile 1**: Live site only
- **Profile 2**: Local dev only

This keeps sessions separate and prevents auth conflicts.

---

## What to Do When Tests Fail

If you see differences:

1. **Console errors?**
   - Check the error message
   - Fix the syntax/logic issue in your refactor

2. **Wrong search results?**
   - Your refactor logic is incorrect
   - Review the FP transformation (map/filter/flatMap)

3. **Visual difference?**
   - Your refactor may have changed rendering order
   - Check the output structure

4. **Network difference?**
   - Your refactor may have changed when/how APIs are called
   - Review the workflow logic

**Rule**: If behavior changes, the refactor is incorrect. Pure refactors should be **invisible** to users.

---

## Ready to Start?

```bash
# 1. Start dev server
bun run dev

# 2. Pick your first chunk
node scripts/extract-affected-pages.js .claude/plans/New/20260111132021_fp_refactor_plan.md 8

# 3. Open the URLs and verify baseline
# 4. Refactor the chunk
# 5. Test and verify
# 6. Move to next chunk
```

**Good first chunks to try**:
- CHUNK 8: `/help-center` only (safe, isolated)
- CHUNK 9: `/search` and `/view-split-lease` (slightly more complex)
- CHUNK 46: Schedule selector (visual component)

**Avoid until you're confident**:
- CHUNK 1-7: Build configuration (AUTO - affects everything)
- CHUNK 10-11: Auth flows (ALL_AUTHENTICATED - affects many pages)

---

**Questions?** Ask Claude for help debugging specific chunks or test failures.
