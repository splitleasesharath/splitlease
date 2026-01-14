
import json
from pathlib import Path

pkg_path = Path("..") / "app" / "package.json"

if not pkg_path.exists():
    print(f"Error: {pkg_path} not found")
    exit(1)

with open(pkg_path, "r", encoding="utf-8") as f:
    data = json.load(f)

if "scripts" not in data:
    data["scripts"] = {}

data["scripts"]["dev:test"] = "vite --port 8010 --strictPort"
data["scripts"]["dev:test:stop"] = "npx kill-port 8010"
data["scripts"]["dev:test:restart"] = "bun run dev:test:stop && bun run dev:test"

with open(pkg_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("Successfully updated app/package.json with ADW scripts")
