# Deep Research Prompt: Automated Code Refactoring Orchestration Patterns

**Purpose:** Use this prompt with Claude, ChatGPT Deep Research, Perplexity Pro, or Gemini Deep Research to generate a comprehensive report on automated refactoring workflow design.

---

## The Prompt

```
I need a comprehensive research report on designing automated code refactoring orchestration systems that use AI/LLM agents to perform large-scale codebase transformations. This is for a production system, not theoretical research.

## Context: The Problem I'm Solving

I have built an automated refactoring orchestrator with the following architecture:

**Current Workflow (3 Phases):**
1. **AUDIT PHASE**: An AI agent (Claude Opus) scans a codebase directory and generates a "refactoring plan" - a markdown document containing 20-30 discrete "chunks" of work. Each chunk specifies:
   - Target file path
   - Current code snippet
   - Refactored code snippet
   - Affected application pages/routes

2. **IMPLEMENT PHASE**: A different AI agent (Claude Sonnet or Gemini Flash) executes each chunk sequentially:
   - Pre-validates that imports in the refactored code resolve to existing files
   - Writes the code change
   - Runs LSP/TypeScript diagnostics
   - Runs a full build check
   - Runs visual regression tests (comparing live vs dev screenshots)

3. **COMMIT/RESET PHASE**: Based on validation results:
   - Success → Git commit
   - Failure → Git reset to discard changes

**The Problem I've Encountered:**

In a recent run targeting 25 refactoring chunks across 11 page groups, I achieved **zero net progress** despite the safety mechanisms working correctly. The failures fall into these categories:

1. **Chicken-and-Egg Dependencies (60% of failures)**
   - Chunk A says: "Update file X to import from `./newService.js`"
   - Chunk B says: "Create `./newService.js`"
   - But Chunk A runs before Chunk B (ordered by page group, not dependency)
   - Pre-validation correctly fails because `./newService.js` doesn't exist yet

2. **Cascading Resets (30% of failures)**
   - Chunks are grouped by "affected page" (e.g., all /search page chunks together)
   - If chunk 3 of 5 fails, the ENTIRE page group is reset
   - This loses the successful work from chunks 1 and 2

3. **Monolithic Plan Staleness (10% of failures)**
   - The audit generates all 25 chunks upfront
   - By the time chunk 20 executes, earlier changes may have shifted line numbers or file structures
   - The "current code" in chunk 20 no longer matches reality

**Constraints:**
- The codebase is a React 18 + Vite application (~500 files, ~100k LOC)
- Changes must not break the production build
- Changes must not cause visual regressions (pixel-level comparison)
- The system runs unattended (no human in the loop during execution)
- Cost matters: Opus is expensive, so audit phases should be efficient
- Time matters: Full runs currently take 30-60 minutes

---

## Research Questions

Please provide detailed, actionable answers to the following:

### 1. Workflow Architecture Patterns

**1.1** What workflow architectures do large tech companies (Google, Meta, Microsoft, Stripe) use for automated large-scale code changes? Specifically:
- How do they handle dependency ordering between changes?
- How do they handle partial failures?
- Do they use single-pass or multi-pass approaches?
- What role do humans play (approval gates, review)?

**1.2** Compare and contrast these approaches:
- **Monolithic audit** (generate all changes upfront, then execute)
- **Incremental audit** (audit → execute → audit again with new state → execute)
- **Category-phased** (scaffold phase → migration phase → cleanup phase)
- **Dependency-graph driven** (topological sort based on explicit dependencies)

**1.3** What does the academic literature say about automated refactoring orchestration? Are there papers on:
- Optimal change ordering algorithms
- Failure recovery strategies
- Change dependency detection

### 2. Change Dependency Management

**2.1** How should an AI-generated refactoring plan express dependencies between chunks? Evaluate these options:
- Implicit detection (parse imports, analyze AST)
- Explicit declaration (each chunk lists `depends_on: [chunk_ids]`)
- Category-based ordering (all "create file" chunks before "update import" chunks)
- Hybrid approaches

**2.2** What algorithms exist for:
- Detecting dependencies between code changes automatically
- Topological sorting of interdependent changes
- Cycle detection and resolution in change graphs

**2.3** How do codemod tools (jscodeshift, ts-morph, ast-grep) handle multi-file transformations that have ordering requirements?

### 3. Failure Handling and Recovery

**3.1** What are the best practices for granularity of commits in automated refactoring?
- Per-change (each chunk = 1 commit)
- Per-group (related chunks = 1 commit)
- Per-phase (all scaffold changes = 1 commit)
- Squash at end (work in progress, squash when done)

**3.2** When a change fails validation, what recovery strategies exist?
- Reset and skip (current approach)
- Retry with modifications (AI attempts to fix)
- Quarantine and continue (skip but don't reset siblings)
- Human escalation (pause for review)

**3.3** How do CI/CD systems handle partial pipeline failures in ways that could inform refactoring orchestration?

### 4. Validation Strategies

**4.1** What validation layers are most effective for automated refactoring?
- Static analysis (AST validation, import resolution)
- Type checking (TypeScript, Flow)
- Unit tests
- Integration tests
- Visual regression tests
- Runtime behavior tests

**4.2** In what order should validations run, and when should execution stop?
- Fail-fast (stop at first failure)
- Collect-all (run all validations, report all failures)
- Tiered (cheap checks first, expensive checks only if cheap pass)

**4.3** How can validation be made incremental to avoid re-running expensive checks?

### 5. AI Agent Orchestration

**5.1** When using AI agents for code transformation, what are the tradeoffs between:
- Single powerful agent (e.g., Opus for both planning and execution)
- Specialized agents (Opus for planning, Sonnet/Haiku for execution)
- Ensemble approaches (multiple agents vote on changes)

**5.2** How should the orchestrator handle AI agent failures (hallucinations, refusals, timeouts)?

**5.3** What prompt engineering patterns improve reliability of AI-generated code transformations?

### 6. Industry Case Studies

**6.1** Provide detailed case studies of:
- Google's Rosie system for large-scale changes
- Meta's codemod infrastructure
- Stripe's approach to API migrations
- Any open-source equivalents (Sourcegraph, Codemod.com)

**6.2** What metrics do these systems track to measure success?
- Change success rate
- Time to completion
- Regression rate
- Human intervention rate

### 7. Recommended Architecture

Based on all the above research, propose a specific architecture for my system that:
- Solves the dependency ordering problem
- Minimizes wasted work from cascading failures
- Balances cost (AI API calls) with reliability
- Can run unattended but surfaces issues for human review
- Scales to codebases of 100k-1M LOC

Include:
- Workflow diagram
- Data structures for representing changes and dependencies
- Pseudocode for the orchestration loop
- Recommended validation sequence
- Failure handling decision tree

---

## Output Format

Structure your report as follows:

1. **Executive Summary** (1 page)
   - Key findings
   - Recommended architecture in brief
   - Expected improvements over current approach

2. **Literature Review** (3-5 pages)
   - Academic research
   - Industry whitepapers
   - Open source tool documentation

3. **Pattern Analysis** (5-7 pages)
   - Detailed comparison of workflow patterns
   - Dependency management approaches
   - Failure handling strategies

4. **Case Studies** (3-5 pages)
   - Google, Meta, Stripe, etc.
   - Lessons learned

5. **Recommended Architecture** (5-7 pages)
   - Detailed design
   - Diagrams
   - Pseudocode
   - Migration path from current system

6. **Implementation Roadmap** (2-3 pages)
   - Prioritized changes
   - Effort estimates
   - Risk assessment

7. **Appendices**
   - Glossary
   - References
   - Sample data structures

---

## Additional Context

**Technologies in my stack:**
- Python orchestrator (can use any libraries)
- Claude API (Opus, Sonnet, Haiku models available)
- Gemini API (Flash, Pro models available)
- TypeScript/JavaScript codebase being refactored
- Git for version control
- Playwright for visual regression
- Vite + React for the application

**What I've already tried:**
- LSP-based pre-validation (catches missing imports but doesn't solve ordering)
- Page-group batching (causes cascading failures)
- Build checks after each chunk (works but expensive)
- Visual regression after each page group (works but expensive)

**What I'm considering:**
- Adding `depends_on` metadata to chunk format
- Splitting into scaffold → migrate → cleanup phases
- Per-chunk commits instead of per-group
- Generating stub files before migration chunks run

Please be specific and actionable. I'm building a production system, not writing a thesis. Code examples, pseudocode, and concrete recommendations are more valuable than theoretical discussion.
```

---

## How to Use This Prompt

### Option 1: Claude with Web Search
```
Use this prompt directly in Claude (claude.ai) with the "Search" feature enabled.
Claude will search the web and synthesize findings.
```

### Option 2: Perplexity Pro
```
Paste this prompt into Perplexity Pro for deep web research with citations.
Perplexity excels at finding and synthesizing technical documentation.
```

### Option 3: ChatGPT with Deep Research
```
Use ChatGPT's "Deep Research" feature (if available) or the browsing capability.
May need to break into smaller sub-prompts for best results.
```

### Option 4: Gemini Deep Research
```
Use Google's Gemini with the Deep Research feature.
Good for finding Google-internal patterns (Rosie, LSC documentation).
```

### Option 5: Manual Research Synthesis
```
Use the research questions as a checklist for manual research.
Search each topic individually, then synthesize.
```

---

## Expected Outputs

After running this research, you should have:

1. **Clear recommendation** on whether to use:
   - Monolithic vs. multi-pass auditing
   - Implicit vs. explicit dependency declaration
   - Per-chunk vs. per-group commits

2. **Concrete data structures** for:
   - Change/chunk representation with dependencies
   - Execution state tracking
   - Failure recovery checkpoints

3. **Algorithm pseudocode** for:
   - Dependency graph construction
   - Topological execution ordering
   - Failure handling and recovery

4. **Validation sequence** that balances:
   - Speed (cheap checks first)
   - Safety (catch errors before expensive operations)
   - Cost (minimize redundant checks)

5. **Migration path** from current architecture to recommended architecture

---

## Follow-Up Prompts

After receiving the research report, consider these follow-up prompts:

### Implementation Details
```
Based on your recommended architecture, provide:
1. Python class definitions for Change, ChangeGraph, and Orchestrator
2. The exact algorithm for detecting dependencies from code changes
3. A YAML schema for the enhanced chunk format with dependencies
```

### Failure Scenario Analysis
```
Walk through these failure scenarios with your recommended architecture:
1. Chunk 5 creates a file, Chunk 3 imports from it (out of order in plan)
2. Chunk 8 passes all validation but causes a visual regression
3. Chunk 12 introduces a TypeScript error that only manifests in a different file
4. The AI agent hallucinates an import that doesn't exist
How does each get handled?
```

### Cost Optimization
```
My current costs per run:
- Opus audit: ~$5-10 (10 min of tokens)
- Sonnet execution: ~$2-5 (25 chunks × ~$0.10-0.20 each)
- Build checks: Free but slow (30s each × 25 = 12 min)
- Visual regression: Free but slow (60s each × 11 groups = 11 min)

How can I optimize this while maintaining safety?
```

### Scaling Analysis
```
My current codebase is 100k LOC. If it grows to 500k or 1M LOC:
1. How does the audit phase scale?
2. How does dependency detection scale?
3. What architectural changes are needed?
```
