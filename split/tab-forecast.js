/* Tab 3: Forecast — 4 sub-views: Daily (16-day weather), Weekly, Monthly, Yearly ROI */

function ForecastTab({ cfg, upC, forecast, viewYr, setViewYr, chartMode, setChartMode, netCost, monthlyPmt, hasData, scLabel, scColor, fmt, fmt2, pct, MO, BAT, financeOverride, setFinanceOverride, rateSets, setTab, accelerateRepay, setAccelerateRepay, annualBill, openMeteoForecast, openMeteoLoading, openMeteoError, refreshOpenMeteo, forecastSubView, setForecastSubView }) {
  // Compute accelerated repayment data when toggle is on
  const avgMonthlySavings = forecast ? forecast.summary.avgMo : 0;
  const accelData = useMemo(() => {
    if (!accelerateRepay || cfg.payType !== "finance" || !forecast) return null;
    return generateAcceleratedSchedule(netCost, cfg.financeRate, cfg.financeTerm, avgMonthlySavings);
  }, [accelerateRepay, cfg.payType, cfg.financeRate, cfg.financeTerm, netCost, avgMonthlySavings, forecast]);

  // Compute lifetime cost comparison data
  const lifetimeCostData = useMemo(() => {
    if (!forecast) return null;
    const annualNoBatt = forecast.summary.totalNB / cfg.forecastYears;
    const annualSavings = (forecast.summary.totalEnergySav || forecast.summary.totalSav) / cfg.forecastYears;
    const years = Math.max(cfg.forecastYears, 15);
    return generateLifetimeCostData(annualNoBatt, annualSavings, netCost, cfg.escalation, cfg.financeRate, cfg.financeTerm, years);
  }, [forecast, cfg.forecastYears, cfg.escalation, cfg.financeRate, cfg.financeTerm, netCost]);

  // Financial calculations for daily forecast
  const avgDailyCostNoBattery = annualBill ? annualBill / 365 : 0;
  const dailyFinanceCost = monthlyPmt / 30;

  // Enrich forecast days with financial data
  const forecastFinancials = useMemo(() => {
    if (!openMeteoForecast) return [];
    return openMeteoForecast.map(day => {
      const batteryReduction = Math.min(day.fillPct / 100, 1);
      const dailySaving = avgDailyCostNoBattery * batteryReduction * 0.5;
      const netSaving = dailySaving - dailyFinanceCost;
      return { ...day, dailySaving: Math.round(dailySaving * 100) / 100, dailyFinanceCost: Math.round(dailyFinanceCost * 100) / 100, netSaving: Math.round(netSaving * 100) / 100 };
    });
  }, [openMeteoForecast, avgDailyCostNoBattery, dailyFinanceCost]);

  // Sub-view pill style
  const pill = (active) => ({
    padding: "7px 18px", borderRadius: "20px",
    border: active ? "1px solid #3b82f6" : "1px solid var(--border-light)",
    background: active ? "rgba(59,130,246,0.15)" : "transparent",
    color: active ? "#60a5fa" : "var(--text-secondary)",
    fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
  });

  return (<>
    {/* Sub-view navigation pills */}
    <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
      {[
        { key: 'daily', label: 'Daily (16 days)' },
        { key: 'weekly', label: 'Weekly' },
        { key: 'monthly', label: 'Monthly' },
        { key: 'yearly', label: 'Yearly' },
      ].map(v => (
        <button key={v.key} onClick={() => setForecastSubView(v.key)} style={pill(forecastSubView === v.key)}>
          {v.label}
        </button>
      ))}
    </div>

    {/* ═══ DAILY SUB-VIEW: 16-day weather-driven forecast ═══ */}
    {forecastSubView === 'daily' && (<>
      {openMeteoLoading && (
        <div style={{ ...S.card, textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Loading 16-day forecast...</div>
        </div>
      )}

      {openMeteoError && (
        <div style={{ ...S.card, textAlign: "center", padding: "24px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>&#x26A0;&#xFE0F;</div>
          <div style={{ fontSize: "14px", color: "#f87171", marginBottom: "8px", fontWeight: 600 }}>Weather Forecast Not Available</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px" }}>{openMeteoError}</div>
          <button onClick={refreshOpenMeteo} style={{ padding: "8px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {!openMeteoLoading && !openMeteoError && openMeteoForecast && openMeteoForecast.length > 0 && (() => {
        const avgPredictedSolar = openMeteoForecast.reduce((sum, d) => sum + d.predictedSolarKwh, 0) / openMeteoForecast.length;
        const daysReachingFull = openMeteoForecast.filter(d => d.fillPct >= 95).length;
        const avgFillPct = openMeteoForecast.reduce((sum, d) => sum + d.fillPct, 0) / openMeteoForecast.length;
        const totalSavings = forecastFinancials.reduce((sum, d) => sum + d.dailySaving, 0);
        const needsSolarSharer = openMeteoForecast.filter(d => d.fillPct < 75);

        return <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            <div style={{ background: "var(--border)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Avg Predicted Solar</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#38bdf8" }}>{avgPredictedSolar.toFixed(1)} kWh/day</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>across {openMeteoForecast.length} days</div>
            </div>
            <div style={{ background: "var(--border)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Days Reaching Full</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#34d399" }}>{daysReachingFull} / {openMeteoForecast.length}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>{((daysReachingFull / openMeteoForecast.length) * 100).toFixed(0)}% of forecast</div>
            </div>
            <div style={{ background: "var(--border)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Avg Battery Fill</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#a78bfa" }}>{avgFillPct.toFixed(0)}%</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>{avgFillPct >= 90 ? 'Excellent' : avgFillPct >= 70 ? 'Good' : 'Fair'} outlook</div>
            </div>
            <div style={{ background: "var(--border)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Est. Total Savings</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#34d399" }}>{fmt(totalSavings)}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>~{fmt(totalSavings / openMeteoForecast.length * 365)}/year at this rate</div>
            </div>
            <div style={{ background: "var(--border)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Data Source</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Open-Meteo</div>
              <button onClick={refreshOpenMeteo} style={{ marginTop: "6px", padding: "4px 12px", background: "transparent", color: "#3b82f6", border: "1px solid #3b82f6", borderRadius: "4px", fontSize: "10px", cursor: "pointer" }}>Refresh</button>
            </div>
          </div>

          {/* 16-Day Bar Chart */}
          <div style={{ ...S.card, marginBottom: "24px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "16px" }}>Predicted Battery Performance (16 days)</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={openMeteoForecast.map(d => ({
                date: `${d.dayName} ${d.dateObj.getDate()}/${d.dateObj.getMonth() + 1}`,
                'Predicted Solar': d.predictedSolarKwh,
                'Max SOC': d.maxSOC,
              }))} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} interval={1} angle={-35} textAnchor="end" height={60} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip contentStyle={{ background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '12px' }} labelStyle={{ color: 'var(--text)', fontWeight: 600 }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Predicted Solar" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Max SOC" fill="#a78bfa" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Day-by-Day Detail Cards */}
          <div style={{ ...S.card, marginBottom: "24px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "16px" }}>Day-by-Day Forecast</div>
            <div style={{ display: "grid", gap: "12px" }}>
              {forecastFinancials.map((day, i) => (
                <div key={i} style={{ background: "var(--bg-input)", padding: "16px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
                  <div style={{ display: "flex", gap: "16px", alignItems: "start", flexWrap: "wrap" }}>
                    {/* Date & Weather */}
                    <div style={{ flex: "0 0 200px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
                        {day.dayName}, {day.dateObj.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "28px" }}>{day.conditionIcon}</span>
                        <div>
                          <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{day.condition}</div>
                          <div style={{ fontSize: "12px", color: "var(--text)", fontWeight: 600 }}>{day.tempMax}°C / {day.tempMin}°C</div>
                        </div>
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                        {day.cloudCover != null && <span>&#x2601;&#xFE0F; {Math.round(day.cloudCover)}% cloud</span>}
                        {day.precipChance != null && <span> · &#x1F327;&#xFE0F; {day.precipChance}% rain</span>}
                      </div>
                      {day.radiationMJ != null && <div style={{ fontSize: "9px", color: "var(--text-dim)" }}>
                        Radiation: {day.radiationMJ.toFixed(1)} MJ/m² · Sunshine: {day.sunshineHours}h
                      </div>}
                    </div>

                    {/* Battery Predictions */}
                    <div style={{ flex: "1", minWidth: "300px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "12px" }}>
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>Predicted Solar</div>
                          <div style={{ fontSize: "16px", fontWeight: 700, color: "#38bdf8" }}>{day.predictedSolarKwh} kWh</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>Max Battery SOC</div>
                          <div style={{ fontSize: "16px", fontWeight: 700, color: "#a78bfa" }}>{day.maxSOC} kWh</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>Fill Percentage</div>
                          <div style={{ fontSize: "16px", fontWeight: 700, color: day.fillPct >= 95 ? "#34d399" : day.fillPct >= 75 ? "#fbbf24" : "#f87171" }}>{day.fillPct}%</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>Time to Full</div>
                          <div style={{ fontSize: "16px", fontWeight: 700, color: day.timeToFull ? "#34d399" : "var(--text-muted)" }}>{day.timeToFull || "\u2014"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>Est. Saving</div>
                          <div style={{ fontSize: "16px", fontWeight: 700, color: "#34d399" }}>${day.dailySaving.toFixed(2)}</div>
                        </div>
                        {cfg.payType === "finance" && <div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>Net (After Finance)</div>
                          <div style={{ fontSize: "16px", fontWeight: 700, color: day.netSaving >= 0 ? "#34d399" : "#f87171" }}>${day.netSaving.toFixed(2)}</div>
                        </div>}
                      </div>
                      <div style={{ marginTop: "12px", padding: "8px 12px", background: "var(--border)", borderRadius: "4px", fontSize: "11px", color: "var(--text-secondary)" }}>
                        {day.fillPct >= 95 ? (
                          <><strong style={{ color: "#34d399" }}>Excellent day!</strong> Battery will reach full. Good day for high consumption activities.</>
                        ) : day.fillPct >= 75 ? (
                          <><strong style={{ color: "#fbbf24" }}>Good day.</strong> Battery will reach {day.fillPct}%. Consider moderate usage.</>
                        ) : (
                          <><strong style={{ color: "#f87171" }}>Low solar day.</strong> Battery only {day.fillPct}%. Consider pre-charging overnight at off-peak rates.</>
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
            <div style={{ background: "var(--border)", padding: "20px", borderRadius: "8px", border: "1px solid #f59e0b", marginBottom: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#fbbf24", marginBottom: "12px" }}>Smart Recommendations</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                <p style={{ margin: "0 0 8px" }}><strong>{needsSolarSharer.length} day{needsSolarSharer.length > 1 ? 's' : ''}</strong> may not fully charge the battery:</p>
                <ul style={{ margin: "0 0 12px 20px", padding: 0 }}>
                  {needsSolarSharer.slice(0, 5).map((day, i) => (
                    <li key={i} style={{ margin: "4px 0" }}>
                      <strong>{day.dayName} {day.dateObj.getDate()}/{day.dateObj.getMonth() + 1}</strong> - Predicted {day.fillPct}% fill ({day.condition.toLowerCase()})
                    </li>
                  ))}
                  {needsSolarSharer.length > 5 && <li style={{ margin: "4px 0", color: "var(--text-muted)" }}>...and {needsSolarSharer.length - 5} more</li>}
                </ul>
                <p style={{ margin: 0 }}><strong>Tip:</strong> Consider pre-charging battery overnight at off-peak rates before very cloudy days to ensure full capacity.</p>
              </div>
            </div>
          )}
        </>;
      })()}

      {!openMeteoLoading && !openMeteoError && (!openMeteoForecast || openMeteoForecast.length === 0) && (
        <div style={{ ...S.card, textAlign: "center", padding: "24px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>&#x1F324;&#xFE0F;</div>
          <div style={{ fontSize: "14px", color: "var(--text)", marginBottom: "8px", fontWeight: 600 }}>16-Day Weather Forecast</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px" }}>Get radiation-based predictions for battery performance using Open-Meteo data</div>
          <button onClick={refreshOpenMeteo} style={{ padding: "10px 24px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Load 16-Day Forecast</button>
        </div>
      )}
    </>)}

    {/* ═══ WEEKLY SUB-VIEW: Group into Week 1 and Week 2 ═══ */}
    {forecastSubView === 'weekly' && (<>
      {openMeteoLoading && <div style={{ ...S.card, textAlign: "center", padding: "40px" }}><div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Loading forecast...</div></div>}
      {openMeteoError && <div style={{ ...S.card, textAlign: "center", padding: "24px" }}><div style={{ color: "#f87171" }}>{openMeteoError}</div><button onClick={refreshOpenMeteo} style={{ marginTop: "8px", padding: "6px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>Retry</button></div>}

      {!openMeteoLoading && !openMeteoError && forecastFinancials.length > 0 && (() => {
        const week1 = forecastFinancials.slice(0, 7);
        const week2 = forecastFinancials.slice(7, 14);
        const weeks = [
          { label: 'Week 1 (Days 1-7)', data: week1 },
          { label: `Week 2 (Days 8-${Math.min(14, forecastFinancials.length)})`, data: week2 },
        ].filter(w => w.data.length > 0);

        const weekStats = weeks.map(w => ({
          label: w.label,
          totalSolar: w.data.reduce((s, d) => s + d.predictedSolarKwh, 0),
          avgFill: w.data.reduce((s, d) => s + d.fillPct, 0) / w.data.length,
          daysAtFull: w.data.filter(d => d.fillPct >= 95).length,
          totalSavings: w.data.reduce((s, d) => s + d.dailySaving, 0),
          days: w.data.length,
        }));

        return <>
          {/* Week Comparison Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            {weekStats.map((ws, i) => (
              <div key={i} style={{ ...S.card, background: i === 0 ? "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(96,165,250,0.04))" : "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(192,112,232,0.04))" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "16px" }}>{ws.label}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Total Solar</div>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#38bdf8" }}>{ws.totalSolar.toFixed(1)} kWh</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Avg Fill %</div>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#a78bfa" }}>{ws.avgFill.toFixed(0)}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Days at Full</div>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#34d399" }}>{ws.daysAtFull} / {ws.days}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Total Savings</div>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#34d399" }}>{fmt(ws.totalSavings)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Weekly Comparison Bar Chart */}
          <div style={S.card}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "16px" }}>Weekly Comparison</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weekStats} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip contentStyle={{ background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="totalSolar" name="Total Solar (kWh)" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="avgFill" name="Avg Fill (%)" fill="#a78bfa" radius={[3, 3, 0, 0]} />
                <Bar dataKey="totalSavings" name="Savings ($)" fill="#34d399" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>;
      })()}

      {!openMeteoLoading && !openMeteoError && forecastFinancials.length === 0 && (
        <div style={{ ...S.card, textAlign: "center", padding: "24px" }}>
          <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px" }}>No forecast data available</div>
          <button onClick={refreshOpenMeteo} style={{ padding: "8px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Load Forecast</button>
        </div>
      )}
    </>)}

    {/* ═══ MONTHLY SUB-VIEW: Rolling 12-month view ═══ */}
    {forecastSubView === 'monthly' && (<>
      {(() => {
        if (!forecast) return (
          <div style={{ ...S.card, textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "40px", marginBottom: "10px" }}>&#x1F4CB;</div>
            <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Enter usage data in the Setup tab first</div>
            <button style={{ ...S.btn(true), marginTop: "12px" }} onClick={() => setTab(0)}>Go to Setup</button>
          </div>
        );

        // Build 12-month rolling view from forecast model
        const now = new Date();
        const currentMonth = now.getMonth();
        const monthlyData = [];

        for (let i = 0; i < 12; i++) {
          const monthIdx = (currentMonth + i) % 12;
          const yearOffset = Math.floor((currentMonth + i) / 12);
          const label = MO[monthIdx] + (yearOffset > 0 ? ` '${String(now.getFullYear() + yearOffset).slice(2)}` : '');

          // Use year 1 forecast data for this month
          const forecastMonth = forecast.monthly.find(m => m.monthIdx === monthIdx && m.year === 1) ||
                                forecast.monthly.find(m => m.label === MO[monthIdx] && m.year === 1);

          if (forecastMonth) {
            monthlyData.push({
              label,
              month: MO[monthIdx],
              noBattery: forecastMonth.noBattery,
              withBattery: forecastMonth.energyOnly,
              saving: forecastMonth.saving,
              energySaving: forecastMonth.energySaving || forecastMonth.noBattery - forecastMonth.energyOnly,
            });
          } else {
            // Fallback: use annual averages
            const avgMonthlyNB = forecast.summary.totalNB / (cfg.forecastYears * 12);
            const avgMonthlySav = (forecast.summary.totalEnergySav || forecast.summary.totalSav) / (cfg.forecastYears * 12);
            monthlyData.push({
              label,
              month: MO[monthIdx],
              noBattery: avgMonthlyNB,
              withBattery: avgMonthlyNB - avgMonthlySav,
              saving: avgMonthlySav - (cfg.payType === 'finance' ? monthlyPmt : 0),
              energySaving: avgMonthlySav,
            });
          }
        }

        // Add Open-Meteo current month enhancement
        const currentMonthWeather = openMeteoForecast && openMeteoForecast.length > 0
          ? { avgSolar: openMeteoForecast.reduce((s, d) => s + d.predictedSolarKwh, 0) / openMeteoForecast.length, avgFill: openMeteoForecast.reduce((s, d) => s + d.fillPct, 0) / openMeteoForecast.length }
          : null;

        return <>
          {/* Forecast settings for Monthly view */}
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "16px" }}>
            <div style={{ ...S.card, flex: "1 1 280px" }}>
              <div style={S.cT}>Forecast Settings</div>
              <div style={{ display: "grid", gap: "10px" }}>
                <div>
                  <label style={S.lbl}>Battery effectiveness</label>
                  <input type="range" min={0.5} max={1.4} step={0.05} value={cfg.scenario} onChange={e => upC("scenario", +e.target.value)} style={S.slider} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)" }}>
                    <span>Conservative</span><span style={{ color: scColor, fontWeight: 600 }}>{scLabel} ({pct(cfg.scenario * 100)})</span><span>Optimistic</span>
                  </div>
                </div>
              </div>
            </div>
            {currentMonthWeather && (
              <div style={{ ...S.card, flex: "1 1 280px" }}>
                <div style={S.cT}>Current Weather Outlook</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Avg Predicted Solar</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#38bdf8" }}>{currentMonthWeather.avgSolar.toFixed(1)} kWh/day</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Avg Battery Fill</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#a78bfa" }}>{currentMonthWeather.avgFill.toFixed(0)}%</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 12-Month Bar Chart */}
          <div style={S.card}>
            <div style={S.cT}>Rolling 12-Month Cost Comparison</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} barGap={2} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip content={<TT />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="noBattery" name="Without Battery" fill="#f87171" radius={[3, 3, 0, 0]} />
                <Bar dataKey="withBattery" name="With Battery" fill="#34d399" radius={[3, 3, 0, 0]} />
                <Bar dataKey="energySaving" name="Energy Saving" fill="#fbbf24" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Summary Table */}
          <div style={{ ...S.card, overflowX: "auto" }}>
            <div style={S.cT}>Monthly Detail</div>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "12px", minWidth: "500px" }}>
              <thead><tr>
                <th style={{ ...S.th, textAlign: "left" }}>Month</th>
                <th style={S.th}>Without Battery</th>
                <th style={S.th}>With Battery</th>
                <th style={S.th}>Energy Saving</th>
                <th style={S.th}>Net Saving</th>
              </tr></thead>
              <tbody>
                {monthlyData.map((d, i) => (
                  <tr key={i} style={{ background: i % 2 ? "var(--bg-row-alt)" : "transparent" }}>
                    <td style={{ ...S.td, fontWeight: 500, textAlign: "left" }}>{d.label}</td>
                    <td style={{ ...S.td, textAlign: "right", color: "#f87171" }}>{fmt(d.noBattery)}</td>
                    <td style={{ ...S.td, textAlign: "right", color: "#34d399" }}>{fmt(d.withBattery)}</td>
                    <td style={{ ...S.td, textAlign: "right" }}><span style={S.badge("#34d399")}>+{fmt(d.energySaving)}</span></td>
                    <td style={{ ...S.td, textAlign: "right" }}><span style={S.badge(d.saving >= 0 ? "#34d399" : "#f87171")}>{d.saving >= 0 ? "+" : ""}{fmt(d.saving)}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr style={{ borderTop: "2px solid var(--border)" }}>
                <td style={{ ...S.td, fontWeight: 700, color: "#fbbf24", textAlign: "left" }}>TOTAL</td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 600, color: "#f87171" }}>{fmt(monthlyData.reduce((s, d) => s + d.noBattery, 0))}</td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 600, color: "#34d399" }}>{fmt(monthlyData.reduce((s, d) => s + d.withBattery, 0))}</td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}><span style={S.badge("#34d399")}>+{fmt(monthlyData.reduce((s, d) => s + d.energySaving, 0))}</span></td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}><span style={S.badge(monthlyData.reduce((s, d) => s + d.saving, 0) >= 0 ? "#34d399" : "#f87171")}>{fmt(monthlyData.reduce((s, d) => s + d.saving, 0))}</span></td>
              </tr></tfoot>
            </table>
          </div>
        </>;
      })()}
    </>)}

    {/* ═══ YEARLY SUB-VIEW: Direct migration of existing forecast content ═══ */}
    {forecastSubView === 'yearly' && (<>
          {/* Forecast Settings */}
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "16px" }}>
            <div style={{ ...S.card, flex: "1 1 280px" }}>
              <div style={S.cT}>Forecast Settings</div>
              <div style={{ display: "grid", gap: "10px" }}>
                <div>
                  <label style={S.lbl}>Forecast period</label>
                  <input type="range" min={2} max={20} step={1} value={cfg.forecastYears} onChange={e => upC("forecastYears", +e.target.value)} style={S.slider} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)" }}><span>2yr</span><span style={{ color: "var(--text)", fontWeight: 600 }}>{cfg.forecastYears} years</span><span>20yr</span></div>
                </div>
                <div>
                  <label style={S.lbl}>Battery effectiveness</label>
                  <input type="range" min={0.5} max={1.4} step={0.05} value={cfg.scenario} onChange={e => upC("scenario", +e.target.value)} style={S.slider} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)" }}>
                    <span>Conservative</span><span style={{ color: scColor, fontWeight: 600 }}>{scLabel} ({pct(cfg.scenario * 100)})</span><span>Optimistic</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ ...S.card, flex: "1 1 280px" }}>
              <div style={S.cT}>Payment Method</div>
              <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                <button style={S.tgl(cfg.payType === "upfront")} onClick={() => upC("payType", "upfront")}>Pay Upfront</button>
                <button style={S.tgl(cfg.payType === "finance")} onClick={() => upC("payType", "finance")}>Finance</button>
              </div>
              {cfg.payType === "finance" ? <div style={{ display: "grid", gap: "10px" }}>
                {financeOverride ? (
                  <div style={{ padding: "10px", background: "rgba(124,58,237,0.1)", borderRadius: "8px", border: "1px solid rgba(124,58,237,0.3)" }}>
                    <div style={{ fontSize: "11px", color: "#a78bfa", marginBottom: "4px" }}>Using Finance Calculator scenario</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#f59e0b" }}>{financeOverride.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{fmt(monthlyPmt)}/mo · {financeOverride.effectiveAPR.toFixed(1)}% APR · {financeOverride.termYears}yr</div>
                    <button onClick={() => setFinanceOverride(null)} style={{ marginTop: "6px", fontSize: "10px", color: "var(--text-secondary)", background: "transparent", border: "1px solid var(--text-dim)", borderRadius: "4px", padding: "3px 8px", cursor: "pointer" }}>Clear override</button>
                  </div>
                ) : <>
                <div><label style={S.lbl}>Loan term (years)</label><input type="number" value={cfg.financeTerm} min={1} max={15} onChange={e => upC("financeTerm", +e.target.value)} style={S.inp} /></div>
                <div><label style={S.lbl}>Interest rate (%)</label><input type="number" step={0.1} value={cfg.financeRate} onChange={e => upC("financeRate", +e.target.value)} style={S.inp} /></div>
                </>}
                <div style={{ padding: "10px", background: "rgba(245,158,11,0.08)", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.15)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Monthly Repayment</div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#fbbf24" }}>{fmt(monthlyPmt)}/mo</div>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>Total repaid: {fmt(monthlyPmt * cfg.financeTerm * 12)}</div>
                </div>
                {/* Accelerated Repayment Toggle */}
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "8px 10px", background: accelerateRepay ? "rgba(16,185,129,0.1)" : "transparent", borderRadius: "6px", border: `1px solid ${accelerateRepay ? "#10b981" : "var(--border-light)"}`, transition: "all 0.2s" }}>
                  <input type="checkbox" checked={accelerateRepay} onChange={e => setAccelerateRepay(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "#10b981" }} />
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: accelerateRepay ? "#10b981" : "var(--text-secondary)" }}>Apply savings to repayments</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Battery savings reduce loan principal faster</div>
                  </div>
                </label>
              </div> : <div style={{ padding: "10px", background: "rgba(245,158,11,0.08)", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.15)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Upfront Payment</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "#fbbf24" }}>{fmt(netCost)}</div>
                <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>No ongoing battery payments</div>
              </div>}
            </div>
          </div>

          {!forecast ? (
            <div style={{ ...S.card, textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>&#x1F4CB;</div>
              <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Enter usage data in the Setup tab first</div>
              <button style={{ ...S.btn(true), marginTop: "12px" }} onClick={() => setTab(0)}>Go to Setup</button>
            </div>
          ) : <>
            {/* Summary Stats — Energy ROI + True ROI side by side */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
              <div style={S.stat("#34d399")}><div style={S.sL}>Energy Savings ({cfg.forecastYears}yr)</div><div style={S.sV("#34d399")}>{fmt(forecast.summary.totalEnergySav || forecast.summary.totalSav)}</div><div style={S.sS}>reduced electricity costs</div></div>
              {cfg.payType === "finance" && (
                <div style={S.stat(forecast.summary.totalSav >= 0 ? "#38bdf8" : "#f87171")}><div style={S.sL}>Net After Finance</div><div style={S.sV(forecast.summary.totalSav >= 0 ? "#38bdf8" : "#f87171")}>{fmt(forecast.summary.totalSav)}</div><div style={S.sS}>savings minus {fmt(forecast.summary.totalPmts || 0)} repayments</div></div>
              )}
              <div style={S.stat("#fbbf24")}><div style={S.sL}>Payback</div><div style={S.sV("#fbbf24")}>{forecast.summary.breakeven ? `${(forecast.summary.breakeven / 12).toFixed(1)} yrs` : `>${cfg.forecastYears}yr`}</div><div style={S.sS}>{forecast.summary.breakeven ? `Month ${forecast.summary.breakeven}` : "Not in forecast"}</div></div>
              <div style={S.stat("#a78bfa")}><div style={S.sL}>Energy ROI ({cfg.forecastYears}yr)</div><div style={S.sV("#a78bfa")}>{pct(forecast.summary.energyROI)}</div><div style={S.sS}>energy savings vs battery cost</div></div>
              {cfg.payType === "finance" && forecast.summary.totalFinanceCost > 0 && (
                <div style={S.stat(forecast.summary.trueROI >= 0 ? "#10b981" : "#f87171")}><div style={S.sL}>True ROI ({cfg.forecastYears}yr)</div><div style={S.sV(forecast.summary.trueROI >= 0 ? "#10b981" : "#f87171")}>{pct(forecast.summary.trueROI)}</div><div style={S.sS}>after {fmt(forecast.summary.totalFinanceCost)} interest</div></div>
              )}
            </div>

            {/* Accelerated Repayment Results */}
            {accelerateRepay && accelData && accelData.summary && (
              <div style={{ ...S.card, background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(52,211,153,0.05))", borderColor: "#10b98140" }}>
                <div style={S.cT}>Accelerated Repayment Impact</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <div style={S.stat("#10b981")}><div style={S.sL}>New Payoff</div><div style={S.sV("#10b981")}>{(accelData.summary.acceleratedMonths / 12).toFixed(1)} yrs</div><div style={S.sS}>was {(accelData.summary.originalMonths / 12).toFixed(1)} yrs</div></div>
                  <div style={S.stat("#34d399")}><div style={S.sL}>Months Saved</div><div style={S.sV("#34d399")}>{accelData.summary.monthsSaved}</div><div style={S.sS}>{accelData.summary.yearsSaved} years earlier</div></div>
                  <div style={S.stat("#fbbf24")}><div style={S.sL}>Interest Saved</div><div style={S.sV("#fbbf24")}>{fmt(accelData.summary.interestSaved)}</div><div style={S.sS}>of {fmt(accelData.summary.totalInterestStandard)} total</div></div>
                  <div style={S.stat("#38bdf8")}><div style={S.sL}>Extra/month</div><div style={S.sV("#38bdf8")}>{fmt(avgMonthlySavings)}</div><div style={S.sS}>avg savings applied</div></div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={(() => {
                    const maxLen = Math.max(accelData.standardSchedule.length, accelData.schedule.length);
                    return Array.from({ length: maxLen }, (_, i) => ({
                      month: i + 1,
                      'Standard': accelData.standardSchedule[i]?.balance || 0,
                      'Accelerated': accelData.schedule[i]?.balance || 0,
                    }));
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={v => v % 12 === 0 ? `Y${v / 12}` : ""} interval={11} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<TT />} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Area type="monotone" dataKey="Standard" stroke="#f87171" fill="#f8717120" strokeWidth={2} />
                    <Area type="monotone" dataKey="Accelerated" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", textAlign: "center", marginTop: "4px" }}>
                  Remaining loan balance: Standard repayment vs Accelerated (with {fmt(avgMonthlySavings)}/mo extra)
                </div>
              </div>
            )}

            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                <div style={S.cT}>Monthly Comparison</div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <button style={S.tgl(chartMode === "total")} onClick={() => setChartMode("total")}>Total Cost</button>
                  <button style={S.tgl(chartMode === "energy")} onClick={() => setChartMode("energy")}>Energy Only</button>
                  <select value={viewYr} onChange={e => setViewYr(+e.target.value)}
                    style={{ ...S.inpSm, width: "auto", padding: "5px 8px", textAlign: "left" }}>
                    {Array.from({ length: cfg.forecastYears }, (_, i) => <option key={i} value={i + 1}>Year {i + 1}</option>)}
                  </select>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={forecast.monthly.filter(d => d.year === viewYr)} barGap={2} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<TT />} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="noBattery" name="Current Bill" fill="#f87171" radius={[3, 3, 0, 0]} />
                  <Bar dataKey={chartMode === "total" ? "totalCost" : "energyOnly"}
                    name={chartMode === "total" ? "Total (energy + battery)" : "Energy Bill (w/ battery)"}
                    fill="#34d399" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: "11px", color: "var(--text-dim)", textAlign: "center", marginTop: "6px" }}>
                {chartMode === "total"
                  ? `Total includes energy bill${cfg.payType === "finance" ? " + finance" : ""}${cfg.useAmber ? " \u2212 Amber earnings + $25/mo" : ""}`
                  : "Energy Only = power bill with battery, excluding battery purchase/finance"}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cT}>Annual Summary</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={forecast.annual} barGap={2} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} />
                  <Tooltip content={<TT />} /><Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="noBattery" name="Without Battery" fill="#f87171" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="energyOnly" name="Energy (w/ battery)" fill="#34d399" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="saving" name="Net Saving" fill="#fbbf24" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={S.card}>
              <div style={S.cT}>Cumulative Savings {cfg.payType === "upfront" ? "(after upfront cost)" : "(incl. finance)"}</div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={forecast.cumData}>
                  <defs><linearGradient id="gn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} /><stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                  </linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={v => v % 12 === 0 ? `Y${v / 12}` : ""} interval={0} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return <div style={{ background: "var(--border)", border: "1px solid var(--border-light)", borderRadius: "8px", padding: "10px", fontSize: "12px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>{d.label}</div>
                      <div style={{ color: d.cumSav >= 0 ? "#34d399" : "#f87171", fontWeight: 500 }}>{d.cumSav >= 0 ? "+" : ""}{fmt(d.cumSav)}</div>
                    </div>;
                  }} />
                  <ReferenceLine y={0} stroke="#fbbf24" strokeDasharray="6 4" strokeWidth={2}
                    label={{ value: "Break Even", fill: "#fbbf24", fontSize: 11, position: "right" }} />
                  <Area type="monotone" dataKey="cumSav" stroke="#34d399" strokeWidth={2} fill="url(#gn)" />
                </AreaChart>
              </ResponsiveContainer>
              {cfg.payType === "upfront" && <div style={{ fontSize: "11px", color: "var(--text-dim)", textAlign: "center", marginTop: "4px" }}>
                Starts at \u2212{fmt(netCost)}, accumulates monthly savings until breakeven
              </div>}
            </div>

            {/* Lifetime Cost Comparison Chart */}
            {lifetimeCostData && lifetimeCostData.length > 0 && (
              <div style={S.card}>
                <div style={S.cT}>Lifetime Cost Comparison ({lifetimeCostData.length} years)</div>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={lifetimeCostData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} interval={Math.max(0, Math.floor(lifetimeCostData.length / 10) - 1)} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return <div style={{ background: "var(--border)", border: "1px solid var(--border-light)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px" }}>
                        <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>{label}</div>
                        {payload.map((p, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                          <span style={{ color: "var(--text-secondary)" }}>{p.name}:</span>
                          <span style={{ color: "var(--text)", fontWeight: 500 }}>{fmt(p.value)}</span>
                        </div>)}
                      </div>;
                    }} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Line type="monotone" dataKey="No Battery" stroke="#f87171" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Battery (Upfront)" stroke="#34d399" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Battery (Financed)" stroke="#a78bfa" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Battery (Accelerated)" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", textAlign: "center", marginTop: "6px" }}>
                  Crossover points show when battery options become cheaper than no battery. Lower is better.
                </div>
              </div>
            )}

            {/* Annual Breakdown Table with Degradation column */}
            <div style={{ ...S.card, overflowX: "auto" }}>
              <div style={S.cT}>Annual Breakdown</div>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "12px", minWidth: "600px" }}>
                <thead><tr>
                  <th style={{ ...S.th, textAlign: "left" }}>Year</th>
                  <th style={S.th}>No Battery</th>
                  <th style={S.th}>Energy Only</th>
                  {cfg.payType === "finance" && <th style={S.th}>Battery Pmt</th>}
                  <th style={S.th}>Total w/ Battery</th>
                  {cfg.payType === "finance" && <th style={S.th}>Energy Saving</th>}
                  <th style={S.th}>{cfg.payType === "finance" ? "Net Saving" : "Annual Saving"}</th>
                  <th style={{ ...S.th, color: "#fb923c" }}>Capacity</th>
                </tr></thead>
                <tbody>
                  {forecast.annual.map((a, i) => {
                    const degradPct = Math.round((1 - 0.02 * i) * 100);
                    return (
                    <tr key={i} style={{ background: i % 2 ? "var(--bg-row-alt)" : "transparent" }}>
                      <td style={{ ...S.td, fontWeight: 500, textAlign: "left" }}>{a.year}</td>
                      <td style={{ ...S.td, textAlign: "right", color: "#f87171" }}>{fmt(a.noBattery)}</td>
                      <td style={{ ...S.td, textAlign: "right", color: "#34d399" }}>{fmt(a.energyOnly)}</td>
                      {cfg.payType === "finance" && <td style={{ ...S.td, textAlign: "right", color: "#fbbf24" }}>{fmt(a.batteryPmt)}</td>}
                      <td style={{ ...S.td, textAlign: "right", color: "var(--text)", fontWeight: 500 }}>{fmt(a.totalCost)}</td>
                      {cfg.payType === "finance" && <td style={{ ...S.td, textAlign: "right" }}><span style={S.badge("#34d399")}>+{fmt(a.energySaving)}</span></td>}
                      <td style={{ ...S.td, textAlign: "right" }}><span style={S.badge(a.saving > 0 ? "#34d399" : "#f87171")}>{a.saving > 0 ? "+" : ""}{fmt(a.saving)}</span></td>
                      <td style={{ ...S.td, textAlign: "right", color: degradPct >= 90 ? "#34d399" : degradPct >= 80 ? "#fbbf24" : "#fb923c", fontSize: "11px" }}>{degradPct}%</td>
                    </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr style={{ borderTop: "2px solid var(--border)" }}>
                  <td style={{ ...S.td, fontWeight: 700, color: "#fbbf24", textAlign: "left" }}>TOTAL</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 600, color: "#f87171" }}>{fmt(forecast.summary.totalNB)}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 600, color: "#34d399" }}>{fmt(forecast.annual.reduce((s, a) => s + a.energyOnly, 0))}</td>
                  {cfg.payType === "finance" && <td style={{ ...S.td, textAlign: "right", fontWeight: 600, color: "#fbbf24" }}>{fmt(forecast.annual.reduce((s, a) => s + a.batteryPmt, 0))}</td>}
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 600, color: "var(--text)" }}>{fmt(forecast.annual.reduce((s, a) => s + a.totalCost, 0))}</td>
                  {cfg.payType === "finance" && <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}><span style={S.badge("#34d399")}>+{fmt(forecast.summary.totalEnergySav || forecast.summary.totalSav)}</span></td>}
                  <td style={{ ...S.td, textAlign: "right" }}><span style={S.badge(forecast.summary.totalSav >= 0 ? "#34d399" : "#f87171")}>{forecast.summary.totalSav >= 0 ? "+" : ""}{fmt(forecast.summary.totalSav)}</span></td>
                  <td style={{ ...S.td, textAlign: "right", color: "var(--text-muted)", fontSize: "10px" }}>\u22122%/yr</td>
                </tr></tfoot>
              </table>
            </div>

            <div style={{ ...S.card, overflowX: "auto" }}>
              <div style={S.cT}>Monthly Detail \u2014 Year {viewYr}</div>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "11px", minWidth: "550px" }}>
                <thead><tr>
                  <th style={{ ...S.th, textAlign: "left" }}>Month</th>
                  <th style={{ ...S.th, color: "#f87171" }}>Current</th>
                  <th style={{ ...S.th, color: "#34d399" }}>w/ Battery</th>
                  {cfg.payType === "finance" && <th style={{ ...S.th, color: "#fbbf24" }}>Batt Pmt</th>}
                  <th style={S.th}>Total</th>
                  {cfg.useAmber && <th style={{ ...S.th, color: "#f59e0b" }}>Amber $</th>}
                  <th style={S.th}>Saving</th>
                  <th style={{ ...S.th, color: "#fb923c" }}>Cap %</th>
                </tr></thead>
                <tbody>
                  {forecast.monthly.filter(d => d.year === viewYr).map((d, i) => (
                    <tr key={i} style={{ background: i % 2 ? "var(--bg-row-alt)" : "transparent" }}>
                      <td style={{ ...S.td, fontWeight: 500, textAlign: "left" }}>{d.label}</td>
                      <td style={{ ...S.td, textAlign: "right", color: "#f87171" }}>{fmt(d.noBattery)}</td>
                      <td style={{ ...S.td, textAlign: "right", color: "#34d399" }}>{fmt(d.energyOnly)}</td>
                      {cfg.payType === "finance" && <td style={{ ...S.td, textAlign: "right", color: "#fbbf24" }}>{fmt(d.batteryPmt)}</td>}
                      <td style={{ ...S.td, textAlign: "right", fontWeight: 500 }}>{fmt(d.totalCost)}</td>
                      {cfg.useAmber && <td style={{ ...S.td, textAlign: "right", color: "#f59e0b" }}>{d.amberBonus > 0 ? fmt(d.amberBonus) : "\u2014"}</td>}
                      <td style={{ ...S.td, textAlign: "right" }}><span style={S.badge(d.saving > 0 ? "#34d399" : "#f87171")}>{d.saving > 0 ? "+" : ""}{fmt(d.saving)}</span></td>
                      <td style={{ ...S.td, textAlign: "right", color: "#fb923c", fontSize: "10px" }}>{d.degradation}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ ...S.card, borderColor: "var(--border)" }}>
              <div style={{ ...S.cT, color: "var(--text-dim)", fontSize: "11px" }}>Assumptions</div>
              <div style={{ fontSize: "11px", color: "var(--text-dim)", lineHeight: 1.6 }}>
                <p style={{ margin: "0 0 4px" }}>Battery reduction per tariff: Peak (25-80%), Off-Peak (15-55%), Solar Sponge (variable), Feed-In export (25-65%) \u2014 seasonally adjusted for Adelaide</p>
                <p style={{ margin: "0 0 4px" }}>Battery degradation: 2% per year capacity loss applied to all savings calculations</p>
                <p style={{ margin: "0 0 4px" }}>Forecast uses your latest rate period as base, with {cfg.escalation}% annual escalation on import rates and supply charges</p>
                {rateSets.length > 1 && <p style={{ margin: "0 0 4px" }}>{rateSets.length} rate periods defined \u2014 forecast escalation starts from the most recent period's rates</p>}
                {cfg.useAmber && <>
                  <p style={{ margin: "0 0 4px" }}>Amber: wholesale FiT avg {(cfg.amberFitAvg * 100).toFixed(0)}\u00A2/kWh, {pct(cfg.amberImportDisc * 100)} import discount, $25/mo subscription included</p>
                  <p style={{ margin: "0 0 4px" }}>Amber spike earnings are estimates \u2014 actual results depend on weather, demand, and market conditions</p>
                </>}
                {cfg.payType === "finance" && <p style={{ margin: "0 0 4px" }}>True ROI accounts for total finance interest of {fmt(forecast.summary.totalFinanceCost || 0)}</p>}
                <p style={{ margin: 0 }}>This is an estimate only \u2014 not financial advice. Actual results depend on usage patterns, weather, and tariff changes.</p>
              </div>
            </div>
          </>}
    </>)}
  </>);
}
