#!/usr/bin/env python3
"""
Add variable captures to forecast section
"""

# Read the HTML
with open('BatteryROI_6.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Find and replace the pattern
old_pattern = """              {(() => {
                // Access outer scope variables: dailyResults, batterySpec, avgSolarAllDays
                const loadForecast = async () => {"""

new_pattern = """              {(() => {
                // Capture variables from outer scope (closure)
                const _dailyResults = typeof dailyResults !== 'undefined' ? dailyResults : historicalData.daily_results;
                const _batterySpec = typeof batterySpec !== 'undefined' ? batterySpec : historicalData.battery_spec || { usable_kwh: 27.36 };
                const _avgSolarAllDays = typeof avgSolarAllDays !== 'undefined' ? avgSolarAllDays : _dailyResults.reduce((sum, d) => sum + d.total_solar_kwh, 0) / _dailyResults.length;

                const loadForecast = async () => {"""

html_content = html_content.replace(old_pattern, new_pattern)

# Write back
with open('BatteryROI_6.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("[OK] Added variable captures!")
