#!/usr/bin/env python3
"""
Create visualizations for Battery ROI Analysis
"""

import json
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
from datetime import datetime

# Set style
plt.style.use('seaborn-v0_8-darkgrid')
colors = {
    'no_battery': '#f87171',
    'with_battery': '#34d399',
    'savings': '#fbbf24',
    'solar': '#38bdf8',
    'consumption': '#a78bfa'
}

# Load results
with open('battery_roi_results_v2.json', 'r') as f:
    results = json.load(f)

monthly = results['monthly_results']
battery_cost = results['battery_spec']['net_cost']

# Extract data
months = [m['month'] for m in monthly]
months_short = [datetime.strptime(m, '%Y-%m').strftime('%b %y') for m in months]
cost_no_battery = [m['cost_no_battery'] for m in monthly]
cost_with_battery = [m['cost_with_battery'] for m in monthly]
savings = [m['savings'] for m in monthly]
solar_total = [m['solar_total'] for m in monthly]
consumption = [m['consumption'] for m in monthly]

# Calculate cumulative savings
cumulative_savings = np.cumsum(savings)
cumulative_savings_with_investment = cumulative_savings - battery_cost

# Create figure with multiple subplots
fig = plt.figure(figsize=(16, 12))
fig.suptitle('Battery ROI Analysis - Alpha ESS 28.8 kWh', fontsize=18, fontweight='bold', y=0.995)

# 1. Monthly Cost Comparison
ax1 = plt.subplot(2, 3, 1)
x = np.arange(len(months))
width = 0.35

bars1 = ax1.bar(x - width/2, cost_no_battery, width, label='Without Battery',
                color=colors['no_battery'], alpha=0.8)
bars2 = ax1.bar(x + width/2, cost_with_battery, width, label='With Battery',
                color=colors['with_battery'], alpha=0.8)

ax1.set_xlabel('Month', fontsize=11)
ax1.set_ylabel('Cost ($)', fontsize=11)
ax1.set_title('Monthly Electricity Costs', fontsize=13, fontweight='bold')
ax1.set_xticks(x)
ax1.set_xticklabels(months_short, rotation=45, ha='right')
ax1.legend()
ax1.grid(True, alpha=0.3)
ax1.axhline(y=0, color='black', linestyle='-', linewidth=0.5)

# Add value labels on bars
for bars in [bars1, bars2]:
    for bar in bars:
        height = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2., height,
                f'${height:.0f}',
                ha='center', va='bottom' if height >= 0 else 'top', fontsize=8)

# 2. Monthly Savings
ax2 = plt.subplot(2, 3, 2)
bars = ax2.bar(x, savings, color=colors['savings'], alpha=0.8)
ax2.set_xlabel('Month', fontsize=11)
ax2.set_ylabel('Savings ($)', fontsize=11)
ax2.set_title('Monthly Savings with Battery', fontsize=13, fontweight='bold')
ax2.set_xticks(x)
ax2.set_xticklabels(months_short, rotation=45, ha='right')
ax2.grid(True, alpha=0.3)

# Add average line
avg_savings = np.mean(savings)
ax2.axhline(y=avg_savings, color='red', linestyle='--', linewidth=2,
            label=f'Average: ${avg_savings:.2f}/month')
ax2.legend()

# Add value labels
for i, bar in enumerate(bars):
    height = bar.get_height()
    ax2.text(bar.get_x() + bar.get_width()/2., height,
            f'${height:.0f}',
            ha='center', va='bottom', fontsize=8)

# 3. Cumulative Savings & Payback
ax3 = plt.subplot(2, 3, 3)
ax3.plot(x, cumulative_savings, marker='o', linewidth=2.5,
         color=colors['with_battery'], label='Cumulative Savings')
ax3.axhline(y=battery_cost, color='red', linestyle='--', linewidth=2,
            label=f'Battery Cost (${battery_cost:,.0f})')
ax3.fill_between(x, 0, cumulative_savings, alpha=0.3, color=colors['with_battery'])

# Find payback point
payback_month = None
for i, cum_save in enumerate(cumulative_savings):
    if cum_save >= battery_cost:
        payback_month = i
        break

if payback_month:
    ax3.plot(payback_month, cumulative_savings[payback_month], 'r*',
             markersize=20, label=f'Payback: {months_short[payback_month]}')

ax3.set_xlabel('Month', fontsize=11)
ax3.set_ylabel('Cumulative Savings ($)', fontsize=11)
ax3.set_title('Cumulative Savings & Payback Timeline', fontsize=13, fontweight='bold')
ax3.set_xticks(x)
ax3.set_xticklabels(months_short, rotation=45, ha='right')
ax3.legend()
ax3.grid(True, alpha=0.3)

# 4. Solar Generation vs Consumption
ax4 = plt.subplot(2, 3, 4)
bars1 = ax4.bar(x - width/2, solar_total, width, label='Solar Generation',
                color=colors['solar'], alpha=0.8)
bars2 = ax4.bar(x + width/2, consumption, width, label='Consumption',
                color=colors['consumption'], alpha=0.8)

ax4.set_xlabel('Month', fontsize=11)
ax4.set_ylabel('Energy (kWh)', fontsize=11)
ax4.set_title('Solar Generation vs Consumption', fontsize=13, fontweight='bold')
ax4.set_xticks(x)
ax4.set_xticklabels(months_short, rotation=45, ha='right')
ax4.legend()
ax4.grid(True, alpha=0.3)

# 5. Cost Reduction Percentage
ax5 = plt.subplot(2, 3, 5)
cost_reduction_pct = [(1 - c_with/c_no)*100 if c_no != 0 else 0
                      for c_with, c_no in zip(cost_with_battery, cost_no_battery)]
bars = ax5.bar(x, cost_reduction_pct, color=colors['with_battery'], alpha=0.8)
ax5.set_xlabel('Month', fontsize=11)
ax5.set_ylabel('Cost Reduction (%)', fontsize=11)
ax5.set_title('Percentage Cost Reduction with Battery', fontsize=13, fontweight='bold')
ax5.set_xticks(x)
ax5.set_xticklabels(months_short, rotation=45, ha='right')
ax5.grid(True, alpha=0.3)
ax5.axhline(y=50, color='orange', linestyle='--', linewidth=1.5, alpha=0.7, label='50% reduction')
ax5.legend()

# Add value labels
for i, bar in enumerate(bars):
    height = bar.get_height()
    if height > 0:
        ax5.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.0f}%',
                ha='center', va='bottom', fontsize=8)

# 6. Annual Summary Box
ax6 = plt.subplot(2, 3, 6)
ax6.axis('off')

annual = results['annual_no_sharer']
summary_text = f"""
ANNUAL SUMMARY

Battery: Alpha ESS 28.8 kWh
Net Investment: ${battery_cost:,.2f}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

Annual Costs:
  Without Battery:  ${annual['cost_no_battery']:>8,.2f}
  With Battery:     ${annual['cost_with_battery']:>8,.2f}

Annual Savings:     ${annual['savings']:>8,.2f}
  (50% reduction)

━━━━━━━━━━━━━━━━━━━━━━━━━━━

Payback Period:     {annual['payback_years']:.1f} years

Monthly Average:    ${np.mean(savings):>8,.2f}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best Month:  {months_short[np.argmax(savings)]} (${max(savings):.2f})
Worst Month: {months_short[np.argmin(savings)]} (${min(savings):.2f})

━━━━━━━━━━━━━━━━━━━━━━━━━━━

10-Year Savings:    ${annual['savings'] * 10:>8,.0f}
ROI (10 years):     {(annual['savings'] * 10 / battery_cost - 1) * 100:.0f}%
"""

ax6.text(0.1, 0.95, summary_text, transform=ax6.transAxes,
         fontsize=11, verticalalignment='top', family='monospace',
         bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))

plt.tight_layout()
plt.savefig('battery_roi_analysis.png', dpi=300, bbox_inches='tight')
print("[OK] Saved: battery_roi_analysis.png")

# Create second figure: Detailed Payback Timeline
fig2, ax = plt.subplots(figsize=(14, 8))

# Extended timeline (project 10 years)
months_extended = list(range(0, 121))  # 10 years = 120 months
monthly_savings = np.mean(savings)
cumulative_extended = [monthly_savings * m - battery_cost for m in months_extended]

# Plot
ax.plot(months_extended, cumulative_extended, linewidth=3, color=colors['with_battery'])
ax.axhline(y=0, color='red', linestyle='--', linewidth=2, label='Break-even')
ax.fill_between(months_extended, 0, cumulative_extended,
                where=np.array(cumulative_extended) > 0, alpha=0.3,
                color=colors['with_battery'], label='Profit Zone')
ax.fill_between(months_extended, 0, cumulative_extended,
                where=np.array(cumulative_extended) <= 0, alpha=0.3,
                color=colors['no_battery'], label='Investment Recovery Zone')

# Mark payback point
payback_months = battery_cost / monthly_savings
ax.plot(payback_months, 0, 'r*', markersize=25, zorder=5)
ax.annotate(f'Payback: {payback_months:.1f} months\n({payback_months/12:.1f} years)',
            xy=(payback_months, 0), xytext=(payback_months + 10, -2000),
            fontsize=12, fontweight='bold',
            bbox=dict(boxstyle='round,pad=0.5', facecolor='yellow', alpha=0.7),
            arrowprops=dict(arrowstyle='->', lw=2, color='red'))

# Mark key milestones
for year in [1, 2, 5, 10]:
    year_months = year * 12
    year_value = cumulative_extended[year_months]
    ax.plot(year_months, year_value, 'o', markersize=10, color='navy')
    ax.annotate(f'Year {year}\n${year_value:,.0f}',
                xy=(year_months, year_value),
                xytext=(year_months, year_value + 1500),
                fontsize=10, ha='center',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='lightblue', alpha=0.7))

ax.set_xlabel('Months', fontsize=13, fontweight='bold')
ax.set_ylabel('Net Savings ($)', fontsize=13, fontweight='bold')
ax.set_title('10-Year Battery Investment Timeline', fontsize=16, fontweight='bold')
ax.legend(fontsize=12, loc='lower right')
ax.grid(True, alpha=0.3)
ax.set_xlim(0, 120)

plt.tight_layout()
plt.savefig('battery_payback_timeline.png', dpi=300, bbox_inches='tight')
print("[OK] Saved: battery_payback_timeline.png")

# Create third figure: Monthly breakdown details
fig3, axes = plt.subplots(3, 1, figsize=(14, 10))

# Solar generation patterns
ax = axes[0]
ax.plot(x, solar_total, marker='o', linewidth=2.5, color=colors['solar'], label='Solar Generation')
ax.fill_between(x, 0, solar_total, alpha=0.3, color=colors['solar'])
ax.set_ylabel('Solar Generation (kWh)', fontsize=11, fontweight='bold')
ax.set_title('Monthly Solar Generation Pattern', fontsize=13, fontweight='bold')
ax.legend()
ax.grid(True, alpha=0.3)
ax.set_xticks(x)
ax.set_xticklabels(months_short, rotation=45, ha='right')

# Consumption patterns
ax = axes[1]
ax.plot(x, consumption, marker='s', linewidth=2.5, color=colors['consumption'], label='Consumption')
ax.fill_between(x, 0, consumption, alpha=0.3, color=colors['consumption'])
ax.set_ylabel('Consumption (kWh)', fontsize=11, fontweight='bold')
ax.set_title('Monthly Consumption Pattern', fontsize=13, fontweight='bold')
ax.legend()
ax.grid(True, alpha=0.3)
ax.set_xticks(x)
ax.set_xticklabels(months_short, rotation=45, ha='right')

# Self-sufficiency ratio
ax = axes[2]
self_sufficiency = [(solar/cons)*100 if cons > 0 else 0
                    for solar, cons in zip(solar_total, consumption)]
bars = ax.bar(x, self_sufficiency, color=colors['with_battery'], alpha=0.8)
ax.axhline(y=100, color='red', linestyle='--', linewidth=2, label='100% Self-sufficient')
ax.set_ylabel('Self-Sufficiency (%)', fontsize=11, fontweight='bold')
ax.set_xlabel('Month', fontsize=11, fontweight='bold')
ax.set_title('Solar Self-Sufficiency Ratio (Solar/Consumption)', fontsize=13, fontweight='bold')
ax.legend()
ax.grid(True, alpha=0.3)
ax.set_xticks(x)
ax.set_xticklabels(months_short, rotation=45, ha='right')

# Add value labels
for i, bar in enumerate(bars):
    height = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2., height,
            f'{height:.0f}%',
            ha='center', va='bottom', fontsize=8)

plt.tight_layout()
plt.savefig('battery_patterns_analysis.png', dpi=300, bbox_inches='tight')
print("[OK] Saved: battery_patterns_analysis.png")

print("\n" + "="*60)
print("All visualizations created successfully!")
print("="*60)
print("\nGenerated files:")
print("  1. battery_roi_analysis.png        - Main dashboard")
print("  2. battery_payback_timeline.png    - 10-year projection")
print("  3. battery_patterns_analysis.png   - Energy patterns")
print("\nKey Insights:")
print(f"  • Annual savings: ${annual['savings']:,.2f}")
print(f"  • Payback period: {annual['payback_years']:.1f} years")
print(f"  • 10-year profit: ${annual['savings'] * 10 - battery_cost:,.0f}")
print(f"  • Average monthly savings: ${monthly_savings:.2f}")
print("="*60)
