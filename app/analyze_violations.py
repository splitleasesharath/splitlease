import json
import os
from collections import Counter

def analyze():
    with open('agents/20260114051446_fp_audit_violations.json', 'r') as f:
        violations = json.load(f)

    # Filter for High Severity or Logic files
    high_priority = []
    for v in violations:
        # Prioritize src/logic
        if "src/logic" in v['file']:
            v['priority_score'] = 10
        else:
            v['priority_score'] = 0
            
        if v['severity'] == 'High':
            v['priority_score'] += 5
        elif v['severity'] == 'Medium':
            v['priority_score'] += 2
            
        if v['priority_score'] >= 5: # Only High severity OR logic files
            high_priority.append(v)

    # Sort by priority score desc, then file
    high_priority.sort(key=lambda x: (x['priority_score'], x['file']), reverse=True)

    # Take top 10 unique files or top 20 violations
    top_violations = high_priority[:20]
    
    print(json.dumps(top_violations, indent=2))

if __name__ == "__main__":
    analyze()
