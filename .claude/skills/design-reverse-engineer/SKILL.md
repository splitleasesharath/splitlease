---
name: design-reverse-engineer
description: |
  Reverse-engineers the visual design (HTML, CSS, styling) of a target website and applies it to Split Lease's public pages.
  Use when: (1) User wants to match the look/feel of another website, (2) User provides a URL to use as design inspiration,
  (3) User wants to polish/redesign public pages based on a reference site.
  Triggers: "match this design", "make our site look like", "reverse engineer the design of", "copy the styling from",
  "polish our pages like", "use this website as design reference".
  IMPORTANT: This skill is designed for external use only. It will refuse to run inside the splitleasesharath GitHub account
  to prevent accidental modifications to the production codebase.
---

# Design Reverse Engineer

Capture and apply visual design patterns from reference websites to Split Lease's public pages.

## Pre-Flight Check

Before executing, verify the codebase is NOT the splitleasesharath GitHub account:

```bash
git remote -v | grep -i "splitleasesharath"
```

**If the remote contains "splitleasesharath"**: STOP and inform the user this skill is for external use only.

**If no match**: Proceed with the workflow.

## Target Pages (Public, Non-Authenticated)

Only these pages are in scope for design updates:

| Page | Route | File |
|------|-------|------|
| Homepage | `/` | `index.html` |
| Search | `/search` | `search.html` |
| View Listing | `/view-split-lease/:id` | `view-split-lease.html` |
| FAQ | `/faq` | `faq.html` |
| Policies | `/policies` | `policies.html` |
| List With Us | `/list-with-us` | `list-with-us.html` |
| Why Split Lease | `/why-split-lease` | `why-split-lease.html` |
| Careers | `/careers` | `careers.html` |
| About Us | `/about-us` | `about-us.html` |
| Host Guarantee | `/host-guarantee` | `host-guarantee.html` |
| Referral | `/referral` | `referral.html` |
| Help Center | `/help-center` | `help-center.html` |

See [references/public-pages.md](references/public-pages.md) for component mapping.

## Workflow

### Phase 1: Capture Reference Design

Use Playwright MCP to analyze the target website:

1. **Navigate and Screenshot**
   ```
   mcp__playwright__browser_navigate → target URL
   mcp__playwright__browser_take_screenshot → full page
   mcp__playwright__browser_snapshot → DOM structure
   ```

2. **Extract Design Elements**
   - Colors (backgrounds, text, accents)
   - Typography (fonts, sizes, weights, line-heights)
   - Spacing patterns (margins, padding)
   - Layout structure (grid, flexbox patterns)
   - Component styles (buttons, cards, headers, footers)
   - Hover/interaction states
   - Shadows, borders, border-radius

3. **Document Captured Styles**
   Create a design spec in `.claude/plans/New/YYYYMMDDHHMMSS-design-capture-<site-name>.md`:
   ```markdown
   # Design Capture: [Target Site Name]

   ## Color Palette
   - Primary: #xxx
   - Secondary: #xxx
   - Background: #xxx
   - Text: #xxx
   - Accent: #xxx

   ## Typography
   - Headings: Font Family, weights, sizes
   - Body: Font Family, weights, sizes
   - Line Heights: values

   ## Spacing
   - Base unit: Xpx
   - Common margins/padding

   ## Components
   - Buttons: styles
   - Cards: styles
   - Navigation: styles
   ```

### Phase 2: Map to Split Lease Components

For each target page, identify corresponding components:

```
app/src/islands/pages/[PageName]/
├── [PageName].jsx              # Page component
├── use[PageName]PageLogic.js   # Logic hook
└── components/                 # Page-specific components

app/src/islands/shared/         # Shared components
app/src/styles/                 # CSS files
├── variables.css               # CSS custom properties (update here first)
└── [page].css                  # Page-specific styles
```

### Phase 3: Apply Design Changes

**CRITICAL RULE**: Preserve ALL content and functionality. Only change visual styling.

1. **Update CSS Variables** (`app/src/styles/variables.css`)
   - Update color variables to match captured palette
   - Update typography variables
   - Update spacing variables

2. **Update Component Styles**
   - Match component layouts to reference
   - Apply captured styling patterns
   - Preserve responsive breakpoints

3. **Preserve Content**
   - DO NOT change text content
   - DO NOT change functionality
   - DO NOT change data structures
   - DO NOT change API calls

### Phase 4: Verify Changes

1. Run dev server: `bun run dev`
2. Navigate to each modified page
3. Screenshot comparison using Playwright:
   ```
   mcp__playwright__browser_navigate → localhost:8000/[route]
   mcp__playwright__browser_take_screenshot → capture result
   ```
4. Verify content is intact
5. Verify functionality works

## MCP Tool Usage

All Playwright MCP calls MUST go through `mcp-tool-specialist` subagent:

```
Task tool → subagent_type: "mcp-tool-specialist"
Prompt: "Use Playwright MCP to [specific action]"
```

Available Playwright tools:
- `mcp__playwright__browser_navigate` - Navigate to URL
- `mcp__playwright__browser_take_screenshot` - Capture page screenshot
- `mcp__playwright__browser_snapshot` - Get DOM structure
- `mcp__playwright__browser_evaluate` - Execute JS to extract computed styles
- `mcp__playwright__browser_click` - Interact with elements
- `mcp__playwright__browser_wait_for` - Wait for elements

## Extraction Patterns

See [references/extraction-patterns.md](references/extraction-patterns.md) for JavaScript snippets to extract:
- Color values from computed styles
- Font information
- Spacing measurements
- Layout analysis

## Output: Design Implementation Plan

After capture, create implementation plan in `.claude/plans/New/`:

```markdown
# Design Implementation Plan: Apply [Site Name] Design to Split Lease

## Source
- URL: [target URL]
- Captured: [timestamp]

## Design Spec Reference
- File: [path to design capture file]

## Changes by File

### app/src/styles/variables.css
- [specific variable changes]

### app/src/styles/[page].css
- [specific style changes]

### app/src/islands/shared/[Component].jsx
- [specific component changes]

## Verification Steps
1. [step]
2. [step]

## Rollback
If issues arise, revert via git:
`git checkout -- app/src/styles/ app/src/islands/`
```

## Constraints

1. **External Use Only** - Will not run on splitleasesharath repository
2. **Public Pages Only** - Only modify pages listed in Target Pages
3. **Content Preservation** - Never modify text, data, or functionality
4. **CSS Variables First** - Start with variables.css for global changes
5. **No Breaking Changes** - Preserve all responsive behavior
6. **MCP Through Subagent** - All Playwright calls via mcp-tool-specialist

## References

- [references/public-pages.md](references/public-pages.md) - Detailed page component mapping
- [references/extraction-patterns.md](references/extraction-patterns.md) - JS extraction snippets
