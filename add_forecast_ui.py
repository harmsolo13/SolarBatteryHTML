#!/usr/bin/env python3
"""
Add 7-Day Forecast UI to the Daily Details tab in BatteryROI_6.html
"""

# The forecast UI component to add before the closing of tab 5
forecast_ui = '''
            {/* ═══ 7-DAY WEATHER FORECAST ═══ */}
            <div style={{ marginTop: "32px", paddingTop: "32px", borderTop: "2px solid #334155" }}>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#e2e8f0", marginBottom: "6px" }}>
                🌤️ 7-Day Battery Performance Forecast
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "20px" }}>
                Predictions based on upcoming weather conditions and your historical solar generation patterns
              </div>

              {(() => {
                const [forecastData, setForecastData] = useState(null);
                const [forecastLoading, setForecastLoading] = useState(false);
                const [forecastError, setForecastError] = useState(null);

                const loadForecast = async () => {
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
                    }

                    // Calculate average solar from historical data
                    const avgSolar = dailyResults.reduce((sum, d) => sum + d.total_solar_kwh, 0) / dailyResults.length;

                    // Process forecast for each day
                    const predictions = weather.forecast.forecastday.map(day => {
                      const predictedSolar = predictSolarFromWeather(day, avgSolar);
                      const batteryPred = predictBatteryPerformance(predictedSolar, batterySpec.usable_kwh);

                      return {
                        date: day.date,
                        dateObj: new Date(day.date),
                        dayName: new Date(day.date).toLocaleDateString('en-AU', { weekday: 'short' }),
                        condition: day.day.condition.text,
                        conditionIcon: day.day.condition.icon,
                        tempMax: day.day.maxtemp_c,
                        tempMin: day.day.mintemp_c,
                        cloudCover: day.day.avgvis_km < 5 ? 90 : day.day.daily_will_it_rain ? 70 : day.hour[12].cloud || 30,
                        uvIndex: day.day.uv,
                        rainChance: day.day.daily_chance_of_rain,
                        ...batteryPred
                      };
                    });

                    setForecastData(predictions);
                  } catch (error) {
                    setForecastError(`Error: ${error.message}`);
                  } finally {
                    setForecastLoading(false);
                  }
                };

                useEffect(() => {
                  if (!forecastData && !forecastLoading && !forecastError) {
                    loadForecast();
                  }
                }, []);

                if (forecastError) {
                  return <div style={{ background: "#1e293b", padding: "24px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
                    <div style={{ fontSize: "14px", color: "#f87171", marginBottom: "8px", fontWeight: 600 }}>
                      Weather Forecast Not Available
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "16px" }}>
                      {forecastError}
                    </div>
                    <button
                      onClick={loadForecast}
                      style={{
                        padding: "8px 20px",
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Retry
                    </button>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "12px" }}>
                      See <strong>weather_forecast_setup.md</strong> for setup instructions
                    </div>
                  </div>;
                }

                if (forecastLoading) {
                  return <div style={{ background: "#1e293b", padding: "40px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
                    <div style={{ fontSize: "14px", color: "#94a3b8" }}>Loading 7-day forecast...</div>
                  </div>;
                }

                if (!forecastData) return null;

                // Calculate summary stats
                const avgPredictedSolar = forecastData.reduce((sum, d) => sum + d.predictedSolarKwh, 0) / forecastData.length;
                const daysReachingFull = forecastData.filter(d => d.fillPct >= 95).length;
                const avgFillPct = forecastData.reduce((sum, d) => sum + d.fillPct, 0) / forecastData.length;
                const needsSolarSharer = forecastData.filter(d => d.fillPct < 75);

                return <>
                  {/* Forecast Summary Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "24px" }}>
                    <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                      <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Predicted Avg Solar</div>
                      <div style={{ fontSize: "24px", fontWeight: 700, color: "#38bdf8" }}>
                        {avgPredictedSolar.toFixed(1)} kWh/day
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                        {avgPredictedSolar > avgSolarAllDays ? 'Above' : 'Below'} historical avg ({avgSolarAllDays.toFixed(1)} kWh)
                      </div>
                    </div>

                    <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                      <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Days Reaching Full</div>
                      <div style={{ fontSize: "24px", fontWeight: 700, color: "#34d399" }}>
                        {daysReachingFull} / 7
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                        {((daysReachingFull / 7) * 100).toFixed(0)}% of week
                      </div>
                    </div>

                    <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                      <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Avg Battery Fill</div>
                      <div style={{ fontSize: "24px", fontWeight: 700, color: "#a78bfa" }}>
                        {avgFillPct.toFixed(0)}%
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                        {avgFillPct >= 90 ? 'Excellent' : avgFillPct >= 70 ? 'Good' : 'Fair'} week ahead
                      </div>
                    </div>

                    <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                      <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Last Updated</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#e2e8f0" }}>
                        {new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <button
                        onClick={loadForecast}
                        style={{
                          marginTop: "6px",
                          padding: "4px 12px",
                          background: "transparent",
                          color: "#3b82f6",
                          border: "1px solid #3b82f6",
                          borderRadius: "4px",
                          fontSize: "10px",
                          cursor: "pointer"
                        }}
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  {/* 7-Day Forecast Chart */}
                  <div style={{ background: "#1e293b", padding: "20px", borderRadius: "8px", border: "1px solid #334155", marginBottom: "24px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#e2e8f0", marginBottom: "16px" }}>
                      Predicted Battery Performance
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={forecastData.map(d => ({
                        date: `${d.dayName}\\n${d.dateObj.getDate()}/${d.dateObj.getMonth() + 1}`,
                        'Predicted Solar': d.predictedSolarKwh,
                        'Max SOC': d.maxSOC,
                        'Fill %': d.fillPct
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip
                          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', fontSize: '12px' }}
                          labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="Predicted Solar" fill="#38bdf8" />
                        <Bar dataKey="Max SOC" fill="#a78bfa" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Daily Forecast Details */}
                  <div style={{ background: "#1e293b", padding: "20px", borderRadius: "8px", border: "1px solid #334155", marginBottom: "24px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#e2e8f0", marginBottom: "16px" }}>
                      Day-by-Day Forecast
                    </div>
                    <div style={{ display: "grid", gap: "12px" }}>
                      {forecastData.map((day, i) => (
                        <div key={i} style={{ background: "#0f172a", padding: "16px", borderRadius: "6px", border: "1px solid #334155" }}>
                          <div style={{ display: "flex", gap: "16px", alignItems: "start", flexWrap: "wrap" }}>
                            {/* Date & Weather */}
                            <div style={{ flex: "0 0 180px" }}>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>
                                {day.dayName}, {day.dateObj.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <img src={`https:${day.conditionIcon}`} alt={day.condition} style={{ width: "32px", height: "32px" }} />
                                <div>
                                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>{day.condition}</div>
                                  <div style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: 600 }}>
                                    {day.tempMax}°C / {day.tempMin}°C
                                  </div>
                                </div>
                              </div>
                              <div style={{ fontSize: "10px", color: "#64748b" }}>
                                ☁️ {day.cloudCover}% cloud • ☀️ UV {day.uvIndex} • 🌧️ {day.rainChance}% rain
                              </div>
                            </div>

                            {/* Battery Predictions */}
                            <div style={{ flex: "1", minWidth: "300px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "12px" }}>
                                <div>
                                  <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>Predicted Solar</div>
                                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#38bdf8" }}>
                                    {day.predictedSolarKwh} kWh
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>Max Battery SOC</div>
                                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#a78bfa" }}>
                                    {day.maxSOC} kWh
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>Fill Percentage</div>
                                  <div style={{ fontSize: "16px", fontWeight: 700, color: day.fillPct >= 95 ? "#34d399" : day.fillPct >= 75 ? "#fbbf24" : "#f87171" }}>
                                    {day.fillPct}%
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>Time to Full</div>
                                  <div style={{ fontSize: "16px", fontWeight: 700, color: day.timeToFull ? "#34d399" : "#64748b" }}>
                                    {day.timeToFull || "—"}
                                  </div>
                                </div>
                              </div>

                              {/* Recommendation */}
                              <div style={{ marginTop: "12px", padding: "8px 12px", background: "#1e293b", borderRadius: "4px", fontSize: "11px", color: "#94a3b8" }}>
                                {day.fillPct >= 95 ? (
                                  <>✓ <strong style={{ color: "#34d399" }}>Excellent day!</strong> Battery will reach full. Good day for high consumption activities.</>
                                ) : day.fillPct >= 75 ? (
                                  <>✓ <strong style={{ color: "#fbbf24" }}>Good day.</strong> Battery will reach {day.fillPct}%. Consider moderate usage.</>
                                ) : (
                                  <>⚠ <strong style={{ color: "#f87171" }}>Low solar day.</strong> Battery only {day.fillPct}%. 💡 Solar Sharer (11am-2pm) could add ~13 kWh.</>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Smart Recommendations */}
                  {needsSolarSharer.length > 0 && (
                    <div style={{ background: "#1e293b", padding: "20px", borderRadius: "8px", border: "1px solid #f59e0b" }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#fbbf24", marginBottom: "12px" }}>
                        💡 Smart Recommendations
                      </div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.6" }}>
                        <p style={{ margin: "0 0 8px" }}>
                          <strong>{needsSolarSharer.length} day{needsSolarSharer.length > 1 ? 's' : ''}</strong> this week may not fully charge the battery:
                        </p>
                        <ul style={{ margin: "0 0 12px 20px", padding: 0 }}>
                          {needsSolarSharer.map((day, i) => (
                            <li key={i} style={{ margin: "4px 0" }}>
                              <strong>{day.dayName} {day.dateObj.getDate()}/{day.dateObj.getMonth() + 1}</strong> -
                              Predicted {day.fillPct}% fill ({day.condition.toLowerCase()})
                            </li>
                          ))}
                        </ul>
                        <p style={{ margin: "0 0 8px", color: "#fbbf24" }}>
                          <strong>Solar Sharer Benefit:</strong> The 3 free hours (11am-2pm) could provide ~13 kWh on these days, bringing battery to near-full capacity.
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Alternative:</strong> Consider pre-charging battery overnight (off-peak rate: 38.82¢/kWh) before very cloudy days to ensure full capacity.
                        </p>
                      </div>
                    </div>
                  )}
                </>;
              })()}
            </div>
'''

# Read the HTML
with open('BatteryROI_6.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Find the end of the Daily Details tab (before "})()}")
# Look for the pattern right before the tab closes
search_pattern = '''            {!selectedDay && viewMode === 'day' && (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No data available for selected date. Please choose a date between Oct 1, 2024 and Oct 31, 2025.
              </div>
            )}
          </>;
        })()}'''

if search_pattern not in html_content:
    print("ERROR: Could not find insertion point!")
    exit(1)

# Insert the forecast UI before the closing
replacement = search_pattern + '\n\n' + forecast_ui

html_content = html_content.replace(search_pattern, replacement)

# Write back
with open('BatteryROI_6.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("[OK] 7-Day Weather Forecast UI added to Daily Details tab!")
print("\nThe forecast section will appear at the bottom of the Daily Details tab.")
print("Make sure to configure your Weather API key as shown in weather_forecast_setup.md")
