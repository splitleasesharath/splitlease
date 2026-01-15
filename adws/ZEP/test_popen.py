
import subprocess
import os
from pathlib import Path

try:
    p = Path.cwd() / "non_existent_folder_xyz"
    print(f"Testing Popen with cwd={p}")
    proc = subprocess.Popen(["cmd", "/c", "echo hello"], cwd=p)
    proc.wait()
    print("Success (unexpected)")
except FileNotFoundError as e:
    print(f"Caught expected FileNotFoundError: {e}")
except Exception as e:
    print(f"Caught unexpected exception: {type(e).__name__}: {e}")
