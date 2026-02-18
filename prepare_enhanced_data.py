#!/usr/bin/env python3
"""
Prepare enhanced battery data for HTML embedding
Include summaries + sample days to keep size reasonable
"""

import json

# Load the enhanced data
with open('battery_daily_charging_enhanced.json', 'r') as f:
    data = json.load(f)

# Create a compact version with:
# 1. Full summaries
# 2. Sample days (every 7th day) for scenarios
# 3. Full continuous results (needed for realistic view)

compact_data = {
    'continuous_simulation': {
        'summary': data['continuous_simulation']['summary'],
        'daily_results': data['continuous_simulation']['daily_results']  # Keep all for realistic view
    },
    'scenario_based': {},
    'battery_spec': data['battery_spec']
}

# For scenarios, include every 7th day as samples
for scenario_name, scenario_data in data['scenario_based'].items():
    daily_results = scenario_data['daily_results']
    # Take every 7th day to show weekly patterns
    sampled_results = [daily_results[i] for i in range(0, len(daily_results), 7)]

    compact_data['scenario_based'][scenario_name] = {
        'starting_soc_pct': scenario_data['starting_soc_pct'],
        'summary': scenario_data['summary'],
        'sample_days': sampled_results,  # ~54 days instead of 381
        'note': 'Sample days (every 7th day) for visualization'
    }

# Save compact version
with open('battery_daily_charging_enhanced_compact.json', 'w') as f:
    json.dump(compact_data, f, indent=2)

# Check sizes
import os
full_size = os.path.getsize('battery_daily_charging_enhanced.json')
compact_size = os.path.getsize('battery_daily_charging_enhanced_compact.json')

print(f"[OK] Created compact version!")
print(f"\nFile sizes:")
print(f"  Full version:    {full_size/1024:.1f} KB ({full_size/1024/1024:.2f} MB)")
print(f"  Compact version: {compact_size/1024:.1f} KB")
print(f"  Reduction:       {(1 - compact_size/full_size)*100:.1f}%")
print(f"\nReady to embed in HTML.")
