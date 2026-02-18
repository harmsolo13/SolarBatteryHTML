#!/usr/bin/env python3
"""
Add Finance Calculator tab to BatteryROI_6.html
Creates a flexible calculator for comparing financing options
"""

# Finance Calculator React Component
FINANCE_CALCULATOR_COMPONENT = '''
/* ═══════════════════════════════════════════════════════════════════════
   FINANCE CALCULATOR - Flexible Lender Comparison
   ═══════════════════════════════════════════════════════════════════════ */

function calculateEffectiveAPR(principal, termYears, interestRate, feeAmount, feeFrequency, establishmentFee) {
  // Convert fee frequency to annual payments
  const frequencyMap = {
    'weekly': 52,
    'fortnightly': 26,
    'monthly': 12,
    'quarterly': 4,
    'annually': 1
  };

  const paymentsPerYear = frequencyMap[feeFrequency] || 12;
  const totalPayments = termYears * paymentsPerYear;

  // Calculate payment per period
  let paymentPerPeriod;

  if (interestRate === 0 && feeAmount > 0) {
    // Fee-based loan (like Brighte): principal/periods + flat fee
    paymentPerPeriod = (principal / totalPayments) + feeAmount;
  } else if (interestRate > 0 && feeAmount === 0) {
    // Traditional interest-only loan: calculate using amortization formula
    const r = (interestRate / 100) / paymentsPerYear;
    paymentPerPeriod = principal * (r * Math.pow(1 + r, totalPayments)) / (Math.pow(1 + r, totalPayments) - 1);
  } else if (interestRate > 0 && feeAmount > 0) {
    // Hybrid: interest calculation + flat fee
    const r = (interestRate / 100) / paymentsPerYear;
    const interestPayment = principal * (r * Math.pow(1 + r, totalPayments)) / (Math.pow(1 + r, totalPayments) - 1);
    paymentPerPeriod = interestPayment + feeAmount;
  } else {
    // No interest, no fees: just principal repayment
    return 0;
  }

  // Use Newton's method to find the effective rate (IRR)
  let r = 0.001 / paymentsPerYear; // initial guess

  for (let iter = 0; iter < 200; iter++) {
    let npv = 0;
    let dnpv = 0;

    for (let i = 1; i <= totalPayments; i++) {
      const payment = i === 1 ? paymentPerPeriod + establishmentFee : paymentPerPeriod;
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

  const annualRate = Math.pow(1 + r, paymentsPerYear) - 1;
  return annualRate * 100;
}

function calculateTotalCost(principal, termYears, interestRate, feeAmount, feeFrequency, establishmentFee) {
  const frequencyMap = { 'weekly': 52, 'fortnightly': 26, 'monthly': 12, 'quarterly': 4, 'annually': 1 };
  const paymentsPerYear = frequencyMap[feeFrequency] || 12;
  const totalPayments = termYears * paymentsPerYear;

  let paymentPerPeriod;
  let totalInterest = 0;

  if (interestRate === 0 && feeAmount > 0) {
    paymentPerPeriod = (principal / totalPayments) + feeAmount;
    totalInterest = 0;
  } else if (interestRate > 0 && feeAmount === 0) {
    const r = (interestRate / 100) / paymentsPerYear;
    paymentPerPeriod = principal * (r * Math.pow(1 + r, totalPayments)) / (Math.pow(1 + r, totalPayments) - 1);
    totalInterest = (paymentPerPeriod * totalPayments) - principal;
  } else if (interestRate > 0 && feeAmount > 0) {
    const r = (interestRate / 100) / paymentsPerYear;
    const interestPayment = principal * (r * Math.pow(1 + r, totalPayments)) / (Math.pow(1 + r, totalPayments) - 1);
    paymentPerPeriod = interestPayment + feeAmount;
    totalInterest = (interestPayment * totalPayments) - principal;
  } else {
    paymentPerPeriod = principal / totalPayments;
    totalInterest = 0;
  }

  const totalFees = (feeAmount * totalPayments) + establishmentFee;
  const totalCost = totalInterest + totalFees;

  return {
    paymentPerPeriod: paymentPerPeriod,
    totalPayments: totalPayments,
    totalInterest: totalInterest,
    totalFees: totalFees,
    totalCost: totalCost,
    totalRepaid: principal + totalCost
  };
}

function calculateOffsetCost(principal, termYears, mortgageRate) {
  // Pulling from offset means you lose the interest saved
  // With linear repayment, average balance = principal / 2
  const avgBalance = principal / 2;
  const totalOpportunityCost = avgBalance * (mortgageRate / 100) * termYears;
  return totalOpportunityCost;
}

function FinanceCalculator({ batteryNetCost }) {
  const [numScenarios, setNumScenarios] = useState(2);
  const [mortgageRate, setMortgageRate] = useState(6.0);
  const [compareOffset, setCompareOffset] = useState(true);

  // Scenario configurations
  const [scenarios, setScenarios] = useState([
    {
      name: 'Brighte',
      principal: batteryNetCost,
      termYears: 5,
      interestRate: 0,
      feeAmount: 2.30,
      feeFrequency: 'weekly',
      establishmentFee: 75,
      enabled: true
    },
    {
      name: 'Bank Loan',
      principal: batteryNetCost,
      termYears: 5,
      interestRate: 7.5,
      feeAmount: 0,
      feeFrequency: 'monthly',
      establishmentFee: 250,
      enabled: true
    },
    {
      name: 'Green Loan',
      principal: batteryNetCost,
      termYears: 7,
      interestRate: 5.5,
      feeAmount: 0,
      feeFrequency: 'monthly',
      establishmentFee: 0,
      enabled: false
    }
  ]);

  const updateScenario = (index, field, value) => {
    const newScenarios = [...scenarios];
    newScenarios[index] = { ...newScenarios[index], [field]: value };
    setScenarios(newScenarios);
  };

  // Calculate results for all scenarios
  const results = useMemo(() => {
    return scenarios.map(s => {
      if (!s.enabled) return null;

      const effectiveAPR = calculateEffectiveAPR(
        s.principal, s.termYears, s.interestRate,
        s.feeAmount, s.feeFrequency, s.establishmentFee
      );

      const costs = calculateTotalCost(
        s.principal, s.termYears, s.interestRate,
        s.feeAmount, s.feeFrequency, s.establishmentFee
      );

      return {
        ...s,
        effectiveAPR,
        ...costs
      };
    }).filter(r => r !== null);
  }, [scenarios]);

  const offsetCost = useMemo(() => {
    if (!compareOffset || results.length === 0) return null;
    return calculateOffsetCost(batteryNetCost, results[0].termYears, mortgageRate);
  }, [compareOffset, batteryNetCost, mortgageRate, results]);

  // Find best option
  const bestOption = useMemo(() => {
    if (results.length === 0) return null;

    const allOptions = [...results];
    if (offsetCost !== null) {
      allOptions.push({
        name: 'Mortgage Offset',
        totalCost: offsetCost,
        effectiveAPR: mortgageRate,
        isOffset: true
      });
    }

    return allOptions.reduce((best, current) =>
      current.totalCost < best.totalCost ? current : best
    );
  }, [results, offsetCost, mortgageRate]);

  const frequencyLabels = {
    'weekly': 'Week',
    'fortnightly': 'Fortnight',
    'monthly': 'Month',
    'quarterly': 'Quarter',
    'annually': 'Year'
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#e2e8f0', padding: '0 0 60px 0' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)', padding: '32px 32px 40px', borderRadius: '0 0 20px 20px', marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#fff' }}>
          💰 Finance Calculator
        </h2>
        <p style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 0 }}>
          Compare financing options and find the best way to fund your battery system
        </p>
      </div>

      {/* Global Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 32, padding: '0 32px' }}>
        <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, border: '1px solid #334155' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            System Cost
          </label>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', marginTop: 8 }}>
            {fmt(batteryNetCost)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            After rebate
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, border: '1px solid #334155' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Your Mortgage Rate
          </label>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981', marginTop: 8 }}>
            {mortgageRate.toFixed(1)}%
          </div>
          <input
            type="range"
            min={3}
            max={10}
            step={0.1}
            value={mortgageRate}
            onChange={e => setMortgageRate(Number(e.target.value))}
            style={{ width: '100%', marginTop: 8 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 4 }}>
            <span>3.0%</span><span>10.0%</span>
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, border: '1px solid #334155' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Compare Options
          </label>
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={compareOffset}
                onChange={e => setCompareOffset(e.target.checked)}
                style={{ marginRight: 8, width: 16, height: 16, accentColor: '#10b981' }}
              />
              Include Mortgage Offset
            </label>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
            Compare against pulling from offset account
          </div>
        </div>
      </div>

      {/* Scenarios */}
      <div style={{ padding: '0 32px', marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>Financing Scenarios</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => {
                  setNumScenarios(n);
                  const newScenarios = [...scenarios];
                  newScenarios.forEach((s, i) => s.enabled = i < n);
                  setScenarios(newScenarios);
                }}
                style={{
                  padding: '6px 14px',
                  background: numScenarios === n ? '#7c3aed' : '#334155',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {n} Option{n > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: numScenarios === 1 ? '1fr' : numScenarios === 2 ? '1fr 1fr' : '1fr 1fr 1fr', gap: 20 }}>
          {scenarios.slice(0, numScenarios).map((scenario, idx) => (
            <div key={idx} style={{ background: '#1e293b', borderRadius: 12, padding: 20, border: '2px solid #334155' }}>
              <input
                type="text"
                value={scenario.name}
                onChange={e => updateScenario(idx, 'name', e.target.value)}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: '#f1f5f9',
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 16
                }}
                placeholder="Lender Name"
              />

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  LOAN AMOUNT
                </label>
                <input
                  type="number"
                  value={scenario.principal}
                  onChange={e => updateScenario(idx, 'principal', Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#f1f5f9',
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  TERM (YEARS)
                </label>
                <input
                  type="number"
                  value={scenario.termYears}
                  onChange={e => updateScenario(idx, 'termYears', Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#f1f5f9',
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  INTEREST RATE (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={scenario.interestRate}
                  onChange={e => updateScenario(idx, 'interestRate', Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#f1f5f9',
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  PERIODIC FEE ($)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={scenario.feeAmount}
                  onChange={e => updateScenario(idx, 'feeAmount', Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#f1f5f9',
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  FEE FREQUENCY
                </label>
                <select
                  value={scenario.feeFrequency}
                  onChange={e => updateScenario(idx, 'feeFrequency', e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#f1f5f9',
                    fontSize: 14
                  }}
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>

              <div style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  ESTABLISHMENT FEE ($)
                </label>
                <input
                  type="number"
                  value={scenario.establishmentFee}
                  onChange={e => updateScenario(idx, 'establishmentFee', Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#f1f5f9',
                    fontSize: 14
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results Comparison */}
      {results.length > 0 && (
        <div style={{ padding: '0 32px' }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Comparison Results</h3>

          {/* Winner Banner */}
          {bestOption && (
            <div style={{
              background: bestOption.isOffset ? 'linear-gradient(135deg, #065f46 0%, #10b981 100%)' : 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', opacity: 0.9, marginBottom: 4 }}>
                🏆 BEST OPTION
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>
                {bestOption.name}
              </div>
              <div style={{ fontSize: 16, color: '#fff', opacity: 0.9, marginTop: 4 }}>
                Total Cost: {fmt(bestOption.totalCost)}
                {!bestOption.isOffset && ` • ${fmt2(bestOption.paymentPerPeriod)}/${frequencyLabels[bestOption.feeFrequency].toLowerCase()}`}
              </div>
            </div>
          )}

          {/* Detailed Comparison Table */}
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #475569' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#94a3b8', fontWeight: 600 }}>Option</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8', fontWeight: 600 }}>Effective APR</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8', fontWeight: 600 }}>Payment</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8', fontWeight: 600 }}>Total Interest</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8', fontWeight: 600 }}>Total Fees</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8', fontWeight: 600 }}>Total Cost</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8', fontWeight: 600 }}>Total Repaid</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, idx) => {
                  const isBest = bestOption && !bestOption.isOffset && r.name === bestOption.name;
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #334155',
                        background: isBest ? 'rgba(124, 58, 237, 0.1)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '12px 8px', fontWeight: isBest ? 600 : 400 }}>
                        {isBest && '🏆 '}{r.name}
                      </td>
                      <td style={{
                        padding: '12px 8px',
                        textAlign: 'right',
                        color: r.effectiveAPR > mortgageRate ? '#ef4444' : '#10b981'
                      }}>
                        {r.effectiveAPR.toFixed(2)}%
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        {fmt2(r.paymentPerPeriod)}/{frequencyLabels[r.feeFrequency].toLowerCase()}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: '#94a3b8' }}>
                        {fmt(r.totalInterest)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: '#94a3b8' }}>
                        {fmt(r.totalFees)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>
                        {fmt(r.totalCost)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        {fmt(r.totalRepaid)}
                      </td>
                    </tr>
                  );
                })}

                {offsetCost !== null && (
                  <tr style={{
                    borderBottom: '1px solid #334155',
                    background: bestOption?.isOffset ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                  }}>
                    <td style={{ padding: '12px 8px', fontWeight: bestOption?.isOffset ? 600 : 400 }}>
                      {bestOption?.isOffset && '🏆 '}Mortgage Offset
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#10b981' }}>
                      {mortgageRate.toFixed(2)}%
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#64748b' }}>
                      N/A
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#94a3b8' }}>
                      {fmt(offsetCost)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#94a3b8' }}>
                      $0
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>
                      {fmt(offsetCost)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      {fmt(batteryNetCost + offsetCost)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Key Insights */}
          <div style={{ marginTop: 24, background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #334155' }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#f59e0b' }}>💡 Key Insights</h4>
            <ul style={{ fontSize: 13, lineHeight: 1.8, color: '#cbd5e1', paddingLeft: 20 }}>
              <li>
                <span style={{ color: '#ef4444' }}>Red APR</span> = More expensive than your mortgage offset ({mortgageRate.toFixed(1)}%)
              </li>
              <li>
                <span style={{ color: '#10b981' }}>Green APR</span> = Cheaper than pulling from offset
              </li>
              <li>
                Fee-based loans (like Brighte) work better for larger amounts over longer terms
              </li>
              <li>
                Total Cost includes ALL interest and fees over the life of the loan
              </li>
              <li>
                Offset comparison assumes linear repayment and average balance opportunity cost
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
'''

def add_finance_tab():
    """Add Finance Calculator tab to BatteryROI_6.html"""

    print("[OK] Reading BatteryROI_6.html...")
    with open('BatteryROI_6.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Find the tab navigation section and add new tab
    tab_nav_search = '''            <button onClick={() => setTab(5)} style={{'''

    if tab_nav_search in html:
        # Add Finance tab button after Daily Details tab
        new_tab_button = '''            <button onClick={() => setTab(6)} style={{
              padding: '12px 24px',
              background: tab === 6 ? 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' : '#1e293b',
              border: tab === 6 ? '2px solid #a78bfa' : '2px solid #334155',
              borderRadius: 10,
              color: tab === 6 ? '#fff' : '#94a3b8',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              💰 Finance
            </button>'''

        # Find position after tab 5 button and insert tab 6
        insert_pos = html.find(tab_nav_search)
        if insert_pos != -1:
            # Find the end of tab 5 button
            button_end = html.find('</button>', insert_pos) + len('</button>')
            # Insert new tab button
            html = html[:button_end] + '\n' + new_tab_button + html[button_end:]
            print("[OK] Added Finance tab button")

    # Find where to insert the Finance Calculator component
    # Insert before the main BatteryROI component definition
    component_insert_marker = 'function BatteryROI() {'
    component_insert_pos = html.find(component_insert_marker)

    if component_insert_pos != -1:
        html = html[:component_insert_pos] + FINANCE_CALCULATOR_COMPONENT + '\n\n' + html[component_insert_pos:]
        print("[OK] Added Finance Calculator component")

    # Find the tab rendering section and add Finance tab content
    # Look for tab 5 content section
    tab5_search = '{tab === 5 &&'
    tab5_pos = html.find(tab5_search)

    if tab5_pos != -1:
        # Find the closing of tab 5 content (the matching closing brace and parenthesis)
        # We need to find where tab 5's content block ends
        # Search for the next tab check or end of tab rendering

        # Insert Finance tab content after finding tab 5
        finance_tab_content = '''

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 6: FINANCE CALCULATOR
              ═══════════════════════════════════════════════════════════════════════ */}
          {tab === 6 && (
            <FinanceCalculator batteryNetCost={batteryCost - rebate} />
          )}'''

        # Find a good insertion point - look for the end of the main return statement tabs
        # Search for the end of tab sections (before the final closing of main div)
        main_div_search = '</div>\n        </div>\n      );\n    })()}'
        main_div_pos = html.find(main_div_search, tab5_pos)

        if main_div_pos != -1:
            # Insert before this closing
            html = html[:main_div_pos] + finance_tab_content + '\n' + html[main_div_pos:]
            print("[OK] Added Finance tab content section")

    # Save the updated HTML
    with open('BatteryROI_7.html', 'w', encoding='utf-8') as f:
        f.write(html)

    print("[OK] Created BatteryROI_7.html with Finance Calculator!")
    print()
    print("Finance Calculator features:")
    print("  - Compare up to 3 financing scenarios")
    print("  - Support for interest rates, fees, or hybrid")
    print("  - Multiple payment frequencies (weekly, fortnightly, monthly, etc.)")
    print("  - Mortgage offset comparison")
    print("  - Effective APR calculation using Newton's method")
    print("  - Visual comparison with best option highlighted")
    print()
    print("Open BatteryROI_7.html in your browser to test!")

if __name__ == '__main__':
    add_finance_tab()
