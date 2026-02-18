#!/usr/bin/env python3
"""
Move the "no data" message inside the main IIFE where selectedDay is defined
"""

# Read the HTML
with open('BatteryROI_6.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Current structure (WRONG):
#   </>;          // closes main return
# })()}          // closes main IIFE
#
# {!selectedDay && ...  // NO DATA MESSAGE - selectedDay not in scope!
# </>}           // closes tab 5

# We need to move the no data message BEFORE the main return closes

# Extract the no data message
no_data_pattern = """
            {!selectedDay && viewMode === 'day' && (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No data available for selected date. Please choose a date between Oct 1, 2024 and Oct 31, 2025.
              </div>
            )}"""

# Remove it from its current location (after the IIFE closes)
# It appears after })()}\n\n and before </>}
old_location_pattern = """          </>;
        })()}

            {!selectedDay && viewMode === 'day' && (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No data available for selected date. Please choose a date between Oct 1, 2024 and Oct 31, 2025.
              </div>
            )}
        </>}"""

new_location_pattern = """            {!selectedDay && viewMode === 'day' && (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No data available for selected date. Please choose a date between Oct 1, 2024 and Oct 31, 2025.
              </div>
            )}
          </>;
        })()}
      </>}"""

html_content = html_content.replace(old_location_pattern, new_location_pattern)

# Write back
with open('BatteryROI_6.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("[OK] Moved 'no data' message inside main IIFE scope!")
print("\nThe message now has access to selectedDay variable.")
