#!/usr/bin/env python3
"""
Research and integrate Bureau of Meteorology (BOM) API
Using proper headers to avoid 403 errors
"""

import json
import urllib.request

# BOM Forecast URLs for Adelaide
BOM_ADELAIDE_FORECAST = "http://www.bom.gov.au/fwo/IDS60901/IDS60901.94675.json"

print("=" * 80)
print("BOM API Integration Research (v2)")
print("=" * 80)
print()

print("Fetching BOM Adelaide Metro forecast...")
print(f"URL: {BOM_ADELAIDE_FORECAST}")
print()

try:
    # Create request with proper headers
    req = urllib.request.Request(
        BOM_ADELAIDE_FORECAST,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    )

    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())

    print("[OK] Successfully fetched BOM data!")
    print()

    # Save raw data for analysis
    with open('bom_adelaide_forecast.json', 'w') as f:
        json.dump(data, f, indent=2)
    print("[OK] Saved raw data to bom_adelaide_forecast.json")
    print()

    # Analyze structure
    print("=" * 80)
    print("BOM Data Structure")
    print("=" * 80)
    print()

    # Observations
    if 'observations' in data:
        obs = data['observations']
        if 'data' in obs and obs['data']:
            print("Current Observations:")
            current = obs['data'][0]
            print(f"  Location: {current.get('name', 'N/A')}")
            print(f"  Temp: {current.get('air_temp', 'N/A')}°C")
            print(f"  Apparent temp: {current.get('apparent_t', 'N/A')}°C")
            print()

    # Forecasts - THIS IS WHAT WE NEED
    if 'forecasts' in data and 'data' in data['forecasts']:
        forecast_days = data['forecasts']['data']

        print("=" * 80)
        print("7-DAY FORECAST")
        print("=" * 80)
        print()

        for i, day in enumerate(forecast_days[:7]):
            date = day.get('date', 'N/A')
            min_t = day.get('temp_min', 'N/A')
            max_t = day.get('temp_max', 'N/A')
            short = day.get('short_text', 'N/A')
            icon = day.get('icon_descriptor', 'N/A')
            rain_chance = day.get('rain', {}).get('chance', 'N/A')
            uv = day.get('uv_max_index', 'N/A')

            print(f"Day {i+1}: {date}")
            print(f"  Temperature: {min_t}°C - {max_t}°C")
            print(f"  Forecast: {short}")
            print(f"  Icon: {icon}")
            print(f"  Rain chance: {rain_chance}%")
            print(f"  UV Index: {uv}")
            print()

        # Extract tomorrow's forecast
        if len(forecast_days) > 1:
            tomorrow = forecast_days[1]  # Index 0 is today, 1 is tomorrow
            print("=" * 80)
            print("TOMORROW'S FORECAST")
            print("=" * 80)
            print()
            print(f"Date: {tomorrow.get('date')}")
            print(f"Min: {tomorrow.get('temp_min')}°C")
            print(f"Max: {tomorrow.get('temp_max')}°C")
            print(f"Forecast: {tomorrow.get('short_text')}")
            print(f"Extended: {tomorrow.get('extended_text')}")
            print()

    # Create weather mapping
    print("=" * 80)
    print("Weather Icon to Solar Multiplier Mapping")
    print("=" * 80)
    print()

    # Map BOM icon descriptors to solar generation multipliers
    bom_solar_map = {
        # Clear/Sunny (90-100% solar)
        'sunny': 1.0,
        'clear': 1.0,
        'fine': 1.0,

        # Mostly clear (80-90% solar)
        'mostly_sunny': 0.85,
        'hazy': 0.8,

        # Partly cloudy (60-75% solar)
        'partly_cloudy': 0.7,
        'hazy_sunshine': 0.65,

        # Mostly cloudy (40-55% solar)
        'mostly_cloudy': 0.5,
        'cloudy': 0.45,

        # Overcast/Showers (20-35% solar)
        'overcast': 0.3,
        'shower': 0.25,
        'showers': 0.25,
        'light_shower': 0.3,
        'light_showers': 0.3,

        # Rain/Storm (10-20% solar)
        'rain': 0.15,
        'storm': 0.1,
        'thunderstorm': 0.1,
        'heavy_rain': 0.1,

        # Other conditions
        'fog': 0.4,
        'mist': 0.5,
        'wind': 0.85,  # Clear and windy
        'frost': 0.9,  # Clear but cold
        'dusty': 0.6,
        'haze': 0.7,
    }

    print("BOM Icon Descriptor -> Solar Generation Multiplier")
    print()
    for icon, mult in sorted(bom_solar_map.items(), key=lambda x: x[1], reverse=True):
        bar = '█' * int(mult * 20)
        print(f"  {icon:25s} {mult:>5.0%}  {bar}")
    print()

    # Save mapping
    with open('bom_solar_mapping.json', 'w') as f:
        json.dump(bom_solar_map, f, indent=2)
    print("[OK] Saved mapping to bom_solar_mapping.json")
    print()

    # Save processed forecast data for JavaScript
    if 'forecasts' in data and 'data' in data['forecasts']:
        js_forecast = []
        for day in data['forecasts']['data'][:7]:
            icon = day.get('icon_descriptor', 'partly_cloudy')
            solar_mult = bom_solar_map.get(icon, 0.5)  # Default 50% if unknown

            js_forecast.append({
                'date': day.get('date'),
                'temp_min': day.get('temp_min'),
                'temp_max': day.get('temp_max'),
                'forecast': day.get('short_text'),
                'icon': icon,
                'rain_chance': day.get('rain', {}).get('chance', 0),
                'uv_index': day.get('uv_max_index', 0),
                'solar_multiplier': solar_mult
            })

        with open('bom_forecast_processed.json', 'w') as f:
            json.dump(js_forecast, f, indent=2)
        print("[OK] Saved processed forecast to bom_forecast_processed.json")
        print()

    print("=" * 80)
    print("SUCCESS!")
    print("=" * 80)
    print()
    print("Next: I'll create the JavaScript integration for BatteryROI")
    print()

except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()
