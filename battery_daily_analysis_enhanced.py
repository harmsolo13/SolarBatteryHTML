#!/usr/bin/env python3
"""
Enhanced Daily Battery Charging Analysis
Includes:
1. Continuous simulation (realistic day-to-day behavior)
2. Multiple starting SOC scenarios (0%, 25%, 50%, 75%)
"""

import pandas as pd
import numpy as np
from datetime import datetime, time
from pathlib import Path
import json

# Battery specs
BATTERY_USABLE_KWH = 27.36
BATTERY_CHARGE_RATE_KW = 4.3
BATTERY_DISCHARGE_RATE_KW = 4.9
BATTERY_EFFICIENCY = 0.96

# Rate periods
def get_rate_period(hour):
    if 10 <= hour < 15:
        return 'sponge'  # 10am-3pm
    elif (6 <= hour < 10) or (18 <= hour < 24):
        return 'peak'  # 6am-10am, 6pm-12am
    else:
        return 'off_peak'  # 12am-6am

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

def simulate_single_day(day_data, starting_soc_kwh, interval_hours=5/60.0):
    """
    Simulate battery charging for a single day from a given starting SOC
    Returns: time_to_full, max_soc, hourly_soc
    """
    battery_soc_kwh = starting_soc_kwh
    time_to_full = None
    hourly_soc = {}

    for idx in day_data.index:
        solar_w = day_data.loc[idx, 'Power Now (W)']
        hour = idx.hour
        minute = idx.minute

        # Calculate charging (assume all solar goes to battery during daylight)
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
        if time_to_full is None and battery_soc_kwh >= BATTERY_USABLE_KWH * 0.95:
            time_to_full = f"{hour:02d}:{minute:02d}"

    max_soc = max(hourly_soc[h][-1] for h in hourly_soc if len(hourly_soc[h]) > 0) if hourly_soc else starting_soc_kwh
    avg_hourly_soc = {hour: np.mean(soc_list) for hour, soc_list in hourly_soc.items()}

    return time_to_full, max_soc, avg_hourly_soc

def analyze_continuous_simulation(solar_df):
    """
    Continuous simulation: carry SOC from day to day with realistic charging/discharging
    """
    solar_df = solar_df.copy()
    solar_df['date'] = solar_df.index.date
    solar_df['hour'] = solar_df.index.hour
    solar_df['minute'] = solar_df.index.minute
    solar_df['rate_period'] = solar_df['hour'].apply(get_rate_period)

    interval_hours = 5 / 60.0

    # Start with battery at 50% (reasonable assumption)
    battery_soc_kwh = BATTERY_USABLE_KWH * 0.5

    daily_results = []

    for date, day_data in solar_df.groupby('date'):
        if len(day_data) == 0:
            continue

        # Track starting SOC for this day
        starting_soc = battery_soc_kwh
        time_to_full = None
        hourly_soc = {}
        daily_discharge_kwh = 0
        daily_charge_kwh = 0

        for idx in day_data.index:
            solar_w = day_data.loc[idx, 'Power Now (W)']
            hour = day_data.loc[idx, 'hour']
            minute = day_data.loc[idx, 'minute']
            rate_period = day_data.loc[idx, 'rate_period']

            # CHARGING: During daylight hours with solar
            if 6 <= hour < 18 and solar_w > 0:
                charge_limit_w = BATTERY_CHARGE_RATE_KW * 1000
                actual_charge_w = min(solar_w, charge_limit_w)
                energy_added_kwh = (actual_charge_w * interval_hours * BATTERY_EFFICIENCY) / 1000
                battery_soc_kwh = min(battery_soc_kwh + energy_added_kwh, BATTERY_USABLE_KWH)
                daily_charge_kwh += energy_added_kwh

            # DISCHARGING: During peak hours (6pm-12am)
            elif rate_period == 'peak' and hour >= 18:
                # Assume discharge during peak to avoid expensive grid import
                # Discharge at ~2 kW average (typical household evening usage)
                discharge_w = 2000
                discharge_limit_w = BATTERY_DISCHARGE_RATE_KW * 1000
                actual_discharge_w = min(discharge_w, discharge_limit_w)
                energy_used_kwh = (actual_discharge_w * interval_hours) / 1000
                battery_soc_kwh = max(battery_soc_kwh - energy_used_kwh, 0)
                daily_discharge_kwh += energy_used_kwh

            # OVERNIGHT CHARGING: During off-peak hours if SOC < 80%
            elif rate_period == 'off_peak' and battery_soc_kwh < BATTERY_USABLE_KWH * 0.8:
                # Top up from grid during cheap off-peak hours
                charge_w = BATTERY_CHARGE_RATE_KW * 1000
                energy_added_kwh = (charge_w * interval_hours * BATTERY_EFFICIENCY) / 1000
                battery_soc_kwh = min(battery_soc_kwh + energy_added_kwh, BATTERY_USABLE_KWH)
                daily_charge_kwh += energy_added_kwh

            # Track hourly SOC
            if hour not in hourly_soc:
                hourly_soc[hour] = []
            hourly_soc[hour].append(battery_soc_kwh)

            # Check if battery reached full during daylight hours
            if time_to_full is None and battery_soc_kwh >= BATTERY_USABLE_KWH * 0.95 and 6 <= hour < 20:
                time_to_full = f"{hour:02d}:{minute:02d}"

        # Calculate daily statistics
        max_soc = max(hourly_soc[h][-1] for h in hourly_soc if len(hourly_soc[h]) > 0) if hourly_soc else starting_soc
        min_soc = min(hourly_soc[h][0] for h in hourly_soc if len(hourly_soc[h]) > 0) if hourly_soc else starting_soc
        total_solar = day_data['Power Now (W)'].sum() * interval_hours / 1000
        avg_hourly_soc = {hour: np.mean(soc_list) for hour, soc_list in hourly_soc.items()}

        daily_results.append({
            'date': str(date),
            'day_of_week': pd.Timestamp(date).day_name(),
            'total_solar_kwh': round(total_solar, 2),
            'starting_soc_kwh': round(starting_soc, 2),
            'ending_soc_kwh': round(battery_soc_kwh, 2),
            'min_soc_kwh': round(min_soc, 2),
            'max_soc_kwh': round(max_soc, 2),
            'battery_filled_pct': round((max_soc / BATTERY_USABLE_KWH) * 100, 1),
            'daily_charge_kwh': round(daily_charge_kwh, 2),
            'daily_discharge_kwh': round(daily_discharge_kwh, 2),
            'time_to_full': time_to_full,
            'hourly_soc': {str(h): round(v, 2) for h, v in avg_hourly_soc.items()}
        })

    return daily_results

def analyze_scenario_based(solar_df, starting_soc_pct):
    """
    Scenario-based analysis: each day starts at specified SOC (0%, 25%, 50%, 75%)
    """
    solar_df = solar_df.copy()
    solar_df['date'] = solar_df.index.date
    solar_df['hour'] = solar_df.index.hour
    solar_df['minute'] = solar_df.index.minute

    starting_soc_kwh = BATTERY_USABLE_KWH * (starting_soc_pct / 100.0)
    interval_hours = 5 / 60.0

    daily_results = []

    for date, day_data in solar_df.groupby('date'):
        if len(day_data) == 0:
            continue

        time_to_full, max_soc, avg_hourly_soc = simulate_single_day(
            day_data, starting_soc_kwh, interval_hours
        )

        total_solar = day_data['Power Now (W)'].sum() * interval_hours / 1000

        daily_results.append({
            'date': str(date),
            'day_of_week': pd.Timestamp(date).day_name(),
            'total_solar_kwh': round(total_solar, 2),
            'starting_soc_kwh': round(starting_soc_kwh, 2),
            'max_battery_soc_kwh': round(max_soc, 2),
            'battery_filled_pct': round((max_soc / BATTERY_USABLE_KWH) * 100, 1),
            'time_to_full': time_to_full,
            'hourly_soc': {str(h): round(v, 2) for h, v in avg_hourly_soc.items()}
        })

    return daily_results

def calculate_summary_stats(daily_results):
    """Calculate summary statistics"""
    days_full = [d for d in daily_results if d['time_to_full'] is not None]

    times_to_full_minutes = []
    for d in days_full:
        try:
            h, m = map(int, d['time_to_full'].split(':'))
            times_to_full_minutes.append(h * 60 + m)
        except:
            continue

    return {
        'total_days_analyzed': len(daily_results),
        'days_reached_full': len(days_full),
        'pct_days_full': round((len(days_full) / len(daily_results) * 100), 1) if len(daily_results) > 0 else 0,
        'avg_time_to_full': f"{int(np.mean(times_to_full_minutes) // 60):02d}:{int(np.mean(times_to_full_minutes) % 60):02d}" if times_to_full_minutes else None,
        'earliest_full': min([d['time_to_full'] for d in days_full]) if days_full else None,
        'latest_full': max([d['time_to_full'] for d in days_full]) if days_full else None,
    }

def main():
    print("=" * 80)
    print("Enhanced Daily Battery Charging Analysis")
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

    # OPTION 1: Continuous Simulation
    print("Running continuous simulation (realistic day-to-day behavior)...")
    continuous_results = analyze_continuous_simulation(solar_df)
    continuous_summary = calculate_summary_stats(continuous_results)
    print(f"Analyzed {len(continuous_results)} days with continuous SOC")
    print()

    # OPTION 2: Scenario-Based Analysis
    print("Running scenario-based analysis (different starting SOCs)...")
    scenarios = {}
    for starting_pct in [0, 25, 50, 75]:
        print(f"  - Scenario: Starting at {starting_pct}%...")
        scenario_results = analyze_scenario_based(solar_df, starting_pct)
        scenario_summary = calculate_summary_stats(scenario_results)
        scenarios[f"{starting_pct}%"] = {
            'starting_soc_pct': starting_pct,
            'summary': scenario_summary,
            'daily_results': scenario_results
        }
    print()

    # Display summary
    print("=" * 80)
    print("CONTINUOUS SIMULATION SUMMARY")
    print("=" * 80)
    print(f"Total days analyzed:        {continuous_summary['total_days_analyzed']}")
    print(f"Days battery reached full:  {continuous_summary['days_reached_full']} ({continuous_summary['pct_days_full']}%)")
    if continuous_summary['avg_time_to_full']:
        print(f"Average time to full:       {continuous_summary['avg_time_to_full']}")
    print()

    print("=" * 80)
    print("SCENARIO-BASED SUMMARY")
    print("=" * 80)
    for scenario_name, scenario_data in scenarios.items():
        summary = scenario_data['summary']
        print(f"\nStarting SOC: {scenario_name}")
        print(f"  Days reaching full: {summary['days_reached_full']}/{summary['total_days_analyzed']} ({summary['pct_days_full']}%)")
        print(f"  Avg time to full:   {summary['avg_time_to_full'] or 'N/A'}")
    print()

    # Save results
    results = {
        'continuous_simulation': {
            'summary': continuous_summary,
            'daily_results': continuous_results
        },
        'scenario_based': scenarios,
        'battery_spec': {
            'usable_kwh': BATTERY_USABLE_KWH,
            'charge_rate_kw': BATTERY_CHARGE_RATE_KW,
            'discharge_rate_kw': BATTERY_DISCHARGE_RATE_KW
        }
    }

    with open('battery_daily_charging_enhanced.json', 'w') as f:
        json.dump(results, f, indent=2)

    print("Results saved to battery_daily_charging_enhanced.json")
    print("Analysis complete!")

if __name__ == "__main__":
    main()
