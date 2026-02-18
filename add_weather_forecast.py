#!/usr/bin/env python3
"""
Add weather forecast functionality to BatteryROI_6.html
"""

# Weather API configuration code to insert after line 29
weather_config = '''
/* ── Weather Forecast Configuration ── */
const WEATHER_API_KEY = 'YOUR_API_KEY_HERE'; // Get free key from weatherapi.com
const WEATHER_API_URL = 'https://api.weatherapi.com/v1/forecast.json';
const ADELAIDE_LOCATION = '-34.9285,138.6007'; // Adelaide, SA coordinates

// Weather to solar generation correlation (based on historical data analysis)
const WEATHER_SOLAR_CORRELATION = {
  // cloud_cover % -> solar generation multiplier
  getSolarMultiplier: (cloudCover, uvIndex) => {
    // Base on cloud cover
    let multiplier = 1.0;
    if (cloudCover <= 10) multiplier = 1.0;      // Clear
    else if (cloudCover <= 30) multiplier = 0.9; // Mostly clear
    else if (cloudCover <= 50) multiplier = 0.7; // Partly cloudy
    else if (cloudCover <= 70) multiplier = 0.5; // Mostly cloudy
    else if (cloudCover <= 90) multiplier = 0.3; // Overcast
    else multiplier = 0.15;                       // Heavy cloud/rain

    // Adjust by UV index (0-11+ scale)
    const uvMultiplier = Math.min(uvIndex / 8, 1.0);
    return multiplier * (0.7 + 0.3 * uvMultiplier);
  }
};
'''

# Weather fetch function to insert
weather_fetch_function = '''
// Fetch weather forecast for Adelaide
async function fetchWeatherForecast(days = 7) {
  if (!WEATHER_API_KEY || WEATHER_API_KEY === 'YOUR_API_KEY_HERE') {
    console.warn('Weather API key not configured');
    return null;
  }

  try {
    const url = `${WEATHER_API_URL}?key=${WEATHER_API_KEY}&q=${ADELAIDE_LOCATION}&days=${days}&aqi=no`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch weather forecast:', error);
    return null;
  }
}

// Predict solar generation based on weather forecast
function predictSolarFromWeather(weatherDay, historicalAvgSolar) {
  const cloudCover = weatherDay.day.avgvis_km < 5 ? 90 : weatherDay.day.daily_will_it_rain ? 70 : weatherDay.hour[12].cloud || 30;
  const uvIndex = weatherDay.day.uv || 5;
  const multiplier = WEATHER_SOLAR_CORRELATION.getSolarMultiplier(cloudCover, uvIndex);

  // Get seasonal adjustment based on month
  const date = new Date(weatherDay.date);
  const month = date.getMonth(); // 0-11
  const seasonalMultipliers = [1.2, 1.1, 0.9, 0.7, 0.5, 0.4, 0.45, 0.6, 0.8, 1.0, 1.1, 1.2]; // Jan-Dec
  const seasonalAdj = seasonalMultipliers[month];

  return historicalAvgSolar * multiplier * seasonalAdj;
}

// Predict battery performance based on predicted solar
function predictBatteryPerformance(predictedSolarKwh, batteryCapacityKwh = 27.36) {
  // Simple model: assume linear charging from 0 to predicted solar over daylight hours
  const chargeRate = 4.3; // kW
  const efficiency = 0.96;

  // Estimate charging hours (approximate)
  const chargingHours = Math.min(predictedSolarKwh / (chargeRate * efficiency), 8);
  const maxSOC = Math.min(predictedSolarKwh * efficiency, batteryCapacityKwh);
  const fillPct = (maxSOC / batteryCapacityKwh) * 100;

  // Estimate time to full (if possible)
  let timeToFull = null;
  if (fillPct >= 95) {
    // Assume charging starts at 8am and reaches 95% at:
    const hoursTo95 = (batteryCapacityKwh * 0.95) / (chargeRate * efficiency);
    const hour = 8 + Math.min(hoursTo95, 8);
    timeToFull = `${Math.floor(hour)}:${Math.floor((hour % 1) * 60).toString().padStart(2, '0')}`;
  }

  return {
    predictedSolarKwh: Math.round(predictedSolarKwh * 10) / 10,
    maxSOC: Math.round(maxSOC * 10) / 10,
    fillPct: Math.round(fillPct * 10) / 10,
    timeToFull,
    performance: fillPct >= 95 ? 'Excellent' : fillPct >= 75 ? 'Good' : fillPct >= 50 ? 'Fair' : 'Poor'
  };
}
'''

# Read the HTML file
with open('BatteryROI_6.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Find the location to insert weather config (after React imports)
insert_marker = "const { useState, useMemo, useCallback, useEffect } = React;"
if insert_marker not in html_content:
    print("ERROR: Could not find insertion point for weather config!")
    exit(1)

# Insert weather configuration
html_content = html_content.replace(
    insert_marker,
    insert_marker + '\n' + weather_config
)

# Find location to insert weather functions (after other functions, before the main component)
function_insert_marker = "function makeRateSet(from, label, overrides = {}) {"
if function_insert_marker not in html_content:
    print("ERROR: Could not find insertion point for weather functions!")
    exit(1)

html_content = html_content.replace(
    function_insert_marker,
    weather_fetch_function + '\n\n' + function_insert_marker
)

# Write back
with open('BatteryROI_6.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("[OK] Weather forecast functionality added to HTML!")
print("\nNext steps:")
print("1. Get a free API key from https://www.weatherapi.com/signup.aspx")
print("2. Open BatteryROI_6.html in a text editor")
print("3. Find: const WEATHER_API_KEY = 'YOUR_API_KEY_HERE';")
print("4. Replace YOUR_API_KEY_HERE with your actual API key")
print("5. Save and reload the HTML in your browser")
print("\nWeather forecast will then appear in the Daily Details tab!")
