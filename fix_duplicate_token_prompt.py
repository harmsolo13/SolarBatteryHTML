#!/usr/bin/env python3
"""
Fix duplicate token prompting in BatteryROI_8_HA.html
"""

print("Fixing duplicate token prompt...")

with open('BatteryROI_8_HA.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove the duplicate token check from loadForecast
# Keep only the one in fetchHAWeatherForecast
old_duplicate = '''                    // Check if token is set
                    if (!HA_CONFIG.token) {
                      const token = prompt(
                        'Enter your Home Assistant Long-Lived Access Token:\\n\\n' +
                        '(You only need to do this once per session)\\n\\n' +
                        'Get it from Home Assistant:\\n' +
                        'Profile → Security → Long-Lived Access Tokens'
                      );

                      if (!token) {
                        setForecastError('Home Assistant access token required');
                        setForecastLoading(false);
                        return;
                      }

                      HA_CONFIG.token = token;
                    }

                    // Fetch weather from HA'''

new_simplified = '''                    // Fetch weather from HA (token handled in fetchHAWeatherForecast)'''

if old_duplicate in html:
    html = html.replace(old_duplicate, new_simplified)
    print("[OK] Removed duplicate token prompt")
else:
    print("[ERROR] Could not find duplicate token section")
    exit(1)

# Save
with open('BatteryROI_8_HA.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("[OK] Fixed! Token now only prompted once")
print()
print("=" * 80)
print("Try again:")
print("  1. Refresh page (Ctrl+F5)")
print("  2. Click 'Load 7-Day Forecast'")
print("  3. Enter token ONCE")
print("  4. Should work!")
print("=" * 80)
