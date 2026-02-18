#!/usr/bin/env python3
"""
Fix the infinite loop by removing useEffect from inside the forecast IIFE
"""

# Read the HTML
with open('BatteryROI_6.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Find and remove the problematic useEffect
old_useeffect = """                useEffect(() => {
                  if (!forecastData && !forecastLoading && !forecastError) {
                    loadForecast();
                  }
                }, []);

                if (forecastError) {"""

# Replace with conditional rendering and manual load button
new_code = """                if (forecastError) {"""

html_content = html_content.replace(old_useeffect, new_code)

# Also update the initial message to include a load button
old_initial_message = """                if (!forecastData) return null;"""

new_initial_message = """                if (!forecastData) {
                  return <div style={{ background: "#1e293b", padding: "24px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "12px" }}>🌤️</div>
                    <div style={{ fontSize: "14px", color: "#e2e8f0", marginBottom: "8px", fontWeight: 600 }}>
                      7-Day Weather Forecast
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "16px" }}>
                      Get AI-powered predictions for battery performance based on weather forecasts
                    </div>
                    <button
                      onClick={loadForecast}
                      style={{
                        padding: "10px 24px",
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Load 7-Day Forecast
                    </button>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "12px" }}>
                      Requires Weather API key (see weather_forecast_setup.md)
                    </div>
                  </div>;
                }"""

html_content = html_content.replace(old_initial_message, new_initial_message)

# Write back
with open('BatteryROI_6.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("[OK] Fixed infinite loop!")
print("\nChanges made:")
print("1. Removed useEffect from inside forecast IIFE")
print("2. Added manual 'Load Forecast' button")
print("3. Forecast now loads only when user clicks the button")
print("\nThis prevents React from creating new useEffect hooks on every render.")
