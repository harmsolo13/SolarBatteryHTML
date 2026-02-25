/* Tab 4: Live Solar — Real-time inverter data, weather, daily costs */

function LiveSolarTab({ solarLive, solarStats, solarDaily, setSolarDaily, solarMonthly, solarHourly, solarToday, solarConnected, weatherToday, forecastData, openMeteoForecast, cfg, blendedRates, rateSets, netCost, showProviderImport, setShowProviderImport, providerImportText, setProviderImportText, providerImportStatus, setProviderImportStatus, fmt, fmt2, pct, MO, S }) {
  return (<>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0", marginBottom: "4px" }}>Live Solar Dashboard</div>
        <div style={{ fontSize: "12px", color: "#475569", marginBottom: "16px" }}>
          Real-time data from Solax {solarLive?.type || 'AL_SI4'} inverter {solarStats ? `· Collecting since ${solarStats.first_date}` : ''}
        </div>

        {!solarConnected ? (
          <div style={S.card}>
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📡</div>
              <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "6px" }}>Connecting to Inverter...</div>
              <div style={{ fontSize: "12px" }}>Make sure the Solax collector service is running and the Nexus server is accessible.</div>
            </div>
          </div>
        ) : <>
          {/* Real-time Stats Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "16px" }}>
            {[
              { label: "Total PV Power", value: `${(solarLive?.total_pv_power || 0).toLocaleString()}W`, color: "#fbbf24", icon: "☀️" },
              { label: "PV1 Power", value: `${(solarLive?.pv1_power || 0).toLocaleString()}W`, color: "#fb923c", icon: "⚡" },
              { label: "PV2 Power", value: `${(solarLive?.pv2_power || 0).toLocaleString()}W`, color: "#f97316", icon: "⚡" },
              { label: "PV1 String", value: `${solarLive?.pv1_voltage || 0}V · ${solarLive?.pv1_current || 0}A`, color: "#fb923c", icon: "🔗" },
              { label: "PV2 String", value: `${solarLive?.pv2_voltage || 0}V · ${solarLive?.pv2_current || 0}A`, color: "#f97316", icon: "🔗" },
              { label: "Grid Power", value: `${(solarLive?.grid_power || 0).toLocaleString()}W`, color: "#38bdf8", icon: "🔌" },
              { label: "Grid AC", value: `${solarLive?.grid_voltage || 0}V · ${solarLive?.grid_current || 0}A`, color: "#a78bfa", icon: "⚡" },
              { label: "Exported Power", value: `${(solarLive?.exported_power || 0).toLocaleString()}W`, color: "#34d399", icon: "📤" },
              { label: "Today's Yield", value: `${solarLive?.today_yield?.toFixed(1) || '0.0'} kWh`, color: "#38bdf8", icon: "📊" },
              { label: "Total Yield", value: `${(solarLive?.total_yield || 0).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} kWh`, color: "#818cf8", icon: "🔋" },
              { label: "Inverter Temp", value: `${solarLive?.inverter_temp || 0}°C`, color: solarLive?.inverter_temp > 60 ? "#f87171" : "#34d399", icon: "🌡️" },
              { label: "Status", value: solarLive?.status == 2 ? "Generating" : solarLive?.status == 0 ? "Standby" : `Code ${solarLive?.status}`, color: solarLive?.status == 2 ? "#34d399" : "#fbbf24", icon: "✅" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "16px", marginBottom: "4px" }}>{s.icon}</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Today's ROI Estimate */}
          {(() => {
            const todayKwh = solarLive?.today_yield || 0;
            const latestRate = rateSets.length > 0 ? rateSets[rateSets.length - 1] : null;
            const feedInRate = latestRate ? latestRate.feedIn : 0.055;
            const peakRate = latestRate ? latestRate.peak : 0.49;
            const offPkRate = latestRate ? latestRate.offPk : 0.34;
            const avgImportRate = (peakRate + offPkRate) / 2;
            const selfConsumptionPct = 0.6; // estimate 60% self-consumed
            const selfConsumedValue = todayKwh * selfConsumptionPct * avgImportRate;
            const exportedValue = todayKwh * (1 - selfConsumptionPct) * feedInRate;
            const todayValue = selfConsumedValue + exportedValue;
            const dailyCostTarget = netCost / (cfg.forecastYears * 365); // payback target per day based on forecast period
            return (
              <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(245,158,11,0.08))", border: "1px solid #1e3a5f", borderRadius: "10px", padding: "16px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Today's Estimated Value</div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: "#34d399" }}>{fmt2(todayValue)}</div>
                  <div style={{ fontSize: "10px", color: "#475569" }}>{todayKwh.toFixed(1)} kWh × est. rates</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Self-Consumed</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "#fbbf24" }}>{fmt2(selfConsumedValue)}</div>
                  <div style={{ fontSize: "10px", color: "#475569" }}>{(todayKwh * selfConsumptionPct).toFixed(1)} kWh @ avg {fmt2(avgImportRate)}/kWh</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Exported</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "#38bdf8" }}>{fmt2(exportedValue)}</div>
                  <div style={{ fontSize: "10px", color: "#475569" }}>{(todayKwh * (1 - selfConsumptionPct)).toFixed(1)} kWh @ {fmt2(feedInRate)}/kWh</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Payback Progress</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: todayValue >= dailyCostTarget ? "#34d399" : "#fb923c" }}>
                    {todayValue >= dailyCostTarget ? "On Track" : "Below Target"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#475569" }}>Need {fmt2(dailyCostTarget)}/day for {cfg.forecastYears}yr payback</div>
                </div>
              </div>
            );
          })()}

          {/* PV Power Gauge */}
          {(() => {
            const maxPV = (cfg.solarCapacity || 5) * 1000; // Actual solar system capacity
            const currentPV = solarLive?.total_pv_power || 0;
            const pct = Math.min((currentPV / maxPV) * 100, 100);
            const barColor = pct > 80 ? "#34d399" : pct > 50 ? "#fbbf24" : pct > 20 ? "#fb923c" : "#64748b";
            return (
              <div style={S.card}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", marginBottom: "8px" }}>System Output</div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <div style={{ background: "#1e293b", borderRadius: "8px", height: "24px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${barColor}88, ${barColor})`, borderRadius: "8px", transition: "width 1s ease" }}></div>
                    </div>
                    <div style={{ position: "absolute", top: "50%", left: `${Math.max(pct, 3)}%`, transform: "translateY(-50%)", fontSize: "11px", fontWeight: 700, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)", paddingLeft: "6px", whiteSpace: "nowrap" }}>{currentPV.toLocaleString()}W</div>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: barColor, minWidth: "80px", textAlign: "right" }}>{pct.toFixed(0)}% capacity</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "10px", color: "#475569" }}>
                  <span>0W</span>
                  <span>{(maxPV / 2).toLocaleString()}W</span>
                  <span>{maxPV.toLocaleString()}W</span>
                </div>
              </div>
            );
          })()}

          {/* Forecast vs Actual Rating — prefers Open-Meteo, falls back to BOM */}
          {(() => {
            // Prefer Open-Meteo data, fall back to legacy forecastData
            const todayStr = localDateStr();
            const meteoToday = openMeteoForecast?.find(d => d.date === todayStr);
            const legacyToday = forecastData?.find(d => d.date === todayStr) || forecastData?.[0];
            const todayPred = meteoToday || legacyToday;
            if (!todayPred && !weatherToday) return null;
            if (!todayPred) return null;

            const isOpenMeteo = !!meteoToday;
            const condition = todayPred.condition || weatherToday?.current?.condition || 'unknown';
            const currentCondition = weatherToday?.current?.condition || null;
            const multiplier = todayPred.solarMultiplier || BOM_CONDITION_TO_SOLAR[condition] || 0.5;
            const weatherMult = todayPred.weatherMultiplier || BOM_CONDITION_TO_SOLAR[condition] || 0.5;
            const seasonalMult = todayPred.seasonalMultiplier || (SEA.feedIn[new Date().getMonth()] || 1.0);
            const predictedFullDay = todayPred.predictedSolarKwh || 0;
            const predictedFillPct = todayPred.fillPct || 0;
            const predictedPerformance = todayPred.performance || 'Unknown';
            const actualYield = solarLive?.today_yield || 0;

            // Time-of-day adjustment using sine curve
            const now = new Date();
            const hour = now.getHours() + now.getMinutes() / 60;
            const month = now.getMonth();
            const sunrise = [6.0, 6.5, 7.0, 6.5, 7.0, 7.2, 7.0, 6.5, 6.0, 5.5, 5.5, 5.8][month];
            const sunset = [20.5, 20.0, 19.0, 17.5, 17.0, 17.0, 17.2, 17.8, 18.5, 19.2, 20.0, 20.5][month];
            let expectedFraction = 0;
            if (hour >= sunset) expectedFraction = 1.0;
            else if (hour > sunrise) {
              const progress = (hour - sunrise) / (sunset - sunrise);
              expectedFraction = (1 - Math.cos(Math.PI * progress)) / 2;
            }

            const predictedByNow = predictedFullDay * expectedFraction;
            const accuracy = predictedByNow > 0.5 ? (actualYield / predictedByNow) * 100 : 0;
            const isBefore6am = hour < sunrise;

            let ratingLabel, ratingColor, ratingIcon;
            if (isBefore6am) {
              ratingLabel = "Pre-Dawn"; ratingColor = "#475569"; ratingIcon = "🌙";
            } else if (accuracy >= 110) {
              ratingLabel = "Exceeding"; ratingColor = "#34d399"; ratingIcon = "🚀";
            } else if (accuracy >= 90) {
              ratingLabel = "On Track"; ratingColor = "#34d399"; ratingIcon = "✅";
            } else if (accuracy >= 70) {
              ratingLabel = "Slightly Below"; ratingColor = "#fbbf24"; ratingIcon = "⚠️";
            } else if (accuracy >= 50) {
              ratingLabel = "Below Forecast"; ratingColor = "#fb923c"; ratingIcon = "📉";
            } else {
              ratingLabel = "Well Below"; ratingColor = "#f87171"; ratingIcon = "❌";
            }

            let modelNote = "";
            if (!isBefore6am && expectedFraction > 0.3) {
              const source = isOpenMeteo ? 'Open-Meteo radiation' : 'BOM condition';
              if (accuracy > 130) modelNote = source + " model underestimating — actual generation exceeding predictions for '" + condition + "'.";
              else if (accuracy > 110) modelNote = source + " model slightly conservative for '" + condition + "' conditions.";
              else if (accuracy >= 85) modelNote = source + " model well calibrated for '" + condition + "'" + (isOpenMeteo && todayPred.radiationMJ ? " (" + todayPred.radiationMJ.toFixed(1) + " MJ/m²)" : "") + ".";
              else if (accuracy >= 60) modelNote = source + " model overestimating for '" + condition + "' conditions.";
              else modelNote = "Significant deviation — check for shading, panel issues, or intermittent cloud.";
            }

            return (
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#e2e8f0" }}>Forecast vs Actual</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>{isOpenMeteo ? 'Open-Meteo Radiation Model' : 'BOM Weather Model'}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                {/* Weather condition */}
                <div style={{ background: "#0a0f1a", borderRadius: "8px", padding: "12px", textAlign: "center", border: "1px solid #1e293b" }}>
                  <div style={{ fontSize: "28px", marginBottom: "4px" }}>{getConditionIcon(condition)}</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>{condition.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                  {currentCondition && currentCondition !== condition && (
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>Now: {currentCondition.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                  )}
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>Weather: {(weatherMult * 100).toFixed(0)}% · Season: {(seasonalMult * 100).toFixed(0)}%</div>
                  {todayPred.tempMax && <div style={{ fontSize: "10px", color: "#64748b" }}>{todayPred.tempMax}°/{todayPred.tempMin}° · {todayPred.rainChance || 0}% rain</div>}
                </div>

                {/* Predicted vs Actual kWh */}
                <div style={{ background: "#0a0f1a", borderRadius: "8px", padding: "12px", textAlign: "center", border: "1px solid #1e293b" }}>
                  <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "6px" }}>Predicted by now</div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#94a3b8" }}>{predictedByNow.toFixed(1)} kWh</div>
                  <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>of {predictedFullDay} kWh full day</div>
                  <div style={{ fontSize: "10px", color: "#475569" }}>({(expectedFraction * 100).toFixed(0)}% of solar window)</div>
                </div>

                {/* Accuracy rating */}
                <div style={{ background: "#0a0f1a", borderRadius: "8px", padding: "12px", textAlign: "center", border: `1px solid ${ratingColor}33` }}>
                  <div style={{ fontSize: "22px", marginBottom: "2px" }}>{ratingIcon}</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: ratingColor }}>{ratingLabel}</div>
                  {!isBefore6am && <div style={{ fontSize: "22px", fontWeight: 700, color: ratingColor, marginTop: "2px" }}>{accuracy.toFixed(0)}%</div>}
                  <div style={{ fontSize: "10px", color: "#475569" }}>accuracy score</div>
                </div>
              </div>

              {/* Battery prediction from model */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                <div style={{ background: "#0a0f1a", borderRadius: "6px", padding: "8px", textAlign: "center", border: "1px solid #1e293b" }}>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>Predicted Battery Fill</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: predictedFillPct >= 95 ? "#34d399" : predictedFillPct >= 75 ? "#fbbf24" : "#fb923c" }}>{predictedFillPct}%</div>
                </div>
                <div style={{ background: "#0a0f1a", borderRadius: "6px", padding: "8px", textAlign: "center", border: "1px solid #1e293b" }}>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>Model Rating</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: predictedPerformance === 'Excellent' ? "#34d399" : predictedPerformance === 'Good' ? "#fbbf24" : "#fb923c" }}>{predictedPerformance}</div>
                </div>
                <div style={{ background: "#0a0f1a", borderRadius: "6px", padding: "8px", textAlign: "center", border: "1px solid #1e293b" }}>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>Actual Yield</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#fb923c" }}>{actualYield.toFixed(1)} kWh</div>
                </div>
              </div>

              {/* Progress bar: Actual vs Predicted */}
              <div style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                  <span style={{ color: "#fb923c" }}>Actual: {actualYield.toFixed(1)} kWh</span>
                  <span style={{ color: "#94a3b8" }}>Predicted: {predictedByNow.toFixed(1)} kWh</span>
                </div>
                <div style={{ position: "relative", background: "#1e293b", borderRadius: "8px", height: "20px", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: `${Math.min((predictedByNow / Math.max(predictedFullDay, 0.1)) * 100, 100)}%`, top: 0, bottom: 0, width: "2px", background: "#94a3b8", zIndex: 2 }}></div>
                  <div style={{
                    width: `${Math.min((actualYield / Math.max(predictedFullDay, 0.1)) * 100, 100)}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${ratingColor}88, ${ratingColor})`,
                    borderRadius: "8px",
                    transition: "width 1s ease"
                  }}></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#475569", marginTop: "2px" }}>
                  <span>0 kWh</span>
                  <span>Full day: {predictedFullDay} kWh</span>
                </div>
              </div>

              {/* Model calibration note */}
              {modelNote && (
                <div style={{ fontSize: "11px", color: "#94a3b8", padding: "8px 10px", background: "#0a0f1a", borderRadius: "6px", borderLeft: `3px solid ${ratingColor}` }}>
                  {modelNote}
                </div>
              )}
            </div>
            );
          })()}

          {/* Today's Power Curve (Solax-style) with Forecast overlay */}
          {(() => {
            // Use raw 5-min readings for smooth curve, fall back to hourly aggregates
            const hasRaw = solarToday.length > 0;
            const chartData = hasRaw
              ? solarToday.map(r => ({
                  time: r.timestamp?.slice(11, 16) || '',
                  solar: r.total_pv_power || 0,
                  grid: r.grid_power || 0,
                  exported: r.exported_power || 0,
                }))
              : solarHourly.map(h => ({
                  time: `${String(h.hour).padStart(2, '0')}:00`,
                  solar: Math.round(h.avg_power || 0),
                  grid: Math.round(h.avg_grid || 0),
                  exported: Math.round(h.avg_export || 0),
                }));
            if (chartData.length === 0) return null;

            // Build forecast power curve using sine model + BOM weather
            const _month = new Date().getMonth();
            const _sunrise = [6.0, 6.5, 7.0, 6.5, 7.0, 7.2, 7.0, 6.5, 6.0, 5.5, 5.5, 5.8][_month];
            const _sunset = [20.5, 20.0, 19.0, 17.5, 17.0, 17.0, 17.2, 17.8, 18.5, 19.2, 20.0, 20.5][_month];
            const _todayStr = localDateStr();
            // Prefer Open-Meteo, fall back to legacy BOM forecastData
            const _meteoToday = openMeteoForecast?.find(d => d.date === _todayStr);
            const _todayPred = _meteoToday || forecastData?.find(d => d.date === _todayStr) || forecastData?.[0];
            const _predictedKwh = parseFloat(_todayPred?.predictedSolarKwh || 0);
            const _solarWindow = _sunset - _sunrise;
            // P_peak such that integral of sine curve = predicted kWh: P_peak = kWh * 1000 * π / (2 * hours)
            const _peakW = _predictedKwh > 0 ? Math.min((_predictedKwh * 1000 * Math.PI) / (2 * _solarWindow), (cfg.solarCapacity || 5) * 1000) : 0;
            const hasForecast = _peakW > 0;

            const forecastAt = (timeStr) => {
              const p = timeStr.split(':');
              const hr = parseInt(p[0]) + parseInt(p[1]) / 60;
              if (hr < _sunrise || hr > _sunset) return 0;
              return Math.round(_peakW * Math.sin(Math.PI * (hr - _sunrise) / _solarWindow));
            };

            // Add forecast value to each actual data point
            if (hasForecast) {
              chartData.forEach(d => { d.forecast = forecastAt(d.time); });
              // Append future forecast-only points (5-min intervals from last reading to sunset)
              const lastTime = chartData[chartData.length - 1]?.time;
              if (lastTime) {
                const lp = lastTime.split(':');
                let nextMin = parseInt(lp[0]) * 60 + parseInt(lp[1]) + 5;
                const endMin = Math.ceil(_sunset * 60);
                while (nextMin <= endMin) {
                  const hh = Math.floor(nextMin / 60);
                  const mm = nextMin % 60;
                  const ts = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
                  chartData.push({ time: ts, solar: null, grid: null, exported: null, forecast: forecastAt(ts) });
                  nextMin += 5;
                }
              }
            }

            const maxPower = Math.max(...chartData.map(d => Math.max(d.solar || 0, d.grid || 0, d.forecast || 0)), 1000);
            const yMax = Math.ceil(maxPower / 1000) * 1000;
            return (
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#fb923c" }}>Power</div>
                </div>
                <div style={{ display: "flex", gap: "16px", fontSize: "11px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width: "10px", height: "10px", background: "#fb923c", borderRadius: "2px", display: "inline-block" }}></span> Solar Power</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width: "10px", height: "10px", background: "#34d399", borderRadius: "2px", display: "inline-block" }}></span> Grid Power</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width: "10px", height: "10px", background: "#38bdf8", borderRadius: "2px", display: "inline-block" }}></span> Exported</span>
                  {hasForecast && <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width: "10px", height: "3px", background: "#f59e0b", borderTop: "2px dashed #f59e0b", display: "inline-block" }}></span> Forecast ({_predictedKwh} kWh)</span>}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradSolar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb923c" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#fb923c" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gradGrid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradExport" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="time"
                    stroke="#475569"
                    fontSize={10}
                    interval={Math.max(Math.floor(chartData.length / 12), 1)}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={10}
                    domain={[0, yMax]}
                    tickFormatter={v => `${v.toLocaleString()}W`}
                    width={65}
                  />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px", color: "#e2e8f0" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
                    formatter={(value, name) => {
                      if (value === null || value === undefined) return ['-', name];
                      return [`${Number(value).toLocaleString()}W`, name];
                    }}
                  />
                  {hasForecast && <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />}
                  <Area type="monotone" dataKey="solar" name="Solar Power" stroke="#fb923c" fill="url(#gradSolar)" strokeWidth={2} dot={false} connectNulls={false} />
                  <Area type="monotone" dataKey="grid" name="Grid Power" stroke="#34d399" fill="url(#gradGrid)" strokeWidth={1.5} dot={false} connectNulls={false} />
                  <Area type="monotone" dataKey="exported" name="Exported" stroke="#38bdf8" fill="url(#gradExport)" strokeWidth={1.5} dot={false} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            );
          })()}

          {/* Daily Energy Overview */}
          {solarDaily.length > 0 && (
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>Daily Energy Overview</div>
                <button onClick={() => setShowProviderImport(true)} style={{
                  background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: "6px",
                  padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontWeight: 500
                }}>Import Provider Data</button>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={solarDaily.map(d => {
                  const consumed = parseFloat(d.grid_consumed_kwh || 0);
                  const feedin = parseFloat(d.feed_in_kwh || 0);
                  const hasProvider = consumed > 0 || feedin > 0;
                  const importCost = hasProvider ? consumed * blendedRates.blendedImport : null;
                  const feedinCredit = hasProvider ? feedin * blendedRates.feedInRate : null;
                  const netCostDay = hasProvider ? importCost - feedinCredit + blendedRates.supplyDaily : null;
                  return {
                    date: d.date?.slice(5) || '',
                    fullDate: d.date || '',
                    yield: parseFloat(d.total_yield_kwh || 0),
                    consumed, feedin,
                    selfUsed: parseFloat(d.self_consumed_kwh || 0),
                    importCost, feedinCredit, netCostDay,
                  };
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} />
                  <YAxis stroke="#475569" fontSize={10} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px", color: "#e2e8f0" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "10px", fontSize: "12px", color: "#e2e8f0" }}>
                          <div style={{ fontWeight: 600, color: "#94a3b8", marginBottom: "6px" }}>{d?.fullDate || label}</div>
                          {payload.filter(p => p.value > 0).map((p, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "2px" }}>
                              <span style={{ color: p.color }}>{p.name}</span>
                              <span>{parseFloat(p.value || 0).toFixed(1)} kWh</span>
                            </div>
                          ))}
                          {d?.selfUsed > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "2px" }}>
                              <span style={{ color: "#a78bfa" }}>Self-Consumed</span>
                              <span>{d.selfUsed.toFixed(1)} kWh</span>
                            </div>
                          )}
                          {d?.netCostDay != null && (
                            <div style={{ borderTop: "1px solid #334155", marginTop: "6px", paddingTop: "6px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", color: "#f87171" }}>
                                <span>Import Cost</span><span>${d.importCost?.toFixed(2)}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", color: "#34d399" }}>
                                <span>Feed-in Credit</span><span>-${d.feedinCredit?.toFixed(2)}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", color: "#64748b", fontSize: "10px" }}>
                                <span>Supply</span><span>${blendedRates.supplyDaily.toFixed(2)}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", fontWeight: 700, color: d.netCostDay >= 0 ? "#f87171" : "#34d399", marginTop: "4px" }}>
                                <span>Net Daily Cost</span><span>{d.netCostDay >= 0 ? '' : '-'}${Math.abs(d.netCostDay).toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="yield" name="Solar Generated" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="consumed" name="Grid Import" fill="#f87171" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="feedin" name="Feed-in Export" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* Cost Summary Row */}
              {(() => {
                const withCosts = solarDaily.filter(d => parseFloat(d.grid_consumed_kwh || 0) > 0);
                if (withCosts.length === 0) return null;
                const totalImport = withCosts.reduce((s, d) => s + parseFloat(d.grid_consumed_kwh || 0) * blendedRates.blendedImport, 0);
                const totalFeedin = withCosts.reduce((s, d) => s + parseFloat(d.feed_in_kwh || 0) * blendedRates.feedInRate, 0);
                const totalSupply = withCosts.length * blendedRates.supplyDaily;
                const totalNet = totalImport - totalFeedin + totalSupply;
                const avgDaily = totalNet / withCosts.length;
                return (
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px", fontSize: "12px" }}>
                    {[
                      { label: `Import Cost (${withCosts.length}d)`, value: `$${totalImport.toFixed(2)}`, color: "#f87171" },
                      { label: "Feed-in Credit", value: `-$${totalFeedin.toFixed(2)}`, color: "#34d399" },
                      { label: `Supply (${withCosts.length}d)`, value: `$${totalSupply.toFixed(2)}`, color: "#94a3b8" },
                      { label: "Net Cost", value: `$${totalNet.toFixed(2)}`, color: totalNet >= 0 ? "#f87171" : "#34d399" },
                      { label: "Avg Daily", value: `$${avgDaily.toFixed(2)}/day`, color: "#fbbf24" },
                    ].map((s, i) => (
                      <div key={i} style={{ flex: "1 1 100px", background: "#1e293b", borderRadius: "6px", padding: "8px", textAlign: "center" }}>
                        <div style={{ color: "#64748b", fontSize: "10px" }}>{s.label}</div>
                        <div style={{ color: s.color, fontWeight: 700 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Provider Data Import Modal */}
          {showProviderImport && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={e => { if (e.target === e.currentTarget) setShowProviderImport(false); }}>
              <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "min(560px, 90vw)", maxHeight: "80vh", overflow: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#e2e8f0" }}>Import Provider Data</div>
                  <button onClick={() => setShowProviderImport(false)} style={{ background: "none", border: "none", color: "#64748b", fontSize: "20px", cursor: "pointer" }}>x</button>
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
                  Paste your energy provider data below. One day per line.<br/>
                  Format: <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>date consumed feedin</span> (separated by spaces, tabs, or commas)<br/>
                  Date formats: <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>2026-02-01</span> or <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>1/2/2026</span> or <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>1st Feb</span> etc.
                </div>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "12px", background: "#1e293b", borderRadius: "6px", padding: "8px", fontFamily: "monospace" }}>
                  Example:<br/>
                  2026-02-01 27.918 23.05<br/>
                  2026-02-02 34.032 17.719<br/>
                  2026-02-03, 37.386, 16.477
                </div>
                <textarea
                  value={providerImportText}
                  onChange={e => setProviderImportText(e.target.value)}
                  placeholder="Paste provider data here..."
                  style={{
                    width: "100%", height: "200px", background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155",
                    borderRadius: "8px", padding: "12px", fontSize: "12px", fontFamily: "monospace", resize: "vertical",
                    boxSizing: "border-box"
                  }}
                />
                {providerImportStatus && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: providerImportStatus.error ? "#f87171" : "#34d399" }}>
                    {providerImportStatus.error || providerImportStatus.message}
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "flex-end" }}>
                  <button onClick={() => { setShowProviderImport(false); setProviderImportStatus(null); }} style={{
                    background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: "6px",
                    padding: "8px 16px", fontSize: "12px", cursor: "pointer"
                  }}>Cancel</button>
                  <button onClick={async () => {
                    setProviderImportStatus(null);
                    const lines = providerImportText.trim().split('\n').filter(l => l.trim());
                    if (!lines.length) { setProviderImportStatus({ error: 'No data to import' }); return; }

                    const currentYear = new Date().getFullYear();
                    const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

                    const rows = [];
                    const errors = [];
                    lines.forEach((line, i) => {
                      // Normalize separators: replace tabs and commas with spaces, collapse multiple spaces
                      const clean = line.replace(/[,\t]+/g, ' ').replace(/\s+/g, ' ').trim();
                      // Try to extract: flexible date + two numbers
                      // Remove ordinal suffixes (1st, 2nd, 3rd, 4th etc)
                      const noOrd = clean.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1');
                      const parts = noOrd.split(' ');

                      // Find the two numbers (consumed, feedin) - they'll be the last two numeric parts
                      const nums = [];
                      const dateParts = [];
                      parts.forEach(p => {
                        const n = parseFloat(p);
                        if (!isNaN(n) && p.match(/^\d+\.?\d*$/)) nums.push(n);
                        else dateParts.push(p);
                      });

                      if (nums.length < 2) { errors.push(`Line ${i+1}: need at least 2 numbers (consumed, feedin)`); return; }

                      // Last two numbers are consumed and feedin; any leading number might be a day
                      let consumed, feedin, dayNum;
                      if (nums.length >= 3) {
                        dayNum = nums[0]; consumed = nums[1]; feedin = nums[2];
                      } else {
                        consumed = nums[0]; feedin = nums[1];
                      }

                      // Parse date from dateParts + optional dayNum
                      let dateStr = '';
                      const dateJoined = dateParts.join(' ').toLowerCase().trim();

                      if (dateJoined.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
                        // ISO format: 2026-02-01
                        const [y, m, d] = dateJoined.split('-');
                        dateStr = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
                      } else if (dateJoined.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                        // D/M/YYYY
                        const [d, m, y] = dateJoined.split('/');
                        dateStr = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
                      } else if (dateJoined.match(/^\d{1,2}\/\d{1,2}$/)) {
                        // D/M (assume current year)
                        const [d, m] = dateJoined.split('/');
                        dateStr = `${currentYear}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
                      } else {
                        // Try month name: "Feb" or "February" with a day number
                        const monthMatch = monthNames.findIndex(mn => dateJoined.includes(mn));
                        if (monthMatch >= 0 && dayNum) {
                          dateStr = `${currentYear}-${String(monthMatch+1).padStart(2,'0')}-${String(Math.round(dayNum)).padStart(2,'0')}`;
                        } else if (monthMatch >= 0) {
                          // Try to find a day number in dateParts
                          const dayInDate = dateJoined.match(/\d+/);
                          if (dayInDate) {
                            dateStr = `${currentYear}-${String(monthMatch+1).padStart(2,'0')}-${String(dayInDate[0]).padStart(2,'0')}`;
                          }
                        }
                      }

                      if (!dateStr) { errors.push(`Line ${i+1}: couldn't parse date from "${line.trim()}"`); return; }
                      rows.push({ date: dateStr, consumed, feedin });
                    });

                    if (rows.length === 0) {
                      setProviderImportStatus({ error: errors.length ? errors.join('; ') : 'No valid rows found' });
                      return;
                    }

                    try {
                      const resp = await fetch(`${SOLAR_API_URL}/provider-import`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rows })
                      });
                      const result = await resp.json();
                      if (result.success) {
                        const msg = `Imported ${result.total} days (${result.imported} new, ${result.updated} updated)`;
                        setProviderImportStatus({ message: msg + (errors.length ? `. Warnings: ${errors.join('; ')}` : '') });
                        // Refresh solar daily data
                        const dailyResp = await fetch(`${SOLAR_API_URL}/daily?days=90`);
                        if (dailyResp.ok) { const d = await dailyResp.json(); setSolarDaily(d.data || []); }
                      } else {
                        setProviderImportStatus({ error: result.error || 'Import failed' });
                      }
                    } catch (e) {
                      setProviderImportStatus({ error: `Request failed: ${e.message}` });
                    }
                  }} style={{
                    background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px",
                    padding: "8px 20px", fontSize: "12px", cursor: "pointer", fontWeight: 600
                  }}>Import</button>
                </div>
              </div>
            </div>
          )}

          {/* Battery Savings Simulation */}
          {(() => {
            const daysWithProvider = solarDaily.filter(d => parseFloat(d.grid_consumed_kwh || 0) > 0);
            if (daysWithProvider.length < 2) return null;

            const bCap = cfg.usableCapacity;
            const bEff = (cfg.inverterEfficiency || 97.5) / 100;

            const simData = daysWithProvider.map(d => {
              const consumed = parseFloat(d.grid_consumed_kwh || 0);
              const feedin = parseFloat(d.feed_in_kwh || 0);

              // Without battery
              const costWithout = consumed * blendedRates.blendedImport - feedin * blendedRates.feedInRate + blendedRates.supplyDaily;

              // With battery: charge from excess solar (what would have been exported)
              const batteryCharge = Math.min(feedin, bCap);
              const batteryDischarge = batteryCharge * bEff;
              const newGridImport = Math.max(0, consumed - batteryDischarge);
              const newFeedin = Math.max(0, feedin - batteryCharge);

              const costWith = newGridImport * blendedRates.blendedImport - newFeedin * blendedRates.feedInRate + blendedRates.supplyDaily;

              return {
                date: d.date?.slice(5) || '',
                fullDate: d.date || '',
                costWithout: Math.round(costWithout * 100) / 100,
                costWith: Math.round(costWith * 100) / 100,
                savings: Math.round((costWithout - costWith) * 100) / 100,
                consumed, feedin,
                batteryCharge: Math.round(batteryCharge * 10) / 10,
                batteryDischarge: Math.round(batteryDischarge * 10) / 10,
                newGridImport: Math.round(newGridImport * 10) / 10,
                newFeedin: Math.round(newFeedin * 10) / 10,
              };
            });

            const totalSavings = simData.reduce((s, d) => s + d.savings, 0);
            const avgDailySavings = totalSavings / simData.length;
            const projectedAnnual = avgDailySavings * 365;
            const paybackYears = projectedAnnual > 0 ? netCost / projectedAnnual : Infinity;
            const totalWithout = simData.reduce((s, d) => s + d.costWithout, 0);
            const savingsPct = totalWithout > 0 ? (totalSavings / totalWithout) * 100 : 0;

            return (
              <div style={S.card}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", marginBottom: "4px" }}>Battery Savings Simulation</div>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "12px" }}>
                  Simulated impact of {cfg.batteryModel || 'battery'} ({bCap} kWh usable, {(bEff * 100).toFixed(1)}% eff.) on your actual energy costs
                </div>

                {/* Summary Stats */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <div style={S.stat("#34d399")}><div style={S.sL}>Total Savings ({simData.length}d)</div><div style={S.sV("#34d399")}>${totalSavings.toFixed(2)}</div><div style={S.sS}>{savingsPct.toFixed(0)}% cost reduction</div></div>
                  <div style={S.stat("#fbbf24")}><div style={S.sL}>Avg Daily Savings</div><div style={S.sV("#fbbf24")}>${avgDailySavings.toFixed(2)}</div><div style={S.sS}>per day</div></div>
                  <div style={S.stat("#38bdf8")}><div style={S.sL}>Projected Annual</div><div style={S.sV("#38bdf8")}>${Math.round(projectedAnnual).toLocaleString()}</div><div style={S.sS}>estimated yearly savings</div></div>
                  <div style={S.stat("#f59e0b")}><div style={S.sL}>Simple Payback</div><div style={S.sV("#f59e0b")}>{paybackYears < 100 ? `${paybackYears.toFixed(1)} yrs` : 'N/A'}</div><div style={S.sS}>at {fmt(netCost)} net cost</div></div>
                </div>

                {/* Grouped Bar Chart: Without vs With Battery */}
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={simData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#475569" fontSize={10} />
                    <YAxis stroke="#475569" fontSize={10} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "10px", fontSize: "12px", color: "#e2e8f0" }}>
                            <div style={{ fontWeight: 600, color: "#94a3b8", marginBottom: "6px" }}>{d?.fullDate || label}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "2px" }}>
                              <span style={{ color: "#f87171" }}>Without Battery</span><span>${d?.costWithout?.toFixed(2)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "2px" }}>
                              <span style={{ color: "#38bdf8" }}>With Battery</span><span>${d?.costWith?.toFixed(2)}</span>
                            </div>
                            <div style={{ borderTop: "1px solid #334155", marginTop: "4px", paddingTop: "4px", display: "flex", justifyContent: "space-between", gap: "16px", fontWeight: 700, color: "#34d399" }}>
                              <span>Daily Savings</span><span>${d?.savings?.toFixed(2)}</span>
                            </div>
                            <div style={{ fontSize: "10px", color: "#475569", marginTop: "6px" }}>
                              Battery: stored {d?.batteryCharge} kWh, discharged {d?.batteryDischarge} kWh
                            </div>
                            <div style={{ fontSize: "10px", color: "#475569" }}>
                              Grid: {d?.consumed?.toFixed(1)} → {d?.newGridImport} kWh | Export: {d?.feedin?.toFixed(1)} → {d?.newFeedin} kWh
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="costWithout" name="Without Battery" fill="#f87171" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="costWith" name="With Battery" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div style={{ fontSize: "10px", color: "#475569", marginTop: "6px", textAlign: "center" }}>
                  Blended import rate: ${blendedRates.blendedImport.toFixed(4)}/kWh (40% peak + 45% off-peak + 15% CL, incl. {rateSets[rateSets.length-1].disc}% discount + GST) | Feed-in: ${blendedRates.feedInRate.toFixed(3)}/kWh
                </div>
              </div>
            );
          })()}

          {/* Monthly Summary */}
          {solarMonthly.length > 0 && (
            <div style={S.card}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", marginBottom: "8px" }}>Monthly Summary</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #334155" }}>
                      {["Month", "Total kWh", "Avg Daily", "Best Day", "Peak Day", "Days", "Avg Peak W"].map(h => (
                        <th key={h} style={{ padding: "8px 6px", color: "#94a3b8", fontWeight: 600, textAlign: "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {solarMonthly.map((m, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "6px", color: "#e2e8f0", fontWeight: 500 }}>{m.month}</td>
                        <td style={{ padding: "6px", color: "#38bdf8" }}>{(m.total_yield_kwh || 0).toFixed(1)}</td>
                        <td style={{ padding: "6px", color: "#34d399" }}>{(m.avg_daily_kwh || 0).toFixed(1)}</td>
                        <td style={{ padding: "6px", color: "#fbbf24" }}>{(m.peak_day_kwh || 0).toFixed(1)}</td>
                        <td style={{ padding: "6px", color: "#94a3b8" }}>{m.peak_day_date || '-'}</td>
                        <td style={{ padding: "6px", color: "#94a3b8" }}>{m.days_with_data || 0}</td>
                        <td style={{ padding: "6px", color: "#fb923c" }}>{(m.avg_peak_power_w || 0).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* System Info */}
          {solarStats && (
            <div style={S.card}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", marginBottom: "8px" }}>System Information</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px", fontSize: "12px" }}>
                {[
                  { label: "Inverter Model", value: solarLive?.type || "Solax AL_SI4" },
                  { label: "Serial Number", value: solarLive?.sn || "N/A" },
                  { label: "Inverter IP", value: solarStats.inverter_ip || "192.168.68.55" },
                  { label: "Collector Status", value: solarStats.collector_status || "unknown" },
                  { label: "Total Readings", value: (solarStats.total_readings || 0).toLocaleString() },
                  { label: "Days Collected", value: solarStats.days_collected || 0 },
                  { label: "Lifetime Yield", value: `${(solarLive?.total_yield || 0).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} kWh` },
                  { label: "Last Update", value: solarLive?.timestamp || "N/A" },
                ].map((info, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e293b" }}>
                    <span style={{ color: "#64748b" }}>{info.label}</span>
                    <span style={{ color: "#e2e8f0", fontWeight: 500 }}>{info.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>}
  </>);
}
