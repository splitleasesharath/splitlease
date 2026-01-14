#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "psutil>=5.9.0"]
# ///

"""
ADW FP Script Tester - Standardized testing utility for core ADW scripts.

This utility verifies that adw_fp_audit, adw_fp_implement, and adw_claude_browser
are functioning correctly in isolation.

Usage:
    uv run adw_fp_script_tester.py <script_name>

Example:
    uv run adw_fp_script_tester.py adw_fp_audit
    uv run adw_fp_script_tester.py adw_fp_implement
    uv run adw_fp_script_tester.py adw_claude_browser
"""

import sys
import json
import os
import argparse
import subprocess
import time
from pathlib import Path
from datetime import datetime
from typing import Optional

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from adw_modules.utils import setup_logger, make_adw_id

class TestRunner:
    def __init__(self, script_name: str):
        self.script_name = script_name
        
        # Determine project root by looking for package.json
        # This ensures tests run from the project root even if invoked from a subdirectory
        path = Path(__file__).resolve().parent
        found_root = False
        while path.parent != path:  # Stop at system root
            if (path / "package.json").exists():
                self.working_dir = path
                found_root = True
                break
            path = path.parent
            
        if not found_root:
            # Fallback to CWD if package.json not found
            self.working_dir = Path.cwd()
            
        self.timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        self.adw_id = f"test_{script_name[:5]}_{self.timestamp[-4:]}"
        self.logger = setup_logger(self.adw_id, trigger_type="tester")
        self.temp_files = []
        # #region agent log
        try:
            with open(r"c:\Users\Split Lease\Documents\Split Lease - Dev\.cursor\debug.log", "a") as f: 
                f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"fix-cwd","location":"TestRunner.__init__","message":"Resolved working_dir","data":{"working_dir":str(self.working_dir)},"timestamp":int(time.time()*1000)}) + "\n")
        except Exception: pass
        # #endregion

    def cleanup(self):
        """Remove temporary files created during testing."""
        print(f"\n[CLEANUP] Removing {len(self.temp_files)} temporary files...")
        for file_path in self.temp_files:
            p = Path(file_path)
            if p.exists():
                try:
                    p.unlink()
                    print(f"  Removed: {p.name}")
                except Exception as e:
                    print(f"  Failed to remove {p.name}: {e}")

    def run_command(self, cmd: list, env_overrides: dict = None) -> bool:
        """Run a command via subprocess and return success."""
        env = os.environ.copy()
        if env_overrides:
            env.update(env_overrides)
            
        print(f"\n[EXEC] Running: {' '.join(cmd)}")
        try:
            result = subprocess.run(
                cmd,
                cwd=self.working_dir,
                env=env,
                capture_output=False, # Show output in real-time
                text=True,
                shell=(os.name == 'nt')
            )
            return result.returncode == 0
        except Exception as e:
            print(f"[FAIL] Command failed with exception: {e}")
            return False

    def test_adw_fp_audit(self):
        """Scenario: Run FP audit on a specific file."""
        print(f"\n{'='*60}")
        print("SCENARIO: adw_fp_audit")
        print(f"{'='*60}")
        
        script_path = Path(__file__).parent / "adw_fp_audit.py"
        target = "app/src/lib/availabilityValidation.js"
        cmd = ["uv", "run", str(script_path), target, "--severity", "high"]
        
        # Check plans dir before
        plans_dir = self.working_dir / ".claude" / "plans" / "New"
        before_plans = set(plans_dir.glob("*.md"))
        
        success = self.run_command(cmd)
        
        if success:
            # Check for new plan file
            after_plans = set(plans_dir.glob("*.md"))
            new_plans = after_plans - before_plans
            if new_plans:
                new_plan = list(new_plans)[0]
                print(f"\n[OK] Audit successful! New plan created: {new_plan.name}")
                self.temp_files.append(str(new_plan))
                return True
            else:
                print("\n[FAIL] Audit completed but no new plan file was found.")
                return False
        return False

    def test_adw_fp_implement(self):
        """Scenario: Implement a mock plan on a safe file."""
        print(f"\n{'='*60}")
        print("SCENARIO: adw_fp_implement")
        print(f"{'='*60}")
        
        script_path = Path(__file__).parent / "adw_fp_implement.py"
        # 1. Create a mock target file
        mock_target = self.working_dir / "app" / "tester_mock_file.js"
        # #region agent log
        try:
            with open(r"c:\Users\Split Lease\Documents\Split Lease - Dev\.cursor\debug.log", "a") as f: 
                f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"fix-cwd","location":"test_adw_fp_implement","message":"Attempting to write mock file","data":{"mock_target":str(mock_target),"parent_exists":mock_target.parent.exists()}, "timestamp":int(time.time()*1000)}) + "\n")
        except Exception: pass
        # #endregion
        mock_content = "// Initial content\nfunction test() {\n  console.log('hello');\n}\n"
        mock_target.write_text(mock_content)
        self.temp_files.append(str(mock_target))
        
        # 2. Create a mock plan file
        plans_dir = self.working_dir / ".claude" / "plans" / "New"
        plans_dir.mkdir(parents=True, exist_ok=True)
        mock_plan_path = plans_dir / f"{self.timestamp}_test_fp_refactor_plan.md"
        
        mock_plan = f"""# Test Plan
## Chunk 1: Add a comment
File: app/tester_mock_file.js
Line: 1
Current Code:
```javascript
// Initial content
```
Refactored Code:
```javascript
// Initial content - TESTED
```
~~~~~
"""
        mock_plan_path.write_text(mock_plan)
        self.temp_files.append(str(mock_plan_path))
        
        print(f"[INFO] Created mock plan: {mock_plan_path.name}")
        
        # 3. Run implementation
        cmd = ["uv", "run", str(script_path)]
        success = self.run_command(cmd)
        
        if success:
            # Verify file content
            updated_content = mock_target.read_text()
            if "TESTED" in updated_content:
                print("\n[OK] Implementation successful! Mock file updated.")
                return True
            else:
                print("\n[FAIL] Implementation completed but file content was not updated.")
                return False
        return False

    def test_adw_claude_browser(self):
        """Scenario: Run a simple browser command."""
        print(f"\n{'='*60}")
        print("SCENARIO: adw_claude_browser")
        print(f"{'='*60}")
        
        script_path = Path(__file__).parent / "adw_claude_browser.py"
        prompt = "Open http://localhost:8010 and report the page title."
        cmd = ["uv", "run", str(script_path), prompt, self.adw_id]
        
        # Force Claude for browser script as per user request
        env_overrides = {
            "ADW_PROVIDER": "claude",
            "STRICT_GEMINI": "false"
        }
        
        print("[INFO] Testing browser integration (assumes dev server might be needed or adopted)...")
        success = self.run_command(cmd, env_overrides=env_overrides)
        
        if success:
            print("\n[OK] Browser script executed successfully.")
            return True
        return False

def main():
    parser = argparse.ArgumentParser(description="ADW Script Tester")
    parser.add_argument("script", choices=["adw_fp_audit", "adw_fp_implement", "adw_claude_browser"],
                        help="Name of the script to test (without .py)")
    
    args = parser.parse_args()
    
    runner = TestRunner(args.script)
    success = False
    
    try:
        if args.script == "adw_fp_audit":
            success = runner.test_adw_fp_audit()
        elif args.script == "adw_fp_implement":
            success = runner.test_adw_fp_implement()
        elif args.script == "adw_claude_browser":
            success = runner.test_adw_claude_browser()
            
        if success:
            print(f"\n[COMPLETE] Test for {args.script} PASSED.")
        else:
            print(f"\n[COMPLETE] Test for {args.script} FAILED.")
            sys.exit(1)
            
    finally:
        runner.cleanup()

if __name__ == "__main__":
    main()
