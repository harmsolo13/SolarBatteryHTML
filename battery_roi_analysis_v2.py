#!/usr/bin/env python3
"""
Battery ROI Analysis Tool V2
Improved consumption modeling using grid transactions and solar data
"""

import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
import json
from typing import Dict

# Battery specs
BATTERY_CAPACITY_KWH = 28.8
BATTERY_USABLE_KWH = 27.36
BATTERY_CHARGE_RATE_KW = 4.3
BATTERY_DISCHARGE_RATE_KW = 4.9
BATTERY_EFFICIENCY = 0.96

BATTERY_COST = 10700
REPS_REBATE = 1500
NET_COST = BATTERY_COST - REPS_REBATE

# Solar Sharer
SOLAR_SHARER_START = datetime(2026, 7, 1)

# Rate structure
RATES = {
    'sponge': 0.2701,
    'peak': 0.5658,
    'off_peak': 0.3882,
    'feed_in': 0.055
}

def get_rate_period(hour: int) -> str:
    """Get rate period from hour"""
    if 10 <= hour < 15:
        return 'sponge'
    elif (6 <= hour < 10) or (18 <= hour < 24):
        return 'peak'
    else:
        return 'off_peak'

def load_solar_data(csv_files) -> pd.DataFrame:
    """Load all solar CSV files"""
    all_data = []

    for csv_file in sorted(csv_files):
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

    combined = pd.concat(all_data, ignore_index=True)
    combined = combined.sort_values('datetime').drop_duplicates(subset=['datetime']).set_index('datetime')
    return combined

# Billing data from HTML file
BILLING_DATA = {
    '2024-10': {'sponge': 6.77, 'peak': 194.67, 'off_peak': 55.93, 'feed_in': 601.14, 'days': 31},
    '2024-11': {'sponge': 15.61, 'peak': 239.23, 'off_peak': 44.44, 'feed_in': 585.95, 'days': 30},
    '2024-12': {'sponge': 20.08, 'peak': 276.29, 'off_peak': 57.89, 'feed_in': 595.11, 'days': 31},
    '2025-1': {'sponge': 9.34, 'peak': 368.69, 'off_peak': 57.70, 'feed_in': 455.95, 'days': 31},
    '2025-2': {'sponge': 15.72, 'peak': 319.99, 'off_peak': 45.69, 'feed_in': 385.60, 'days': 28},
    '2025-3': {'sponge': 16.04, 'peak': 329.14, 'off_peak': 63.56, 'feed_in': 389.52, 'days': 31},
    '2025-4': {'sponge': 22.34, 'peak': 301.30, 'off_peak': 82.25, 'feed_in': 245.71, 'days': 30},
    '2025-5': {'sponge': 37.88, 'peak': 564.18, 'off_peak': 236.40, 'feed_in': 204.65, 'days': 31},
    '2025-6': {'sponge': 21.37, 'peak': 622.82, 'off_peak': 250.64, 'feed_in': 161.51, 'days': 30},
    '2025-7': {'sponge': 28.75, 'peak': 657.57, 'off_peak': 269.27, 'feed_in': 218.55, 'days': 31},
    '2025-8': {'sponge': 18.20, 'peak': 529.54, 'off_peak': 241.35, 'feed_in': 314.35, 'days': 31},
    '2025-9': {'sponge': 5.30, 'peak': 375.96, 'off_peak': 182.94, 'feed_in': 476.62, 'days': 30},
}

def main():
    print("=" * 80)
    print("Battery ROI Analysis V2 - Alpha ESS 28.8 kWh")
    print("=" * 80)
    print()

    # Load solar data
    data_dir = Path(__file__).parent
    csv_files = sorted(data_dir.glob("C03AEC7B*.csv"))
    print(f"Loading {len(csv_files)} CSV files...")
    solar_df = load_solar_data(csv_files)

    # Add rate period
    solar_df['hour'] = solar_df.index.hour
    solar_df['date'] = solar_df.index.date
    solar_df['rate_period'] = solar_df['hour'].apply(get_rate_period)
    solar_df['year'] = solar_df.index.year
    solar_df['month'] = solar_df.index.month
    solar_df['year_month'] = solar_df['year'].astype(str) + '-' + solar_df['month'].astype(str)

    interval_hours = 5 / 60.0  # 5-minute intervals

    print(f"Loaded {len(solar_df)} records from {solar_df.index.min()} to {solar_df.index.max()}")
    print()

    # Calculate monthly solar generation by rate period
    print("Calculating solar generation by month and rate period...")
    solar_monthly = {}
    for year_month in solar_df['year_month'].unique():
        month_data = solar_df[solar_df['year_month'] == year_month]
        solar_monthly[year_month] = {}
        for period in ['sponge', 'peak', 'off_peak']:
            period_data = month_data[month_data['rate_period'] == period]
            solar_kwh = (period_data['Power Now (W)'].sum() * interval_hours) / 1000
            solar_monthly[year_month][period] = solar_kwh
        solar_monthly[year_month]['total'] = (month_data['Power Now (W)'].sum() * interval_hours) / 1000

    print()
    print("=" * 80)
    print("MONTHLY ANALYSIS")
    print("=" * 80)
    print()

    total_savings_no_sharer = 0
    total_savings_with_sharer = 0
    total_cost_no_battery = 0
    total_cost_with_battery_no_sharer = 0
    total_cost_with_battery_with_sharer = 0

    results_by_month = []

    for year_month, bill in BILLING_DATA.items():
        if year_month not in solar_monthly:
            continue

        print(f"\n{year_month}:")
        print("-" * 80)

        solar_gen = solar_monthly[year_month]

        # Grid imports by rate period (from bill)
        grid_import = {
            'sponge': bill['sponge'],
            'peak': bill['peak'],
            'off_peak': bill['off_peak']
        }

        # Total grid import and export
        total_grid_import = sum(grid_import.values())
        total_feed_in = bill['feed_in']
        total_solar = solar_gen['total']

        # Solar self-consumed = Total solar - Feed-in
        solar_self_consumed = total_solar - total_feed_in

        # Total consumption = Grid import + Solar self-consumed
        total_consumption = total_grid_import + solar_self_consumed

        print(f"  Total solar generation:    {total_solar:8.1f} kWh")
        print(f"  Feed-in exported:          {total_feed_in:8.1f} kWh")
        print(f"  Solar self-consumed:       {solar_self_consumed:8.1f} kWh")
        print(f"  Grid imports:              {total_grid_import:8.1f} kWh")
        print(f"  Total consumption:         {total_consumption:8.1f} kWh")
        print(f"  Average daily consumption: {total_consumption/bill['days']:8.1f} kWh/day")

        # Current cost (no battery)
        cost_no_battery = (
            grid_import['sponge'] * RATES['sponge'] +
            grid_import['peak'] * RATES['peak'] +
            grid_import['off_peak'] * RATES['off_peak'] -
            total_feed_in * RATES['feed_in']
        )

        # Simulate with battery
        # Strategy: Use excess solar to charge battery, discharge during peak/sponge
        # Simplification: Assume we can perfectly time charge/discharge

        # Solar available by period (after self-consumption for immediate needs)
        # Excess solar = Solar generated in that period - immediate consumption in that period
        # For simplification, estimate consumption distribution:
        # Peak: 45%, Sponge: 15%, Off-peak: 40% of total consumption

        consumption_dist = {'peak': 0.45, 'sponge': 0.15, 'off_peak': 0.40}
        consumption_by_period = {p: total_consumption * consumption_dist[p] for p in ['peak', 'sponge', 'off_peak']}

        # Excess solar by period = Solar generated - Consumption in that period
        excess_solar = {}
        deficit_by_period = {}
        for period in ['peak', 'sponge', 'off_peak']:
            net = solar_gen[period] - consumption_by_period[period]
            if net > 0:
                excess_solar[period] = net
                deficit_by_period[period] = 0
            else:
                excess_solar[period] = 0
                deficit_by_period[period] = -net

        # Battery strategy:
        # 1. Charge from excess sponge/off-peak solar (up to battery capacity)
        # 2. Discharge to cover peak/sponge deficits

        # Available to charge: excess from sponge + off-peak
        available_to_charge = excess_solar['sponge'] + excess_solar['off_peak']
        battery_charged = min(available_to_charge * BATTERY_EFFICIENCY, BATTERY_USABLE_KWH * bill['days'])

        # Available to discharge: battery charged
        battery_discharged = battery_charged * BATTERY_EFFICIENCY

        # Use battery to cover expensive peak deficit first, then sponge
        battery_used_peak = min(deficit_by_period['peak'], battery_discharged)
        battery_remaining = battery_discharged - battery_used_peak
        battery_used_sponge = min(deficit_by_period['sponge'], battery_remaining)

        # New grid imports with battery
        new_grid_import = {
            'peak': max(0, deficit_by_period['peak'] - battery_used_peak),
            'sponge': max(0, deficit_by_period['sponge'] - battery_used_sponge),
            'off_peak': deficit_by_period['off_peak']  # No battery help for off-peak
        }

        # New feed-in with battery
        # Less excess sponge/off-peak goes to grid (used for battery)
        battery_charged_actual = (battery_used_peak + battery_used_sponge) / (BATTERY_EFFICIENCY ** 2)
        new_feed_in = total_feed_in - battery_charged_actual

        cost_with_battery = (
            new_grid_import['sponge'] * RATES['sponge'] +
            new_grid_import['peak'] * RATES['peak'] +
            new_grid_import['off_peak'] * RATES['off_peak'] -
            new_feed_in * RATES['feed_in']
        )

        savings = cost_no_battery - cost_with_battery

        print(f"\n  Scenario A: Without battery")
        print(f"    Cost: ${cost_no_battery:7.2f}")
        print(f"\n  Scenario B: With battery (no Solar Sharer)")
        print(f"    Grid import peak:   {new_grid_import['peak']:8.1f} kWh (was {grid_import['peak']:.1f})")
        print(f"    Grid import sponge: {new_grid_import['sponge']:8.1f} kWh (was {grid_import['sponge']:.1f})")
        print(f"    Battery used:       {battery_used_peak + battery_used_sponge:8.1f} kWh")
        print(f"    Cost: ${cost_with_battery:7.2f}")
        print(f"    Savings: ${savings:7.2f}")

        total_cost_no_battery += cost_no_battery
        total_cost_with_battery_no_sharer += cost_with_battery
        total_savings_no_sharer += savings

        # Add Solar Sharer benefit (from July 2026 onwards)
        solar_sharer_benefit = 0
        if year_month >= '2026-7':
            # 3 hours/day free charging at 4.3 kW = 12.9 kWh/day
            # Can charge battery on low-solar days
            # Assume 50% of days benefit from Solar Sharer top-up
            solar_sharer_charge_kwh = 12.9 * bill['days'] * 0.5
            solar_sharer_benefit = solar_sharer_charge_kwh * RATES['peak']

        cost_with_battery_and_sharer = cost_with_battery - solar_sharer_benefit
        savings_with_sharer = cost_no_battery - cost_with_battery_and_sharer

        total_cost_with_battery_with_sharer += cost_with_battery_and_sharer
        total_savings_with_sharer += savings_with_sharer

        results_by_month.append({
            'month': year_month,
            'solar_total': total_solar,
            'consumption': total_consumption,
            'cost_no_battery': cost_no_battery,
            'cost_with_battery': cost_with_battery,
            'savings': savings,
            'savings_with_sharer': savings_with_sharer
        })

    # Annual summary
    print()
    print("=" * 80)
    print("ANNUAL SUMMARY")
    print("=" * 80)
    print()

    print(f"Battery: Alpha ESS {BATTERY_CAPACITY_KWH} kWh (Usable: {BATTERY_USABLE_KWH:.1f} kWh)")
    print(f"Net cost: ${NET_COST:,.2f}")
    print()

    print("Scenario A: WITHOUT Solar Sharer")
    print("-" * 80)
    print(f"Annual cost (no battery):           ${total_cost_no_battery:>10,.2f}")
    print(f"Annual cost (with battery):         ${total_cost_with_battery_no_sharer:>10,.2f}")
    print(f"Annual savings:                     ${total_savings_no_sharer:>10,.2f}")

    if total_savings_no_sharer > 0:
        payback_years = NET_COST / total_savings_no_sharer
        print(f"Payback period:                     {payback_years:>10,.1f} years")
    else:
        print(f"Payback period:                          Never (no savings)")

    print()
    print("Scenario B: WITH Solar Sharer (from July 2026)")
    print("-" * 80)
    print(f"Annual cost (no battery):           ${total_cost_no_battery:>10,.2f}")
    print(f"Annual cost (with battery + Solar Sharer): ${total_cost_with_battery_with_sharer:>10,.2f}")
    print(f"Annual savings:                     ${total_savings_with_sharer:>10,.2f}")

    if total_savings_with_sharer > 0:
        payback_years = NET_COST / total_savings_with_sharer
        print(f"Payback period:                     {payback_years:>10,.1f} years")
    else:
        print(f"Payback period:                          Never (no savings)")

    print()
    print("=" * 80)

    # Save results
    results = {
        'battery_spec': {
            'capacity_kwh': BATTERY_CAPACITY_KWH,
            'usable_kwh': BATTERY_USABLE_KWH,
            'cost': BATTERY_COST,
            'rebate': REPS_REBATE,
            'net_cost': NET_COST
        },
        'annual_no_sharer': {
            'cost_no_battery': total_cost_no_battery,
            'cost_with_battery': total_cost_with_battery_no_sharer,
            'savings': total_savings_no_sharer,
            'payback_years': NET_COST / total_savings_no_sharer if total_savings_no_sharer > 0 else None
        },
        'annual_with_sharer': {
            'cost_no_battery': total_cost_no_battery,
            'cost_with_battery': total_cost_with_battery_with_sharer,
            'savings': total_savings_with_sharer,
            'payback_years': NET_COST / total_savings_with_sharer if total_savings_with_sharer > 0 else None
        },
        'monthly_results': results_by_month
    }

    with open('battery_roi_results_v2.json', 'w') as f:
        json.dump(results, f, indent=2)

    print("\nResults saved to battery_roi_results_v2.json")
    print("Analysis complete!")

if __name__ == "__main__":
    main()
