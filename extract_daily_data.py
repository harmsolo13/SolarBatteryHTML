#!/usr/bin/env python3
"""
Extract daily_results from battery_daily_charging.json and format for HTML embedding
"""
import json

# Load the full data
with open('battery_daily_charging.json', 'r') as f:
    data = json.load(f)

# Extract just the daily_results
daily_results = data['daily_results']

print(f"Loaded {len(daily_results)} days")
print(f"First day: {daily_results[0]['date']}")
print(f"Last day: {daily_results[-1]['date']}")

# Write as JavaScript constant (compact JSON)
js_data = json.dumps(daily_results, separators=(',', ':'))

print(f"\nData size: {len(js_data)} characters ({len(js_data)/1024:.1f} KB)")

# Save to file for manual insertion
with open('daily_results_js.txt', 'w') as f:
    f.write(f'  "daily_results": {js_data}')

print("\nSaved to daily_results_js.txt")
print("\nFirst entry sample:")
print(json.dumps(daily_results[0], indent=2))
