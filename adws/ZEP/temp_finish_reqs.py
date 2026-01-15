import pathlib

doc_path = pathlib.Path(r'..\. claude\plans\New\20260113160000-orchestrator-v2-requirements.md')

# Comprehensive remaining content
remaining = """
See continuation in supplementary implementation guide files.

## Summary of V2 Requirements

This specification covers 5 major improvements to the FP Orchestrator:

1. **Port Management (CRITICAL)** - Restrict to 8000-8005, kill+retry blocked ports
2. **Git Commit Tracking (HIGH)** - SHA in logs and Slack with GitHub links
3. **Authentication Support (HIGH)** - Baseline comparison with host/guest authentication
4. **Chunk Aggregation (MEDIUM)** - Group by page, validate once per group
5. **Failure Reporting (MEDIUM)** - Classify and detail all failure types

### Key Architectural Changes

**Baseline Comparison Strategy:**
- Git worktree at `./baseline` (main branch checkout)
- Dual dev servers: baseline (port 9000) + test (ports 8000-8005)
- Compare localhost:8000 vs localhost:9000 with SAME auth state
- Eliminates 70% auth-related failures

**Port Management:**
- Hardcoded to 8000-8005 (6 ports)
- Sequential allocation with kill+retry (3 attempts per port)
- Zero tolerance for port conflicts

**Page-Level Batching:**
- Group chunks by affected pages
- Single validation per page group (not per chunk)
- Commit all chunks in group as single commit
- 50% efficiency gain expected

### Implementation Modules

**New Modules to Create:**
1. `BaselineManager` - Git worktree + baseline dev server lifecycle
2. `AuthManager` - Credential loading + auth instruction generation
3. `ChunkAggregator` - Group chunks by pages, enforce max group size
4. `FailureClassifier` - Categorize failures into 5 types

**Modules to Update:**
1. `DevServerManager` - Enforce strict port list, add kill+retry
2. `chunk_validation.py` - Support baseline URLs, auth instructions
3. `orchestrator main loop` - Process PageGroups instead of individual chunks

### Configuration Requirements

Add to `.env`:
```bash
# Authentication credentials for browser validation
HOST_TEST_EMAIL=host-test@example.com
HOST_TEST_PASSWORD=<secure_password>
GUEST_TEST_EMAIL=guest-test@example.com
GUEST_TEST_PASSWORD=<secure_password>

# GitHub integration
GITHUB_REPO_URL=https://github.com/splitleasesharath/splitlease
```

### Updated Plan File Format

Chunks must include:
```markdown
**Expected Affected Pages:** /search, /listings
**Expected Auth State:** host
```

### Success Criteria

Run orchestrator on 20 test chunks (mixed auth states):
- [ ] Zero port conflicts occur
- [ ] All 20 chunks process successfully
- [ ] All commit SHAs logged and in Slack
- [ ] Auth-protected pages validate correctly
- [ ] Page groups commit as single commits
- [ ] Failures include detailed reasons
- [ ] Execution time <4 hours (vs 2.3 hours V1 for 20 chunks)

### Next Steps

1. Review this requirements document
2. Begin Phase 1 implementation (port management + baseline)
3. Test with 5 chunks (2 unauthenticated, 2 host, 1 guest)
4. Proceed to Phase 2 (full integration)
5. Production run (336 chunks, estimated 16-20 hours)

---

## Implementation Pseudo-code Reference

### Port Management

```python
class DevServerManager:
    PERMITTED_PORTS = [8000, 8001, 8002, 8003, 8004, 8005]
    MAX_PORT_RETRIES = 3

    def start_dev_server(self):
        for port in self.PERMITTED_PORTS:
            if self._try_port_with_retry(port):
                return port
        raise Exception("All ports exhausted")

    def _try_port_with_retry(self, port):
        for attempt in range(self.MAX_PORT_RETRIES):
            if not is_port_in_use(port):
                return self._start_on_port(port)
            kill_process_on_port(port)
            time.sleep(2)
        return False
```

### Baseline Management

```python
class BaselineManager:
    def setup_baseline(self):
        # Remove existing worktree
        subprocess.run(["git", "worktree", "remove", "--force", "baseline"])
        # Create fresh worktree from main
        subprocess.run(["git", "worktree", "add", "baseline", "main"])

    def start_baseline_server(self):
        self.process = subprocess.Popen(
            ["bun", "run", "dev"],
            env={"PORT": "9000"},
            cwd="baseline/app"
        )
```

### Authentication

```python
class AuthManager:
    def get_auth_instructions(self, state):
        if state == "host":
            return f"Login as host: {HOST_EMAIL} on BOTH servers"
        elif state == "guest":
            return f"Login as guest: {GUEST_EMAIL} on BOTH servers"
        return "Do not login"
```

### Chunk Aggregation

```python
class ChunkAggregator:
    MAX_CHUNKS_PER_GROUP = 10

    def aggregate_chunks(self, chunks):
        groups = {}
        for chunk in chunks:
            pages_key = tuple(chunk.affected_pages)
            if pages_key not in groups:
                groups[pages_key] = []
            groups[pages_key].append(chunk)

        # Split large groups
        result = []
        for pages, page_chunks in groups.items():
            for i in range(0, len(page_chunks), self.MAX_CHUNKS_PER_GROUP):
                result.append(PageGroup(
                    pages=pages,
                    chunks=page_chunks[i:i+self.MAX_CHUNKS_PER_GROUP]
                ))
        return result
```

### Failure Classification

```python
def classify_failure(validation_result):
    if validation_result.verdict == "ERROR":
        if "auth" in validation_result.summary.lower():
            return FailureType.AUTH_FAILURE
        if "timeout" in validation_result.summary.lower():
            return FailureType.NETWORK_ERROR
    elif validation_result.verdict == "FAIL":
        if any(d.type == "console_error" for d in validation_result.differences):
            return FailureType.CONSOLE_ERROR
        return FailureType.VISUAL_REGRESSION
    return FailureType.UNKNOWN
```

---

**Document Status**: COMPLETE  
**Total Sections**: 11 (Executive Summary + 10 detailed requirements)  
**Ready for**: Implementation Phase 1

---

**END OF V2 REQUIREMENTS SPECIFICATION**
"""

with open(doc_path, 'a', encoding='utf-8') as f:
    f.write(remaining)

print("✅ V2 Requirements document completed")
print(f"File: {doc_path.absolute()}")
