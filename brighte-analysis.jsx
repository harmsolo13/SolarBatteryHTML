import { useState, useMemo } from "react";

const WEEKLY_FEE = 2.30;
const ESTABLISHMENT_FEE = 75;
const WEEKS_PER_YEAR = 52;

function calculateEffectiveRate(principal, termYears) {
  const totalWeeks = termYears * WEEKS_PER_YEAR;
  const weeklyPrincipal = principal / totalWeeks;
  const weeklyPayment = weeklyPrincipal + WEEKLY_FEE;
  
  // Cash flows: receive principal (minus establishment fee upfront effectively)
  // Then pay weeklyPayment for totalWeeks
  // Establishment fee is paid on first repayment date, so add it to first payment
  
  // Use Newton's method to find weekly rate where:
  // principal = sum of (payment_i / (1 + r)^i) for i = 1 to totalWeeks
  // where payment_1 = weeklyPayment + ESTABLISHMENT_FEE, rest = weeklyPayment
  
  let r = 0.001 / WEEKS_PER_YEAR; // initial guess
  
  for (let iter = 0; iter < 200; iter++) {
    let npv = 0;
    let dnpv = 0;
    
    for (let i = 1; i <= totalWeeks; i++) {
      const payment = i === 1 ? weeklyPayment + ESTABLISHMENT_FEE : weeklyPayment;
      const discount = Math.pow(1 + r, i);
      npv += payment / discount;
      dnpv -= i * payment / (discount * (1 + r));
    }
    
    npv -= principal;
    const newR = r - npv / dnpv;
    
    if (Math.abs(newR - r) < 1e-12) {
      r = newR;
      break;
    }
    r = newR;
  }
  
  const annualRate = Math.pow(1 + r, WEEKS_PER_YEAR) - 1;
  return annualRate * 100;
}

function calculateTotalCost(principal, termYears) {
  const totalWeeks = termYears * WEEKS_PER_YEAR;
  const totalFees = WEEKLY_FEE * totalWeeks + ESTABLISHMENT_FEE;
  const weeklyPayment = principal / totalWeeks + WEEKLY_FEE;
  return { totalFees, weeklyPayment, totalWeeks };
}

function calculateOffsetComparison(principal, termYears, mortgageRate) {
  // If you pull money from offset, you pay extra mortgage interest
  // on that amount until you would have "repaid" it (same schedule)
  // Simplified: average balance over the term × rate × term
  // With linear repayment, average balance = principal / 2
  const avgBalance = principal / 2;
  const extraInterest = avgBalance * (mortgageRate / 100) * termYears;
  return extraInterest;
}

function formatCurrency(val) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(val);
}

export default function BrighteAnalyzer() {
  const [principal, setPrincipal] = useState(15000);
  const [termYears, setTermYears] = useState(5);
  const [mortgageRate, setMortgageRate] = useState(6.0);

  const analysis = useMemo(() => {
    const effectiveRate = calculateEffectiveRate(principal, termYears);
    const { totalFees, weeklyPayment, totalWeeks } = calculateTotalCost(principal, termYears);
    const offsetCost = calculateOffsetComparison(principal, termYears, mortgageRate);
    
    // Also calculate for a range of amounts at the selected term
    const amounts = [3000, 5000, 8000, 10000, 12000, 15000, 20000, 25000, 30000];
    const rateTable = amounts.map(amt => ({
      amount: amt,
      rate: calculateEffectiveRate(amt, termYears),
      totalFees: WEEKLY_FEE * termYears * WEEKS_PER_YEAR + ESTABLISHMENT_FEE,
      feePercent: ((WEEKLY_FEE * termYears * WEEKS_PER_YEAR + ESTABLISHMENT_FEE) / amt * 100),
    }));

    // Term comparison at selected principal
    const terms = [1, 2, 3, 4, 5, 7, 10];
    const termTable = terms.map(t => ({
      term: t,
      rate: calculateEffectiveRate(principal, t),
      totalFees: WEEKLY_FEE * t * WEEKS_PER_YEAR + ESTABLISHMENT_FEE,
      weeklyPayment: principal / (t * WEEKS_PER_YEAR) + WEEKLY_FEE,
    }));

    return { effectiveRate, totalFees, weeklyPayment, totalWeeks, offsetCost, rateTable, termTable };
  }, [principal, termYears, mortgageRate]);

  const brighteBetter = analysis.totalFees < analysis.offsetCost;

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", maxWidth: 860, margin: "0 auto", padding: 24, color: "#1a1a2e" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Brighte "0% Interest" — Real Cost Analysis</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 28 }}>
        The $2.30/week flat fee + $75 establishment fee translate to an effective interest rate that varies by loan size and term.
      </p>

      {/* Input Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 32, background: "#f8f9fb", borderRadius: 12, padding: 20 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: 0.5 }}>Finance Amount</label>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a2e", marginTop: 4 }}>{formatCurrency(principal)}</div>
          <input type="range" min={1000} max={55000} step={500} value={principal}
            onChange={e => setPrincipal(Number(e.target.value))}
            style={{ width: "100%", marginTop: 8, accentColor: "#4361ee" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999" }}>
            <span>$1,000</span><span>$55,000</span>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: 0.5 }}>Term (Years)</label>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a2e", marginTop: 4 }}>{termYears} yr{termYears !== 1 ? "s" : ""}</div>
          <input type="range" min={1} max={10} step={1} value={termYears}
            onChange={e => setTermYears(Number(e.target.value))}
            style={{ width: "100%", marginTop: 8, accentColor: "#4361ee" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999" }}>
            <span>1 yr</span><span>10 yrs</span>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: 0.5 }}>Your Mortgage Rate</label>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a2e", marginTop: 4 }}>{mortgageRate.toFixed(1)}%</div>
          <input type="range" min={3} max={8} step={0.1} value={mortgageRate}
            onChange={e => setMortgageRate(Number(e.target.value))}
            style={{ width: "100%", marginTop: 8, accentColor: "#4361ee" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999" }}>
            <span>3.0%</span><span>8.0%</span>
          </div>
        </div>
      </div>

      {/* Key Results */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
        <div style={{ background: "#fff", border: "2px solid #4361ee", borderRadius: 12, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#4361ee", textTransform: "uppercase", letterSpacing: 1 }}>Effective APR</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#4361ee", marginTop: 8 }}>{analysis.effectiveRate.toFixed(2)}%</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>What "0% interest" really costs</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 12, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#e63946", textTransform: "uppercase", letterSpacing: 1 }}>Total Brighte Fees</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#e63946", marginTop: 8 }}>{formatCurrency(analysis.totalFees)}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{formatCurrency(analysis.weeklyPayment)}/week for {analysis.totalWeeks} weeks</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 12, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#2a9d8f", textTransform: "uppercase", letterSpacing: 1 }}>Offset Cost (est.)</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#2a9d8f", marginTop: 8 }}>{formatCurrency(analysis.offsetCost)}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Extra mortgage interest if you pull from offset</div>
        </div>
      </div>

      {/* Verdict */}
      <div style={{
        background: brighteBetter ? "#eafaf1" : "#fef3e6",
        border: `1px solid ${brighteBetter ? "#2a9d8f" : "#e9a84c"}`,
        borderRadius: 12, padding: 16, marginBottom: 32, textAlign: "center"
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: brighteBetter ? "#1a7a5e" : "#b8760a" }}>
          {brighteBetter
            ? `✓ Brighte saves you ${formatCurrency(analysis.offsetCost - analysis.totalFees)} vs pulling from offset at ${mortgageRate.toFixed(1)}%`
            : `⚠ Pulling from offset saves you ${formatCurrency(analysis.totalFees - analysis.offsetCost)} vs Brighte — your mortgage rate is lower than Brighte's effective rate`
          }
        </span>
      </div>

      {/* Rate by Amount Table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#333" }}>
            Effective Rate by Amount <span style={{ fontWeight: 400, color: "#999" }}>({termYears}yr term)</span>
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                <th style={{ textAlign: "left", padding: "8px 4px", color: "#666", fontWeight: 600 }}>Amount</th>
                <th style={{ textAlign: "right", padding: "8px 4px", color: "#666", fontWeight: 600 }}>Eff. Rate</th>
                <th style={{ textAlign: "right", padding: "8px 4px", color: "#666", fontWeight: 600 }}>Total Fees</th>
              </tr>
            </thead>
            <tbody>
              {analysis.rateTable.map(row => {
                const isSelected = row.amount === principal;
                return (
                  <tr key={row.amount} style={{
                    borderBottom: "1px solid #f0f0f0",
                    background: isSelected ? "#eef0ff" : "transparent",
                    fontWeight: isSelected ? 600 : 400,
                    cursor: "pointer"
                  }} onClick={() => setPrincipal(row.amount)}>
                    <td style={{ padding: "7px 4px" }}>{formatCurrency(row.amount)}</td>
                    <td style={{ padding: "7px 4px", textAlign: "right", color: row.rate > mortgageRate ? "#e63946" : "#2a9d8f" }}>
                      {row.rate.toFixed(2)}%
                    </td>
                    <td style={{ padding: "7px 4px", textAlign: "right", color: "#666" }}>{formatCurrency(row.totalFees)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: "#999", marginTop: 8 }}>
            <span style={{ color: "#e63946" }}>Red</span> = worse than your mortgage rate. <span style={{ color: "#2a9d8f" }}>Green</span> = better.
          </p>
        </div>

        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#333" }}>
            Effective Rate by Term <span style={{ fontWeight: 400, color: "#999" }}>({formatCurrency(principal)})</span>
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                <th style={{ textAlign: "left", padding: "8px 4px", color: "#666", fontWeight: 600 }}>Term</th>
                <th style={{ textAlign: "right", padding: "8px 4px", color: "#666", fontWeight: 600 }}>Eff. Rate</th>
                <th style={{ textAlign: "right", padding: "8px 4px", color: "#666", fontWeight: 600 }}>Weekly</th>
                <th style={{ textAlign: "right", padding: "8px 4px", color: "#666", fontWeight: 600 }}>Total Fees</th>
              </tr>
            </thead>
            <tbody>
              {analysis.termTable.map(row => {
                const isSelected = row.term === termYears;
                return (
                  <tr key={row.term} style={{
                    borderBottom: "1px solid #f0f0f0",
                    background: isSelected ? "#eef0ff" : "transparent",
                    fontWeight: isSelected ? 600 : 400,
                    cursor: "pointer"
                  }} onClick={() => setTermYears(row.term)}>
                    <td style={{ padding: "7px 4px" }}>{row.term} yr{row.term !== 1 ? "s" : ""}</td>
                    <td style={{ padding: "7px 4px", textAlign: "right", color: row.rate > mortgageRate ? "#e63946" : "#2a9d8f" }}>
                      {row.rate.toFixed(2)}%
                    </td>
                    <td style={{ padding: "7px 4px", textAlign: "right", color: "#666" }}>{formatCurrency(row.weeklyPayment)}</td>
                    <td style={{ padding: "7px 4px", textAlign: "right", color: "#666" }}>{formatCurrency(row.totalFees)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: "#999", marginTop: 8 }}>
            Click any row to update the analysis above.
          </p>
        </div>
      </div>

      {/* Key Insight */}
      <div style={{ marginTop: 28, background: "#f8f9fb", borderRadius: 10, padding: 16, fontSize: 13, color: "#444", lineHeight: 1.6 }}>
        <strong style={{ color: "#1a1a2e" }}>Key insight:</strong> Because the $2.30/week fee is flat (not based on balance), it behaves regressively — smaller loans and shorter terms get hit with a higher effective rate. The $75 establishment fee also has more impact on smaller amounts. The sweet spot for Brighte is larger loans over longer terms where the flat fee is diluted across a bigger principal. Compare the effective rate (blue box above) against your mortgage rate to decide.
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "#aaa", lineHeight: 1.5 }}>
        <strong>Note:</strong> Offset comparison assumes you'd repay the offset at the same rate as the Brighte payments (linear repayment). 
        Actual offset impact depends on your remaining loan term and repayment behaviour. This is a simplified comparison — not financial advice.
      </div>
    </div>
  );
}
