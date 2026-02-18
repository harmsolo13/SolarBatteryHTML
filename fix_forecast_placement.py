#!/usr/bin/env python3
"""
Fix the weather forecast section placement - it needs to be INSIDE the return statement
"""

# Read the HTML
with open('BatteryROI_6.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# The weather forecast section is currently AFTER the closing of the week view
# It needs to be BEFORE the "no data available" condition and inside the main return

# Find the pattern where we need to insert the forecast
# Current structure:
#             </div>           # closes week table div
#           </div>             # closes week view div
#         </>}                 # closes week conditional
#
#         {!selectedDay && viewMode === 'day' && (  # no data condition
#         )}
#     </>}                     # closes main return
#
#     {/* WEATHER FORECAST */}  # WRONG - it's after the return closes

# We need to move the forecast BEFORE the main return closes

# First, let's extract the weather forecast section
forecast_start_marker = """            {/* ═══ 7-DAY WEATHER FORECAST ═══ */}"""
forecast_end_marker = """            </div>

          </>;
        })()}"""

# Find the forecast section
forecast_start_pos = html_content.find(forecast_start_marker)
forecast_end_pos = html_content.find(forecast_end_marker, forecast_start_pos)

if forecast_start_pos == -1 or forecast_end_pos == -1:
    print("ERROR: Could not find forecast section markers!")
    exit(1)

# Extract the forecast section (including the end marker)
forecast_section = html_content[forecast_start_pos:forecast_end_pos + len(forecast_end_marker)]

# Remove it from its current location
html_content = html_content[:forecast_start_pos] + html_content[forecast_end_pos + len(forecast_end_marker):]

# Now find where to insert it - right before the "No data available" condition
insert_marker = """            {!selectedDay && viewMode === 'day' && (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No data available for selected date. Please choose a date between Oct 1, 2024 and Oct 31, 2025.
              </div>
            )}"""

insert_pos = html_content.find(insert_marker)

if insert_pos == -1:
    print("ERROR: Could not find insertion point!")
    exit(1)

# Insert the forecast section before the "no data" condition
html_content = html_content[:insert_pos] + forecast_section + "\n\n" + html_content[insert_pos:]

# Write back
with open('BatteryROI_6.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("[OK] Fixed weather forecast placement!")
print("\nWeather forecast section is now properly inside the return statement.")
print("The page should render correctly now.")
