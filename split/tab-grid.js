/* Tab 5: SA Grid — Wholesale Price History & Live Market Data */

function PctBar({ pct }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ flex: 1, height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ width: Math.min(pct, 100) + "%", height: "100%", background: pct > 50 ? "#34d399" : pct > 20 ? "#fbbf24" : "#f87171", borderRadius: "3px" }}></div>
      </div>
      <span style={{ fontSize: "11px", fontWeight: 600, color: pct > 50 ? "#34d399" : pct > 20 ? "#fbbf24" : "#f87171", minWidth: "32px" }}>{pct}%</span>
    </div>
  );
}

function RateCompareTable({ rateRows, wsLabel, wsValue }) {
  return (
    <div style={{ background: "#0f172a", borderRadius: "8px", border: "1px solid #1e3a5f", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#0c1222" }}>
            <th style={{ padding: "8px 10px", fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, borderBottom: "1px solid #1e3a5f", textAlign: "left" }}>Rate</th>
            <th style={{ padding: "8px 10px", fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, borderBottom: "1px solid #1e3a5f", textAlign: "right" }}>Your Rate</th>
            <th style={{ padding: "8px 10px", fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, borderBottom: "1px solid #1e3a5f", textAlign: "right" }}>{wsLabel}</th>
            <th style={{ padding: "8px 10px", fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, borderBottom: "1px solid #1e3a5f", textAlign: "right" }}>Diff</th>
          </tr>
        </thead>
        <tbody>
          {rateRows.map(function(r, i) {
            var diff = r.ckwh - wsValue;
            var diffColor = r.isRetail ? (diff > 0 ? '#fb923c' : '#34d399') : (diff > 0 ? '#34d399' : '#fb923c');
            return (
              <tr key={i}>
                <td style={{ padding: "8px 10px", fontSize: "12px", borderBottom: "1px solid #1e293b", textAlign: "left", color: r.color, fontWeight: 600 }}>{r.label}</td>
                <td style={{ padding: "8px 10px", fontSize: "12px", borderBottom: "1px solid #1e293b", textAlign: "right", color: "#e2e8f0", fontWeight: 500 }}>{r.ckwh.toFixed(1) + "¢"}</td>
                <td style={{ padding: "8px 10px", fontSize: "12px", borderBottom: "1px solid #1e293b", textAlign: "right", color: "#94a3b8" }}>{wsValue != null ? wsValue.toFixed(1) + "¢" : "—"}</td>
                <td style={{ padding: "8px 10px", fontSize: "12px", borderBottom: "1px solid #1e293b", textAlign: "right", color: diffColor, fontWeight: 700 }}>
                  {wsValue != null ? (diff > 0 ? "+" : "") + diff.toFixed(1) + "¢" : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FitMonthRow({ m }) {
  return (
    <tr>
      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #1e293b", textAlign: "left", color: "#e2e8f0", fontWeight: 500 }}>{m.label}</td>
      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #1e293b", textAlign: "right", color: "#94a3b8" }}>{m.totalDays}</td>
      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #1e293b", textAlign: "right", color: m.daysAbove > 0 ? "#34d399" : "#64748b", fontWeight: 600 }}>{m.daysAbove}</td>
      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #1e293b", textAlign: "right" }}><PctBar pct={m.pctAbove} /></td>
      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #1e293b", textAlign: "right", color: "#38bdf8" }}>{m.avgPrice.toFixed(1) + "¢"}</td>
      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #1e293b", textAlign: "right", color: m.avgAbovePrice > 0 ? "#fbbf24" : "#64748b" }}>{m.avgAbovePrice > 0 ? m.avgAbovePrice.toFixed(1) + "¢" : "—"}</td>
      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #1e293b", textAlign: "right", color: m.extraPerKwh > 0 ? "#34d399" : "#64748b", fontWeight: 600 }}>{m.extraPerKwh > 0 ? "+" + m.extraPerKwh.toFixed(1) + "¢" : "—"}</td>
    </tr>
  );
}

function GridTab({ gridData, gridLoading, gridError, gridRefresh,
  gridHistory, gridHistoryLoading, gridDayData, gridDayLoading,
  selectedGridDay, fetchGridDay, cfg, rateSets, solarLive, fmt, fmt2, S }) {

  var showGenState = React.useState(false);
  var showGeneration = showGenState[0];
  var setShowGeneration = showGenState[1];

  // ALL hooks must be called before any early returns (React rules of hooks)
  var d = gridData || {};
  var latestRate = rateSets.length > 0 ? rateSets[rateSets.length - 1] : null;
  var fitCkwh = latestRate ? latestRate.feedIn * 100 : 5.5;
  var historyDays = gridHistory ? gridHistory.days || [] : [];

  var fitMonthlyAnalysis = React.useMemo(function() {
    if (historyDays.length === 0) return [];
    var months = {};
    historyDays.forEach(function(day) {
      var mk = day.date.substring(0, 7);
      if (!months[mk]) months[mk] = { days: [], aboveFit: [], prices: [] };
      months[mk].days.push(day);
      months[mk].prices.push(day.avg_price);
      if (day.avg_price > fitCkwh) months[mk].aboveFit.push(day);
    });
    return Object.entries(months).sort(function(a, b) { return a[0].localeCompare(b[0]); }).map(function(entry) {
      var month = entry[0]; var data = entry[1];
      var avgAll = data.prices.reduce(function(s, p) { return s + p; }, 0) / data.prices.length;
      var avgAbove = data.aboveFit.length > 0 ? data.aboveFit.reduce(function(s, dd) { return s + dd.avg_price; }, 0) / data.aboveFit.length : 0;
      return {
        month: month, label: new Date(month + '-15').toLocaleDateString('en-AU', { year: 'numeric', month: 'short' }),
        totalDays: data.days.length, daysAbove: data.aboveFit.length,
        pctAbove: Math.round(data.aboveFit.length / data.days.length * 100),
        avgPrice: avgAll, avgAbovePrice: avgAbove,
        extraPerKwh: avgAbove > fitCkwh ? avgAbove - fitCkwh : 0,
      };
    });
  }, [historyDays, fitCkwh]);

  var fitWeeklyAnalysis = React.useMemo(function() {
    if (historyDays.length === 0) return [];
    var weeks = {};
    historyDays.forEach(function(day) {
      var dd = new Date(day.date + 'T00:00:00');
      var dayOfYear = Math.floor((dd - new Date(dd.getFullYear(), 0, 1)) / 86400000);
      var weekNum = Math.ceil((dayOfYear + new Date(dd.getFullYear(), 0, 1).getDay() + 1) / 7);
      var wk = dd.getFullYear() + '-W' + String(weekNum).padStart(2, '0');
      if (!weeks[wk]) weeks[wk] = { days: [], aboveFit: [], prices: [], firstDate: day.date, lastDate: day.date };
      weeks[wk].days.push(day);
      weeks[wk].prices.push(day.avg_price);
      weeks[wk].lastDate = day.date;
      if (day.avg_price > fitCkwh) weeks[wk].aboveFit.push(day);
    });
    var allWeeks = Object.entries(weeks).sort(function(a, b) { return a[0].localeCompare(b[0]); });
    return allWeeks.slice(-12).map(function(entry) {
      var data = entry[1];
      var avgAll = data.prices.reduce(function(s, p) { return s + p; }, 0) / data.prices.length;
      var avgAbove = data.aboveFit.length > 0 ? data.aboveFit.reduce(function(s, dd) { return s + dd.avg_price; }, 0) / data.aboveFit.length : 0;
      return {
        range: data.firstDate.substring(5) + " — " + data.lastDate.substring(5),
        totalDays: data.days.length, daysAbove: data.aboveFit.length,
        pctAbove: Math.round(data.aboveFit.length / data.days.length * 100),
        avgPrice: avgAll, avgAbovePrice: avgAbove,
        extraPerKwh: avgAbove > fitCkwh ? avgAbove - fitCkwh : 0,
      };
    });
  }, [historyDays, fitCkwh]);

  // Early returns AFTER all hooks
  if (gridLoading && !gridData && !gridHistory) {
    return (
      <div style={S.card}>
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
          <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "6px" }}>Loading SA Grid Data...</div>
          <div style={{ fontSize: "12px" }}>Fetching from OpenElectricity API (AEMO NEM)</div>
        </div>
      </div>
    );
  }

  if (gridError && !gridData && !gridHistory) {
    return (
      <div style={S.card}>
        <div style={{ textAlign: "center", padding: "40px", color: "#f87171" }}>
          <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "6px" }}>Grid Data Unavailable</div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>{gridError}</div>
          <button onClick={gridRefresh} style={{ marginTop: "12px", padding: "8px 16px", background: "#1e3a5f", border: "1px solid #334155", borderRadius: "6px", color: "#e2e8f0", cursor: "pointer", fontSize: "12px" }}>Retry</button>
        </div>
      </div>
    );
  }

  var currentCkwh = d.current && d.current.price_mwh != null ? d.current.price_mwh / 10 : null;
  var todayAvgCkwh = d.summary && d.summary.avg_price != null ? d.summary.avg_price / 10 : null;

  var priceColor = currentCkwh == null ? '#64748b' :
    currentCkwh < 0 ? '#22c55e' : currentCkwh < 5 ? '#34d399' :
    currentCkwh < 10 ? '#38bdf8' : currentCkwh < 20 ? '#fbbf24' :
    currentCkwh < 50 ? '#f97316' : '#ef4444';

  var priceLabel = currentCkwh == null ? '' :
    currentCkwh < 0 ? 'Negative' : currentCkwh < 5 ? 'Very Low' :
    currentCkwh < 10 ? 'Normal' : currentCkwh < 20 ? 'Elevated' :
    currentCkwh < 50 ? 'High' : 'Spike';

  var peakCkwh = latestRate ? latestRate.peak * 100 : 56.6;
  var offPkCkwh = latestRate ? latestRate.offPk * 100 : 38.8;
  var spongeCkwh = latestRate ? latestRate.sponge * 100 : 27.0;

  var rateRows = [
    { label: 'Peak', ckwh: peakCkwh, color: '#f87171', isRetail: true },
    { label: 'Off-Peak', ckwh: offPkCkwh, color: '#a78bfa', isRetail: true },
    { label: 'Sponge', ckwh: spongeCkwh, color: '#38bdf8', isRetail: true },
    { label: 'Feed-In', ckwh: fitCkwh, color: '#34d399', isRetail: false },
  ];

  var historyDateRange = gridHistory ? gridHistory.date_range || {} : {};
  var periodAvgCkwh = historyDays.length > 0
    ? historyDays.reduce(function(s, dd) { return s + dd.avg_price; }, 0) / historyDays.length : null;

  var historyChartData = historyDays.map(function(day) {
    return { date: day.date, label: day.date.substring(5), avg: day.avg_price };
  });

  // FIT analysis from 5-min today data
  var todayTimeSeries = d.time_series || [];
  var todayPricesCkwh = todayTimeSeries.filter(function(p) { return p.price != null; }).map(function(p) { return p.price / 10; });
  var todayAboveFit = todayPricesCkwh.filter(function(p) { return p > fitCkwh; });
  var todayAboveFitHours = todayAboveFit.length * 5 / 60;
  var todayAboveFitAvg = todayAboveFit.length > 0 ? todayAboveFit.reduce(function(s, p) { return s + p; }, 0) / todayAboveFit.length : 0;
  var todayAboveFitExtra = todayAboveFitAvg > fitCkwh ? todayAboveFitAvg - fitCkwh : 0;
  var todayTotalHours = todayPricesCkwh.length * 5 / 60;
  var todayAbovePct = todayPricesCkwh.length > 0 ? Math.round(todayAboveFit.length / todayPricesCkwh.length * 100) : 0;

  var currentPvW = solarLive ? solarLive.total_pv_power || 0 : 0;
  var wholesaleValuePerHour = currentCkwh != null ? ((currentPvW / 1000) * currentCkwh / 100) : null;

  var dayDetail = gridDayData;
  var dayChartData = dayDetail ? (dayDetail.time_series || []).map(function(p) {
    return { time: p.time ? p.time.substring(11, 16) : '', price: p.price, demand: p.demand };
  }) : [];

  var todayChartData = todayTimeSeries.map(function(p) {
    return { time: p.time ? p.time.substring(11, 16) : '', price: p.price != null ? p.price / 10 : null, demand: p.demand };
  });

  // Generation data
  var genSource = selectedGridDay && dayDetail ? dayDetail : d;
  var genEntries = Object.entries(genSource.generation || {}).filter(function(e) { return e[1] > 0 && e[0].indexOf('charging') === -1; }).sort(function(a, b) { return b[1] - a[1]; });
  var totalGen = genEntries.reduce(function(s, e) { return s + e[1]; }, 0);
  var genColors = { solar: '#fbbf24', wind: '#22d3ee', gas: '#fb923c', hydro: '#3b82f6', coal: '#78716c', battery_discharging: '#a78bfa', battery: '#a78bfa', bioenergy_biogas: '#84cc16', bioenergy_biomass: '#84cc16', distillate: '#d97706', other: '#64748b' };
  var genLabels = { solar: 'Solar', wind: 'Wind', gas: 'Gas', hydro: 'Hydro', coal: 'Coal', battery_discharging: 'Battery', battery: 'Battery', bioenergy_biogas: 'Biogas', bioenergy_biomass: 'Biomass', distillate: 'Diesel', other: 'Other' };
  var genChartData = (genSource.generation_series || []).map(function(entry) {
    var point = { time: entry.time ? entry.time.substring(11, 16) : '' };
    Object.keys(entry).forEach(function(k) { if (k !== 'time' && k.indexOf('charging') === -1) point[k] = entry[k] > 0 ? entry[k] : 0; });
    return point;
  });
  var genFuelTypes = [];
  var seenFt = {};
  (genSource.generation_series || []).forEach(function(entry) {
    Object.keys(entry).forEach(function(k) { if (k !== 'time' && k.indexOf('charging') === -1 && !seenFt[k]) { seenFt[k] = true; genFuelTypes.push(k); } });
  });
  var demandChartData = selectedGridDay ? dayChartData : todayChartData;

  // FIT totals
  var totalAboveDays = historyDays.filter(function(dd) { return dd.avg_price > fitCkwh; }).length;
  var totalPctAbove = historyDays.length > 0 ? Math.round(totalAboveDays / historyDays.length * 100) : 0;
  var aboveDaysData = historyDays.filter(function(dd) { return dd.avg_price > fitCkwh; });
  var overallAvgAbove = aboveDaysData.length > 0 ? aboveDaysData.reduce(function(s, dd) { return s + dd.avg_price; }, 0) / aboveDaysData.length : 0;

  var fitThLeft = { padding: "7px 10px", fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, borderBottom: "1px solid #1e3a5f", textAlign: "left" };
  var fitTh = { padding: "7px 10px", fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, borderBottom: "1px solid #1e3a5f", textAlign: "right" };
  var fitThWide = { padding: "7px 10px", fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, borderBottom: "1px solid #1e3a5f", textAlign: "right", minWidth: "100px" };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0", marginBottom: "4px" }}>SA Grid Wholesale Pricing</div>
          <div style={{ fontSize: "12px", color: "#475569" }}>South Australia NEM Region (SA1) · Historical + live dispatch data</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "10px", color: "#64748b" }}>
            {d.fetched_at ? d.fetched_at.substring(11) : ''}
            {d.cache && d.cache.market_cached ? ' (cached)' : ' (live)'}
          </span>
          <button onClick={gridRefresh} disabled={gridLoading}
            style={{ padding: "4px 10px", background: gridLoading ? "#1e293b" : "#1e3a5f", border: "1px solid #334155", borderRadius: "5px", color: gridLoading ? "#475569" : "#e2e8f0", cursor: gridLoading ? "default" : "pointer", fontSize: "11px" }}>
            {gridLoading ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        <div style={{ background: "#0f172a", border: "1px solid " + priceColor + "44", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Right Now</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: priceColor, lineHeight: 1 }}>{currentCkwh != null ? currentCkwh.toFixed(1) + "¢" : "—"}</div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>wholesale <span style={{ color: priceColor }}>{priceLabel}</span></div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "13px", color: "#f87171", fontWeight: 600 }}>{peakCkwh.toFixed(1) + "¢"} <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 400 }}>peak</span></div>
              <div style={{ fontSize: "13px", color: "#a78bfa", fontWeight: 600 }}>{offPkCkwh.toFixed(1) + "¢"} <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 400 }}>off-pk</span></div>
              <div style={{ fontSize: "13px", color: "#38bdf8", fontWeight: 600 }}>{spongeCkwh.toFixed(1) + "¢"} <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 400 }}>sponge</span></div>
            </div>
          </div>
        </div>

        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Today Average</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#38bdf8", lineHeight: 1 }}>{todayAvgCkwh != null ? todayAvgCkwh.toFixed(1) + "¢" : "—"}</div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>wholesale avg</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>You pay <span style={{ color: "#f87171", fontWeight: 600 }}>{(peakCkwh / (todayAvgCkwh || 1)).toFixed(1) + "x"}</span> at peak</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>You pay <span style={{ color: "#a78bfa", fontWeight: 600 }}>{(offPkCkwh / (todayAvgCkwh || 1)).toFixed(1) + "x"}</span> at off-pk</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>You pay <span style={{ color: "#38bdf8", fontWeight: 600 }}>{(spongeCkwh / (todayAvgCkwh || 1)).toFixed(1) + "x"}</span> at sponge</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Feed-In Value</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#34d399", lineHeight: 1 }}>{fitCkwh.toFixed(1) + "¢"}</div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>your FIT rate</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "13px", color: currentCkwh != null && currentCkwh > fitCkwh ? "#fb923c" : "#34d399", fontWeight: 600 }}>{currentCkwh != null ? currentCkwh.toFixed(1) + "¢ spot" : "—"}</div>
              <div style={{ fontSize: "13px", color: todayAvgCkwh != null && todayAvgCkwh > fitCkwh ? "#fb923c" : "#34d399", fontWeight: 600 }}>{todayAvgCkwh != null ? todayAvgCkwh.toFixed(1) + "¢ today" : "—"}</div>
              <div style={{ fontSize: "13px", color: periodAvgCkwh != null && periodAvgCkwh > fitCkwh ? "#fb923c" : "#34d399", fontWeight: 600 }}>{periodAvgCkwh != null ? periodAvgCkwh.toFixed(1) + "¢ period" : "—"}</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{historyDateRange.from ? "Since " + historyDateRange.from.substring(0, 7) : "Period Avg"}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#a78bfa", lineHeight: 1 }}>{periodAvgCkwh != null ? periodAvgCkwh.toFixed(1) + "¢" : "—"}</div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>wholesale avg</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>{historyDays.length + " days tracked"}</div>
              {currentPvW > 0 && currentCkwh != null && (
                <div>
                  <div style={{ fontSize: "13px", color: "#fbbf24", fontWeight: 600 }}>{"$" + wholesaleValuePerHour.toFixed(3) + "/hr"}</div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>{currentPvW.toLocaleString() + "W at spot"}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Price History Chart */}
      {historyChartData.length > 0 && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>Daily Wholesale Price History (¢/kWh)</div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>{historyDays.length + " days · " + historyDateRange.from + " to " + historyDateRange.to}</div>
            </div>
            {selectedGridDay && (
              <button onClick={function() { fetchGridDay(null); }} style={{ padding: "4px 10px", background: "#1e3a5f", border: "1px solid #334155", borderRadius: "5px", color: "#e2e8f0", cursor: "pointer", fontSize: "11px" }}>Clear</button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={historyChartData} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}
              onClick={function(e) { if (e && e.activePayload && e.activePayload[0]) { var cd = e.activePayload[0].payload.date; if (cd) fetchGridDay(cd); } }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#475569" fontSize={10} interval={Math.max(1, Math.floor(historyChartData.length / 16) - 1)} />
              <YAxis stroke="#475569" fontSize={10} tickFormatter={function(v) { return v + "¢"; }} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px" }}
                formatter={function(value) { return [value != null ? value.toFixed(2) + "¢/kWh" : "—", "Wholesale Avg"]; }} />
              <Line type="monotone" dataKey="avg" stroke="#38bdf8" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: "#38bdf8", cursor: "pointer" }} />
              <ReferenceLine y={fitCkwh} stroke="#34d399" strokeDasharray="5 5" label={{ value: "FIT " + fitCkwh.toFixed(1) + "¢", fill: "#34d399", fontSize: 10, position: "right" }} />
              <ReferenceLine y={peakCkwh} stroke="#f87171" strokeDasharray="3 3" label={{ value: "Peak " + peakCkwh.toFixed(0) + "¢", fill: "#f87171", fontSize: 9, position: "right" }} />
              <ReferenceLine y={offPkCkwh} stroke="#a78bfa" strokeDasharray="3 3" label={{ value: "Off-Pk " + offPkCkwh.toFixed(0) + "¢", fill: "#a78bfa", fontSize: 9, position: "right" }} />
              <ReferenceLine y={spongeCkwh} stroke="#38bdf8" strokeDasharray="3 3" label={{ value: "Sponge " + spongeCkwh.toFixed(0) + "¢", fill: "#38bdf8", fontSize: 9, position: "right" }} />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ fontSize: "10px", color: "#475569", marginTop: "6px", textAlign: "center" }}>Click any day to see 5-minute price detail</div>
        </div>
      )}

      {gridHistoryLoading && !gridHistory && (
        <div style={S.card}><div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>Loading price history from Oct 2024...</div></div>
      )}

      {/* Rate Comparison Tables */}
      {latestRate && periodAvgCkwh != null && (
        <div style={S.card}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", marginBottom: "12px" }}>Your Retail Rates vs Wholesale</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "10px" }}>
            <RateCompareTable rateRows={rateRows} wsLabel="Today Avg" wsValue={todayAvgCkwh} />
            <RateCompareTable rateRows={rateRows} wsLabel="Period Avg" wsValue={periodAvgCkwh} />
          </div>
          <div style={{ fontSize: "10px", color: "#475569" }}>Retail rates include network charges, retailer margin and GST on top of wholesale. Feed-in: positive diff = FIT above wholesale (good for you).</div>
        </div>
      )}

      {/* FIT Opportunity Analysis */}
      {historyDays.length > 0 && (
        <div style={S.card}>
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>FIT Opportunity Analysis</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>{"When wholesale exceeds your " + fitCkwh.toFixed(1) + "¢/kWh FIT — Amber/wholesale FIT would earn more"}</div>
          </div>

          {todayPricesCkwh.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", marginBottom: "16px" }}>
              <div style={{ background: "#0f172a", borderRadius: "8px", padding: "12px", textAlign: "center", border: "1px solid #1e293b" }}>
                <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>Today Above FIT</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: todayAboveFit.length > 0 ? "#34d399" : "#64748b" }}>{todayAboveFitHours.toFixed(1) + "h"}</div>
                <div style={{ fontSize: "10px", color: "#475569" }}>{"of " + todayTotalHours.toFixed(1) + "h (" + todayAbovePct + "%)"}</div>
              </div>
              <div style={{ background: "#0f172a", borderRadius: "8px", padding: "12px", textAlign: "center", border: "1px solid #1e293b" }}>
                <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>Avg When Above</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: todayAboveFitAvg > 0 ? "#fbbf24" : "#64748b" }}>{todayAboveFitAvg > 0 ? todayAboveFitAvg.toFixed(1) + "¢" : "—"}</div>
                <div style={{ fontSize: "10px", color: "#475569" }}>{"vs " + fitCkwh.toFixed(1) + "¢ FIT"}</div>
              </div>
              <div style={{ background: "#0f172a", borderRadius: "8px", padding: "12px", textAlign: "center", border: "1px solid #1e293b" }}>
                <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>Extra per kWh</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: todayAboveFitExtra > 0 ? "#34d399" : "#64748b" }}>{"+" + todayAboveFitExtra.toFixed(1) + "¢"}</div>
                <div style={{ fontSize: "10px", color: "#475569" }}>above-FIT avg bonus</div>
              </div>
              <div style={{ background: "#0f172a", borderRadius: "8px", padding: "12px", textAlign: "center", border: "1px solid #1e293b" }}>
                <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>All-Time Above</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: totalPctAbove > 50 ? "#34d399" : "#fbbf24" }}>{totalPctAbove + "%"}</div>
                <div style={{ fontSize: "10px", color: "#475569" }}>{totalAboveDays + " of " + historyDays.length + " days"}</div>
              </div>
            </div>
          )}

          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px" }}>Monthly Breakdown</div>
          <div style={{ background: "#0f172a", borderRadius: "8px", border: "1px solid #1e3a5f", overflow: "hidden", marginBottom: "14px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0c1222" }}>
                  <th style={fitThLeft}>Month</th>
                  <th style={fitTh}>Days</th>
                  <th style={fitTh}>Above FIT</th>
                  <th style={fitThWide}>% Above</th>
                  <th style={fitTh}>Avg Wholesale</th>
                  <th style={fitTh}>Avg When Above</th>
                  <th style={fitTh}>Extra ¢/kWh</th>
                </tr>
              </thead>
              <tbody>
                {fitMonthlyAnalysis.map(function(m, i) { return <FitMonthRow key={i} m={m} />; })}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px" }}>Weekly Breakdown (Last 12 Weeks)</div>
          <div style={{ background: "#0f172a", borderRadius: "8px", border: "1px solid #1e3a5f", overflow: "hidden", marginBottom: "10px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0c1222" }}>
                  <th style={fitThLeft}>Week</th>
                  <th style={fitTh}>Days</th>
                  <th style={fitTh}>Above FIT</th>
                  <th style={fitThWide}>% Above</th>
                  <th style={fitTh}>Avg Wholesale</th>
                  <th style={fitTh}>Avg When Above</th>
                  <th style={fitTh}>Extra ¢/kWh</th>
                </tr>
              </thead>
              <tbody>
                {fitWeeklyAnalysis.map(function(w, i) {
                  return (
                    <tr key={i}>
                      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #1e293b", textAlign: "left", color: "#e2e8f0", fontWeight: 500 }}>{w.range}</td>
                      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #1e293b", textAlign: "right", color: "#94a3b8" }}>{w.totalDays}</td>
                      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #1e293b", textAlign: "right", color: w.daysAbove > 0 ? "#34d399" : "#64748b", fontWeight: 600 }}>{w.daysAbove}</td>
                      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #1e293b", textAlign: "right" }}><PctBar pct={w.pctAbove} /></td>
                      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #1e293b", textAlign: "right", color: "#38bdf8" }}>{w.avgPrice.toFixed(1) + "¢"}</td>
                      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #1e293b", textAlign: "right", color: w.avgAbovePrice > 0 ? "#fbbf24" : "#64748b" }}>{w.avgAbovePrice > 0 ? w.avgAbovePrice.toFixed(1) + "¢" : "—"}</td>
                      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #1e293b", textAlign: "right", color: w.extraPerKwh > 0 ? "#34d399" : "#64748b", fontWeight: 600 }}>{w.extraPerKwh > 0 ? "+" + w.extraPerKwh.toFixed(1) + "¢" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: "10px 14px", background: "rgba(52,211,153,0.06)", borderRadius: "8px", border: "1px solid #1e3a5f", fontSize: "11px", color: "#94a3b8" }}>
            <span style={{ fontWeight: 600, color: "#e2e8f0" }}>Amber potential: </span>
            {"On the " + totalPctAbove + "% of days wholesale exceeds your FIT, the average wholesale price was "}
            <span style={{ color: "#fbbf24", fontWeight: 600 }}>{overallAvgAbove.toFixed(1) + "¢/kWh"}</span>
            {" — that's "}
            <span style={{ color: "#34d399", fontWeight: 600 }}>{"+" + (overallAvgAbove - fitCkwh).toFixed(1) + "¢/kWh"}</span>
            {" extra per exported kWh during those windows. With a battery, you could time exports to these high-price windows for maximum return."}
          </div>
        </div>
      )}

      {/* Day Detail Panel */}
      {selectedGridDay && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>{"5-Minute Price Detail: " + selectedGridDay}</div>
              {dayDetail && dayDetail.summary && (
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  {"Avg: " + (dayDetail.summary.avg_price != null ? dayDetail.summary.avg_price.toFixed(2) : "—") + "¢ · Min: " + (dayDetail.summary.min_price != null ? dayDetail.summary.min_price.toFixed(2) : "—") + "¢ · Max: " + (dayDetail.summary.max_price != null ? dayDetail.summary.max_price.toFixed(2) : "—") + "¢"}
                </div>
              )}
            </div>
            <button onClick={function() { fetchGridDay(null); }} style={{ padding: "4px 10px", background: "#1e3a5f", border: "1px solid #334155", borderRadius: "5px", color: "#e2e8f0", cursor: "pointer", fontSize: "11px" }}>Close</button>
          </div>
          {gridDayLoading && <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading 5-minute data...</div>}
          {!gridDayLoading && dayChartData.length > 0 && (
            <div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dayChartData} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} interval={Math.max(1, Math.floor(dayChartData.length / 12) - 1)} />
                  <YAxis stroke="#475569" fontSize={10} tickFormatter={function(v) { return v + "¢"; }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px" }}
                    formatter={function(value, name) { if (name === 'price') return [value != null ? value.toFixed(2) + "¢/kWh" : "—", 'Wholesale']; return [value, name]; }} />
                  <ReferenceLine y={fitCkwh} stroke="#34d399" strokeDasharray="5 5" label={{ value: "FIT " + fitCkwh.toFixed(1) + "¢", fill: "#34d399", fontSize: 10, position: "right" }} />
                  <ReferenceLine y={offPkCkwh} stroke="#a78bfa" strokeDasharray="3 3" label={{ value: "Off-Pk " + offPkCkwh.toFixed(0) + "¢", fill: "#a78bfa", fontSize: 9, position: "right" }} />
                  <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
                  <Line type="monotone" dataKey="price" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
              {dayDetail && dayDetail.summary && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px", marginTop: "12px" }}>
                  <div style={{ background: "#0f172a", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "3px" }}>Average</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#38bdf8" }}>{(dayDetail.summary.avg_price != null ? dayDetail.summary.avg_price.toFixed(2) : "—") + "¢"}</div>
                  </div>
                  <div style={{ background: "#0f172a", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "3px" }}>Minimum</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#34d399" }}>{(dayDetail.summary.min_price != null ? dayDetail.summary.min_price.toFixed(2) : "—") + "¢"}</div>
                  </div>
                  <div style={{ background: "#0f172a", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "3px" }}>Maximum</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#f87171" }}>{(dayDetail.summary.max_price != null ? dayDetail.summary.max_price.toFixed(2) : "—") + "¢"}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Today's Price Chart */}
      {!selectedGridDay && todayChartData.length > 0 && (
        <div style={S.card}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", marginBottom: "12px" }}>Today's 5-Minute Spot Price (¢/kWh)</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={todayChartData} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#475569" fontSize={10} interval={Math.max(1, Math.floor(todayChartData.length / 12) - 1)} />
              <YAxis stroke="#475569" fontSize={10} tickFormatter={function(v) { return v + "¢"; }} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px" }}
                formatter={function(value) { return [value != null ? value.toFixed(2) + "¢/kWh" : "—", 'Wholesale']; }} />
              <ReferenceLine y={fitCkwh} stroke="#34d399" strokeDasharray="5 5" label={{ value: "FIT " + fitCkwh.toFixed(1) + "¢", fill: "#34d399", fontSize: 10, position: "right" }} />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
              <Line type="monotone" dataKey="price" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Generation & Demand (Collapsible) */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={function() { setShowGeneration(!showGeneration); }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>
            {"Generation & Demand " + (selectedGridDay ? "(" + selectedGridDay + ")" : "(Today)")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {totalGen > 0 && <span style={{ fontSize: "11px", color: "#64748b" }}>{Math.round(totalGen).toLocaleString() + " MWh"}</span>}
            <span style={{ fontSize: "14px", color: "#64748b", transform: showGeneration ? 'rotate(180deg)' : 'rotate(0)', transition: "transform 0.2s" }}>&#9660;</span>
          </div>
        </div>

        {showGeneration && demandChartData.length > 0 && (
          <div style={{ marginTop: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8", marginBottom: "8px" }}>Demand</div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={demandChartData} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} interval={Math.max(1, Math.floor(demandChartData.length / 12) - 1)} />
                <YAxis stroke="#475569" fontSize={10} label={{ value: 'MW', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 10 } }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px" }}
                  formatter={function(value) { return [value != null ? value.toFixed(0) + " MW" : "—", 'Demand']; }} />
                <Area type="monotone" dataKey="demand" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.15} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {showGeneration && genEntries.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8" }}>Generation Mix</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>{Math.round(totalGen).toLocaleString() + " MWh total"}</div>
            </div>
            <div style={{ display: "flex", height: "32px", borderRadius: "8px", overflow: "hidden", marginBottom: "10px" }}>
              {genEntries.map(function(entry) {
                var fuel = entry[0]; var mwh = entry[1]; var pct = (mwh / totalGen) * 100;
                return <div key={fuel} style={{ width: pct + "%", background: genColors[fuel] || '#64748b', minWidth: pct > 2 ? "auto" : "2px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#0f172a" }}>{pct > 8 ? pct.toFixed(0) + "%" : ""}</div>;
              })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {genEntries.map(function(entry) {
                var fuel = entry[0]; var mwh = entry[1];
                return (
                  <div key={fuel} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "3px", background: genColors[fuel] || '#64748b' }}></div>
                    <span style={{ fontSize: "11px", color: "#e2e8f0", fontWeight: 500 }}>{genLabels[fuel] || fuel}</span>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>{mwh.toFixed(0) + " MWh"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showGeneration && genChartData.length > 1 && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8", marginBottom: "8px" }}>Hourly Generation</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={genChartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} />
                <YAxis stroke="#475569" fontSize={10} label={{ value: 'MWh', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 10 } }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", fontSize: "11px" }}
                  formatter={function(value, name) { return [value != null ? value.toFixed(1) + " MWh" : "—", genLabels[name] || name]; }} />
                {genFuelTypes.map(function(ft) {
                  return <Area key={ft} type="monotone" dataKey={ft} stackId="gen" fill={genColors[ft] || '#64748b'} stroke={genColors[ft] || '#64748b'} fillOpacity={0.7} />;
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Data Source */}
      <div style={{ textAlign: "center", padding: "10px", fontSize: "10px", color: "#475569" }}>
        {"Data from "}
        <a href="https://openelectricity.org.au" target="_blank" rel="noopener" style={{ color: "#38bdf8", textDecoration: "none" }}>OpenElectricity</a>
        {" · AEMO NEM Dispatch · CC BY-NC 4.0"}
      </div>
    </div>
  );
}
