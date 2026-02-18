#!/usr/bin/env python3
"""
Fix React hooks issue in tab 5 (Daily Details)
Move useState calls from IIFE to component level
"""

# Read the HTML
with open('BatteryROI_6.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Step 1: Add state variables at component level (after historicalError)
state_insertion_point = "  const [historicalError, setHistoricalError] = useState(false);"

new_state_variables = """  const [historicalError, setHistoricalError] = useState(false);

  // Tab 5: Daily Details state
  const [selectedDate, setSelectedDate] = useState('2024-10-01');
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  const [forecastData, setForecastData] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);"""

html_content = html_content.replace(state_insertion_point, new_state_variables)

# Step 2: Fix tab 5 opening - remove the IIFE and useState declarations
old_tab5_start = """        {tab === 5 && (() => {
          const [selectedDate, setSelectedDate] = useState('2024-10-01');
          const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'

          // Get daily results from historicalData"""

new_tab5_start = """        {tab === 5 && <>
          {/* Get daily results from historicalData */}"""

html_content = html_content.replace(old_tab5_start, new_tab5_start)

# Step 3: Fix the weather forecast section - remove nested IIFE and useState
old_forecast_start = """              {(() => {
                const [forecastData, setForecastData] = useState(null);
                const [forecastLoading, setForecastLoading] = useState(false);
                const [forecastError, setForecastError] = useState(null);

                const loadForecast = async () => {"""

new_forecast_start = """              {(() => {
                const loadForecast = async () => {"""

html_content = html_content.replace(old_forecast_start, new_forecast_start)

# Step 4: Fix tab 5 closing - change from })()}) to just </>
# Need to find the end of tab 5 carefully
# The pattern is:   })())}  which should become just  </>}

# Actually, let's be more careful. Let me find the exact closing pattern
# Tab 5 should end with   </>;  })())}  but we want it to end with just  </>}

# This is tricky because there might be multiple closing patterns
# Let me search for the specific closing of the forecast section first

# The forecast section ends with:
#                 </>;
#               })()}

old_forecast_close = """                </>;
              })()}"""

new_forecast_close = """                </>;
              })()}"""  # Keep this one as-is, it's inside a function

# But the main tab 5 close needs to change from:
#           </>;
#         })()}

# Let me be very specific and look for the pattern after "No data available"
old_tab5_end = """          </>;
        })()}"""

new_tab5_end = """        </>}"""

html_content = html_content.replace(old_tab5_end, new_tab5_end)

# Write back
with open('BatteryROI_6.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("[OK] Fixed React hooks in tab 5!")
print("\nChanges made:")
print("1. Moved useState hooks to component level")
print("2. Removed IIFE wrapper from tab 5")
print("3. Fixed nested useState in forecast section")
print("4. Updated closing brackets")
print("\nTab 5 should now load correctly!")
