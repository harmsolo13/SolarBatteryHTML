#!/usr/bin/env python3
"""
Fix BatteryROI_8_HA.html to actually use Home Assistant instead of WeatherAPI
"""

print("Fixing forecast loading to use Home Assistant...")

# Read the file
with open('BatteryROI_8_HA.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find and replace the loadForecast function to use HA instead of WeatherAPI
old_load_forecast = '''                const loadForecast = async () => {
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
                    }'''

new_load_forecast = '''                const loadForecast = async () => {
                  setForecastLoading(true);
                  setForecastError(null);

                  try {
                    // Fetch from Home Assistant instead of WeatherAPI
                    console.log('Fetching BOM weather from Home Assistant...');

                    // Check if token is set
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

                    // Fetch weather from HA
                    const haForecast = await fetchHAWeatherForecast();
                    console.log('Home Assistant forecast:', haForecast);

                    if (!haForecast || !haForecast.forecast) {
                      setForecastError('Failed to fetch weather data from Home Assistant');
                      setForecastLoading(false);
                      return;
                    }'''

if old_load_forecast in html:
    html = html.replace(old_load_forecast, new_load_forecast)
    print("[OK] Replaced loadForecast to use Home Assistant")
else:
    print("[ERROR] Could not find loadForecast function")
    exit(1)

# Now replace the forecast processing part
old_processing = '''                    // Calculate average solar from historical data
                    const avgSolar = _dailyResults.reduce((sum, d) => sum + d.total_solar_kwh, 0) / dailyResults.length;

                    // Process forecast for each day
                    const predictions = weather.forecast.forecastday.map(day => {'''

new_processing = '''                    // Calculate average solar from historical data
                    const avgSolar = _dailyResults.reduce((sum, d) => sum + d.total_solar_kwh, 0) / _dailyResults.length;

                    // Process HA forecast for each day
                    const predictions = haForecast.forecast.slice(0, 7).map(day => {'''

if old_processing in html:
    html = html.replace(old_processing, new_processing)
    print("[OK] Updated forecast processing")
else:
    print("[WARN] Could not find forecast processing section")

# Replace the individual forecast day processing
old_day_processing = '''                      const forecast = day.day;
                      const dateObj = new Date(day.date);

                      // Get cloud cover and UV
                      const cloudCover = forecast.avgcloudpct || forecast.cloud || 50;
                      const uvIndex = forecast.uv || 0;

                      // Calculate solar multiplier
                      const solarMultiplier = WEATHER_SOLAR_CORRELATION.getSolarMultiplier(cloudCover, uvIndex);'''

new_day_processing = '''                      const dateObj = new Date(day.datetime);

                      // Get solar multiplier from BOM condition mapping
                      const solarMultiplier = day.solar_multiplier;'''

if old_day_processing in html:
    html = html.replace(old_day_processing, new_day_processing)
    print("[OK] Updated day processing to use BOM conditions")
else:
    print("[WARN] Could not find day processing section")

# Replace forecast data mapping
old_mapping = '''                      return {
                        date: day.date,
                        dateObj: dateObj,
                        dayName: dateObj.toLocaleDateString('en-AU', { weekday: 'short' }),
                        condition: forecast.condition.text,
                        conditionIcon: `https:${forecast.condition.icon}`,
                        tempMax: forecast.maxtemp_c,
                        tempMin: forecast.mintemp_c,
                        cloudCover: cloudCover,
                        uvIndex: uvIndex,
                        rainChance: forecast.daily_chance_of_rain || 0,'''

new_mapping = '''                      return {
                        date: day.date,
                        dateObj: dateObj,
                        dayName: dateObj.toLocaleDateString('en-AU', { weekday: 'short' }),
                        condition: day.condition.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase()),
                        conditionIcon: getConditionIcon(day.condition),
                        tempMax: day.temperature,
                        tempMin: day.templow,
                        cloudCover: 0, // BOM doesn't provide cloud cover %
                        uvIndex: 0, // BOM doesn't provide UV in this format
                        rainChance: day.precipitation_probability || 0,'''

if old_mapping in html:
    html = html.replace(old_mapping, new_mapping)
    print("[OK] Updated data mapping to use HA/BOM fields")
else:
    print("[WARN] Could not find data mapping section")

# Update the help text
old_help = '''                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "12px" }}>
                      Requires Weather API key (see weather_forecast_setup.md)
                    </div>'''

new_help = '''                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "12px" }}>
                      Uses BOM weather from Home Assistant (weather.forecast_home)
                    </div>'''

if old_help in html:
    html = html.replace(old_help, new_help)
    print("[OK] Updated help text")

# Save
with open('BatteryROI_8_HA.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("[OK] Saved BatteryROI_8_HA.html")
print()
print("=" * 80)
print("SUCCESS - Now Using Home Assistant BOM Data!")
print("=" * 80)
print()
print("Changes made:")
print("  - Load Forecast button now calls Home Assistant")
print("  - Uses BOM weather from weather.forecast_home")
print("  - Prompts for HA access token on first use")
print("  - Maps BOM conditions to solar predictions")
print()
print("Test it now!")
print("  1. Refresh BatteryROI_8_HA.html in browser")
print("  2. Go to Daily Details tab")
print("  3. Click 'Load 7-Day Forecast'")
print("  4. Enter your HA token when prompted")
print("  5. Should now show Saturday = 36.9°C!")
print()
