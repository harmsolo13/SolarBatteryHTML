#!/usr/bin/env python3
"""
Add daily_results data to BatteryROI_6.html
"""
import json

# Load the daily results
with open('battery_daily_charging.json', 'r') as f:
    data = json.load(f)
    daily_results = data['daily_results']

# Read the HTML file
with open('BatteryROI_6.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Find the location to insert (after daily_charging object, before closing brace)
# Look for the pattern: "    }\n  }\n};" which closes daily_charging and HISTORICAL_ROI_DATA
search_pattern = '      "Spring": {"total_days":107,"days_full":29,"pct_days_full":27.1,"avg_solar":23.68,"avg_max_soc":21.59,"avg_time_to_full":"15:45"}\n    }\n  }\n};'

if search_pattern not in html_content:
    print("ERROR: Could not find insertion point!")
    print("Searching for alternative pattern...")
    # Try alternative search
    search_pattern2 = '    }\n  }\n};'
    pos = html_content.find(search_pattern2)
    if pos == -1:
        print("ERROR: Could not find alternative pattern either!")
        exit(1)
    print(f"Found alternative at position {pos}")
else:
    pos = html_content.find(search_pattern)
    print(f"Found insertion point at position {pos}")

# Create the daily_results JSON (compact)
daily_results_json = json.dumps(daily_results, separators=(',', ':'))

# Build the replacement string
# Close the seasons object and daily_charging, add daily_results, then close HISTORICAL_ROI_DATA
replacement = f'''      "Spring": {{"total_days":107,"days_full":29,"pct_days_full":27.1,"avg_solar":23.68,"avg_max_soc":21.59,"avg_time_to_full":"15:45"}}
    }}
  }},
  "daily_results": {daily_results_json}
}};'''

# Replace
html_content = html_content.replace(search_pattern, replacement)

# Write back
with open('BatteryROI_6.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"\n[OK] Successfully added {len(daily_results)} days of data to HTML")
print(f"  Daily results size: {len(daily_results_json)/1024:.1f} KB")
print("\nHTML file updated!")
