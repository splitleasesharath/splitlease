import os
import re
import json
import argparse

# FP Violations Patterns
PATTERNS = {
    "MUTATING_METHOD": [
        (r"\.push\(", "High"),
        (r"\.pop\(", "High"),
        (r"\.shift\(", "High"),
        (r"\.unshift\(", "High"),
        (r"\.splice\(", "High"),
        (r"\.sort\(", "Medium"), # .sort() mutates in place
        (r"\.reverse\(", "Medium"),
        (r"delete\s+[\w\.]+", "High"),
        (r"\w+\s*\+=\s*", "Medium"), # Mutation via +=
        (r"\w+\s*-=\s*", "Medium"),
        (r"\w+\+\+", "Low"), # Increment
    ],
    "IMPERATIVE_LOOP": [
        (r"for\s*\(", "Medium"),
        (r"while\s*\(", "Medium"),
        (r"do\s*\{", "Medium"),
    ],
    "IO_IN_CORE": [
        (r"console\.log\(", "Low"),
        (r"console\.error\(", "Low"),
        (r"localStorage\.", "High"),
        (r"sessionStorage\.", "High"),
        (r"fetch\(", "High"),
    ],
    "EXCEPTION_FOR_FLOW": [
        (r"throw\s+new\s+", "Medium"),
    ]
}

def scan_file(filepath):
    violations = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception:
        return []

    for i, line in enumerate(lines):
        line_num = i + 1
        code = line.strip()
        if code.startswith("//") or code.startswith("/*") or code.startswith("*"):
            continue

        for v_type, rules in PATTERNS.items():
            for pattern, severity in rules:
                if re.search(pattern, code):
                    # Filter out likely false positives
                    if v_type == "MUTATING_METHOD" and ".sort((a, b)" in code and "[...array]" in code:
                        continue # Safe sort

                    violations.append({
                        "file": filepath,
                        "line": line_num,
                        "type": v_type,
                        "violation_text": f"{v_type} detected: {pattern}", # Adding this for context
                        "severity": severity,
                        "code": code
                    })
                    break # One violation per line is enough usually
    return violations

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("target_dir")
    parser.add_argument("--output", required=True)
    parser.add_argument("--file", required=True) # The prompt uses --file for output file
    parser.add_argument("--severity")
    args = parser.parse_args()

    target_dir = args.target_dir
    output_file = args.file
    
    all_violations = []
    
    # Walk directory
    for root, dirs, files in os.walk(target_dir):
        if "node_modules" in root or ".git" in root or "dist" in root:
            continue
        for file in files:
            if file.endswith(".js") or file.endswith(".jsx") or file.endswith(".ts") or file.endswith(".tsx"):
                full_path = os.path.join(root, file)
                # Normalize path to relative
                rel_path = os.path.relpath(full_path, start=".")
                all_violations.extend(scan_file(rel_path))

    # Write JSON
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(all_violations, f, indent=2)
    
    print(f"Audit complete. Found {len(all_violations)} violations.")

if __name__ == "__main__":
    main()
