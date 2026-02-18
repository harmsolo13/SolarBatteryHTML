#!/usr/bin/env python3
"""
Research and integrate Bureau of Meteorology (BOM) API
for accurate Adelaide/Ferryden Park weather forecasts
"""

import json
import urllib.request

# BOM Forecast URLs
# Adelaide Metro forecast: IDS60901
BOM_ADELAIDE_FORECAST = "http://www.bom.gov.au/fwo/IDS60901/IDS60901.94675.json"
BOM_SA_DISTRICTS = "http://www.bom.gov.au/fwo/IDS60920/IDS60920.94675.json"

print("=" * 80)
print("BOM API Integration Research")
print("=" * 80)
print()

print("Fetching BOM Adelaide Metro forecast...")
print(f"URL: {BOM_ADELAIDE_FORECAST}")
print()

try:
    with urllib.request.urlopen(BOM_ADELAIDE_FORECAST) as response:
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
    print("BOM Data Structure Analysis")
    print("=" * 80)
    print()

    # Top-level keys
    print("Top-level keys:")
    for key in data.keys():
        print(f"  - {key}")
    print()

    # Observations
    if 'observations' in data:
        obs = data['observations']
        print("Observations structure:")
        if 'data' in obs:
            print(f"  Number of observation points: {len(obs['data'])}")
            if obs['data']:
                first_obs = obs['data'][0]
                print(f"  Sample observation location: {first_obs.get('name', 'N/A')}")
                print(f"  Available fields: {list(first_obs.keys())}")
        print()

    # Forecasts
    if 'forecasts' in data:
        forecasts = data['forecasts']
        print("Forecasts structure:")
        if 'data' in forecasts:
            print(f"  Number of forecast days: {len(forecasts['data'])}")
            if forecasts['data']:
                first_day = forecasts['data'][0]
                print(f"  Sample forecast date: {first_day.get('date', 'N/A')}")
                print(f"  Available fields: {list(first_day.keys())}")
                print()
                print(f"  Min temp: {first_day.get('temp_min', 'N/A')}°C")
                print(f"  Max temp: {first_day.get('temp_max', 'N/A')}°C")
                print(f"  Forecast: {first_day.get('short_text', 'N/A')}")
        print()

    # Locations included
    if 'forecasts' in data and 'header' in data['forecasts']:
        header = data['forecasts']['header']
        print("Forecast header info:")
        print(f"  Product ID: {header.get('product_id', 'N/A')}")
        print(f"  Refresh message: {header.get('refresh_message', 'N/A')}")
        print(f"  Issue time: {header.get('issue_time_local', 'N/A')}")
        print()

    # Extract all forecast days
    print("=" * 80)
    print("7-Day Forecast Preview")
    print("=" * 80)
    print()

    if 'forecasts' in data and 'data' in data['forecasts']:
        forecast_days = data['forecasts']['data'][:7]  # Get 7 days

        for i, day in enumerate(forecast_days):
            print(f"Day {i+1}: {day.get('date', 'N/A')}")
            print(f"  Min: {day.get('temp_min', 'N/A')}°C | Max: {day.get('temp_max', 'N/A')}°C")
            print(f"  Forecast: {day.get('short_text', 'N/A')}")
            print(f"  Extended: {day.get('extended_text', 'N/A')}")
            print(f"  UV Alert: {day.get('uv_alert', 'N/A')}")
            print()

    print("=" * 80)
    print("Field Mapping for Solar Prediction")
    print("=" * 80)
    print()

    print("Available BOM fields we can use:")
    if forecast_days:
        sample = forecast_days[0]
        useful_fields = {
            'date': sample.get('date'),
            'temp_min': sample.get('temp_min'),
            'temp_max': sample.get('temp_max'),
            'short_text': sample.get('short_text'),
            'extended_text': sample.get('extended_text'),
            'icon_descriptor': sample.get('icon_descriptor'),
            'rain_amount_min': sample.get('rain', {}).get('amount', {}).get('min'),
            'rain_amount_max': sample.get('rain', {}).get('amount', {}).get('max'),
            'rain_chance': sample.get('rain', {}).get('chance'),
            'uv_category': sample.get('uv_category'),
            'uv_max_index': sample.get('uv_max_index'),
        }

        for field, value in useful_fields.items():
            print(f"  {field}: {value}")
        print()

    # Create weather condition to solar multiplier mapping
    print("=" * 80)
    print("Weather Condition Mapping")
    print("=" * 80)
    print()

    print("BOM icon descriptors and suggested solar multipliers:")
    print()

    bom_to_solar = {
        'sunny': 1.0,
        'clear': 1.0,
        'mostly_sunny': 0.9,
        'partly_cloudy': 0.7,
        'cloudy': 0.5,
        'mostly_cloudy': 0.4,
        'overcast': 0.3,
        'shower': 0.3,
        'showers': 0.3,
        'rain': 0.2,
        'storm': 0.15,
        'fog': 0.4,
        'hazy': 0.7,
        'wind': 0.8,  # Usually means clear and windy
        'frost': 0.9,  # Clear but cold
        'snow': 0.2,
        'dusty': 0.6,
    }

    for condition, multiplier in bom_to_solar.items():
        print(f"  {condition:20s} -> {multiplier:.1%} solar capacity")
    print()

    # Save the mapping
    with open('bom_solar_mapping.json', 'w') as f:
        json.dump(bom_to_solar, f, indent=2)
    print("[OK] Saved solar mapping to bom_solar_mapping.json")
    print()

    print("=" * 80)
    print("Next Steps")
    print("=" * 80)
    print()
    print("1. Review bom_adelaide_forecast.json for full data structure")
    print("2. Update BatteryROI calculator to use BOM instead of WeatherAPI")
    print("3. Map BOM icon_descriptor to solar generation multipliers")
    print("4. Parse BOM date format and forecast structure")
    print("5. Test with real BOM data")
    print()
    print("Advantages of BOM:")
    print("  + Official Australian Bureau of Meteorology data")
    print("  + Most accurate for Adelaide/SA region")
    print("  + Free, no API key required")
    print("  + Updated multiple times daily")
    print()
    print("Differences from WeatherAPI:")
    print("  - No cloud cover percentage (use icon_descriptor instead)")
    print("  - Different JSON structure")
    print("  - Regional forecast (covers Adelaide metro)")
    print("  - No hourly breakdown (daily forecasts only)")
    print()

except Exception as e:
    print(f"[ERROR] Failed to fetch BOM data: {e}")
    print()
    print("Troubleshooting:")
    print("  - Check internet connection")
    print("  - BOM URL might have changed")
    print("  - Try opening URL in browser to verify")
