#!/usr/bin/env python3
"""
Battery ROI Analysis Tool
Analyzes solar generation data to simulate Alpha ESS battery performance
and calculate ROI with Solar Sharer program benefits
"""

import pandas as pd
import numpy as np
from datetime import datetime, time
from pathlib import Path
import json
from typing import Dict, List, Tuple

# ============================================================================
# CONFIGURATION
# ============================================================================

# Battery specifications (Alpha ESS 28.8 kWh)
BATTERY_CAPACITY_KWH = 28.8
BATTERY_USABLE_KWH = BATTERY_CAPACITY_KWH * 0.95  # 95% DoD = 27.36 kWh
BATTERY_CHARGE_RATE_KW = 4.3
BATTERY_DISCHARGE_RATE_KW = 4.9
BATTERY_EFFICIENCY = 0.96  # 96% round-trip efficiency

# Battery costs
BATTERY_COST = 10700
REPS_REBATE = 1500
NET_COST = BATTERY_COST - REPS_REBATE

# Solar Sharer program (from July 1, 2026)
SOLAR_SHARER_START = datetime(2026, 7, 1)
SOLAR_SHARER_HOURS = 3  # 11am-2pm typically
SOLAR_SHARER_START_HOUR = 11
SOLAR_SHARER_END_HOUR = 14

# Adelaide TOU rate periods (24-hour time ranges)
# Sponge: 10am-3pm (10:00-15:00)
# Peak: 6am-10am & 6pm-12am (06:00-10:00, 18:00-00:00)
# Off-peak: 12am-6am & 3pm-6pm (00:00-06:00, 15:00-18:00)

def get_rate_period(dt: datetime) -> str:
    """Determine rate period (sponge/peak/off-peak) for a given datetime"""
    hour = dt.hour

    # Sponge: 10am-3pm
    if 10 <= hour < 15:
        return 'sponge'
    # Peak: 6am-10am OR 6pm-12am
    elif (6 <= hour < 10) or (18 <= hour < 24):
        return 'peak'
    # Off-peak: 12am-6am OR 3pm-6pm
    else:  # (0 <= hour < 6) or (15 <= hour < 18)
        return 'off_peak'

# Default electricity rates (from HTML file - will be overridden with actual billing data)
DEFAULT_RATES = {
    'sponge': 0.2701,  # $/kWh
    'peak': 0.5658,
    'off_peak': 0.3882,
    'feed_in': 0.055,
    'supply': 1.2626,  # $/day
    'discount': 0.09,  # 9%
    'gst': 0.10  # 10%
}

# ============================================================================
# DATA LOADING AND PARSING
# ============================================================================

def load_solar_data(csv_files: List[Path]) -> pd.DataFrame:
    """
    Load and combine all solar generation CSV files

    Args:
        csv_files: List of paths to C03AEC7B*.csv files

    Returns:
        DataFrame with datetime index and power generation columns
    """
    all_data = []

    for csv_file in sorted(csv_files):
        print(f"Loading {csv_file.name}...")

        try:
            # Try different encodings
            df = None
            for encoding in ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252', 'gbk']:
                try:
                    df = pd.read_csv(csv_file, encoding=encoding, encoding_errors='ignore')
                    break
                except UnicodeDecodeError:
                    continue

            if df is None:
                print(f"  Could not decode {csv_file.name} with any encoding")
                continue

            # Parse datetime
            df['datetime'] = pd.to_datetime(df['RTCTime'], format='%Y/%m/%d %H:%M:%S')

            # Extract relevant columns
            df = df[['datetime', 'Power Now (W)', 'Feed In Power (W)',
                    'PV1 Input Power (W)', 'PV2 Input Power (W)']].copy()

            # Convert to numeric, handle errors
            for col in df.columns:
                if col != 'datetime':
                    df[col] = pd.to_numeric(df[col], errors='coerce')

            # Fill NaN with 0
            df = df.fillna(0)

            all_data.append(df)

        except Exception as e:
            print(f"Error loading {csv_file.name}: {e}")
            continue

    # Combine all dataframes
    if not all_data:
        raise ValueError("No data loaded from CSV files")

    combined = pd.concat(all_data, ignore_index=True)
    combined = combined.sort_values('datetime').reset_index(drop=True)

    # Remove duplicates
    combined = combined.drop_duplicates(subset=['datetime'], keep='first')

    # Set datetime as index
    combined = combined.set_index('datetime')

    print(f"\nLoaded {len(combined)} records from {combined.index.min()} to {combined.index.max()}")

    return combined

def categorize_by_rate_period(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add rate period column to dataframe

    Args:
        df: DataFrame with datetime index

    Returns:
        DataFrame with 'rate_period' column added
    """
    df = df.copy()
    df['rate_period'] = df.index.map(get_rate_period)
    df['hour'] = df.index.hour
    df['date'] = df.index.date

    return df

# ============================================================================
# CONSUMPTION MODELING
# ============================================================================

def estimate_consumption(solar_df: pd.DataFrame, monthly_bills: Dict) -> pd.DataFrame:
    """
    Estimate household consumption patterns based on solar generation and billing data

    Strategy:
    1. Use billing data to get total monthly consumption by rate period
    2. Distribute consumption across hours using typical household patterns
    3. Where solar > 0 and feed_in > 0, consumption = solar - feed_in
    4. Where solar = 0, consumption = grid import (estimated from billing data)

    Args:
        solar_df: DataFrame with solar generation data
        monthly_bills: Dict of monthly billing data

    Returns:
        DataFrame with estimated consumption added
    """
    df = solar_df.copy()

    # Typical household consumption profile (fraction of daily consumption by hour)
    # Higher in morning (6-9am) and evening (6-10pm), lower overnight and midday
    hourly_profile = {
        0: 0.02, 1: 0.015, 2: 0.015, 3: 0.015, 4: 0.02, 5: 0.03,
        6: 0.05, 7: 0.07, 8: 0.06, 9: 0.04, 10: 0.03, 11: 0.03,
        12: 0.035, 13: 0.04, 14: 0.04, 15: 0.045, 16: 0.05, 17: 0.055,
        18: 0.08, 19: 0.09, 20: 0.08, 21: 0.06, 22: 0.04, 23: 0.03
    }

    # Initialize consumption column
    df['consumption_w'] = 0.0

    # For each month in billing data, estimate consumption
    for month_key, bill_data in monthly_bills.items():
        # Get total consumption by rate period (kWh)
        total_sponge = bill_data.get('sponge', 0)
        total_peak = bill_data.get('peak', 0)
        total_off_peak = bill_data.get('off_peak', 0)

        # Filter dataframe for this month
        year, month = map(int, month_key.split('-'))
        month_mask = (df.index.year == year) & (df.index.month == month)
        month_df = df[month_mask]

        if len(month_df) == 0:
            continue

        # Count records by rate period
        period_counts = month_df['rate_period'].value_counts()

        # Distribute consumption across time periods
        for period in ['sponge', 'peak', 'off_peak']:
            if period not in period_counts or period_counts[period] == 0:
                continue

            # Get total kWh for this period
            if period == 'sponge':
                total_kwh = total_sponge
            elif period == 'peak':
                total_kwh = total_peak
            else:
                total_kwh = total_off_peak

            # Convert to Wh
            total_wh = total_kwh * 1000

            # Get mask for this period
            period_mask = month_mask & (df['rate_period'] == period)
            period_records = period_mask.sum()

            if period_records == 0:
                continue

            # Distribute based on hourly profile
            for hour in range(24):
                hour_mask = period_mask & (df['hour'] == hour)
                hour_records = hour_mask.sum()

                if hour_records > 0:
                    # Consumption for this hour = (hourly_fraction * total_wh) / num_records_in_hour
                    hourly_consumption = (hourly_profile[hour] * total_wh) / hour_records
                    df.loc[hour_mask, 'consumption_w'] = hourly_consumption

    return df

# ============================================================================
# BATTERY SIMULATION
# ============================================================================

def simulate_battery(df: pd.DataFrame, enable_solar_sharer: bool = False) -> pd.DataFrame:
    """
    Simulate battery charge/discharge behavior

    Strategy:
    1. When solar > consumption: charge battery with excess (up to charge rate limit)
    2. When consumption > solar: discharge battery (up to discharge rate limit)
    3. Solar Sharer: During 11am-2pm, can charge from free grid power
    4. Track battery state of charge (SOC) throughout

    Args:
        df: DataFrame with solar and consumption data
        enable_solar_sharer: Whether to enable Solar Sharer free charging

    Returns:
        DataFrame with battery simulation columns added
    """
    df = df.copy()

    # Initialize battery state
    battery_soc_kwh = BATTERY_USABLE_KWH / 2  # Start at 50% charge

    # Initialize columns
    df['battery_soc_kwh'] = 0.0
    df['battery_charge_w'] = 0.0  # Positive = charging
    df['battery_discharge_w'] = 0.0  # Positive = discharging
    df['grid_import_w'] = 0.0
    df['grid_export_w'] = 0.0
    df['solar_sharer_charge_w'] = 0.0

    # Time interval between records (minutes)
    interval_minutes = 5
    interval_hours = interval_minutes / 60.0

    for idx in df.index:
        row = df.loc[idx]

        solar_w = row['Power Now (W)']
        consumption_w = row['consumption_w']
        rate_period = row['rate_period']
        hour = row['hour']

        # Net power (solar - consumption)
        net_power_w = solar_w - consumption_w

        # Solar Sharer: Can charge from free grid during 11am-2pm
        solar_sharer_available = False
        if enable_solar_sharer and idx >= SOLAR_SHARER_START:
            if SOLAR_SHARER_START_HOUR <= hour < SOLAR_SHARER_END_HOUR:
                solar_sharer_available = True

        # Initialize for this time step
        charge_w = 0
        discharge_w = 0
        grid_import_w = 0
        grid_export_w = 0
        solar_sharer_charge_w = 0

        if net_power_w > 0:
            # Excess solar - charge battery
            available_to_charge_w = net_power_w

            # Battery charge limit
            charge_limit_w = BATTERY_CHARGE_RATE_KW * 1000
            charge_limit_kwh = (charge_limit_w * interval_hours) / 1000

            # Available battery capacity
            available_capacity_kwh = BATTERY_USABLE_KWH - battery_soc_kwh

            # Actual charge (limited by rate and capacity)
            actual_charge_kwh = min(
                (available_to_charge_w * interval_hours * BATTERY_EFFICIENCY) / 1000,
                charge_limit_kwh,
                available_capacity_kwh
            )

            charge_w = (actual_charge_kwh * 1000) / (interval_hours * BATTERY_EFFICIENCY)
            battery_soc_kwh += actual_charge_kwh

            # Remaining excess goes to grid
            grid_export_w = available_to_charge_w - charge_w

        else:
            # Consumption > solar - try to discharge battery first
            deficit_w = -net_power_w

            # Battery discharge limit
            discharge_limit_w = BATTERY_DISCHARGE_RATE_KW * 1000
            discharge_limit_kwh = (discharge_limit_w * interval_hours) / 1000

            # Available battery energy
            available_battery_kwh = battery_soc_kwh

            # Actual discharge (limited by rate and available energy)
            actual_discharge_kwh = min(
                (deficit_w * interval_hours) / (1000 * BATTERY_EFFICIENCY),
                discharge_limit_kwh,
                available_battery_kwh
            )

            discharge_w = (actual_discharge_kwh * 1000 * BATTERY_EFFICIENCY) / interval_hours
            battery_soc_kwh -= actual_discharge_kwh

            # Remaining deficit comes from grid (unless Solar Sharer can help)
            remaining_deficit_w = deficit_w - discharge_w

            if remaining_deficit_w > 0:
                if solar_sharer_available and battery_soc_kwh < BATTERY_USABLE_KWH:
                    # Can charge battery from free Solar Sharer power AND cover consumption
                    # Priority: cover consumption first, then charge battery if capacity available
                    grid_import_w = remaining_deficit_w  # Cover immediate consumption

                    # Also charge battery from Solar Sharer if space available
                    charge_limit_w = BATTERY_CHARGE_RATE_KW * 1000
                    charge_limit_kwh = (charge_limit_w * interval_hours) / 1000
                    available_capacity_kwh = BATTERY_USABLE_KWH - battery_soc_kwh

                    solar_sharer_charge_kwh = min(charge_limit_kwh, available_capacity_kwh)
                    solar_sharer_charge_w = (solar_sharer_charge_kwh * 1000) / (interval_hours * BATTERY_EFFICIENCY)

                    battery_soc_kwh += solar_sharer_charge_kwh
                    # Solar Sharer is free, so no cost
                else:
                    grid_import_w = remaining_deficit_w

        # Store results
        df.loc[idx, 'battery_soc_kwh'] = battery_soc_kwh
        df.loc[idx, 'battery_charge_w'] = charge_w
        df.loc[idx, 'battery_discharge_w'] = discharge_w
        df.loc[idx, 'grid_import_w'] = grid_import_w
        df.loc[idx, 'grid_export_w'] = grid_export_w
        df.loc[idx, 'solar_sharer_charge_w'] = solar_sharer_charge_w

    return df

# ============================================================================
# COST CALCULATIONS
# ============================================================================

def calculate_costs(df: pd.DataFrame, rates: Dict = None) -> Dict:
    """
    Calculate electricity costs with and without battery

    Args:
        df: DataFrame with simulation results
        rates: Rate structure (default: use DEFAULT_RATES)

    Returns:
        Dict with cost analysis results
    """
    if rates is None:
        rates = DEFAULT_RATES

    # Convert W to kWh (5-minute intervals = 1/12 hour)
    interval_hours = 5 / 60.0

    # Scenario A: No battery (current state)
    # consumption = solar + grid_import - grid_export
    # In reality, without battery, we would have:
    # - Used solar directly when available
    # - Exported excess solar
    # - Imported from grid when solar insufficient

    # For no-battery scenario, recalculate based on original consumption
    no_battery_costs = {}

    for period in ['sponge', 'peak', 'off_peak']:
        period_df = df[df['rate_period'] == period]

        # Total consumption in this period (kWh)
        total_consumption_kwh = (period_df['consumption_w'].sum() * interval_hours) / 1000

        # Total solar in this period (kWh)
        total_solar_kwh = (period_df['Power Now (W)'].sum() * interval_hours) / 1000

        # Solar used directly = min(consumption, solar) for each interval
        solar_used_kwh = ((period_df[['consumption_w', 'Power Now (W)']].min(axis=1) * interval_hours).sum()) / 1000

        # Grid import needed = consumption - solar_used
        grid_import_kwh = total_consumption_kwh - solar_used_kwh

        # Grid export = solar - solar_used
        grid_export_kwh = total_solar_kwh - solar_used_kwh

        no_battery_costs[f'{period}_import_kwh'] = grid_import_kwh
        no_battery_costs[f'{period}_export_kwh'] = grid_export_kwh
        no_battery_costs[f'{period}_cost'] = grid_import_kwh * rates[period]
        no_battery_costs[f'{period}_credit'] = grid_export_kwh * rates['feed_in']

    # Total costs without battery
    total_import_cost_no_battery = sum(no_battery_costs[f'{p}_cost'] for p in ['sponge', 'peak', 'off_peak'])
    total_export_credit_no_battery = sum(no_battery_costs[f'{p}_credit'] for p in ['sponge', 'peak', 'off_peak'])

    # Scenario B: With battery
    with_battery_costs = {}

    for period in ['sponge', 'peak', 'off_peak']:
        period_df = df[df['rate_period'] == period]

        # Grid import (kWh)
        grid_import_kwh = (period_df['grid_import_w'].sum() * interval_hours) / 1000

        # Grid export (kWh)
        grid_export_kwh = (period_df['grid_export_w'].sum() * interval_hours) / 1000

        with_battery_costs[f'{period}_import_kwh'] = grid_import_kwh
        with_battery_costs[f'{period}_export_kwh'] = grid_export_kwh
        with_battery_costs[f'{period}_cost'] = grid_import_kwh * rates[period]
        with_battery_costs[f'{period}_credit'] = grid_export_kwh * rates['feed_in']

    # Total costs with battery
    total_import_cost_with_battery = sum(with_battery_costs[f'{p}_cost'] for p in ['sponge', 'peak', 'off_peak'])
    total_export_credit_with_battery = sum(with_battery_costs[f'{p}_credit'] for p in ['sponge', 'peak', 'off_peak'])

    # Solar Sharer benefit
    total_solar_sharer_charge_kwh = (df['solar_sharer_charge_w'].sum() * interval_hours) / 1000
    # Value = what we would have paid for this energy during peak times
    solar_sharer_value = total_solar_sharer_charge_kwh * rates['peak']

    # Calculate savings
    net_cost_no_battery = total_import_cost_no_battery - total_export_credit_no_battery
    net_cost_with_battery = total_import_cost_with_battery - total_export_credit_with_battery
    savings = net_cost_no_battery - net_cost_with_battery + solar_sharer_value

    return {
        'no_battery': {
            'total_import_cost': total_import_cost_no_battery,
            'total_export_credit': total_export_credit_no_battery,
            'net_cost': net_cost_no_battery,
            **no_battery_costs
        },
        'with_battery': {
            'total_import_cost': total_import_cost_with_battery,
            'total_export_credit': total_export_credit_with_battery,
            'net_cost': net_cost_with_battery,
            'solar_sharer_charge_kwh': total_solar_sharer_charge_kwh,
            'solar_sharer_value': solar_sharer_value,
            **with_battery_costs
        },
        'savings': savings,
        'savings_percent': (savings / net_cost_no_battery * 100) if net_cost_no_battery > 0 else 0
    }

# ============================================================================
# MAIN ANALYSIS
# ============================================================================

def main():
    """Main analysis workflow"""

    print("=" * 80)
    print("Battery ROI Analysis - Alpha ESS 28.8 kWh")
    print("=" * 80)
    print()

    # Find all CSV files
    data_dir = Path(__file__).parent
    csv_files = sorted(data_dir.glob("C03AEC7B*.csv"))

    if not csv_files:
        print("ERROR: No C03AEC7B*.csv files found!")
        return

    print(f"Found {len(csv_files)} CSV files")
    print()

    # Load solar generation data
    print("Step 1: Loading solar generation data...")
    solar_df = load_solar_data(csv_files)

    # Categorize by rate period
    print("\nStep 2: Categorizing by rate period...")
    solar_df = categorize_by_rate_period(solar_df)

    # Load monthly billing data from HTML localStorage
    # For now, use simplified test data
    # TODO: Load actual billing data from HTML file or export
    print("\nStep 3: Loading monthly billing data...")
    monthly_bills = {
        '2024-10': {'sponge': 6.77, 'peak': 194.67, 'off_peak': 55.93, 'feed_in': 601.14},
        '2024-11': {'sponge': 15.61, 'peak': 239.23, 'off_peak': 44.44, 'feed_in': 585.95},
        '2024-12': {'sponge': 20.08, 'peak': 276.29, 'off_peak': 57.89, 'feed_in': 595.11},
        '2025-1': {'sponge': 9.34, 'peak': 368.69, 'off_peak': 57.70, 'feed_in': 455.95},
        '2025-2': {'sponge': 15.72, 'peak': 319.99, 'off_peak': 45.69, 'feed_in': 385.60},
        '2025-3': {'sponge': 16.04, 'peak': 329.14, 'off_peak': 63.56, 'feed_in': 389.52},
        '2025-4': {'sponge': 22.34, 'peak': 301.30, 'off_peak': 82.25, 'feed_in': 245.71},
        '2025-5': {'sponge': 37.88, 'peak': 564.18, 'off_peak': 236.40, 'feed_in': 204.65},
        '2025-6': {'sponge': 21.37, 'peak': 622.82, 'off_peak': 250.64, 'feed_in': 161.51},
        '2025-7': {'sponge': 28.75, 'peak': 657.57, 'off_peak': 269.27, 'feed_in': 218.55},
        '2025-8': {'sponge': 18.20, 'peak': 529.54, 'off_peak': 241.35, 'feed_in': 314.35},
        '2025-9': {'sponge': 5.30, 'peak': 375.96, 'off_peak': 182.94, 'feed_in': 476.62},
    }

    # Estimate consumption patterns
    print("\nStep 4: Estimating household consumption patterns...")
    solar_df = estimate_consumption(solar_df, monthly_bills)

    # Simulate battery WITHOUT Solar Sharer
    print("\nStep 5: Simulating battery performance (without Solar Sharer)...")
    df_no_sharer = simulate_battery(solar_df.copy(), enable_solar_sharer=False)

    # Simulate battery WITH Solar Sharer
    print("\nStep 6: Simulating battery performance (with Solar Sharer from July 2026)...")
    df_with_sharer = simulate_battery(solar_df.copy(), enable_solar_sharer=True)

    # Calculate costs
    print("\nStep 7: Calculating costs and savings...")
    costs_no_sharer = calculate_costs(df_no_sharer)
    costs_with_sharer = calculate_costs(df_with_sharer)

    # Display results
    print("\n" + "=" * 80)
    print("RESULTS")
    print("=" * 80)
    print()

    print(f"Battery: Alpha ESS {BATTERY_CAPACITY_KWH} kWh (Usable: {BATTERY_USABLE_KWH:.1f} kWh)")
    print(f"Net cost: ${NET_COST:,.2f} (${BATTERY_COST:,.2f} - ${REPS_REBATE:,.2f} rebate)")
    print()

    print("Scenario A: WITHOUT Solar Sharer")
    print("-" * 80)
    print(f"Current annual cost (no battery):  ${costs_no_sharer['no_battery']['net_cost']:>10,.2f}")
    print(f"Annual cost with battery:           ${costs_no_sharer['with_battery']['net_cost']:>10,.2f}")
    print(f"Annual savings:                     ${costs_no_sharer['savings']:>10,.2f} ({costs_no_sharer['savings_percent']:.1f}%)")

    if costs_no_sharer['savings'] > 0:
        payback_years = NET_COST / costs_no_sharer['savings']
        print(f"Payback period:                     {payback_years:>10,.1f} years")
    print()

    print("Scenario B: WITH Solar Sharer (from July 2026)")
    print("-" * 80)
    print(f"Current annual cost (no battery):  ${costs_with_sharer['no_battery']['net_cost']:>10,.2f}")
    print(f"Annual cost with battery:           ${costs_with_sharer['with_battery']['net_cost']:>10,.2f}")
    print(f"Solar Sharer free charging:         {costs_with_sharer['with_battery']['solar_sharer_charge_kwh']:>10,.1f} kWh")
    print(f"Solar Sharer value:                 ${costs_with_sharer['with_battery']['solar_sharer_value']:>10,.2f}")
    print(f"Annual savings:                     ${costs_with_sharer['savings']:>10,.2f} ({costs_with_sharer['savings_percent']:.1f}%)")

    if costs_with_sharer['savings'] > 0:
        payback_years = NET_COST / costs_with_sharer['savings']
        print(f"Payback period:                     {payback_years:>10,.1f} years")
    print()

    print("=" * 80)

    # Save detailed results
    print("\nSaving detailed results...")

    results = {
        'battery_spec': {
            'capacity_kwh': BATTERY_CAPACITY_KWH,
            'usable_kwh': BATTERY_USABLE_KWH,
            'charge_rate_kw': BATTERY_CHARGE_RATE_KW,
            'discharge_rate_kw': BATTERY_DISCHARGE_RATE_KW,
            'efficiency': BATTERY_EFFICIENCY,
            'cost': BATTERY_COST,
            'rebate': REPS_REBATE,
            'net_cost': NET_COST
        },
        'scenario_no_sharer': costs_no_sharer,
        'scenario_with_sharer': costs_with_sharer,
        'analysis_date': datetime.now().isoformat(),
        'data_range': {
            'start': solar_df.index.min().isoformat(),
            'end': solar_df.index.max().isoformat(),
            'records': len(solar_df)
        }
    }

    with open('battery_roi_results.json', 'w') as f:
        json.dump(results, f, indent=2)

    print("Results saved to battery_roi_results.json")
    print()
    print("Analysis complete!")

if __name__ == "__main__":
    main()
