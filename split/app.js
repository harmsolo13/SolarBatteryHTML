/* ══════════════════════════════════════════════════════════════
   Battery ROI Calculator — Main App Component
   ══════════════════════════════════════════════════════════════ */

const { useState, useMemo, useCallback, useEffect } = React;

function BatteryROI() {
  const [tab, setTab] = useState(0);
  const [viewYr, setViewYr] = useState(1);
  const [chartMode, setChartMode] = useState("total");

  const [rateSets, setRateSets] = useState(
    saved?.rateSets || [makeRateSet("2025-01-01", "Rate period 1", {})]
  );
  const [editingRate, setEditingRate] = useState(0);

  /* Dynamic bill entries — no fixed month grid */
  const [entries, setEntries] = useState(saved?.entries || []);
  const [draft, setDraft] = useState({ billFrom: "", days: "", sponge: "", peak: "", offPk: "", feedIn: "" });
  const [editingId, setEditingId] = useState(null);

  const [cfg, setCfg] = useState(saved?.cfg || {
    batteryCost: 25282, repsRebate: 9782,
    forecastYears: 10, escalation: 4,
    payType: "finance", financeTerm: 6, financeRate: 6.99,
    useAmber: true, amberFitAvg: 0.12, amberImportDisc: 0.25,
    amberSpikeMult: 1.0, amberFee: 25, scenario: 1.0,
    installerName: "MLEC", batteryModel: "GoodWe GW8.3-BAT-D-G21", batteryCapacity: 33.28,
    usableCapacity: 32, inverterPower: 9.99, chargeRate: 8, inverterEfficiency: 97.5, solarCapacity: 5,
    location: "Adelaide", provider: "Amber Electric",
  });

  // Analysis sub-view state
  const [analysisSubView, setAnalysisSubView] = useState('monthly');

  /* Historical ROI data state */
  const [historicalData, setHistoricalData] = useState(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState(false);

  // Tab 5: Daily Details state
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  const [roiMode, setRoiMode] = useState('hypothetical'); // 'hypothetical' or 'actual'
  const [purchaseDate, setPurchaseDate] = useState(saved?.purchaseDate || HISTORICAL_FIRST_DATE);
  const [forecastData, setForecastData] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);

  // Open-Meteo 16-day forecast state
  const [openMeteoForecast, setOpenMeteoForecast] = useState(null);
  const [openMeteoLoading, setOpenMeteoLoading] = useState(false);
  const [openMeteoError, setOpenMeteoError] = useState(null);
  const [forecastSubView, setForecastSubView] = useState('daily');

  // Live DB merge state
  const [liveDataLoaded, setLiveDataLoaded] = useState(false);
  const [liveMonthCount, setLiveMonthCount] = useState(0);

  // Finance scenario override (from FinanceCalculator)
  const [financeOverride, setFinanceOverride] = useState(null);

  // Accelerated repayment toggle (Deliverable 2)
  const [accelerateRepay, setAccelerateRepay] = useState(false);

  // Live Solar state
  const [solarLive, setSolarLive] = useState(null);
  const [solarStats, setSolarStats] = useState(null);
  const [solarDaily, setSolarDaily] = useState([]);
  const [solarMonthly, setSolarMonthly] = useState([]);
  const [solarHourly, setSolarHourly] = useState([]);
  const [solarToday, setSolarToday] = useState([]);
  const [solarConnected, setSolarConnected] = useState(false);
  const [weatherToday, setWeatherToday] = useState(null);
  const [showProviderImport, setShowProviderImport] = useState(false);
  const [providerImportText, setProviderImportText] = useState('');
  const [providerImportStatus, setProviderImportStatus] = useState(null);

  /* Auto-save to localStorage on changes */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, rateSets, cfg, purchaseDate, _saved: new Date().toISOString() }));
    } catch {}
  }, [entries, rateSets, cfg, purchaseDate]);

  /* Load historical ROI data when tab 2 is accessed — embedded first, then merge live */
  useEffect(() => {
    if (tab === 2 && !historicalData && !historicalLoading) {
      setHistoricalLoading(true);
      // Instant render from embedded data
      if (HISTORICAL_ROI_DATA && HISTORICAL_ROI_DATA.monthly_results) {
        setHistoricalData(HISTORICAL_ROI_DATA);
        if (!selectedDate && HISTORICAL_ROI_DATA.daily_results && HISTORICAL_ROI_DATA.daily_results.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const dr = HISTORICAL_ROI_DATA.daily_results;
          const lastDate = dr[dr.length - 1].date;
          setSelectedDate(today <= lastDate ? today : lastDate);
        }
        setHistoricalLoading(false);

        // Async fetch live data and merge
        (async () => {
          try {
            const resp = await fetch(`${SOLAR_API_URL}/roi-daily`);
            if (!resp.ok) return;
            const liveRaw = await resp.json();
            if (!liveRaw.daily || liveRaw.daily.length === 0) return;
            const liveTransformed = transformLiveToHistorical(liveRaw.daily, liveRaw.monthly, cfg);
            const merged = mergeHistoricalData(HISTORICAL_ROI_DATA, liveTransformed);
            setHistoricalData(merged);
            setLiveDataLoaded(true);
            setLiveMonthCount(merged.monthly_results.length);
            // Update selectedDate to most recent if current is beyond embedded range
            const dr = merged.daily_results;
            if (dr.length > 0) {
              const today = new Date().toISOString().split('T')[0];
              const lastDate = dr[dr.length - 1].date;
              setSelectedDate(prev => {
                if (!prev || prev > lastDate) return lastDate;
                if (prev <= lastDate && today <= lastDate) return today;
                return prev;
              });
            }
          } catch (e) {
            console.warn('Live solar data merge failed:', e);
          }
        })();
      } else {
        setHistoricalError(true);
        setHistoricalLoading(false);
      }
    }
  }, [tab, historicalData, historicalLoading]);

  /* Live Solar Data Polling */
  useEffect(() => {
    const fetchSolarLive = async () => {
      try {
        const resp = await fetch(`${SOLAR_API_URL}/realtime?live=true`);
        if (resp.ok) {
          const data = await resp.json();
          setSolarLive(data);
          setSolarConnected(true);
          // Also refresh today's power curve when on the solar tab
          if (tab === 4) {
            try {
              const todayResp = await fetch(`${SOLAR_API_URL}/today?date=${new Date().toISOString().split('T')[0]}`);
              if (todayResp.ok) { const t = await todayResp.json(); setSolarToday(t.readings || []); }
            } catch {}
          }
        } else {
          setSolarConnected(false);
        }
      } catch (e) {
        setSolarConnected(false);
      }
    };
    fetchSolarLive();
    const interval = setInterval(fetchSolarLive, SOLAR_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [tab]);

  /* Load solar stats & history when solar tab is accessed */
  useEffect(() => {
    if (tab === 4) {
      const loadSolarData = async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          const [statsResp, dailyResp, monthlyResp, hourlyResp, todayResp] = await Promise.all([
            fetch(`${SOLAR_API_URL}/stats`),
            fetch(`${SOLAR_API_URL}/daily?days=90`),
            fetch(`${SOLAR_API_URL}/monthly`),
            fetch(`${SOLAR_API_URL}/hourly?date=${today}`),
            fetch(`${SOLAR_API_URL}/today?date=${today}`)
          ]);
          if (statsResp.ok) setSolarStats(await statsResp.json());
          if (dailyResp.ok) { const d = await dailyResp.json(); setSolarDaily(d.data || []); }
          if (monthlyResp.ok) { const m = await monthlyResp.json(); setSolarMonthly(m.data || []); }
          if (hourlyResp.ok) { const h = await hourlyResp.json(); setSolarHourly(h.hours || []); }
          if (todayResp.ok) { const t = await todayResp.json(); setSolarToday(t.readings || []); }
          // Fetch weather via server-side proxy and build 7-day forecast
          try {
            const wxResp = await fetch(`${SOLAR_API_URL}/weather`);
            if (wxResp.ok) {
              const wxData = await wxResp.json();
              const todayStr = new Date().toISOString().split('T')[0];
              const todayForecast = wxData.forecast?.find(d => d.date === todayStr);
              setWeatherToday({
                current: wxData.current,
                forecast: todayForecast || wxData.forecast?.[0],
                location: wxData.location
              });
              // Also populate forecastData if not already loaded (same model as Analysis tab)
              if (!forecastData && HISTORICAL_ROI_DATA?.daily_results) {
                const dr = HISTORICAL_ROI_DATA.daily_results;
                const avgSolar = dr.reduce((s, d) => s + d.total_solar_kwh, 0) / dr.length;
                const bCap = cfg.usableCapacity;
                const preds = wxData.forecast.slice(0, 7).map(day => {
                  const weatherMult = BOM_CONDITION_TO_SOLAR[day.condition] || 0.5;
                  const forecastDate = new Date(day.date + 'T00:00:00');
                  const seasonalMult = SEA.feedIn[forecastDate.getMonth()] || 1.0;
                  const combinedMult = weatherMult * seasonalMult;
                  const predKwh = avgSolar * combinedMult;
                  const batteryPred = predictBatteryPerformance(predKwh, bCap, cfg.chargeRate || 8, cfg.inverterEfficiency || 97.5);
                  return {
                    date: day.date,
                    dayName: forecastDate.toLocaleDateString('en-AU', { weekday: 'short' }),
                    condition: day.condition || 'Unknown',
                    conditionIcon: getConditionIcon(day.condition),
                    tempMax: day.temperature,
                    tempMin: day.templow,
                    rainChance: day.precipitation_probability || 0,
                    solarMultiplier: combinedMult,
                    weatherMultiplier: weatherMult,
                    seasonalMultiplier: seasonalMult,
                    ...batteryPred
                  };
                });
                setForecastData(preds);
              }
            }
          } catch (e) {
            console.warn('Weather forecast unavailable:', e.message);
          }
        } catch (e) {
          console.error('Failed to load solar data:', e);
        }
      };
      loadSolarData();
    }
  }, [tab]);

  /* Auto-fetch Open-Meteo 16-day forecast when Forecast or Live Solar tab is accessed */
  useEffect(() => {
    if ((tab === 3 || tab === 4) && !openMeteoForecast && !openMeteoLoading) {
      setOpenMeteoLoading(true);
      setOpenMeteoError(null);
      (async () => {
        try {
          const resp = await fetch(`${SOLAR_API_URL}/weather-forecast`);
          if (resp.ok) {
            const data = await resp.json();
            const processed = processOpenMeteoForecast(data.forecast_days || [], cfg);
            setOpenMeteoForecast(processed);
          } else {
            setOpenMeteoError('Failed to fetch Open-Meteo forecast');
          }
        } catch (e) {
          setOpenMeteoError(e.message);
        } finally {
          setOpenMeteoLoading(false);
        }
      })();
    }
  }, [tab]);

  /* Export/Import helpers */
  const exportData = () => {
    const data = { entries, rateSets, cfg, _exported: new Date().toISOString(), _version: 2 };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `battery-roi-data-${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.entries) setEntries(data.entries);
          if (data.rateSets) setRateSets(data.rateSets);
          if (data.cfg) setCfg(prev => ({ ...prev, ...data.cfg }));
        } catch { alert("Invalid JSON file"); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const netCost = Math.max(0, cfg.batteryCost - cfg.repsRebate);
  const effectiveFinanceTerm = financeOverride ? financeOverride.termYears : cfg.financeTerm;
  const monthlyPmt = cfg.payType === "finance"
    ? (financeOverride ? financeOverride.monthlyPayment : calcPmt(netCost, cfg.financeRate, cfg.financeTerm))
    : 0;
  const financeTermMonths = effectiveFinanceTerm * 12;

  const upC = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const upD = (k, v) => setDraft(p => ({ ...p, [k]: v }));

  // Blended import rate for daily cost estimates (provider data has no TOU breakdown)
  const blendedRates = useMemo(() => {
    const rs = rateSets[rateSets.length - 1];
    const blendedImport = rs.peak * 0.40 + rs.offPk * 0.45 + rs.sponge * 0.15;
    const discounted = blendedImport * (1 - rs.disc / 100);
    const withGST = discounted * (1 + rs.gst / 100);
    const supplyDaily = rs.supply * (1 - rs.disc / 100) * (1 + rs.gst / 100);
    return { blendedImport: withGST, feedInRate: rs.feedIn, supplyDaily };
  }, [rateSets]);

  /* Derive 12-month pattern from entries (averages per calendar month) — feeds the forecast */
  const mo = useMemo(() => {
    const pattern = MO.map((m, i) => ({ m, days: MD[i], sponge: "", peak: "", offPk: "", feedIn: "", billFrom: "" }));
    const counts = new Array(12).fill(0);
    const sums = Array.from({ length: 12 }, () => ({ sponge: 0, peak: 0, offPk: 0, feedIn: 0, days: 0 }));
    for (const e of entries) {
      const mi = e.month;
      sums[mi].sponge += parseFloat(e.sponge) || 0;
      sums[mi].peak += parseFloat(e.peak) || 0;
      sums[mi].offPk += parseFloat(e.offPk) || 0;
      sums[mi].feedIn += parseFloat(e.feedIn) || 0;
      sums[mi].days += parseInt(e.days) || MD[mi];
      counts[mi]++;
    }
    for (let i = 0; i < 12; i++) {
      if (counts[i] > 0) {
        pattern[i].sponge = (sums[i].sponge / counts[i]).toFixed(2);
        pattern[i].peak = (sums[i].peak / counts[i]).toFixed(2);
        pattern[i].offPk = (sums[i].offPk / counts[i]).toFixed(2);
        pattern[i].feedIn = (sums[i].feedIn / counts[i]).toFixed(2);
        pattern[i].days = Math.round(sums[i].days / counts[i]);
        const latest = entries.filter(e => e.month === i).sort((a, b) => b.billFrom.localeCompare(a.billFrom))[0];
        if (latest) pattern[i].billFrom = latest.billFrom;
      }
    }
    return pattern;
  }, [entries]);

  const hasData = entries.length > 0 && entries.some(e =>
    (parseFloat(e.peak) || 0) > 0 || (parseFloat(e.sponge) || 0) > 0 || (parseFloat(e.offPk) || 0) > 0);

  const addRateSet = () => {
    const last = rateSets[rateSets.length - 1];
    const d = new Date(last.from);
    d.setMonth(d.getMonth() + 6);
    const ds = d.toISOString().split("T")[0];
    setRateSets(p => [...p, makeRateSet(ds, `Rate period ${p.length + 1}`, {
      sponge: last.sponge, peak: last.peak, offPk: last.offPk,
      feedIn: last.feedIn, supply: last.supply, disc: last.disc, gst: last.gst,
    })]);
    setEditingRate(rateSets.length);
  };

  const removeRateSet = (idx) => {
    if (rateSets.length <= 1) return;
    setRateSets(p => p.filter((_, i) => i !== idx));
    setEditingRate(Math.max(0, editingRate >= idx ? editingRate - 1 : editingRate));
  };

  const updateRate = (idx, k, v) => {
    setRateSets(p => { const n = [...p]; n[idx] = { ...n[idx], [k]: v }; return n; });
  };

  /* Rate lookup for derived mo pattern (forecast) */
  const rateForMonth = useMemo(() => {
    return mo.map((m, i) => {
      const target = m.billFrom ? new Date(m.billFrom) : new Date(2025, i, 15);
      const sorted = [...rateSets].sort((a, b) => new Date(b.from) - new Date(a.from));
      for (const rs of sorted) {
        if (new Date(rs.from) <= target) return rs;
      }
      return sorted[sorted.length - 1];
    });
  }, [mo, rateSets]);

  /* Rate lookup for a specific entry */
  const rateForEntry = useCallback((entry) => {
    const target = entry.billFrom ? new Date(entry.billFrom) : new Date(2025, entry.month || 0, 15);
    const sorted = [...rateSets].sort((a, b) => new Date(b.from) - new Date(a.from));
    for (const rs of sorted) {
      if (new Date(rs.from) <= target) return rs;
    }
    return sorted[sorted.length - 1];
  }, [rateSets]);

  /* ── Entry CRUD ── */
  const saveDraft = () => {
    if (!draft.billFrom) return;
    const d = new Date(draft.billFrom + "T00:00");
    const month = d.getMonth();
    const year = d.getFullYear();
    const days = draft.days || MD[month].toString();
    const hasKwh = (parseFloat(draft.sponge) || 0) > 0 || (parseFloat(draft.peak) || 0) > 0 || (parseFloat(draft.offPk) || 0) > 0;
    if (!hasKwh) return;

    if (editingId !== null) {
      setEntries(prev => prev.map(e => e.id === editingId
        ? { ...e, billFrom: draft.billFrom, days, sponge: draft.sponge, peak: draft.peak, offPk: draft.offPk, feedIn: draft.feedIn, month, year }
        : e).sort((a, b) => a.billFrom.localeCompare(b.billFrom)));
    } else {
      setEntries(prev => [...prev,
        { id: Date.now() + Math.random(), billFrom: draft.billFrom, days, sponge: draft.sponge, peak: draft.peak, offPk: draft.offPk, feedIn: draft.feedIn, month, year }
      ].sort((a, b) => a.billFrom.localeCompare(b.billFrom)));
    }
    /* Auto-advance to next month */
    const next = new Date(d);
    next.setMonth(next.getMonth() + 1);
    setDraft({ billFrom: next.toISOString().split("T")[0], days: MD[next.getMonth()].toString(), sponge: "", peak: "", offPk: "", feedIn: "" });
    setEditingId(null);
  };

  const editEntry = (entry) => {
    setDraft({ billFrom: entry.billFrom, days: entry.days, sponge: entry.sponge, peak: entry.peak, offPk: entry.offPk, feedIn: entry.feedIn });
    setEditingId(entry.id);
  };

  const cancelEdit = () => {
    setDraft({ billFrom: "", days: "", sponge: "", peak: "", offPk: "", feedIn: "" });
    setEditingId(null);
  };

  const removeEntry = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (editingId === id) cancelEdit();
  };

  const autoFill = () => {
    if (entries.length === 0) return;
    const src = entries[0];
    const srcMi = src.month;
    const base = { sponge: parseFloat(src.sponge) || 0, peak: parseFloat(src.peak) || 0, offPk: parseFloat(src.offPk) || 0, feedIn: parseFloat(src.feedIn) || 0 };
    const filled = new Set(entries.map(e => e.month));
    const newEntries = [];
    for (let i = 0; i < 12; i++) {
      if (filled.has(i)) continue;
      const d = new Date(src.billFrom + "T00:00");
      d.setMonth(i);
      if (d.getMonth() !== i) d.setDate(0);
      newEntries.push({
        id: Date.now() + Math.random() + i,
        billFrom: d.toISOString().split("T")[0], month: i, year: d.getFullYear(),
        days: MD[i].toString(),
        sponge: (Math.round(base.sponge * (SEA.sponge[i] / SEA.sponge[srcMi]) * 10) / 10).toString(),
        peak: (Math.round(base.peak * (SEA.peak[i] / SEA.peak[srcMi]) * 10) / 10).toString(),
        offPk: (Math.round(base.offPk * (SEA.offPk[i] / SEA.offPk[srcMi]) * 10) / 10).toString(),
        feedIn: (Math.round(base.feedIn * (SEA.feedIn[i] / SEA.feedIn[srcMi]) * 10) / 10).toString(),
      });
    }
    setEntries(prev => [...prev, ...newEntries].sort((a, b) => a.billFrom.localeCompare(b.billFrom)));
  };

  const loadSample = () => {
    const base = { sponge: 10.11, peak: 329.87, offPk: 133.32, feedIn: 518.06 };
    setEntries(MO.map((m, i) => ({
      id: Date.now() + Math.random() + i,
      billFrom: `2024-${String(i + 1).padStart(2, "0")}-01`, month: i, year: 2024,
      days: MD[i].toString(),
      sponge: (Math.round(base.sponge * SEA.sponge[i] * 10) / 10).toString(),
      peak: (Math.round(base.peak * SEA.peak[i] * 10) / 10).toString(),
      offPk: (Math.round(base.offPk * SEA.offPk[i] * 10) / 10).toString(),
      feedIn: (Math.round(base.feedIn * SEA.feedIn[i] * 10) / 10).toString(),
    })));
  };

  const clearAll = () => { setEntries([]); cancelEdit(); };

  /* Per-entry bill calculations (for collected table) */
  const entryBills = useMemo(() => {
    return entries.map(e => {
      const d = { days: parseInt(e.days) || MD[e.month], sponge: parseFloat(e.sponge) || 0, peak: parseFloat(e.peak) || 0, offPk: parseFloat(e.offPk) || 0, feedIn: parseFloat(e.feedIn) || 0 };
      if (d.peak === 0 && d.sponge === 0 && d.offPk === 0) return null;
      const rate = rateForEntry(e);
      return { ...calcBill(d, rate), rateLabel: rate.label };
    });
  }, [entries, rateForEntry]);

  /* Totals across all entries */
  const totalBill = entryBills.reduce((s, b) => s + (b ? b.total : 0), 0);
  const totalDays = entries.reduce((s, e) => s + (parseInt(e.days) || 0), 0);
  const totalImport = entries.reduce((s, e) => s + (parseFloat(e.sponge) || 0) + (parseFloat(e.peak) || 0) + (parseFloat(e.offPk) || 0), 0);
  const totalExport = entries.reduce((s, e) => s + (parseFloat(e.feedIn) || 0), 0);
  const monthsCovered = new Set(entries.map(e => e.month)).size;

  /* Forecast-compatible totals from derived 12-month pattern */
  const curBills = useMemo(() => mo.map((m, i) => {
    const d = { days: parseInt(m.days) || MD[i], sponge: parseFloat(m.sponge) || 0, peak: parseFloat(m.peak) || 0, offPk: parseFloat(m.offPk) || 0, feedIn: parseFloat(m.feedIn) || 0 };
    if (d.peak === 0 && d.sponge === 0 && d.offPk === 0) return null;
    return { ...calcBill(d, rateForMonth[i]), rateLabel: rateForMonth[i].label };
  }), [mo, rateForMonth]);
  const annualBill = curBills.reduce((s, b) => s + (b ? b.total : 0), 0);
  const annualImport = mo.reduce((s, m) => s + (parseFloat(m.sponge) || 0) + (parseFloat(m.peak) || 0) + (parseFloat(m.offPk) || 0), 0);
  const annualExport = mo.reduce((s, m) => s + (parseFloat(m.feedIn) || 0), 0);

  /* ── FORECAST ── */
  const forecast = useMemo(() => {
    if (!hasData) return null;
    const monthly = [];
    let cumSav = cfg.payType === "upfront" ? -netCost : 0;
    const cumData = [];
    const sortedRates = [...rateSets].sort((a, b) => new Date(a.from) - new Date(b.from));

    for (let month = 0; month < cfg.forecastYears * 12; month++) {
      const mi = month % 12;
      const yr = Math.floor(month / 12);
      const esc = Math.pow(1 + cfg.escalation / 100, yr + 1);
      const sc = cfg.scenario;
      // 2% annual battery degradation — effective capacity decreases each year
      const degradation = 1 - 0.02 * yr;

      const d = { days: parseInt(mo[mi].days) || MD[mi], sponge: parseFloat(mo[mi].sponge) || 0, peak: parseFloat(mo[mi].peak) || 0, offPk: parseFloat(mo[mi].offPk) || 0, feedIn: parseFloat(mo[mi].feedIn) || 0 };
      if (d.peak === 0 && d.sponge === 0 && d.offPk === 0) continue;

      const baseRate = sortedRates[sortedRates.length - 1];
      const escR = { ...baseRate, sponge: baseRate.sponge * esc, peak: baseRate.peak * esc, offPk: baseRate.offPk * esc, supply: baseRate.supply * esc, feedIn: baseRate.feedIn };
      const noBatt = calcBill(d, escR);

      // Apply degradation to battery effectiveness
      const bd = {
        days: d.days,
        sponge: Math.max(0, d.sponge * (1 - BAT.spongeR[mi] * sc * degradation)),
        peak: Math.max(0, d.peak * (1 - BAT.peakR[mi] * sc * degradation)),
        offPk: Math.max(0, d.offPk * (1 - BAT.offPkR[mi] * sc * degradation)),
        feedIn: Math.max(0, d.feedIn * (1 - BAT.feedInR[mi] * sc * degradation)),
      };

      let battBill, amberBonus = 0;
      if (cfg.useAmber) {
        const aR = {
          sponge: escR.sponge * (1 - cfg.amberImportDisc), peak: escR.peak * (1 - cfg.amberImportDisc),
          offPk: escR.offPk * (1 - cfg.amberImportDisc), feedIn: cfg.amberFitAvg,
          supply: escR.supply, disc: 0, gst: baseRate.gst,
        };
        battBill = calcBill(bd, aR);
        amberBonus = BAT.amberSpike[mi] * cfg.amberSpikeMult * Math.min(sc, 1.2);
        battBill = { ...battBill, total: Math.max(d.days * escR.supply * 0.2, battBill.total - amberBonus + cfg.amberFee) };
      } else {
        battBill = calcBill(bd, escR);
      }

      // Only charge finance payments within the loan term
      const pmt = (cfg.payType === "finance" && month < financeTermMonths) ? monthlyPmt : 0;
      const totalWithBatt = battBill.total + pmt;
      const energySaving = noBatt.total - battBill.total; // pure energy benefit
      const saving = noBatt.total - totalWithBatt;         // net after finance
      cumSav += saving;

      monthly.push({
        label: MO[mi], mi, year: yr + 1,
        noBattery: Math.round(noBatt.total),
        energyOnly: Math.round(battBill.total),
        batteryPmt: Math.round(pmt),
        totalCost: Math.round(totalWithBatt),
        saving: Math.round(saving),
        energySaving: Math.round(energySaving),
        amberBonus: Math.round(amberBonus),
        degradation: Math.round(degradation * 100),
      });
      cumData.push({ month: month + 1, label: `${MO[mi]} Y${yr + 1}`, cumSav: Math.round(cumSav) });
    }

    const annual = [];
    for (let y = 0; y < cfg.forecastYears; y++) {
      const yd = monthly.filter(d => d.year === y + 1);
      if (!yd.length) continue;
      annual.push({
        year: `Year ${y + 1}`,
        noBattery: yd.reduce((s, d) => s + d.noBattery, 0),
        energyOnly: yd.reduce((s, d) => s + d.energyOnly, 0),
        batteryPmt: yd.reduce((s, d) => s + d.batteryPmt, 0),
        totalCost: yd.reduce((s, d) => s + d.totalCost, 0),
        saving: yd.reduce((s, d) => s + d.saving, 0),
        energySaving: yd.reduce((s, d) => s + d.energySaving, 0),
      });
    }

    const totalEnergySav = monthly.reduce((s, d) => s + d.energySaving, 0);
    const totalSav = monthly.reduce((s, d) => s + d.saving, 0);
    const totalNB = monthly.reduce((s, d) => s + d.noBattery, 0);
    const totalPmts = monthly.reduce((s, d) => s + d.batteryPmt, 0);
    // Breakeven: for upfront, first month cumSav reaches 0 from negative start
    // For finance, skip initial 0 — find first month cumSav returns to 0 after going negative
    const beIdx = cumData.findIndex((d, i) => {
      if (d.cumSav >= 0 && i > 0) {
        // Must have been negative at some earlier point
        return cumData.slice(0, i).some(p => p.cumSav < 0);
      }
      return false;
    });
    const be = beIdx >= 0 ? beIdx : cumData.findIndex(d => d.cumSav >= 0);
    const totalFinanceCost = cfg.payType === "finance" ? totalPmts - netCost : 0; // interest + fees only
    const energyROI = (totalEnergySav / netCost) * 100;
    const trueROI = cfg.payType === "finance"
      ? ((totalEnergySav - totalFinanceCost) / netCost) * 100
      : energyROI;

    return {
      monthly, annual, cumData, summary: {
        totalSav, totalEnergySav, totalNB, avgMo: totalSav / monthly.length,
        breakeven: be >= 0 ? be + 1 : null,
        roi: trueROI,
        energyROI,
        trueROI,
        totalFinanceCost,
        totalPmts,
        annAvg: totalEnergySav / cfg.forecastYears,
      }
    };
  }, [mo, rateSets, cfg, hasData, netCost, monthlyPmt, financeOverride]);

  const scLabel = cfg.scenario <= 0.75 ? "Conservative" : cfg.scenario <= 1.05 ? "Moderate" : "Optimistic";
  const scColor = cfg.scenario <= 0.75 ? "#f87171" : cfg.scenario <= 1.05 ? "#fbbf24" : "#34d399";

  const rateFields = [
    { k: "sponge", l: "Solar Sponge", c: "#38bdf8", u: "$/kWh" },
    { k: "peak", l: "Peak", c: "#f87171", u: "$/kWh" },
    { k: "offPk", l: "Off-Peak", c: "#a78bfa", u: "$/kWh" },
    { k: "feedIn", l: "Feed-In", c: "#34d399", u: "$/kWh" },
    { k: "supply", l: "Supply", c: "#fbbf24", u: "$/day" },
    { k: "disc", l: "Discount", c: "#94a3b8", u: "%" },
  ];

  /* ═══ RENDER ═══ */
  return (
    <div style={S.page}>
      <div style={S.hdr}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h1 style={S.h1}>⚡ Battery ROI Calculator</h1>
            <p style={S.sub}>{cfg.installerName} {cfg.batteryModel} {cfg.batteryCapacity}kWh · {cfg.location} TOU Tariff · {cfg.provider}</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "4px", background: "#0f172a", padding: "3px", borderRadius: "7px", border: "1px solid #334155" }}>
              <button style={{ ...S.tgl(roiMode === 'hypothetical'), fontSize: "10px", padding: "4px 8px" }} onClick={() => setRoiMode('hypothetical')}>Hypothetical</button>
              <button style={{ ...S.tgl(roiMode === 'actual'), fontSize: "10px", padding: "4px 8px" }} onClick={() => setRoiMode('actual')}>Actual</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <label style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>Install Date</label>
              <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)}
                style={{ padding: "4px 8px", border: "1px solid #334155", borderRadius: "6px", background: "#0f172a", color: "#e2e8f0", fontSize: "11px" }} />
            </div>
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              {entries.length > 0 && <span style={{ fontSize: "10px", color: "#34d399", marginRight: "2px" }}>● Saved</span>}
              <button onClick={exportData} style={{ padding: "4px 8px", border: "1px solid #334155", borderRadius: "5px", cursor: "pointer", fontSize: "10px", color: "#94a3b8", background: "transparent" }} title="Download all data as JSON">📥</button>
              <button onClick={importData} style={{ padding: "4px 8px", border: "1px solid #334155", borderRadius: "5px", cursor: "pointer", fontSize: "10px", color: "#94a3b8", background: "transparent" }} title="Load data from JSON file">📤</button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ LIVE SOLAR STATUS BAR ═══ */}
      {solarConnected && solarLive && (
        <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a2332 100%)", border: "1px solid #1e3a5f", borderRadius: "10px", padding: "10px 16px", margin: "0 0 8px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", cursor: "pointer" }} onClick={() => setTab(4)}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>{solarLive.total_pv_power > 100 ? "☀️" : "🌙"}</span>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: solarLive.total_pv_power > 100 ? "#fbbf24" : "#64748b" }}>
                {typeof solarLive.total_pv_power === 'number' ? solarLive.total_pv_power.toLocaleString() : '0'}W
              </div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>PV Power</div>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#38bdf8" }}>{solarLive.today_yield?.toFixed(1) || '0.0'} kWh</div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Today</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#a78bfa" }}>{solarLive.grid_power?.toLocaleString() || '0'}W</div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Grid</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#34d399" }}>{solarLive.exported_power?.toLocaleString() || '0'}W</div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Export</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#fb923c" }}>{solarLive.inverter_temp || '0'}°C</div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Temp</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", animation: "pulse 2s infinite" }}></span>
            <span style={{ fontSize: "10px", color: "#34d399" }}>LIVE</span>
          </div>
        </div>
      )}

      <div style={S.tabs}>
        {["⚙️ Setup", "💰 Finance", "📊 Performance", "📈 Forecast", "☀️ Live Solar"].map((t, i) =>
          <button key={i} style={S.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
        )}
      </div>

      <div style={S.body}>

        {/* ═══ TAB 0: SETUP ═══ */}
        {tab === 0 && <SetupTab
          cfg={cfg} upC={upC} rateSets={rateSets} editingRate={editingRate} setEditingRate={setEditingRate}
          addRateSet={addRateSet} removeRateSet={removeRateSet} updateRate={updateRate} rateFields={rateFields}
          entries={entries} entryBills={entryBills} draft={draft} upD={upD} editingId={editingId}
          saveDraft={saveDraft} editEntry={editEntry} cancelEdit={cancelEdit} removeEntry={removeEntry}
          autoFill={autoFill} loadSample={loadSample} clearAll={clearAll}
          totalBill={totalBill} totalDays={totalDays} totalImport={totalImport} totalExport={totalExport}
          monthsCovered={monthsCovered} showProviderImport={showProviderImport} setShowProviderImport={setShowProviderImport}
          providerImportText={providerImportText} setProviderImportText={setProviderImportText}
          providerImportStatus={providerImportStatus} setProviderImportStatus={setProviderImportStatus}
          setEntries={setEntries} MO={MO} MD={MD} SEA={SEA}
          rateForEntry={rateForEntry} netCost={netCost} scColor={scColor} scLabel={scLabel}
        />}

        {/* ═══ TAB 1: FINANCE ═══ */}
        {tab === 1 && (
          <FinanceCalculator
            batteryNetCost={netCost}
            cfg={cfg}
            financeOverride={financeOverride}
            onSelectScenario={(scenario) => {
              setFinanceOverride(scenario);
              upC("payType", "finance");
            }}
            selectedScenarioName={financeOverride?.name}
          />
        )}

        {/* ═══ TAB 2: PERFORMANCE ═══ */}
        {tab === 2 && <AnalysisTab
          historicalData={historicalData} historicalLoading={historicalLoading} historicalError={historicalError}
          analysisSubView={analysisSubView} setAnalysisSubView={setAnalysisSubView}
          selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          viewMode={viewMode} setViewMode={setViewMode}
          roiMode={roiMode} purchaseDate={purchaseDate}
          cfg={cfg} netCost={netCost} monthlyPmt={monthlyPmt}
          forecast={forecast}
          financeOverride={financeOverride} annualBill={annualBill}
          blendedRates={blendedRates} fmt={fmt} fmt2={fmt2} pct={pct} MO={MO}
          liveDataLoaded={liveDataLoaded} liveMonthCount={liveMonthCount}
        />}

        {/* ═══ TAB 3: FORECAST ═══ */}
        {tab === 3 && <ForecastTab
          cfg={cfg} upC={upC} forecast={forecast} viewYr={viewYr} setViewYr={setViewYr}
          chartMode={chartMode} setChartMode={setChartMode}
          netCost={netCost} monthlyPmt={monthlyPmt} hasData={hasData}
          scLabel={scLabel} scColor={scColor}
          fmt={fmt} fmt2={fmt2} pct={pct} MO={MO} BAT={BAT}
          financeOverride={financeOverride} setFinanceOverride={setFinanceOverride}
          rateSets={rateSets} setTab={setTab}
          accelerateRepay={accelerateRepay} setAccelerateRepay={setAccelerateRepay}
          annualBill={annualBill}
          openMeteoForecast={openMeteoForecast} openMeteoLoading={openMeteoLoading} openMeteoError={openMeteoError}
          setOpenMeteoForecast={setOpenMeteoForecast} setOpenMeteoLoading={setOpenMeteoLoading} setOpenMeteoError={setOpenMeteoError}
          forecastSubView={forecastSubView} setForecastSubView={setForecastSubView}
        />}

        {/* ═══ TAB 4: LIVE SOLAR ═══ */}
        {tab === 4 && <LiveSolarTab
          solarLive={solarLive} solarStats={solarStats} solarDaily={solarDaily} setSolarDaily={setSolarDaily}
          solarMonthly={solarMonthly} solarHourly={solarHourly} solarToday={solarToday}
          solarConnected={solarConnected} weatherToday={weatherToday}
          forecastData={forecastData} openMeteoForecast={openMeteoForecast}
          cfg={cfg} blendedRates={blendedRates} rateSets={rateSets} netCost={netCost}
          showProviderImport={showProviderImport} setShowProviderImport={setShowProviderImport}
          providerImportText={providerImportText} setProviderImportText={setProviderImportText}
          providerImportStatus={providerImportStatus} setProviderImportStatus={setProviderImportStatus}
          fmt={fmt} fmt2={fmt2} pct={pct} MO={MO} S={S}
        />}

      </div>
    </div>
  );
}

ReactDOM.render(<BatteryROI />, document.getElementById('root'));
