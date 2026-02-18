#!/usr/bin/env python3
"""
Add Home Assistant BOM integration to BatteryROI_7.html
"""

print("Adding Home Assistant integration to BatteryROI_7.html...")

# Read the HA integration code
with open('ha_bom_integration.js', 'r', encoding='utf-8') as f:
    ha_code = f.read()

# Read the HTML file
with open('BatteryROI_7.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find where to insert (after the WeatherAPI configuration)
insert_marker = "const WEATHER_API_KEY = '4c5098037db74b3f980113023260602';"

if insert_marker in html:
    # Find the position after the Weather configuration section
    # We'll insert after the getSolarMultiplier function closes
    insert_pos = html.find("};", html.find("getSolarMultiplier"))

    if insert_pos != -1:
        insert_pos += 3  # After the "};\n"

        # Insert the HA integration code
        html = html[:insert_pos] + "\n\n" + ha_code + html[insert_pos:]

        print("[OK] Inserted Home Assistant integration code")
    else:
        print("[ERROR] Could not find insertion point")
        exit(1)
else:
    print("[ERROR] Could not find weather configuration marker")
    exit(1)

# Save the updated file
with open('BatteryROI_8_HA.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("[OK] Created BatteryROI_8_HA.html")
print()
print("=" * 80)
print("SUCCESS!")
print("=" * 80)
print()
print("Your new calculator: BatteryROI_8_HA.html")
print()
print("Features:")
print("  - Connects to Home Assistant at 192.168.68.60:8123")
print("  - Fetches BOM weather from weather.forecast_home entity")
print("  - Accurate Adelaide/Ferryden Park forecasts")
print("  - Maps BOM conditions to solar generation")
print()
print("How to use:")
print("  1. Open BatteryROI_8_HA.html in your browser")
print("  2. Go to Daily Details tab")
print("  3. Click 'Load 7-Day Forecast'")
print("  4. Enter your Home Assistant Long-Lived Access Token when prompted")
print("     (Get it from: Settings -> People -> [Your Name] -> Security)")
print("  5. View BOM forecast and battery predictions!")
print()
print("The token is only requested once per session and stored in memory.")
print()
