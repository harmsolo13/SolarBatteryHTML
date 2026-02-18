#!/usr/bin/env python3
"""
Create BatteryAnalysis_Enhanced.html with full interactive experience
"""

import json

# Load the compact enhanced data
with open('battery_daily_charging_enhanced_compact.json', 'r') as f:
    enhanced_data = json.load(f)

# Convert to JavaScript format
enhanced_data_js = json.dumps(enhanced_data, separators=(',', ':'))

html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🔋 Enhanced Battery Analysis</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.9/babel.min.js"></script>
<script src="https://unpkg.com/recharts@2.12.7/umd/Recharts.js"></script>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    background: linear-gradient(135deg, #0a0f1a 0%, #1e293b 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    min-height: 100vh;
    color: #e2e8f0;
  }}
  #root {{ min-height: 100vh; }}
  select {{
    background: #1e293b;
    color: #e2e8f0;
    border: 1px solid #334155;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
  }}
  select:focus {{ outline: none; border-color: #3b82f6; }}
  ::-webkit-scrollbar {{ width: 8px; }}
  ::-webkit-scrollbar-track {{ background: #0a0f1a; }}
  ::-webkit-scrollbar-thumb {{ background: #334155; border-radius: 4px; }}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const {{ useState, useMemo }} = React;
const {{ BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine }} = Recharts;

// Embedded enhanced data
const ENHANCED_DATA = {enhanced_data_js};

function BatteryAnalysis() {{
  const [simulationMode, setSimulationMode] = useState('realistic'); // 'realistic' or 'scenario'
  const [startingSOC, setStartingSOC] = useState('0%');
  const [selectedDate, setSelectedDate] = useState('2024-10-01');

  const batterySpec = ENHANCED_DATA.battery_spec;

  // Get data based on selected mode
  const currentData = useMemo(() => {{
    if (simulationMode === 'realistic') {{
      return ENHANCED_DATA.continuous_simulation;
    }} else {{
      return ENHANCED_DATA.scenario_based[startingSOC];
    }}
  }}, [simulationMode, startingSOC]);

  const dailyResults = currentData.daily_results || currentData.sample_days || [];
  const summary = currentData.summary;

  // Find selected day
  const selectedDay = dailyResults.find(d => d.date === selectedDate) || dailyResults[0];

  // Available dates
  const availableDates = dailyResults.map(d => d.date);

  // Calculate comparison stats
  const allScenarios = Object.entries(ENHANCED_DATA.scenario_based).map(([key, data]) => ({{
    name: key,
    starting_pct: data.starting_soc_pct,
    days_full: data.summary.days_reached_full,
    pct_full: data.summary.pct_days_full,
    avg_time: data.summary.avg_time_to_full
  }}));

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      {{/* Header */}}
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <h1 style={{ fontSize: "36px", fontWeight: 700, marginBottom: "8px", background: "linear-gradient(135deg, #60a5fa 0%, #34d399 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          🔋 Enhanced Battery Analysis
        </h1>
        <p style={{ fontSize: "16px", color: "#94a3b8" }}>
          Alpha ESS 28.8 kWh • Realistic vs Scenario-Based Simulations
        </p>
        <a href="BatteryROI_6.html" style={{ fontSize: "13px", color: "#3b82f6", textDecoration: "none", marginTop: "8px", display: "inline-block" }}>
          ← Back to ROI Calculator
        </a>
      </div>

      {{/* Controls */}}
      <div style={{ background: "#1e293b", padding: "24px", borderRadius: "12px", border: "1px solid #334155", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "center" }}>
          {{/* Simulation Mode */}}
          <div style={{ flex: "1", minWidth: "250px" }}>
            <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px", display: "block", fontWeight: 600 }}>
              Simulation Mode
            </label>
            <div style={{ display: "flex", gap: "8px", background: "#0f172a", padding: "4px", borderRadius: "8px", border: "1px solid #334155" }}>
              <button
                onClick={{() => setSimulationMode('realistic')}}
                style={{{{
                  flex: 1,
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "6px",
                  background: simulationMode === 'realistic' ? '#3b82f6' : 'transparent',
                  color: simulationMode === 'realistic' ? '#fff' : '#94a3b8',
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}}}
              >
                ✨ Realistic
              </button>
              <button
                onClick={{() => setSimulationMode('scenario')}}
                style={{{{
                  flex: 1,
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "6px",
                  background: simulationMode === 'scenario' ? '#3b82f6' : 'transparent',
                  color: simulationMode === 'scenario' ? '#fff' : '#94a3b8',
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}}}
              >
                🎯 Scenario-Based
              </button>
            </div>
          </div>

          {{/* Starting SOC Selector (Scenario mode only) */}}
          {{simulationMode === 'scenario' && (
            <div style={{ flex: "1", minWidth: "200px" }}>
              <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px", display: "block", fontWeight: 600 }}>
                Starting SOC
              </label>
              <select
                value={{startingSOC}}
                onChange={{(e) => setStartingSOC(e.target.value)}}
                style={{ width: "100%" }}
              >
                <option value="0%">0% - Empty Battery</option>
                <option value="25%">25% - Light Discharge</option>
                <option value="50%">50% - Moderate Use</option>
                <option value="75%">75% - Light Use</option>
              </select>
            </div>
          )}}

          {{/* Date Selector */}}
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px", display: "block", fontWeight: 600 }}>
              Select Date
            </label>
            <select
              value={{selectedDate}}
              onChange={{(e) => setSelectedDate(e.target.value)}}
              style={{ width: "100%" }}
            >
              {{availableDates.map(date => (
                <option key={{date}} value={{date}}>
                  {{new Date(date).toLocaleDateString('en-AU', {{ weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }})}}
                </option>
              ))}}
            </select>
          </div>
        </div>

        {{/* Mode Description */}}
        <div style={{ marginTop: "16px", padding: "12px", background: "#0f172a", borderRadius: "8px", fontSize: "12px", color: "#94a3b8", lineHeight: "1.6" }}>
          {{simulationMode === 'realistic' ? (
            <div>
              <strong style={{ color: "#60a5fa" }}>Realistic Mode:</strong> Shows actual day-to-day battery behavior including overnight grid charging during off-peak hours (12am-6am) and evening discharge during peak hours (6pm-12am). This is what actually happens with your battery system.
            </div>
          ) : (
            <div>
              <strong style={{ color: "#fbbf24" }}>Scenario Mode:</strong> Shows how quickly the battery charges from solar alone, starting at {{startingSOC}} each day. No overnight charging or discharge modeled. Useful for understanding solar generation capacity.
            </div>
          )}}
        </div>
      </div>

      {{/* Summary Stats */}}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div style={{ background: "#1e293b", padding: "20px", borderRadius: "12px", border: "1px solid #334155" }}>
          <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px", fontWeight: 600 }}>DAYS REACHING FULL</div>
          <div style={{ fontSize: "32px", fontWeight: 700, color: "#34d399" }}>
            {{summary.days_reached_full}}
          </div>
          <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
            out of {{summary.total_days_analyzed}} days ({{summary.pct_days_full}}%)
          </div>
        </div>

        <div style={{ background: "#1e293b", padding: "20px", borderRadius: "12px", border: "1px solid #334155" }}>
          <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px", fontWeight: 600 }}>AVG TIME TO FULL</div>
          <div style={{ fontSize: "32px", fontWeight: 700, color: "#60a5fa" }}>
            {{summary.avg_time_to_full || "—"}}
          </div>
          <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
            {{summary.earliest_full && summary.latest_full ? `Range: ${{summary.earliest_full}} - ${{summary.latest_full}}` : 'N/A'}}
          </div>
        </div>

        {{simulationMode === 'realistic' && (
          <>
            <div style={{ background: "#1e293b", padding: "20px", borderRadius: "12px", border: "1px solid #334155" }}>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px", fontWeight: 600 }}>OVERNIGHT CHARGING</div>
              <div style={{ fontSize: "32px", fontWeight: 700, color: "#a78bfa" }}>
                ✓
              </div>
              <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
                Off-peak grid (12am-6am)
              </div>
            </div>

            <div style={{ background: "#1e293b", padding: "20px", borderRadius: "12px", border: "1px solid #334155" }}>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px", fontWeight: 600 }}>PEAK DISCHARGE</div>
              <div style={{ fontSize: "32px", fontWeight: 700, color: "#f59e0b" }}>
                ✓
              </div>
              <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
                Evening peak (6pm-12am)
              </div>
            </div>
          </>
        )}}
      </div>

      {{/* Comparison Chart */}}
      {{simulationMode === 'scenario' && (
        <div style={{ background: "#1e293b", padding: "24px", borderRadius: "12px", border: "1px solid #334155", marginBottom: "32px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "#e2e8f0" }}>
            📊 Scenario Comparison
          </h3>
          <ResponsiveContainer width="100%" height={{300}}>
            <BarChart data={{allScenarios}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={{12}} />
              <YAxis stroke="#64748b" fontSize={{12}} label={{{{ value: 'Days Reaching Full', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}}} />
              <Tooltip
                contentStyle={{{{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}}}
                labelStyle={{{{ color: '#e2e8f0', fontWeight: 600 }}}}
              />
              <Bar dataKey="days_full" fill="#34d399" radius={{[8, 8, 0, 0]}} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: "16px", fontSize: "12px", color: "#94a3b8", textAlign: "center" }}>
            Higher starting SOC = More days reaching 100% charge
          </div>
        </div>
      )}}

      {{/* Selected Day Details */}}
      {{selectedDay && (
        <>
          <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px", color: "#e2e8f0" }}>
            📅 {{new Date(selectedDay.date).toLocaleDateString('en-AU', {{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }})}}
          </h3>

          {{/* Day Stats */}}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Solar Generation</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#38bdf8" }}>
                {{selectedDay.total_solar_kwh}} kWh
              </div>
            </div>

            {{simulationMode === 'realistic' && (
              <>
                <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Starting SOC</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#a78bfa" }}>
                    {{selectedDay.starting_soc_kwh}} kWh
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    {{((selectedDay.starting_soc_kwh / batterySpec.usable_kwh) * 100).toFixed(0)}}%
                  </div>
                </div>

                <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Ending SOC</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#34d399" }}>
                    {{selectedDay.ending_soc_kwh}} kWh
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    {{((selectedDay.ending_soc_kwh / batterySpec.usable_kwh) * 100).toFixed(0)}}%
                  </div>
                </div>

                <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Grid Charged</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#f59e0b" }}>
                    {{(selectedDay.daily_charge_kwh - selectedDay.total_solar_kwh * 0.96).toFixed(1)}} kWh
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    Off-peak overnight
                  </div>
                </div>

                <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Discharged</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#f87171" }}>
                    {{selectedDay.daily_discharge_kwh}} kWh
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    Peak hours (6pm-12am)
                  </div>
                </div>
              </>
            )}}

            {{simulationMode === 'scenario' && (
              <>
                <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Starting SOC</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#a78bfa" }}>
                    {{selectedDay.starting_soc_kwh}} kWh
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    {{startingSOC}}
                  </div>
                </div>

                <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Max SOC Reached</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#34d399" }}>
                    {{selectedDay.max_battery_soc_kwh}} kWh
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    {{selectedDay.battery_filled_pct}}%
                  </div>
                </div>
              </>
            )}}

            <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Time to Full</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: selectedDay.time_to_full ? "#34d399" : "#64748b" }}>
                {{selectedDay.time_to_full || "—"}}
              </div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>
                {{selectedDay.time_to_full ? "Reached 95% SOC" : "Did not reach full"}}
              </div>
            </div>
          </div>

          {{/* Hourly SOC Chart */}}
          <div style={{ background: "#1e293b", padding: "24px", borderRadius: "12px", border: "1px solid #334155", marginBottom: "32px" }}>
            <h4 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px", color: "#e2e8f0" }}>
              Hourly Battery State of Charge
            </h4>
            <ResponsiveContainer width="100%" height={{350}}>
              <AreaChart data={{Object.keys(selectedDay.hourly_soc).map(hour => ({{
                hour: `${{hour}}:00`,
                'SOC (kWh)': selectedDay.hourly_soc[hour],
                'SOC %': ((selectedDay.hourly_soc[hour] / batterySpec.usable_kwh) * 100).toFixed(1)
              }})).sort((a, b) => parseInt(a.hour) - parseInt(b.hour))}}>
                <defs>
                  <linearGradient id="socGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={{0.8}}/>
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={{0.1}}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={{11}} />
                <YAxis stroke="#64748b" fontSize={{11}} domain={{[0, batterySpec.usable_kwh]}} />
                <Tooltip
                  contentStyle={{{{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}}}
                  labelStyle={{{{ color: '#e2e8f0', fontWeight: 600 }}}}
                />
                <ReferenceLine y={{batterySpec.usable_kwh}} stroke="#34d399" strokeDasharray="3 3" label={{{{ value: 'Full (27.36 kWh)', fill: '#34d399', fontSize: 10 }}}} />
                <ReferenceLine y={{batterySpec.usable_kwh * 0.5}} stroke="#fbbf24" strokeDasharray="3 3" label={{{{ value: '50%', fill: '#fbbf24', fontSize: 10 }}}} />
                <Area type="monotone" dataKey="SOC (kWh)" stroke="#a78bfa" strokeWidth={{2}} fill="url(#socGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}}

      {{/* Footer */}}
      <div style={{ marginTop: "48px", padding: "24px", background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "8px" }}>
          Analysis based on 381 days of actual solar production data (Oct 2024 - Oct 2025)
        </p>
        <p style={{ fontSize: "12px", color: "#64748b" }}>
          Battery: Alpha ESS 28.8 kWh (27.36 kWh usable) • Charge Rate: {{batterySpec.charge_rate_kw}} kW • Discharge Rate: {{batterySpec.discharge_rate_kw}} kW
        </p>
        <div style={{ marginTop: "16px" }}>
          <a href="BatteryROI_6.html" style={{ fontSize: "13px", color: "#3b82f6", textDecoration: "none" }}>
            ← Back to ROI Calculator
          </a>
          <span style={{ margin: "0 12px", color: "#334155" }}>|</span>
          <a href="ENHANCED_ANALYSIS.md" style={{ fontSize: "13px", color: "#3b82f6", textDecoration: "none" }}>
            📖 Documentation
          </a>
        </div>
      </div>
    </div>
  );
}}

ReactDOM.render(<BatteryAnalysis />, document.getElementById('root'));
</script>
</body>
</html>
'''

# Write the HTML file
with open('BatteryAnalysis_Enhanced.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("[OK] Created BatteryAnalysis_Enhanced.html!")
print(f"\nFile size: {len(html_content)/1024:.1f} KB")
print("\nFeatures included:")
print("  ✓ Toggle between Realistic and Scenario-Based modes")
print("  ✓ Starting SOC selector (0%, 25%, 50%, 75%)")
print("  ✓ Date picker for all available days")
print("  ✓ Summary stats cards")
print("  ✓ Scenario comparison chart")
print("  ✓ Hourly SOC visualization")
print("  ✓ Detailed daily breakdown")
print("  ✓ Grid charging & discharge tracking (realistic mode)")
print("\nOpen BatteryAnalysis_Enhanced.html in your browser to view!")
