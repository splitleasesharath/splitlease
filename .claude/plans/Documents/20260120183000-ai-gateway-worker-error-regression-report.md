# AI Gateway WORKER_ERROR Regression Report

**Date**: January 20, 2026
**Severity**: Critical (complete service outage)
**Duration**: ~5 days (Jan 15 - Jan 20, 2026)
**Fix Commit**: `42b458ae` (tagged: `ai-gateway-fix-v1`)
**Breaking Commit**: `0204aabf`

---

## Executive Summary

The `ai-gateway` Supabase Edge Function experienced a complete outage due to a **JavaScript template literal syntax error** introduced in commit `0204aabf`. The error caused Deno to crash during module initialization, returning HTTP 500 for ALL requests including CORS preflight (OPTIONS), which manifested as CORS errors in the browser.

**Root Cause**: Using `${{variable}}` patterns inside JavaScript template literals in prompt files, where `${{` is interpreted by JavaScript as attempted string interpolation.

---

## Timeline

| Date | Commit | Event |
|------|--------|-------|
| Jan 15, 11:03 | `fdc941a4` | **Working**: AI transcription tool added to create-suggested-proposal page |
| Jan 15, 19:03 | `0204aabf` | **Breaking**: Negotiation summary prompts added with syntax errors |
| Jan 20, ~18:30 | `42b458ae` | **Fixed**: Problematic syntax removed from all 3 prompt files |

---

## The Breaking Commit

### Commit Details

```
Commit: 0204aabf6d9a66e7b8c782690f7f419cb75eda02
Author: Sharath <splitleasesharath@gmail.com>
Date:   Thu Jan 15 19:03:07 2026 -0600

feat(proposals): implement AI-powered negotiation summaries

Add AI-generated personalized summaries for proposal negotiations:
- Create 3 new AI prompts for suggested proposals, counteroffers, and host notifications
- Add negotiationSummaryHelpers.ts with summary generation functions
- Integrate AI summary in create_suggested.ts for Split Lease suggestions
- Integrate AI summary in update.ts for host counteroffers
```

### Files Added

1. `supabase/functions/ai-gateway/prompts/negotiation-summary-suggested.ts`
2. `supabase/functions/ai-gateway/prompts/negotiation-summary-counteroffer.ts`
3. `supabase/functions/ai-gateway/prompts/negotiation-summary-host.ts`
4. `supabase/functions/_shared/negotiationSummaryHelpers.ts`

---

## Technical Root Cause Analysis

### The Problem: JavaScript Template Literal Syntax Conflict

JavaScript template literals use `${expression}` for string interpolation:

```javascript
const name = "Alice";
const greeting = `Hello, ${name}!`; // "Hello, Alice!"
```

The prompt template engine (in `_template.ts`) uses `{{variable}}` syntax for its own interpolation:

```javascript
// Template engine expects this:
userPromptTemplate: `Price per night: {{nightlyPrice}}`
```

### The Bug: Combining Both Syntaxes

The breaking commit used `${{variable}}` inside template literals:

```javascript
// BROKEN CODE (from negotiation-summary-suggested.ts)
userPromptTemplate: `...
- Price per night: ${{nightlyPrice}}
- Total price: ${{totalPrice}}
...`
```

When Deno parses this file, it sees:
- `${{nightlyPrice}}` → JavaScript tries to interpolate `{nightlyPrice}` as an expression
- `{nightlyPrice}` is interpreted as an empty object literal `{}` followed by `nightlyPrice`
- This causes a **parse-time error** during module import

### Why CORS Errors?

The crash occurred during Deno's module import phase, **before any request handler could run**:

```
ai-gateway/index.ts imports:
├── ./prompts/parse-call-transcription.ts  ✓ (no errors)
├── ./prompts/negotiation-summary-suggested.ts  ✗ CRASH
├── ./prompts/negotiation-summary-counteroffer.ts  (never reached)
└── ./prompts/negotiation-summary-host.ts  (never reached)
```

Since the module crashed before initialization:
- **No request handler was available**
- **OPTIONS preflight requests returned HTTP 500** (not 200)
- **Browsers interpreted 500 as CORS failure** → "Response to preflight request doesn't pass access control check"

---

## Problematic Code Samples

### File 1: negotiation-summary-suggested.ts

**BROKEN (lines 26-27):**
```javascript
- Price per night: ${{nightlyPrice}}
- Total price: ${{totalPrice}}
```

**Also problematic (Handlebars syntax not supported):**
```javascript
{{#if previousProposals}}
{{previousProposals}}
{{else}}
No previous proposals on record.
{{/if}}
```

### File 2: negotiation-summary-counteroffer.ts

**BROKEN (lines 22-24, 28-30):**
```javascript
- Price/night: ${{originalNightlyPrice}}
- Total: ${{originalTotalPrice}}
...
- Price/night: ${{counterNightlyPrice}}
- Total: ${{counterTotalPrice}}
```

### File 3: negotiation-summary-host.ts

**BROKEN (lines 21-22):**
```javascript
- Your compensation per night: ${{hostCompensation}}
- Total compensation: ${{totalCompensation}}
```

**Also problematic (Handlebars syntax):**
```javascript
{{#if guestComment}}
Guest's message: "{{guestComment}}"
{{/if}}
```

---

## The Fix

### Changes Made (commit `42b458ae`)

Removed `$` prefix from all `{{variable}}` patterns:

```javascript
// BEFORE (broken)
- Price per night: ${{nightlyPrice}}

// AFTER (fixed)
- Price per night: {{nightlyPrice}}
```

Removed unsupported Handlebars conditionals:

```javascript
// BEFORE (broken - Handlebars not supported)
{{#if previousProposals}}
{{previousProposals}}
{{else}}
No previous proposals on record.
{{/if}}

// AFTER (fixed - plain variable)
{{previousProposals}}
```

### Why This Works

The template engine (`_template.ts`) handles `{{variable}}` interpolation at runtime. The AI model receives the dollar sign as part of the surrounding text context and naturally formats prices with `$` in responses.

---

## Impact Assessment

### Services Affected

| Service | Impact |
|---------|--------|
| AI Transcription Tool | **Complete outage** - parse-call-transcription prompt unreachable |
| Suggested Proposal AI Summary | **Complete outage** - negotiation-summary-suggested unreachable |
| Counteroffer AI Summary | **Complete outage** - negotiation-summary-counteroffer unreachable |
| Host Notification AI Summary | **Complete outage** - negotiation-summary-host unreachable |
| All other ai-gateway prompts | **Complete outage** - entire function crashed |

### User-Facing Symptoms

1. **Create Suggested Proposal page**: AI transcription tool shows "Failed to fetch" error
2. **Console errors**: CORS policy blocking preflight requests
3. **Network tab**: OPTIONS requests returning 500 instead of 200

---

## Lessons Learned

### 1. Template Literal + Custom Template Engine = Risk

When using `{{variable}}` template syntax inside JavaScript template literals (backticks), avoid any character sequence that could be interpreted as JavaScript interpolation:

| Pattern | Interpretation | Result |
|---------|----------------|--------|
| `{{var}}` | Custom template | ✅ Works |
| `${{var}}` | JavaScript tries to interpolate `{var}` | ❌ Parse error |
| `${var}` | JavaScript interpolation | ✅ Works (if var is defined) |

### 2. Edge Function Testing Gaps

The breaking commit was not caught because:
- Unit tests may not have covered module initialization
- Local testing may have used different Deno version/settings
- CORS behavior differs between local and deployed environments

### 3. Deploy Verification

After deploying Edge Functions, verify:
1. OPTIONS preflight returns HTTP 200
2. Basic POST requests succeed
3. Existing functionality still works (regression testing)

---

## Recommendations

### Immediate

1. ✅ **Applied**: Tag the fix commit for easy reference
2. **Recommended**: Add pre-commit hook to scan for `${{` patterns in `.ts` files

### Short-term

1. Add smoke test for ai-gateway deployment:
   ```bash
   curl -X OPTIONS https://<project>.supabase.co/functions/v1/ai-gateway
   # Must return HTTP 200
   ```

2. Document template engine syntax rules in prompt file header comments

### Long-term

1. Consider using regular strings (single/double quotes) instead of template literals for prompt templates, to avoid this class of errors entirely
2. Add ESLint rule to warn about `${{` patterns in template literals

---

## Appendix: Verification Commands

```bash
# Test OPTIONS preflight
curl -X OPTIONS https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/ai-gateway

# Test parse-call-transcription endpoint
curl -X POST https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/ai-gateway \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon-key>" \
  -d '{"action":"complete","payload":{"prompt_key":"parse-call-transcription","variables":{"transcription":"Test"}}}'
```

---

## File References

| File | Purpose |
|------|---------|
| [supabase/functions/ai-gateway/index.ts](../../../supabase/functions/ai-gateway/index.ts) | Main entry point (imports all prompts) |
| [supabase/functions/ai-gateway/prompts/_template.ts](../../../supabase/functions/ai-gateway/prompts/_template.ts) | Template interpolation engine |
| [supabase/functions/ai-gateway/prompts/_registry.ts](../../../supabase/functions/ai-gateway/prompts/_registry.ts) | Prompt registration system |
| [supabase/functions/ai-gateway/prompts/negotiation-summary-suggested.ts](../../../supabase/functions/ai-gateway/prompts/negotiation-summary-suggested.ts) | Fixed prompt file |
| [supabase/functions/ai-gateway/handlers/complete.ts](../../../supabase/functions/ai-gateway/handlers/complete.ts) | Non-streaming completion handler |
| [app/src/islands/pages/CreateSuggestedProposalPage/suggestedProposalService.js](../../../app/src/islands/pages/CreateSuggestedProposalPage/suggestedProposalService.js) | Frontend service calling ai-gateway |
