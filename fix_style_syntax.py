#!/usr/bin/env python3
"""
Fix JSX style syntax errors in BatteryAnalysis_Enhanced.html
Change: style={ prop: "value" }
To:     style={{ prop: "value" }}
"""

print("[OK] Reading BatteryAnalysis_Enhanced.html...")
with open('BatteryAnalysis_Enhanced.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the style syntax
# Replace "style={ " with "style={{ "
content = content.replace('style={ ', 'style={{ ')

# Replace " }>" with " }}>" (but only for style attributes)
# More careful replacement - look for the pattern
import re

# Pattern: style={{ ... }} where }} should be }}>
# We need to find places where we have style={{ followed by properties and ending with }>
# Actually, simpler: just replace all " }>" that come after "style={{" with " }}>"

# Split by "style={{" to process each section
parts = content.split('style={{')
result = [parts[0]]  # First part before any style={{

for part in parts[1:]:
    # Find the first }> in this part and replace with }}>
    if ' }>' in part:
        part = part.replace(' }>', ' }}>', 1)  # Only replace the first occurrence
    result.append(part)

content = 'style={{'.join(result)

# Write back
with open('BatteryAnalysis_Enhanced.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Fixed style syntax errors!")
print("[OK] BatteryAnalysis_Enhanced.html should now load correctly")
