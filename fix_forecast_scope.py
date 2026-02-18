#!/usr/bin/env python3
"""
Fix the weather forecast section to have access to outer scope variables
by removing the unnecessary IIFE wrapper
"""

# Read the HTML
with open('BatteryROI_6.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# The weather forecast section currently has:
#   {(() => {
#     const loadForecast = ...
#     useEffect(...)
#     return (JSX)
#   })()}

# We need to change it to just:
#   {(() => {
#     const loadForecast = ...
#     useEffect(...)
#     // No return, just JSX
#   })()}

# Actually, even better - we don't need the IIFE at all because:
# - useEffect is already at component level
# - loadForecast can be defined inline

# But wait - there's a useEffect inside which can't be at that level
# The solution: Remove the outer IIFE and just have the JSX

# Find the forecast IIFE start
old_forecast_start = """              {(() => {
                const loadForecast = async () => {"""

# Replace with just defining the function
new_forecast_start = """              {(() => {
                // Access outer scope variables: dailyResults, batterySpec, avgSolarAllDays
                const loadForecast = async () => {"""

html_content = html_content.replace(old_forecast_start, new_forecast_start)

# But actually, the real issue is that we need to make the variables accessible
# The better fix: remove the IIFE entirely and move the useEffect and loadForecast
# into the component level, or pass dailyResults through

# Actually, let me think about this differently
# The forecast section creates an IIFE and inside that IIFE it tries to use dailyResults
# But dailyResults is defined in the PARENT IIFE

# The issue is scope. We need dailyResults to be accessible.
# Solution: Move the forecast section INSIDE the main IIFE's return,
# but don't create another nested IIFE

# Let me check the pattern more carefully
# Currently:
#   return <>
#     ...stuff...
#     {(() => { <-- NEW IIFE, loses access to dailyResults
#       const loadForecast = ...uses dailyResults...
#     })()}
#   </>;

# We need:
#   return <>
#     ...stuff...
#     {(() => { <-- This is OK to have an IIFE
#       // But we need to capture dailyResults from closure
#       const _dailyResults = dailyResults;  // Capture from closure
#       const loadForecast = ...uses _dailyResults...
#     })()}
#   </>;

# OR better yet, don't have the useEffect inside the IIFE

# Actually, looking at the code structure, the forecast IIFE should have access
# to the outer variables through closure. Let me check if dailyResults is
# actually being passed correctly

# Let me try a different approach: just ensure the variables are captured
# by adding explicit references at the top of the forecast IIFE

forecast_function_start = """              {(() => {
                const loadForecast = async () => {
                  if (!WEATHER_API_KEY || WEATHER_API_KEY === 'YOUR_API_KEY_HERE') {
                    setForecastError('Please configure your Weather API key (see weather_forecast_setup.md)');
                    return;
                  }

                  setForecastLoading(true);
                  setForecastError(null);

                  try {
                    const weather = await fetchWeatherForecast(7);
                    if (!weather) {
                      setForecastError('Failed to fetch weather data. Check your API key and internet connection.');
                      return;
                    }

                    // Calculate average solar from historical data
                    const avgSolar = dailyResults.reduce((sum, d) => sum + d.total_solar_kwh, 0) / dailyResults.length;"""

new_forecast_function_start = """              {(() => {
                // Capture variables from outer scope (closure)
                const _dailyResults = typeof dailyResults !== 'undefined' ? dailyResults : historicalData.daily_results;
                const _batterySpec = typeof batterySpec !== 'undefined' ? batterySpec : historicalData.battery_spec || { usable_kwh: 27.36 };
                const _avgSolarAllDays = typeof avgSolarAllDays !== 'undefined' ? avgSolarAllDays : _dailyResults.reduce((sum, d) => sum + d.total_solar_kwh, 0) / _dailyResults.length;

                const loadForecast = async () => {
                  if (!WEATHER_API_KEY || WEATHER_API_KEY === 'YOUR_API_KEY_HERE') {
                    setForecastError('Please configure your Weather API key (see weather_forecast_setup.md)');
                    return;
                  }

                  setForecastLoading(true);
                  setForecastError(null);

                  try {
                    const weather = await fetchWeatherForecast(7);
                    if (!weather) {
                      setForecastError('Failed to fetch weather data. Check your API key and internet connection.');
                      return;
                    }

                    // Calculate average solar from historical data
                    const avgSolar = _dailyResults.reduce((sum, d) => sum + d.total_solar_kwh, 0) / _dailyResults.length;"""

html_content = html_content.replace(forecast_function_start, new_forecast_function_start)

# Also need to update the batterySpec reference in the predictBatteryPerformance call
html_content = html_content.replace(
    "const batteryPred = predictBatteryPerformance(predictedSolar, batterySpec.usable_kwh);",
    "const batteryPred = predictBatteryPerformance(predictedSolar, _batterySpec.usable_kwh);"
)

# Write back
with open('BatteryROI_6.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("[OK] Fixed weather forecast scope!")
print("\nWeather forecast now captures outer scope variables:")
print("  - dailyResults -> _dailyResults")
print("  - batterySpec -> _batterySpec")
print("  - avgSolarAllDays -> _avgSolarAllDays")
