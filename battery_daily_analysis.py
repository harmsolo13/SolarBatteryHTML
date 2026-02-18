#!/usr/bin/env python3
"""
Daily Battery Charging Analysis
Analyzes when battery reaches full charge each day based on actual solar data
"""

import pandas as pd
import numpy as np
from datetime import datetime, time
from pathlib import Path
import json

# Battery specs
BATTERY_USABLE_KWH = 27.36
BATTERY_CHARGE_RATE_KW = 4.3
BATTERY_EFFICIENCY = 0.96

def load_solar_data(csv_files):
    """Load all solar CSV files"""
    all_data = []
    for csv_file in sorted(csv_files):
        try:
            for encoding in ['latin-1', 'utf-8', 'cp1252']:
                try:
                    df = pd.read_csv(csv_file, encoding=encoding, encoding_errors='ignore')
                    df['datetime'] = pd.to_datetime(df['RTCTime'], format='%Y/%m/%d %H:%M:%S')
                    df = df[['datetime', 'Power Now (W)']].copy()
                    df['Power Now (W)'] = pd.to_numeric(df['Power Now (W)'], errors='coerce').fillna(0)
                    all_data.append(df)
                    break
                except:
                    continue
        except:
            continue

    combined = pd.concat(all_data, ignore_index=True)
    combined = combined.sort_values('datetime').drop_duplicates(subset=['datetime']).set_index('datetime')
    return combined

def analyze_daily_charging(solar_df):
    """
    Analyze daily battery charging patterns

    Returns:
        Dictionary with daily charging statistics
    """
    solar_df = solar_df.copy()
    solar_df['date'] = solar_df.index.date
    solar_df['hour'] = solar_df.index.hour
    solar_df['minute'] = solar_df.index.minute

    interval_hours = 5 / 60.0  # 5-minute intervals

    daily_results = []

    # Group by date
    for date, day_data in solar_df.groupby('date'):
        if len(day_data) == 0:
            continue

        # Simulate battery charging for this day
        battery_soc_kwh = 0  # Start empty each day (conservative estimate)
        time_to_full = None
        hourly_soc = {}

        for idx in day_data.index:
            solar_w = day_data.loc[idx, 'Power Now (W)']
            hour = day_data.loc[idx, 'hour']
            minute = day_data.loc[idx, 'minute']

            # Calculate charging (assume all solar goes to battery for simplicity)
            charge_limit_w = BATTERY_CHARGE_RATE_KW * 1000
            actual_charge_w = min(solar_w, charge_limit_w)

            # Energy added to battery (accounting for efficiency)
            energy_added_kwh = (actual_charge_w * interval_hours * BATTERY_EFFICIENCY) / 1000

            # Update battery SOC
            battery_soc_kwh = min(battery_soc_kwh + energy_added_kwh, BATTERY_USABLE_KWH)

            # Track hourly SOC
            if hour not in hourly_soc:
                hourly_soc[hour] = []
            hourly_soc[hour].append(battery_soc_kwh)

            # Check if battery reached full
            if time_to_full is None and battery_soc_kwh >= BATTERY_USABLE_KWH * 0.95:  # 95% = "full"
                time_to_full = f"{hour:02d}:{minute:02d}"

        # Calculate daily statistics
        max_soc = max(hourly_soc[h][-1] for h in hourly_soc if len(hourly_soc[h]) > 0) if hourly_soc else 0
        total_solar = day_data['Power Now (W)'].sum() * interval_hours / 1000

        # Average SOC by hour
        avg_hourly_soc = {hour: np.mean(soc_list) for hour, soc_list in hourly_soc.items()}

        daily_results.append({
            'date': str(date),
            'day_of_week': pd.Timestamp(date).day_name(),
            'total_solar_kwh': round(total_solar, 2),
            'max_battery_soc_kwh': round(max_soc, 2),
            'battery_filled_pct': round((max_soc / BATTERY_USABLE_KWH) * 100, 1),
            'time_to_full': time_to_full,
            'hourly_soc': {str(h): round(v, 2) for h, v in avg_hourly_soc.items()}
        })

    return daily_results

def calculate_summary_stats(daily_results):
    """Calculate summary statistics from daily results"""

    # Days that reached full charge
    days_full = [d for d in daily_results if d['time_to_full'] is not None]

    # Extract time to full (convert to minutes from midnight)
    times_to_full_minutes = []
    for d in days_full:
        try:
            h, m = map(int, d['time_to_full'].split(':'))
            times_to_full_minutes.append(h * 60 + m)
        except:
            continue

    # Average hourly SOC across all days
    all_hours = range(24)
    avg_soc_by_hour = {}
    for hour in all_hours:
        hour_values = []
        for day in daily_results:
            if str(hour) in day['hourly_soc']:
                hour_values.append(day['hourly_soc'][str(hour)])
        if hour_values:
            avg_soc_by_hour[hour] = round(np.mean(hour_values), 2)

    # Seasonal breakdown
    seasons = {}
    for day in daily_results:
        date = pd.Timestamp(day['date'])
        month = date.month

        # Determine season (Southern Hemisphere - Adelaide)
        if month in [12, 1, 2]:
            season = 'Summer'
        elif month in [3, 4, 5]:
            season = 'Autumn'
        elif month in [6, 7, 8]:
            season = 'Winter'
        else:
            season = 'Spring'

        if season not in seasons:
            seasons[season] = []
        seasons[season].append(day)

    seasonal_stats = {}
    for season, days in seasons.items():
        days_reached_full = [d for d in days if d['time_to_full'] is not None]
        avg_solar = np.mean([d['total_solar_kwh'] for d in days])
        avg_max_soc = np.mean([d['max_battery_soc_kwh'] for d in days])

        seasonal_times = []
        for d in days_reached_full:
            try:
                h, m = map(int, d['time_to_full'].split(':'))
                seasonal_times.append(h * 60 + m)
            except:
                continue

        avg_time_to_full = None
        if seasonal_times:
            avg_minutes = np.mean(seasonal_times)
            avg_time_to_full = f"{int(avg_minutes // 60):02d}:{int(avg_minutes % 60):02d}"

        seasonal_stats[season] = {
            'total_days': len(days),
            'days_reached_full': len(days_reached_full),
            'pct_days_full': round((len(days_reached_full) / len(days) * 100), 1) if len(days) > 0 else 0,
            'avg_solar_kwh': round(avg_solar, 2),
            'avg_max_soc_kwh': round(avg_max_soc, 2),
            'avg_time_to_full': avg_time_to_full
        }

    return {
        'total_days_analyzed': len(daily_results),
        'days_reached_full': len(days_full),
        'pct_days_full': round((len(days_full) / len(daily_results) * 100), 1) if len(daily_results) > 0 else 0,
        'avg_time_to_full_minutes': round(np.mean(times_to_full_minutes), 0) if times_to_full_minutes else None,
        'avg_time_to_full': f"{int(np.mean(times_to_full_minutes) // 60):02d}:{int(np.mean(times_to_full_minutes) % 60):02d}" if times_to_full_minutes else None,
        'earliest_full': min([d['time_to_full'] for d in days_full]) if days_full else None,
        'latest_full': max([d['time_to_full'] for d in days_full]) if days_full else None,
        'avg_hourly_soc': avg_soc_by_hour,
        'seasonal_stats': seasonal_stats
    }

def main():
    print("=" * 80)
    print("Daily Battery Charging Analysis")
    print("=" * 80)
    print()

    # Load solar data
    data_dir = Path(__file__).parent
    csv_files = sorted(data_dir.glob("C03AEC7B*.csv"))

    if not csv_files:
        print("ERROR: No CSV files found!")
        return

    print(f"Loading {len(csv_files)} CSV files...")
    solar_df = load_solar_data(csv_files)
    print(f"Loaded {len(solar_df)} records from {solar_df.index.min()} to {solar_df.index.max()}")
    print()

    # Analyze daily charging patterns
    print("Analyzing daily charging patterns...")
    daily_results = analyze_daily_charging(solar_df)
    print(f"Analyzed {len(daily_results)} days")
    print()

    # Calculate summary statistics
    print("Calculating summary statistics...")
    summary = calculate_summary_stats(daily_results)
    print()

    # Display results
    print("=" * 80)
    print("DAILY CHARGING ANALYSIS SUMMARY")
    print("=" * 80)
    print()

    print(f"Total days analyzed:        {summary['total_days_analyzed']}")
    print(f"Days battery reached full:  {summary['days_reached_full']} ({summary['pct_days_full']}%)")

    if summary['avg_time_to_full']:
        print(f"Average time to full:       {summary['avg_time_to_full']}")
        print(f"Earliest full charge:       {summary['earliest_full']}")
        print(f"Latest full charge:         {summary['latest_full']}")

    print()
    print("SEASONAL BREAKDOWN:")
    print("-" * 80)
    for season in ['Summer', 'Autumn', 'Winter', 'Spring']:
        if season in summary['seasonal_stats']:
            s = summary['seasonal_stats'][season]
            print(f"\n{season}:")
            print(f"  Days reaching full: {s['days_reached_full']}/{s['total_days']} ({s['pct_days_full']}%)")
            print(f"  Avg time to full:   {s['avg_time_to_full'] or 'N/A'}")
            print(f"  Avg solar gen:      {s['avg_solar_kwh']} kWh/day")
            print(f"  Avg max SOC:        {s['avg_max_soc_kwh']} kWh ({s['avg_max_soc_kwh']/BATTERY_USABLE_KWH*100:.0f}%)")

    print()
    print("TYPICAL DAILY CHARGING CURVE (Average SOC by Hour):")
    print("-" * 80)
    for hour in range(6, 20):  # 6am to 8pm
        if hour in summary['avg_hourly_soc']:
            soc = summary['avg_hourly_soc'][hour]
            pct = (soc / BATTERY_USABLE_KWH) * 100
            bar_length = int(pct / 2)
            bar = '#' * bar_length
            print(f"{hour:02d}:00  {bar:<50} {soc:5.1f} kWh ({pct:5.1f}%)")

    print()
    print("=" * 80)

    # Save results
    results = {
        'summary': summary,
        'daily_results': daily_results,  # Include ALL days for granular view
        'battery_spec': {
            'usable_kwh': BATTERY_USABLE_KWH,
            'charge_rate_kw': BATTERY_CHARGE_RATE_KW
        }
    }

    with open('battery_daily_charging.json', 'w') as f:
        json.dump(results, f, indent=2)

    print("\nResults saved to battery_daily_charging.json")
    print("Analysis complete!")

if __name__ == "__main__":
    main()
