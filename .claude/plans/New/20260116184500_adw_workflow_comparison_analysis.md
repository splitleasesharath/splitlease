# ADW Workflow Comparison: Current vs Industry Patterns

**Date:** 2026-01-16
**Purpose:** Objective analysis of whether Audit → Implement → Review is the right workflow pattern

---

## Current ADW Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: AUDIT (Claude Opus) - Single monolithic pass           │
│   • Scans entire target directory                               │
│   • Generates 25+ chunks in one plan file                       │
│   • Groups by page (not by dependency)                          │
│   • ~10 minutes of Opus time                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: PARSE PLAN                                             │
│   • Extract chunks from markdown                                │
│   • Group by affected page                                      │
│   • No dependency analysis                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: DEV SERVER SETUP                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: FOR EACH PAGE GROUP                                    │
│   a. Pre-validate imports (LSP)                                 │
│   b. Implement chunk (Claude Sonnet)                            │
│   c. Post-validate (LSP diagnostics)                            │
│   d. Build check                                                │
│   e. Visual regression check                                    │
│   f. Success → commit, Fail → reset ALL chunks for page         │
└─────────────────────────────────────────────────────────────────┘
```

**Observed Problems:**
1. Audit produces chunks with cross-dependencies not captured in metadata
2. Page-group ordering doesn't respect creation order
3. All-or-nothing reset loses successful chunk work
4. No mechanism to retry failed chunks with different strategies
5. No human approval gates for risky changes

---

## Industry Pattern 1: Google's Large-Scale Changes (LSCs)

**Source:** [Software Engineering at Google - Chapter 22](https://abseil.io/resources/swe-book/html/ch22.html)

### Key Principles

1. **LSCs are NEVER a single phase** - they involve multiple passes:
   - Discovery phase (what needs to change?)
   - Prototype phase (prove the transformation works on samples)
   - Incremental rollout (change 1%, verify, change 10%, verify, etc.)
   - Cleanup phase (remove deprecated code)

2. **Atomic but independent changes** - Each CL (changelist) should:
   - Be independently reviewable
   - Be independently revertable
   - Not depend on other CLs being merged first

3. **Tooling (Rosie) handles thousands of changes/day** by:
   - Generating changes automatically from AST transforms
   - Running global tests to detect breakage
   - Using pattern-based review (not per-change review)
   - Auto-approving low-risk changes

### Comparison to ADW

| Aspect | Google LSC | ADW Current |
|--------|-----------|-------------|
| Change granularity | 1 change = 1 concern | 1 chunk ≈ 1 concern ✓ |
| Dependency handling | Topological ordering | Page-based grouping ✗ |
| Validation | Global test suite | LSP + build + visual ✓ |
| Failure handling | Individual change fails | Entire page group fails ✗ |
| Human review | Pattern-based global | None during execution ✗ |
| Incremental rollout | Yes (1% → 10% → 100%) | All at once ✗ |

### What ADW Should Adopt
- **Per-chunk commit** instead of per-page-group commit
- **Dependency metadata** in chunks for topological sorting
- **Sampling/dry-run phase** before full execution

---

## Industry Pattern 2: Codemod Workflows

**Sources:**
- [Codemod.com Workflow Engine](https://docs.codemod.com/workflows/introduction)
- [Martin Fowler - Refactoring with Codemods](https://martinfowler.com/articles/codemods-api-refactoring.html)

### Key Principles

1. **AST-based transforms are deterministic** - Same input → same output
2. **Workflow YAML declares dependencies explicitly:**
   ```yaml
   nodes:
     - name: create-service
       steps: [...]
     - name: update-imports
       depends_on: [create-service]  # Explicit dependency!
       steps: [...]
   ```

3. **Matrix strategies** for fan-out:
   ```yaml
   matrix:
     file: [file1.js, file2.js, file3.js]
   # Runs transform on all files in parallel
   ```

4. **Manual approval gates** for risky changes:
   ```yaml
   - name: delete-old-service
     approval: required  # Human must approve before proceeding
   ```

### What ADW Should Adopt
- **Explicit dependency declaration** in plan format
- **Topological execution** order
- **Optional human approval gates** for high-risk chunks

---

## Industry Pattern 3: CI/CD Quality Gates

**Sources:**
- [Continuous Integration - Martin Fowler](https://martinfowler.com/articles/continuousIntegration.html)
- [CISIN Enterprise Refactoring Guide](https://www.cisin.com/coffee-break/implementing-automated-code-refactoring-for-software-development.html)

### Standard CI/CD Refactoring Pipeline

```
Code Change
    ↓
Static Analysis (SonarQube, ESLint)
    ↓
Automated Refactoring Tool
    ↓
Unit Tests
    ↓
Integration Tests
    ↓
Quality Gate (complexity, coverage thresholds)
    ↓ PASS
Merge / Deploy
```

### Key Insight: "Quality Gate" Concept

CI/CD pipelines use **quality gates** - quantitative thresholds that must be met:
- Code coverage must not decrease
- Cyclomatic complexity must not increase
- No new critical/blocker issues

**ADW has quality gates** (LSP, build, visual parity) but **lacks incremental measurement**. It doesn't track:
- Did this chunk improve complexity?
- Did this chunk reduce LOC without breaking coverage?

### What ADW Should Adopt
- **Baseline metrics** captured before audit
- **Delta metrics** calculated per chunk
- **Net-positive enforcement** (reject chunks that make things worse)

---

## Structural Analysis: Is Audit → Implement → Review Correct?

### Argument FOR Current Structure

1. **Audit-first is industry standard** - You can't fix what you haven't identified
2. **Separation of concerns** - Opus for planning, Sonnet for execution is reasonable
3. **Safety nets exist** - LSP validation, build checks, visual regression

### Argument AGAINST Current Structure

1. **Monolithic audit creates stale plans** - By the time you reach chunk 20, the codebase may have drifted
2. **No feedback loop** - Failed chunks don't inform future chunk generation
3. **Page-grouping is arbitrary** - It doesn't match actual code dependencies
4. **Review is missing** - There's no human-in-the-loop or AI review of changes

### Critical Gap: **No Planning → Scaffolding → Migration Separation**

Industry patterns typically separate:
1. **Infrastructure creation** (new files, new services)
2. **Migration** (update imports, move code)
3. **Cleanup** (delete old files, remove dead code)

ADW mixes all three in a single plan, leading to the chicken-and-egg problem observed.

---

## Alternative Workflow Architectures

### Option A: Multi-Pass Audit (Recommended)

```
┌─────────────────────────────────────────────────────────────────┐
│ PASS 1: DISCOVER (Claude Opus)                                  │
│   • Scan codebase                                               │
│   • Identify change categories:                                 │
│     - SCAFFOLD: New files to create                             │
│     - MIGRATE: Import/usage updates                             │
│     - CLEANUP: Deletions, logging cleanup                       │
│   • Output: Categorized change list (not execution plan yet)    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASS 2: PLAN SCAFFOLD (Claude Opus)                             │
│   • Generate ONLY new file creation chunks                      │
│   • Each chunk: file path, content, exports                     │
│   • Validate: No external dependencies (pure creation)          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ EXECUTE SCAFFOLD                                                │
│   • Create new files                                            │
│   • Build check (new files exist, exports work)                 │
│   • Commit each file individually                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASS 3: PLAN MIGRATION (Claude Opus)                            │
│   • Now that new files exist, plan import updates               │
│   • Dependency analysis: which files import from where          │
│   • Topological ordering                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ EXECUTE MIGRATION                                               │
│   • Update imports one file at a time                           │
│   • LSP validation per file                                     │
│   • Commit per file (not per page group)                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASS 4: PLAN CLEANUP                                            │
│   • Delete old duplicate files                                  │
│   • Remove console.log statements                               │
│   • Inline style cleanup                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ EXECUTE CLEANUP                                                 │
│   • Safe deletions (no one imports deleted files)               │
│   • Cosmetic changes (logging, styles)                          │
└─────────────────────────────────────────────────────────────────┘
```

**Advantages:**
- No dependency conflicts (scaffold first, then consume)
- Each pass can fail independently
- Human checkpoint between passes
- Smaller, focused plans

**Disadvantages:**
- More Opus invocations (cost)
- Longer total time
- Requires pass coordination

---

### Option B: Dependency-Aware Single Pass

```
┌─────────────────────────────────────────────────────────────────┐
│ AUDIT (Claude Opus) - Enhanced                                  │
│   • Same audit, but each chunk declares:                        │
│     - creates: [list of new files]                              │
│     - depends_on: [chunk numbers]                               │
│     - deletes: [list of files to remove]                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DEPENDENCY ANALYSIS (Python)                                    │
│   • Build dependency graph from chunk metadata                  │
│   • Topological sort                                            │
│   • Detect cycles (fatal error if found)                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ EXECUTE IN DEPENDENCY ORDER                                     │
│   • Run chunks in topological order                             │
│   • Per-chunk commit (not per-page)                             │
│   • Per-chunk reset on failure (don't lose sibling progress)    │
└─────────────────────────────────────────────────────────────────┘
```

**Advantages:**
- Single audit (current cost)
- Explicit dependency handling
- Per-chunk granularity

**Disadvantages:**
- Requires plan format changes
- Opus must understand dependency declaration
- More complex parser

---

### Option C: Codemod-Hybrid (AST + AI)

```
┌─────────────────────────────────────────────────────────────────┐
│ AUDIT (Claude Opus)                                             │
│   • Identify patterns to change                                 │
│   • Output: Pattern descriptions, NOT code                      │
│     Example: "Replace console.log with logger.debug"            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ CODEMOD GENERATION (Claude Opus)                                │
│   • Generate AST transform scripts (jscodeshift)                │
│   • Each codemod is deterministic and testable                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ CODEMOD EXECUTION (jscodeshift)                                 │
│   • Run transforms across codebase                              │
│   • Deterministic: same input → same output                     │
│   • Parallelizable                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ VALIDATION                                                      │
│   • Build check                                                 │
│   • Visual regression (sample pages)                            │
└─────────────────────────────────────────────────────────────────┘
```

**Advantages:**
- Codemods are repeatable and testable
- Scales to large codebases
- Industry-proven (Meta, Google)

**Disadvantages:**
- Significant tooling investment
- Not all changes are AST-expressible
- Requires jscodeshift expertise

---

## Recommendations by Priority

### Immediate (This Week)

1. **Per-chunk commit** instead of per-page-group
   - Change: `git commit` after each successful chunk, not after all chunks in a page
   - Impact: Preserves successful work even if later chunks fail

2. **Per-chunk reset** instead of page-group reset
   - Change: `git checkout -- <file>` instead of `git reset --hard`
   - Impact: Failed chunk doesn't lose sibling progress

### Short-Term (This Month)

3. **Add `depends_on` to chunk metadata**
   - Plan format change: Each chunk declares dependencies
   - Parser change: Build dependency graph, topological sort

4. **Category-based execution order**
   - Execute all SCAFFOLD chunks first
   - Then all MIGRATE chunks
   - Then all CLEANUP chunks

### Medium-Term (This Quarter)

5. **Multi-pass workflow**
   - Separate discovery, scaffolding, migration, cleanup phases
   - Human checkpoint between phases

6. **Baseline metrics**
   - Capture LOC, complexity, console.log count before audit
   - Compare after execution

---

## Conclusion: Is Audit → Implement → Review Correct?

**The phases are correct in principle, but the execution model is flawed.**

| Phase | Principle | Execution |
|-------|-----------|-----------|
| Audit | ✓ Correct - must identify before fixing | ✗ Monolithic, no dependency awareness |
| Implement | ✓ Correct - automated execution | ✗ Wrong granularity (page groups), wrong order (page-based not dependency-based) |
| Review | ✗ Missing - no human or AI review | N/A |

**The fix is not to change the phases, but to:**
1. Add dependency awareness to the audit output
2. Change execution granularity from page-group to individual chunk
3. Add an explicit review step (human or AI) before committing

---

## File References

- [adw_unified_fp_orchestrator.py](../../adws/adw_unified_fp_orchestrator.py) - Main orchestrator
- [chunk_parser.py](../../adws/adw_modules/chunk_parser.py) - Plan parsing
- [lsp_validator.py](../../adws/adw_modules/lsp_validator.py) - Pre-validation
- [20260116161549_code_refactor_plan.md](./20260116161549_code_refactor_plan.md) - Failed plan

## Sources

- [Google Software Engineering - Large-Scale Changes](https://abseil.io/resources/swe-book/html/ch22.html)
- [Codemod.com Workflow Engine](https://docs.codemod.com/workflows/introduction)
- [Martin Fowler - Refactoring with Codemods](https://martinfowler.com/articles/codemods-api-refactoring.html)
- [Chrome LSC Workflow](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/process/lsc/lsc_workflow.md)
- [CISIN Enterprise Refactoring Guide](https://www.cisin.com/coffee-break/implementing-automated-code-refactoring-for-software-development.html)
- [Augment Code - AI Refactoring Best Practices](https://www.augmentcode.com/tools/ai-code-refactoring-tools-tactics-and-best-practices)
