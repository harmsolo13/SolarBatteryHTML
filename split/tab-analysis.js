/* Tab 2: Performance — Historical ROI data, charts, daily explorer */

function AnalysisTab({ historicalData, historicalLoading, historicalError, analysisSubView, setAnalysisSubView, selectedDate, setSelectedDate, viewMode, setViewMode, roiMode, purchaseDate, cfg, netCost, monthlyPmt, forecast, financeOverride, annualBill, blendedRates, fmt, fmt2, pct, MO, liveDataLoaded, liveMonthCount }) {
  const [dateRange, setDateRange] = React.useState('all');
  return (<>
          {/* Sub-navigation pills */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
            {[
              { key: 'monthly', label: 'Monthly Overview' },
              { key: 'daily', label: 'Daily Explorer' },
            ].map(v => (
              <button key={v.key} onClick={() => setAnalysisSubView(v.key)}
                style={{ padding: "7px 16px", borderRadius: "20px", border: analysisSubView === v.key ? "1px solid #f59e0b" : "1px solid #334155",
                  background: analysisSubView === v.key ? "rgba(245,158,11,0.15)" : "transparent",
                  color: analysisSubView === v.key ? "#fbbf24" : "#94a3b8", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                {v.label}
              </button>
            ))}
          </div>

          {analysisSubView === 'monthly' && <>
          {historicalLoading && (
            <div style={{ ...S.card, textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>⏳</div>
              <div style={{ fontSize: "14px", color: "#94a3b8" }}>Loading historical analysis...</div>
            </div>
          )}

          {historicalError && (
            <div style={{ ...S.card, textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>📊</div>
              <div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "8px" }}>Historical ROI analysis data not found</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Run battery_roi_analysis_v2.py to generate the analysis</div>
            </div>
          )}

          {!historicalLoading && !historicalError && historicalData && (() => {

          const allMonthly = historicalData.monthly_results;
          const annual = historicalData.annual_no_sharer;
          const batterySpec = { ...historicalData.battery_spec, usable_kwh: cfg.usableCapacity };

          // Actual purchase mode uses cfg from Battery tab
          const isActual = roiMode === 'actual';
          const effectiveNetCost = isActual ? netCost : batterySpec.net_cost;
          const effectiveMonthlyPmt = isActual && cfg.payType === "finance" ? monthlyPmt : 0;
          const totalFinanceCost = isActual && cfg.payType === "finance" ? (effectiveMonthlyPmt * cfg.financeTerm * 12) : 0;
          const totalInterest = totalFinanceCost - effectiveNetCost;

          // Filter monthly data from purchase date in actual mode
          // Normalize "YYYY-M" to "YYYY-MM" for reliable comparison
          const padMonth = (ym) => { const [y, m] = ym.split('-'); return `${y}-${m.padStart(2, '0')}`; };
          const purchaseYM = purchaseDate ? purchaseDate.slice(0, 7) : HISTORICAL_FIRST_DATE.slice(0, 7);
          const filteredMonthly = isActual
            ? allMonthly.filter(m => padMonth(m.month) >= purchaseYM)
            : allMonthly;
          const preRangeMonthly = filteredMonthly.length > 0 ? filteredMonthly : allMonthly;

          // Apply date range filter
          const rangeFilteredMonthly = (() => {
            if (dateRange === 'all') return preRangeMonthly;
            const now = new Date();
            const months = dateRange === '6mo' ? 6 : 12;
            const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
            const cutoffStr = cutoff.toISOString().slice(0, 7);
            return preRangeMonthly.filter(m => {
              const pm = m.month.length === 6 ? m.month.slice(0, 5) + '0' + m.month.slice(5) : m.month;
              return pm >= cutoffStr;
            });
          })();
          const monthly = rangeFilteredMonthly.length > 0 ? rangeFilteredMonthly : preRangeMonthly;

          // Date range label
          const firstMonth = monthly[0]?.month || '';
          const lastMonth = monthly[monthly.length - 1]?.month || '';
          const formatRangeMonth = (ym) => {
            if (!ym) return '';
            const [y, m] = ym.split('-');
            const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            return `${names[parseInt(m) - 1]} ${y}`;
          };
          const rangeLabel = `${formatRangeMonth(firstMonth)} – ${formatRangeMonth(lastMonth)} (${monthly.length} months)`;

          // Format month labels
          const monthLabels = monthly.map(m => {
            const [year, month] = m.month.split('-');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`;
          });

          // Prepare data for charts
          const costComparisonData = monthly.map((m, i) => ({
            month: monthLabels[i],
            'Without Battery': Math.round(m.cost_no_battery),
            'With Battery': Math.round(m.cost_with_battery + effectiveMonthlyPmt),
            savings: Math.round(m.savings - effectiveMonthlyPmt)
          }));

          const savingsData = monthly.map((m, i) => ({
            month: monthLabels[i],
            'Monthly Savings': Math.round(m.savings - effectiveMonthlyPmt)
          }));

          const solarConsumptionData = monthly.map((m, i) => ({
            month: monthLabels[i],
            'Solar Generation': Math.round(m.solar_total),
            'Consumption': Math.round(m.consumption)
          }));

          // Calculate cumulative savings for payback chart
          const startingCum = (isActual && cfg.payType === "finance") ? 0 : -effectiveNetCost;
          let cumSavings = startingCum;
          const cumulativeData = monthly.map((m, i) => {
            cumSavings += (m.savings - effectiveMonthlyPmt);
            return {
              month: i + 1,
              label: monthLabels[i],
              'Cumulative Savings': Math.round(cumSavings)
            };
          });

          // Ideal baseline comparison (Deliverable 4)
          const idealBaseline = historicalData.daily_results
            ? computeIdealBaseline(historicalData.daily_results, batterySpec.usable_kwh, monthly)
            : null;

          const monthCount = monthly.length || 1;
          const totalSavings = monthly.reduce((sum, m) => sum + m.savings, 0);
          const annualizedSavings = (totalSavings / monthCount) * 12;
          const effectiveAnnualSavings = annualizedSavings - (effectiveMonthlyPmt * 12);
          const avgSavings = effectiveAnnualSavings / 12;
          const effectivePaybackYears = effectiveAnnualSavings > 0 ? effectiveNetCost / effectiveAnnualSavings : Infinity;
          const paybackMonths = effectivePaybackYears * 12;
          const monthsSincePurchase = monthly.length;
          const totalSavedSoFar = totalSavings - (effectiveMonthlyPmt * monthsSincePurchase);

          return <>
            {/* Analysis Mode Info */}
            <div style={{ marginBottom: "16px", fontSize: "11px", color: "#64748b", padding: "8px 12px", background: "rgba(15,23,42,0.4)", borderRadius: "8px", border: "1px solid #1e293b" }}>
              {isActual
                ? `Real payback tracking from ${new Date(purchaseDate).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })} — ${cfg.payType === "finance" ? `${fmt(monthlyPmt)}/mo${financeOverride ? ` (${financeOverride.name})` : ` over ${cfg.financeTerm}yr at ${cfg.financeRate}%`}` : `${fmt(effectiveNetCost)} paid upfront`} — ${monthsSincePurchase} months of data`
                : `What-if analysis from ${new Date(purchaseDate).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })} — change install date in header`
              }
            </div>

            {/* Date Range Filter + Live Data Indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "4px" }}>
                {[
                  { key: '6mo', label: 'Last 6mo' },
                  { key: '12mo', label: 'Last 12mo' },
                  { key: 'all', label: 'All Time' },
                ].map(r => (
                  <button key={r.key} onClick={() => setDateRange(r.key)}
                    style={{ padding: "4px 12px", borderRadius: "14px", border: dateRange === r.key ? "1px solid #38bdf8" : "1px solid #334155",
                      background: dateRange === r.key ? "rgba(56,189,248,0.15)" : "transparent",
                      color: dateRange === r.key ? "#38bdf8" : "#64748b", fontSize: "11px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                    {r.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: "11px", color: "#475569", marginLeft: "auto" }}>
                {rangeLabel}
              </div>
              {liveDataLoaded && (
                <div style={{ fontSize: "10px", color: "#34d399", padding: "3px 8px", borderRadius: "10px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
                  Live data merged — {liveMonthCount} months total
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
              <div style={S.stat("#34d399")}>
                <div style={S.sL}>{isActual ? "Net Annual Savings" : "Annual Savings"}</div>
                <div style={S.sV("#34d399")}>{fmt(effectiveAnnualSavings)}</div>
                <div style={S.sS}>{isActual && cfg.payType === "finance" ? "after finance repayments" : `${Math.round((annual.savings / annual.cost_no_battery) * 100)}% cost reduction`}</div>
              </div>
              <div style={S.stat("#fbbf24")}>
                <div style={S.sL}>{isActual ? "True Payback" : "Payback Period"}</div>
                <div style={S.sV("#fbbf24")}>{effectivePaybackYears === Infinity ? "N/A" : `${effectivePaybackYears.toFixed(1)} yrs`}</div>
                <div style={S.sS}>{effectivePaybackYears === Infinity ? "Costs exceed savings" : `${Math.round(paybackMonths)} months`}</div>
              </div>
              <div style={S.stat("#38bdf8")}>
                <div style={S.sL}>Monthly Average</div>
                <div style={S.sV("#38bdf8")}>{fmt(avgSavings)}</div>
                <div style={S.sS}>{isActual && cfg.payType === "finance" ? "net of repayments" : "consistent savings"}</div>
              </div>
              <div style={S.stat("#a78bfa")}>
                <div style={S.sL}>{isActual ? "Your Battery Cost" : "Battery Investment"}</div>
                <div style={S.sV("#a78bfa")}>{fmt(effectiveNetCost)}</div>
                <div style={S.sS}>{isActual ? `${fmt(cfg.batteryCost)} - ${fmt(cfg.repsRebate)} rebate` : `${batterySpec.capacity_kwh} kWh system`}</div>
              </div>
              {isActual && cfg.payType === "finance" && <>
                <div style={S.stat("#f87171")}>
                  <div style={S.sL}>Monthly Payment</div>
                  <div style={S.sV("#f87171")}>{fmt(effectiveMonthlyPmt)}</div>
                  <div style={S.sS}>{cfg.financeTerm}yr at {cfg.financeRate}%</div>
                </div>
                <div style={S.stat("#fb923c")}>
                  <div style={S.sL}>Total Interest</div>
                  <div style={S.sV("#fb923c")}>{fmt(totalInterest)}</div>
                  <div style={S.sS}>total repaid: {fmt(totalFinanceCost)}</div>
                </div>
              </>}
              {isActual && <>
                <div style={S.stat("#10b981")}>
                  <div style={S.sL}>Saved So Far</div>
                  <div style={S.sV(totalSavedSoFar >= 0 ? "#10b981" : "#f87171")}>{fmt(totalSavedSoFar)}</div>
                  <div style={S.sS}>{monthsSincePurchase} months since purchase</div>
                </div>
                <div style={S.stat("#e879f9")}>
                  <div style={S.sL}>Remaining to Break Even</div>
                  <div style={S.sV("#e879f9")}>{(startingCum + totalSavedSoFar) >= 0 ? "Paid off!" : fmt(Math.abs(startingCum + totalSavedSoFar))}</div>
                  <div style={S.sS}>{(startingCum + totalSavedSoFar) >= 0 ? "Investment recovered" : `of ${fmt(effectiveNetCost)} investment`}</div>
                </div>
              </>}
            </div>

            {/* Monthly Cost Comparison Chart */}
            <div style={S.card}>
              <div style={S.cT}>Monthly Cost Comparison{isActual && cfg.payType === "finance" ? " (incl. finance)" : ""}</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costComparisonData} barGap={4} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#141e30" />
                  <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<TT />} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="Without Battery" fill="#f87171" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="With Battery" fill="#34d399" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Savings Chart */}
            <div style={S.card}>
              <div style={S.cT}>{isActual ? "Monthly Net Savings (after finance)" : "Monthly Savings with Battery"}</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={savingsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#141e30" />
                  <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<TT />} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="Monthly Savings" fill="#fbbf24" radius={[3, 3, 0, 0]} />
                  <ReferenceLine y={avgSavings} stroke="#f87171" strokeDasharray="3 3" label={{ value: `Avg: $${Math.round(avgSavings)}`, fill: "#f87171", fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Cumulative Savings & Payback */}
            <div style={S.card}>
              <div style={S.cT}>Cumulative Savings & Payback Timeline{isActual ? ` (${cfg.payType === "finance" ? "financed" : "upfront"})` : ""}</div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#141e30" />
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<TT />} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <ReferenceLine y={0} stroke="#f87171" strokeWidth={2} strokeDasharray="5 5" label={{ value: 'Break-even', fill: "#f87171", fontSize: 11 }} />
                  <Area type="monotone" dataKey="Cumulative Savings" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#savingsGradient)" />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ marginTop: "12px", fontSize: "12px", color: "#94a3b8", textAlign: "center" }}>
                {cumulativeData.length === 0
                  ? "No data available for selected date range"
                  : cumulativeData[cumulativeData.length - 1]['Cumulative Savings'] >= 0
                    ? `✓ Investment recovered! Currently ${fmt(cumulativeData[cumulativeData.length - 1]['Cumulative Savings'])} in profit`
                    : `${fmt(Math.abs(cumulativeData[cumulativeData.length - 1]['Cumulative Savings']))} remaining to break even`}
              </div>
            </div>

            {/* Fresh Battery Baseline Comparison (Deliverable 4) */}
            {idealBaseline && idealBaseline.data.length > 0 && (
              <div style={S.card}>
                <div style={S.cT}>Actual vs Ideal Battery Performance (100% Capacity from Day 1)</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
                  <div style={S.stat("#34d399")}><div style={S.sL}>Actual Savings</div><div style={S.sV("#34d399")}>{fmt(idealBaseline.totalActual)}</div><div style={S.sS}>{idealBaseline.data.length} days</div></div>
                  <div style={S.stat("#38bdf8")}><div style={S.sL}>Ideal Savings</div><div style={S.sV("#38bdf8")}>{fmt(idealBaseline.totalIdeal)}</div><div style={S.sS}>100% capacity from day 1</div></div>
                  <div style={S.stat("#fb923c")}><div style={S.sL}>Left on Table</div><div style={S.sV("#fb923c")}>{fmt(idealBaseline.moneyLeftOnTable)}</div><div style={S.sS}>ramp-up + seasonal loss</div></div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={(() => {
                    // Sample every Nth point for readability
                    const d = idealBaseline.data;
                    const step = d.length > 200 ? Math.floor(d.length / 100) : d.length > 60 ? 3 : 1;
                    return d.filter((_, i) => i % step === 0 || i === d.length - 1).map(p => ({
                      day: p.dayIndex,
                      label: p.date,
                      'Actual': p.cumActual,
                      'Ideal (100%)': p.cumIdeal,
                    }));
                  })()}>
                    <defs>
                      <linearGradient id="idealGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02}/>
                      </linearGradient>
                      <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#141e30" />
                    <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v => v % 30 === 0 ? `D${v}` : ""} interval={0} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => `$${Math.round(v)}`} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "10px", fontSize: "12px" }}>
                        <div style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{d.label}</div>
                        {payload.map((p, i) => <div key={i} style={{ color: p.color, marginBottom: 2 }}>{p.name}: {fmt(p.value)}</div>)}
                        <div style={{ color: "#fb923c", marginTop: 4, fontWeight: 500 }}>Gap: {fmt(d['Ideal (100%)'] - d['Actual'])}</div>
                      </div>;
                    }} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Area type="monotone" dataKey="Ideal (100%)" stroke="#38bdf8" strokeWidth={2} fill="url(#idealGrad)" strokeDasharray="5 3" />
                    <Area type="monotone" dataKey="Actual" stroke="#34d399" strokeWidth={2} fill="url(#actualGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ fontSize: "11px", color: "#475569", textAlign: "center", marginTop: "6px" }}>
                  Gap between lines = money lost to ramp-up period, partial charging, and seasonal variation. Solid = actual, dashed = ideal.
                </div>
              </div>
            )}

            {/* Solar vs Consumption */}
            <div style={S.card}>
              <div style={S.cT}>Solar Generation vs Consumption</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={solarConsumptionData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#141e30" />
                  <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => `${v} kWh`} />
                  <Tooltip content={<TT />} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="Solar Generation" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Consumption" fill="#a78bfa" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Self-Sufficiency & Cost Reduction */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "14px" }}>
              {/* Self-Sufficiency Ratio */}
              <div style={S.card}>
                <div style={S.cT}>Solar Self-Sufficiency Ratio</div>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={(() => {
                    return monthly.map((m, i) => ({
                      month: monthLabels[i],
                      'Self-Sufficiency': Math.min(100, (m.solar_total / m.consumption * 100))
                    }));
                  })()}>
                    <defs>
                      <linearGradient id="sufficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#141e30" />
                    <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 9 }} angle={-45} textAnchor="end" height={70} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                    <Tooltip content={<TT />} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <ReferenceLine y={100} stroke="#34d399" strokeDasharray="3 3" label={{ value: '100% Self-Sufficient', fill: "#34d399", fontSize: 10 }} />
                    <Area type="monotone" dataKey="Self-Sufficiency" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#sufficiencyGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ marginTop: "8px", fontSize: "11px", color: "#64748b", textAlign: "center" }}>
                  Higher = more solar covering your consumption
                </div>
              </div>

              {/* Cost Reduction % */}
              <div style={S.card}>
                <div style={S.cT}>Cost Reduction with Battery</div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={(() => {
                    return monthly.map((m, i) => ({
                      month: monthLabels[i],
                      'Reduction %': m.cost_no_battery > 0 ? ((m.savings / m.cost_no_battery) * 100) : 0
                    }));
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#141e30" />
                    <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 9 }} angle={-45} textAnchor="end" height={70} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<TT />} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="Reduction %" fill="#34d399" radius={[3, 3, 0, 0]} />
                    <ReferenceLine y={50} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: '50%', fill: "#fbbf24", fontSize: 10 }} />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop: "8px", fontSize: "11px", color: "#64748b", textAlign: "center" }}>
                  Average reduction: {Math.round((annual.savings / annual.cost_no_battery) * 100)}%
                </div>
              </div>
            </div>

            {/* Energy Flow Breakdown */}
            <div style={S.card}>
              <div style={S.cT}>Monthly Energy Flow Patterns</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(() => {
                  return monthly.map((m, i) => {
                    const solarSelfConsumed = Math.min(m.solar_total, m.consumption);
                    const solarExported = Math.max(0, m.solar_total - m.consumption);
                    const gridImport = Math.max(0, m.consumption - m.solar_total);
                    return {
                      month: monthLabels[i],
                      'Solar Self-Consumed': Math.round(solarSelfConsumed),
                      'Solar Exported': Math.round(solarExported),
                      'Grid Import': Math.round(gridImport)
                    };
                  });
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#141e30" />
                  <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => `${v} kWh`} />
                  <Tooltip content={<TT />} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="Solar Self-Consumed" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Solar Exported" stackId="a" fill="#38bdf8" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Grid Import" stackId="a" fill="#f87171" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: "12px", fontSize: "11px", color: "#64748b", padding: "0 16px" }}>
                <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: 12, height: 12, background: "#34d399", borderRadius: "2px" }}></div>
                    <span>Solar used directly (reduces import)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: 12, height: 12, background: "#38bdf8", borderRadius: "2px" }}></div>
                    <span>Solar exported (low feed-in rate)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: 12, height: 12, background: "#f87171", borderRadius: "2px" }}></div>
                    <span>Grid import (expensive peak/sponge)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seasonal Patterns Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              {(() => {
                const seasons = [
                  { name: "Summer", monthIndices: [11, 0, 1], color: "#f59e0b", emoji: "☀️" },
                  { name: "Autumn", monthIndices: [2, 3, 4], color: "#a78bfa", emoji: "🍂" },
                  { name: "Winter", monthIndices: [5, 6, 7], color: "#38bdf8", emoji: "❄️" },
                  { name: "Spring", monthIndices: [8, 9, 10], color: "#34d399", emoji: "🌸" }
                ];

                return seasons.map(season => {
                  const seasonData = monthly.filter(m => {
                    const mi = parseInt(m.month.split('-')[1]) - 1;
                    return season.monthIndices.includes(mi);
                  });
                  if (seasonData.length === 0) return null;

                  const avgSolar = seasonData.reduce((sum, m) => sum + m.solar_total, 0) / seasonData.length;
                  const avgConsumption = seasonData.reduce((sum, m) => sum + m.consumption, 0) / seasonData.length;
                  const avgSavings = seasonData.reduce((sum, m) => sum + m.savings, 0) / seasonData.length;
                  const avgSufficiency = (avgSolar / avgConsumption * 100);

                  return (
                    <div key={season.name} style={{ ...S.card, borderColor: season.color + "40" }}>
                      <div style={{ fontSize: "24px", marginBottom: "4px" }}>{season.emoji}</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: season.color, marginBottom: "8px" }}>{season.name}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.6 }}>
                        <div style={{ marginBottom: "4px" }}><strong style={{ color: "#e2e8f0" }}>{Math.round(avgSolar)} kWh</strong> solar/mo</div>
                        <div style={{ marginBottom: "4px" }}><strong style={{ color: "#e2e8f0" }}>{Math.round(avgConsumption)} kWh</strong> usage/mo</div>
                        <div style={{ marginBottom: "4px" }}><strong style={{ color: "#34d399" }}>{fmt(avgSavings)}</strong> savings/mo</div>
                        <div><strong style={{ color: season.color }}>{Math.round(avgSufficiency)}%</strong> self-sufficient</div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Daily Charging Analysis */}
            {historicalData.daily_charging && <>
              <div style={{ ...S.card, background: "linear-gradient(135deg,rgba(245,158,11,0.08),rgba(16,185,129,0.05))", borderColor: "#fbbf2440" }}>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "#fbbf24", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "24px" }}>⚡</span>
                  Daily Battery Charging Analysis
                </div>

                {/* Daily Charging Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ ...S.card, padding: "12px", background: "rgba(15,23,42,0.6)" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>Days Analyzed</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#e2e8f0" }}>{historicalData.daily_charging.total_days}</div>
                  </div>
                  <div style={{ ...S.card, padding: "12px", background: "rgba(15,23,42,0.6)" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>Days Reached Full</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#34d399" }}>{historicalData.daily_charging.days_full}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>({historicalData.daily_charging.pct_days_full}%)</div>
                  </div>
                  <div style={{ ...S.card, padding: "12px", background: "rgba(15,23,42,0.6)" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>Avg Time to Full</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#fbbf24" }}>{historicalData.daily_charging.avg_time_to_full}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>~3:46 PM</div>
                  </div>
                  <div style={{ ...S.card, padding: "12px", background: "rgba(15,23,42,0.6)" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>Full Charge Range</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#38bdf8" }}>{historicalData.daily_charging.earliest_full}</div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>to</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#a78bfa" }}>{historicalData.daily_charging.latest_full}</div>
                  </div>
                </div>

                {/* Typical Daily Charging Curve */}
                <div style={S.card}>
                  <div style={S.cT}>Typical Daily Charging Curve (All Seasons Average)</div>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={(() => {
                      const hours = Object.keys(historicalData.daily_charging.hourly_soc).map(Number).sort((a,b) => a-b);
                      return hours.map(hour => ({
                        hour: `${hour}:00`,
                        'Battery SOC (kWh)': historicalData.daily_charging.hourly_soc[hour],
                        'SOC %': (historicalData.daily_charging.hourly_soc[hour] / batterySpec.usable_kwh * 100)
                      }));
                    })()}>
                      <defs>
                        <linearGradient id="dailyChargeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#141e30" />
                      <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => `${v.toFixed(0)} kWh`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                      <Tooltip content={<TT />} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <ReferenceLine yAxisId="left" y={batterySpec.usable_kwh} stroke="#34d399" strokeDasharray="3 3" label={{ value: `Full (${batterySpec.usable_kwh} kWh)`, fill: "#34d399", fontSize: 10 }} />
                      <Area yAxisId="left" type="monotone" dataKey="Battery SOC (kWh)" stroke="#fbbf24" strokeWidth={3} fillOpacity={1} fill="url(#dailyChargeGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: "12px", fontSize: "11px", color: "#64748b", textAlign: "center", lineHeight: 1.6 }}>
                    <div>Battery charging typically begins around 7-8 AM as sun rises</div>
                    <div>Peak charging occurs mid-day (10 AM - 2 PM)</div>
                    <div>On good days (Summer), battery reaches full by 3-4 PM</div>
                  </div>
                </div>

                {/* Seasonal Charging Comparison */}
                <div style={S.card}>
                  <div style={S.cT}>Seasonal Daily Charging Performance</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "14px" }}>
                    {Object.entries(historicalData.daily_charging.seasons).map(([season, data]) => {
                      const seasonEmoji = {"Summer":"☀️","Autumn":"🍂","Winter":"❄️","Spring":"🌸"}[season];
                      const seasonColor = {"Summer":"#f59e0b","Autumn":"#a78bfa","Winter":"#38bdf8","Spring":"#34d399"}[season];
                      return (
                        <div key={season} style={{ ...S.card, borderColor: seasonColor + "40", background: seasonColor + "08" }}>
                          <div style={{ fontSize: "32px", marginBottom: "8px" }}>{seasonEmoji}</div>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: seasonColor, marginBottom: "12px" }}>{season}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.8 }}>
                            <div style={{ marginBottom: "6px", padding: "8px", background: "rgba(15,23,42,0.4)", borderRadius: "4px" }}>
                              <div style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: "2px" }}>Days Reaching Full</div>
                              <div style={{ fontSize: "20px", color: data.days_full > 0 ? "#34d399" : "#f87171", fontWeight: 700 }}>
                                {data.days_full}/{data.total_days} <span style={{ fontSize: "14px" }}>({data.pct_days_full}%)</span>
                              </div>
                            </div>
                            {data.avg_time_to_full && (
                              <div style={{ marginBottom: "4px" }}>
                                <span style={{ color: "#fbbf24", fontWeight: 600 }}>⏰ {data.avg_time_to_full}</span> avg time to full
                              </div>
                            )}
                            <div style={{ marginBottom: "4px" }}>☀️ {data.avg_solar.toFixed(1)} kWh/day solar</div>
                            <div>🔋 {data.avg_max_soc.toFixed(1)} kWh max SOC ({(data.avg_max_soc/batterySpec.usable_kwh*100).toFixed(0)}%)</div>
                          </div>
                          {data.days_full === 0 && (
                            <div style={{ marginTop: "8px", padding: "6px", background: "rgba(251,191,36,0.1)", borderRadius: "4px", fontSize: "10px", color: "#fbbf24" }}>
                              💡 Solar Sharer (3 free hrs from July 2026) will help in {season.toLowerCase()}!
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Key Insights */}
                <div style={{ ...S.card, borderColor: "#141e30", background: "rgba(251,191,36,0.05)" }}>
                  <div style={{ ...S.cT, color: "#fbbf24" }}>💡 Key Daily Charging Insights</div>
                  <div style={{ fontSize: "12px", color: "#e2e8f0", lineHeight: 1.8 }}>
                    <div style={{ marginBottom: "8px" }}>• <strong style={{ color: "#34d399" }}>Summer Performance:</strong> Battery reaches full charge on 82% of days, typically by mid-afternoon (3:46 PM)</div>
                    <div style={{ marginBottom: "8px" }}>• <strong style={{ color: "#38bdf8" }}>Winter Challenge:</strong> Lower solar generation means battery only reaches 40% capacity - Solar Sharer program (from July 2026) will help offset this</div>
                    <div style={{ marginBottom: "8px" }}>• <strong style={{ color: "#a78bfa" }}>Spring/Autumn:</strong> Transitional periods with moderate charging - Spring sees 27% of days reaching full</div>
                    <div style={{ marginBottom: "8px" }}>• <strong style={{ color: "#fbbf24" }}>Charging Pattern:</strong> Most charging happens between 10 AM - 3 PM during sponge rate period (optimal timing!)</div>
                    <div>• <strong style={{ color: "#f87171" }}>Strategic Insight:</strong> From July 2026, Solar Sharer's 3 free hours (11 AM-2 PM) could help winter days reach 50-60% charge</div>
                  </div>
                </div>
              </div>
            </>}

            {/* Data Table */}
            <div style={{ ...S.card, overflowX: "auto" }}>
              <div style={S.cT}>Monthly Breakdown</div>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "12px" }}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, textAlign: "left" }}>Month</th>
                    <th style={S.th}>Solar (kWh)</th>
                    <th style={S.th}>Usage (kWh)</th>
                    <th style={{ ...S.th, color: "#f87171" }}>Cost (No Batt)</th>
                    <th style={{ ...S.th, color: "#34d399" }}>Cost (w/ Batt)</th>
                    {isActual && cfg.payType === "finance" && <th style={{ ...S.th, color: "#fb923c" }}>Finance</th>}
                    <th style={{ ...S.th, color: "#fbbf24" }}>{isActual ? "Net Savings" : "Savings"}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m, i) => (
                    <tr key={i} style={{ background: i % 2 ? "rgba(10,15,26,0.3)" : "transparent" }}>
                      <td style={{ ...S.td, textAlign: "left", fontWeight: 500 }}>{monthLabels[i]}</td>
                      <td style={{ ...S.td, textAlign: "right", color: "#38bdf8" }}>{Math.round(m.solar_total)}</td>
                      <td style={{ ...S.td, textAlign: "right", color: "#a78bfa" }}>{Math.round(m.consumption)}</td>
                      <td style={{ ...S.td, textAlign: "right", color: "#f87171" }}>{fmt2(m.cost_no_battery)}</td>
                      <td style={{ ...S.td, textAlign: "right", color: "#34d399" }}>{fmt2(m.cost_with_battery)}</td>
                      {isActual && cfg.payType === "finance" && <td style={{ ...S.td, textAlign: "right", color: "#fb923c" }}>{fmt2(effectiveMonthlyPmt)}</td>}
                      <td style={{ ...S.td, textAlign: "right" }}><span style={S.badge(m.savings - effectiveMonthlyPmt >= 0 ? "#fbbf24" : "#f87171")}>{fmt2(m.savings - effectiveMonthlyPmt)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            <div style={{ ...S.card, borderColor: "#141e30" }}>
              <div style={{ ...S.cT, color: "#475569", fontSize: "11px" }}>Analysis Notes</div>
              <div style={{ fontSize: "11px", color: "#475569", lineHeight: 1.6 }}>
                <p style={{ margin: "0 0 4px" }}>• Based on actual solar generation data from {monthly[0].month} to {monthly[monthly.length - 1].month}</p>
                <p style={{ margin: "0 0 4px" }}>• Battery simulation assumes optimal charge/discharge timing during peak and sponge rate periods</p>
                <p style={{ margin: "0 0 4px" }}>• Solar Sharer benefit (3 free hours daily) starts July 1st 2026 - not yet reflected in historical data</p>
                <p style={{ margin: "0 0 4px" }}>• Consumption patterns estimated from billing data and distributed across time periods</p>
                <p style={{ margin: 0 }}>• Actual results may vary based on usage patterns, weather, and tariff changes</p>
              </div>
            </div>
          </>;
          })()}
          </>}

          {/* ─── Sub-view: Daily Explorer ─── */}
          {analysisSubView === 'daily' && <>
          {!historicalData || !historicalData.daily_results ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
              Loading daily data...
            </div>
          ) : (() => {
            const dailyResults = historicalData.daily_results;
            const batterySpec = { ...historicalData.battery_spec, usable_kwh: cfg.usableCapacity };

          // Find the selected day's data
          const selectedDay = dailyResults.find(d => d.date === selectedDate);

          // Get week data (7 days starting from selected date)
          const getWeekData = () => {
            const startIdx = dailyResults.findIndex(d => d.date === selectedDate);
            if (startIdx === -1) return [];
            return dailyResults.slice(startIdx, startIdx + 7);
          };

          const weekData = viewMode === 'week' ? getWeekData() : [];

          // Calculate stats
          const avgSolarAllDays = dailyResults.reduce((sum, d) => sum + d.total_solar_kwh, 0) / dailyResults.length;
          const avgMaxSOC = dailyResults.reduce((sum, d) => sum + d.max_battery_soc_kwh, 0) / dailyResults.length;

          return <>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#e2e8f0", marginBottom: "6px" }}>
                📅 Daily Battery Performance Details
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Explore detailed charging patterns for any day or week from your historical solar data
              </div>
            </div>

            {/* Date Selector & View Mode */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <label style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px", display: "block" }}>Select Date</label>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <input
                    type="date"
                    value={selectedDate || ''}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #334155",
                      borderRadius: "6px",
                      background: "#0f172a",
                      color: "#e2e8f0",
                      fontSize: "13px"
                    }}
                  />
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      const dr = historicalData?.daily_results;
                      if (dr && dr.length > 0) {
                        const lastDate = dr[dr.length - 1].date;
                        setSelectedDate(today <= lastDate ? today : lastDate);
                      } else {
                        setSelectedDate(today);
                      }
                    }}
                    style={{
                      padding: "8px 14px",
                      border: "1px solid #334155",
                      borderRadius: "6px",
                      background: "#1e293b",
                      color: "#94a3b8",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}
                  >
                    Today
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px", display: "block" }}>View Mode</label>
                <div style={{ display: "flex", gap: "4px", background: "#0f172a", padding: "4px", borderRadius: "6px", border: "1px solid #334155" }}>
                  <button
                    onClick={() => setViewMode('day')}
                    style={{
                      padding: "6px 16px",
                      border: "none",
                      borderRadius: "4px",
                      background: viewMode === 'day' ? '#3b82f6' : 'transparent',
                      color: viewMode === 'day' ? '#fff' : '#94a3b8',
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Single Day
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    style={{
                      padding: "6px 16px",
                      border: "none",
                      borderRadius: "4px",
                      background: viewMode === 'week' ? '#3b82f6' : 'transparent',
                      color: viewMode === 'week' ? '#fff' : '#94a3b8',
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    7-Day Week
                  </button>
                </div>
              </div>

              {selectedDay && <div style={{ marginLeft: "auto", display: "flex", gap: "16px", alignItems: "center" }}>
                <div style={{ background: "#1e293b", padding: "8px 16px", borderRadius: "6px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>Selected Date</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>
                    {new Date(selectedDate).toLocaleDateString('en-AU', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>}
            </div>

            {/* No data for selected date fallback */}
            {selectedDate && !selectedDay && viewMode === 'day' && (
              <div style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(148,163,184,0.08))", border: "1px solid #1e3a5f", borderRadius: "10px", padding: "20px", marginBottom: "24px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#e2e8f0", marginBottom: "8px" }}>
                  📊 Seasonal Estimate for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>
                  No recorded data for this date. Showing seasonal estimate based on historical patterns.
                </div>
                {(() => {
                  const m = new Date(selectedDate + 'T00:00:00').getMonth();
                  const seasonalSolar = avgSolarAllDays * (SEA.feedIn[m] || 1.0);
                  const seasonName = m >= 11 || m <= 1 ? "Summer" : m >= 2 && m <= 4 ? "Autumn" : m >= 5 && m <= 7 ? "Winter" : "Spring";
                  const seasonEmoji = m >= 11 || m <= 1 ? "☀️" : m >= 2 && m <= 4 ? "🍂" : m >= 5 && m <= 7 ? "❄️" : "🌸";
                  const estBatteryPct = Math.min(100, (seasonalSolar / batterySpec.usable_kwh * 100));
                  const batteryFillR = BAT.peakR[m] || 0.5;
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                      <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px", border: "1px solid #1e293b", textAlign: "center" }}>
                        <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>Season</div>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0" }}>{seasonEmoji} {seasonName}</div>
                        <div style={{ fontSize: "10px", color: "#475569" }}>{MO[m]}</div>
                      </div>
                      <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px", border: "1px solid #1e293b", textAlign: "center" }}>
                        <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>Est. Solar Generation</div>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "#38bdf8" }}>{seasonalSolar.toFixed(1)} kWh</div>
                        <div style={{ fontSize: "10px", color: "#475569" }}>Avg base: {avgSolarAllDays.toFixed(1)} kWh</div>
                      </div>
                      <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px", border: "1px solid #1e293b", textAlign: "center" }}>
                        <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>Est. Battery Fill</div>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: estBatteryPct >= 80 ? "#34d399" : estBatteryPct >= 50 ? "#fbbf24" : "#f87171" }}>{estBatteryPct.toFixed(0)}%</div>
                        <div style={{ fontSize: "10px", color: "#475569" }}>Peak coverage: {(batteryFillR * 100).toFixed(0)}%</div>
                      </div>
                      <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px", border: "1px solid #1e293b", textAlign: "center" }}>
                        <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>Data Range</div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>{dailyResults[0]?.date || '?'}</div>
                        <div style={{ fontSize: "10px", color: "#475569" }}>to {dailyResults[dailyResults.length - 1]?.date || '?'}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Single Day View */}
            {viewMode === 'day' && selectedDay && <>
              {/* Day Stats Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
                <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Solar Generation</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#38bdf8" }}>{selectedDay.total_solar_kwh.toFixed(1)} kWh</div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                    Avg: {avgSolarAllDays.toFixed(1)} kWh
                    {selectedDay.total_solar_kwh > avgSolarAllDays ?
                      <span style={{ color: "#34d399", marginLeft: "4px" }}>↑ {((selectedDay.total_solar_kwh / avgSolarAllDays - 1) * 100).toFixed(0)}%</span> :
                      <span style={{ color: "#f87171", marginLeft: "4px" }}>↓ {((1 - selectedDay.total_solar_kwh / avgSolarAllDays) * 100).toFixed(0)}%</span>
                    }
                  </div>
                </div>

                <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Max Battery SOC</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#a78bfa" }}>{selectedDay.max_battery_soc_kwh.toFixed(1)} kWh</div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                    {selectedDay.battery_filled_pct.toFixed(0)}% of capacity
                  </div>
                </div>

                <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Time to Full</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: selectedDay.time_to_full ? "#34d399" : "#f87171" }}>
                    {selectedDay.time_to_full || "N/A"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                    {selectedDay.time_to_full ? "Reached 95% SOC" : "Did not reach full"}
                  </div>
                </div>

                <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Day Performance</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: selectedDay.battery_filled_pct >= 95 ? "#34d399" : selectedDay.battery_filled_pct >= 75 ? "#fbbf24" : "#f87171" }}>
                    {selectedDay.battery_filled_pct >= 95 ? "Excellent" : selectedDay.battery_filled_pct >= 75 ? "Good" : selectedDay.battery_filled_pct >= 50 ? "Fair" : "Poor"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                    {selectedDay.day_of_week}
                  </div>
                </div>
              </div>

              {/* Hourly Charging Curve */}
              <div style={{ background: "#1e293b", padding: "20px", borderRadius: "8px", border: "1px solid #334155", marginBottom: "24px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#e2e8f0", marginBottom: "16px" }}>
                  Hourly Battery Charging Curve
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={Object.keys(selectedDay.hourly_soc).sort((a, b) => parseInt(a) - parseInt(b)).map(hour => ({
                    hour: `${hour}:00`,
                    'Battery SOC (kWh)': selectedDay.hourly_soc[hour],
                    'SOC %': (selectedDay.hourly_soc[hour] / batterySpec.usable_kwh * 100).toFixed(1)
                  }))}>
                    <defs>
                      <linearGradient id="socGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} label={{ value: 'Battery SOC (kWh)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', fontSize: '12px' }}
                      labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                    />
                    <ReferenceLine y={batterySpec.usable_kwh} stroke="#34d399" strokeDasharray="3 3" label={{ value: `Full (${batterySpec.usable_kwh} kWh)`, fill: '#34d399', fontSize: 10 }} />
                    <ReferenceLine y={batterySpec.usable_kwh * 0.5} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: '50%', fill: '#fbbf24', fontSize: 10 }} />
                    <Area type="monotone" dataKey="Battery SOC (kWh)" stroke="#a78bfa" strokeWidth={2} fill="url(#socGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Insights & Recommendations */}
              <div style={{ background: "#1e293b", padding: "20px", borderRadius: "8px", border: "1px solid #334155" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#e2e8f0", marginBottom: "12px" }}>
                  💡 Insights for {selectedDate}
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.6" }}>
                  {selectedDay.battery_filled_pct >= 95 ? (
                    <>
                      <p style={{ margin: "0 0 8px" }}>✓ <strong style={{ color: "#34d399" }}>Excellent day!</strong> Battery reached full charge at {selectedDay.time_to_full}.</p>
                      <p style={{ margin: "0 0 8px" }}>• Solar generation was {selectedDay.total_solar_kwh > avgSolarAllDays ? "above" : "at"} average, providing {selectedDay.total_solar_kwh.toFixed(1)} kWh.</p>
                      <p style={{ margin: "0 0 8px" }}>• With full battery, you maximized self-consumption and minimized grid imports during peak rates.</p>
                      {selectedDay.total_solar_kwh > 28 && <p style={{ margin: 0 }}>• Excess solar after battery full was exported to grid at feed-in rate (5.5¢/kWh).</p>}
                    </>
                  ) : selectedDay.battery_filled_pct >= 75 ? (
                    <>
                      <p style={{ margin: "0 0 8px" }}>✓ <strong style={{ color: "#fbbf24" }}>Good day.</strong> Battery reached {selectedDay.battery_filled_pct.toFixed(0)}% capacity.</p>
                      <p style={{ margin: "0 0 8px" }}>• Solar generation: {selectedDay.total_solar_kwh.toFixed(1)} kWh ({selectedDay.total_solar_kwh < avgSolarAllDays ? "below average" : "average"}).</p>
                      <p style={{ margin: "0 0 8px" }}>• Battery provided {((selectedDay.max_battery_soc_kwh / batterySpec.usable_kwh) * 100).toFixed(0)}% coverage for evening peak demand.</p>
                      <p style={{ margin: 0 }}>💡 From July 1st 2026, Solar Sharer program (11am-2pm free power) will help top up battery on days like this.</p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: "0 0 8px" }}>⚠ <strong style={{ color: "#f87171" }}>Below average day.</strong> Battery only reached {selectedDay.battery_filled_pct.toFixed(0)}% ({selectedDay.max_battery_soc_kwh.toFixed(1)} kWh).</p>
                      <p style={{ margin: "0 0 8px" }}>• Solar generation: {selectedDay.total_solar_kwh.toFixed(1)} kWh (well below {avgSolarAllDays.toFixed(1)} kWh average).</p>
                      <p style={{ margin: "0 0 8px" }}>• Likely overcast/rainy day with limited solar production.</p>
                      <p style={{ margin: 0 }}>💡 <strong>Solar Sharer (from July 1st 2026):</strong> Once active, the 3 free hours (11am-2pm) would provide ~13 kWh to top up battery on days like this.</p>
                    </>
                  )}
                </div>
              </div>
            </>}

            {/* Week View */}
            {viewMode === 'week' && weekData.length > 0 && <>
              {/* Week Summary Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "24px" }}>
                <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Week Total Solar</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#38bdf8" }}>
                    {weekData.reduce((sum, d) => sum + d.total_solar_kwh, 0).toFixed(1)} kWh
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                    Avg: {(weekData.reduce((sum, d) => sum + d.total_solar_kwh, 0) / weekData.length).toFixed(1)} kWh/day
                  </div>
                </div>

                <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Days Reaching Full</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#34d399" }}>
                    {weekData.filter(d => d.time_to_full).length} / {weekData.length}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                    {((weekData.filter(d => d.time_to_full).length / weekData.length) * 100).toFixed(0)}% of week
                  </div>
                </div>

                <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Avg Battery Fill</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#a78bfa" }}>
                    {(weekData.reduce((sum, d) => sum + d.battery_filled_pct, 0) / weekData.length).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                    {(weekData.reduce((sum, d) => sum + d.max_battery_soc_kwh, 0) / weekData.length).toFixed(1)} kWh avg
                  </div>
                </div>
              </div>

              {/* Week Daily Breakdown */}
              <div style={{ background: "#1e293b", padding: "20px", borderRadius: "8px", border: "1px solid #334155", marginBottom: "24px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#e2e8f0", marginBottom: "16px" }}>
                  7-Day Battery Performance Comparison
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={weekData.map(d => ({
                    date: new Date(d.date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }),
                    day: d.day_of_week.substr(0, 3),
                    'Solar (kWh)': d.total_solar_kwh,
                    'Max SOC (kWh)': d.max_battery_soc_kwh,
                    'Fill %': d.battery_filled_pct
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', fontSize: '12px' }}
                      labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Solar (kWh)" fill="#38bdf8" />
                    <Bar dataKey="Max SOC (kWh)" fill="#a78bfa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Week Details Table */}
              <div style={{ background: "#1e293b", padding: "20px", borderRadius: "8px", border: "1px solid #334155" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#e2e8f0", marginBottom: "16px" }}>
                  Daily Breakdown
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #334155" }}>
                        <th style={{ textAlign: "left", padding: "8px", color: "#94a3b8", fontWeight: 600 }}>Date</th>
                        <th style={{ textAlign: "left", padding: "8px", color: "#94a3b8", fontWeight: 600 }}>Day</th>
                        <th style={{ textAlign: "right", padding: "8px", color: "#94a3b8", fontWeight: 600 }}>Solar</th>
                        <th style={{ textAlign: "right", padding: "8px", color: "#94a3b8", fontWeight: 600 }}>Max SOC</th>
                        <th style={{ textAlign: "right", padding: "8px", color: "#94a3b8", fontWeight: 600 }}>Fill %</th>
                        <th style={{ textAlign: "right", padding: "8px", color: "#94a3b8", fontWeight: 600 }}>Time to Full</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekData.map((day, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                          <td style={{ padding: "8px", color: "#e2e8f0" }}>{day.date}</td>
                          <td style={{ padding: "8px", color: "#94a3b8" }}>{day.day_of_week}</td>
                          <td style={{ padding: "8px", color: "#38bdf8", textAlign: "right" }}>{day.total_solar_kwh.toFixed(1)} kWh</td>
                          <td style={{ padding: "8px", color: "#a78bfa", textAlign: "right" }}>{day.max_battery_soc_kwh.toFixed(1)} kWh</td>
                          <td style={{ padding: "8px", textAlign: "right", color: day.battery_filled_pct >= 95 ? "#34d399" : day.battery_filled_pct >= 75 ? "#fbbf24" : "#f87171" }}>
                            {day.battery_filled_pct.toFixed(0)}%
                          </td>
                          <td style={{ padding: "8px", color: day.time_to_full ? "#34d399" : "#64748b", textAlign: "right" }}>
                            {day.time_to_full || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>}


            {!selectedDay && viewMode === 'day' && (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No data available for selected date. Please choose a date within the available range.
              </div>
            )}
          </>;
        })()}
          </>}
  </>);
}
