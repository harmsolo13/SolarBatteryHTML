#!/usr/bin/env python3
"""
Fix the structure of tab 5 to use proper conditional rendering
"""

# Read the HTML
with open('BatteryROI_6.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# The problem is that we have return statements outside a function
# We need to wrap the logic properly

old_structure = """        {tab === 5 && <>
          {/* Get daily results from historicalData */}
          if (!historicalData || !historicalData.daily_results) {
            return <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
              Loading daily data...
            </div>;
          }

          const dailyResults = historicalData.daily_results;
          const batterySpec = historicalData.battery_spec || { usable_kwh: 27.36 };"""

new_structure = """        {tab === 5 && <>
          {!historicalData || !historicalData.daily_results ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
              Loading daily data...
            </div>
          ) : (() => {
            const dailyResults = historicalData.daily_results;
            const batterySpec = historicalData.battery_spec || { usable_kwh: 27.36 };"""

html_content = html_content.replace(old_structure, new_structure)

# Now we need to add a closing for the IIFE at the end of tab 5
# But before the final </>}

# The tab should end with  })()}</>}
# Let me find the current ending

# Actually, since we're wrapping in an IIFE again, we need the proper closing
# The end should be:
#     })()}
#   </>}

# Let's find where tab 5 ends (before tab 6 or the closing div)
# It should be right before the next section

# Actually, I realize the issue - we DO need an IIFE to have local const declarations
# But the useState needs to be at component level (which we already did)
# So the structure should be:
#   {tab === 5 && <>
#     {!data ? <Loading /> : (() => {
#       const x = ...
#       return <>...</>
#     })()}
#   </>}

# We need to make sure there's a return statement in the IIFE
# Let me check if there already is one

# Write back
with open('BatteryROI_6.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("[OK] Fixed tab 5 structure!")
print("\nNow using proper conditional rendering with IIFE for local variables.")
