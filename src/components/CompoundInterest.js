import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import './CompoundInterest.css';

const CompoundInterest = () => {
  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(7);
  const [time, setTime] = useState(10);
  const [monthlyContribution, setMonthlyContribution] = useState(200);
  const [compound, setCompound] = useState('12');
  const [result, setResult] = useState(null);
  const [yearlyData, setYearlyData] = useState([]);

  const calculateInterest = useCallback(() => {
    const p = parseFloat(principal) || 0;
    const r = parseFloat(rate) / 100;
    const t = parseFloat(time) || 0;
    const n = parseFloat(compound) || 12;
    const m = parseFloat(monthlyContribution) || 0;

    if (p >= 0 && r >= 0 && t > 0 && n > 0) {
      const yearlyBreakdown = [];
      let currentAmount = p;
      let totalContributions = p;
      
      // Year 0 (starting point)
      yearlyBreakdown.push({
        year: 0,
        amount: currentAmount,
        totalContributions,
        totalInterest: 0,
        yearlyInterest: 0
      });

      for (let year = 1; year <= t; year++) {
        const startingAmount = currentAmount;
        
        // Calculate monthly compounding
        for (let month = 0; month < 12; month++) {
          currentAmount = currentAmount * (1 + r/n) + m;
          totalContributions += m;
        }

        const yearlyInterest = currentAmount - startingAmount - (m * 12);
        
        yearlyBreakdown.push({
          year,
          amount: currentAmount,
          totalContributions,
          totalInterest: currentAmount - totalContributions,
          yearlyInterest
        });
      }

      setYearlyData(yearlyBreakdown);
      const finalAmount = currentAmount;
      const totalInterest = finalAmount - totalContributions;

      setResult({
        finalAmount: finalAmount,
        totalInterest: totalInterest,
        totalContributions: totalContributions,
        principalAmount: p,
        contributionAmount: totalContributions - p
      });
    }
  }, [principal, rate, time, monthlyContribution, compound]);

  useEffect(() => {
    calculateInterest();
  }, [calculateInterest]);

  const pieData = result ? [
    { name: 'Principal', value: result.principalAmount, color: '#00bfff' },
    { name: 'Contributions', value: result.contributionAmount, color: '#32cd32' },
    { name: 'Interest Earned', value: result.totalInterest, color: '#ffdf00' }
  ] : [];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };



  return (
    <div className="compound-interest">
      <div className="ci-header">
        <h1>Compound Interest Calculator</h1>
        <p>See how your money can grow over time with compound interest</p>
      </div>

      <div className="ci-main-content">
        {/* Left Panel - Inputs */}
        <div className="ci-inputs-panel">
          <div className="ci-input-section">
            <h2>Investment Details</h2>
            
            <div className="ci-input-group">
              <label htmlFor="principal">Initial Investment</label>
              <div className="ci-input-wrapper">
                <span className="ci-currency-symbol">$</span>
                <input
                  id="principal"
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  min="0"
                  step="100"
                />
              </div>
            </div>

            <div className="ci-input-group">
              <label htmlFor="monthlyContribution">Monthly Contribution</label>
              <div className="ci-input-wrapper">
                <span className="ci-currency-symbol">$</span>
                <input
                  id="monthlyContribution"
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                  min="0"
                  step="50"
                />
              </div>
            </div>

            <div className="ci-input-group">
              <label htmlFor="rate">Annual Interest Rate</label>
              <div className="ci-input-wrapper">
                <input
                  id="rate"
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  min="0"
                  max="50"
                  step="0.1"
                />
                <span className="ci-percent-symbol">%</span>
              </div>
            </div>

            <div className="ci-input-group">
              <label htmlFor="time">Investment Time Period</label>
              <div className="ci-input-wrapper">
                <input
                  id="time"
                  type="number"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  min="1"
                  max="50"
                  step="1"
                />
                <span className="ci-unit-symbol">years</span>
              </div>
            </div>

            <div className="ci-input-group">
              <label htmlFor="compound">Compound Frequency</label>
              <select 
                id="compound"
                value={compound} 
                onChange={(e) => setCompound(e.target.value)}
              >
                <option value="1">Annually</option>
                <option value="2">Semi-Annually</option>
                <option value="4">Quarterly</option>
                <option value="12">Monthly</option>
                <option value="365">Daily</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="ci-results-panel">
          {result && (
            <>
              <div className="ci-summary-cards">
                <div className="ci-summary-card ci-primary">
                  <div className="ci-card-header">
                    <h3>Final Balance</h3>
                  </div>
                  <div className="ci-card-value">
                    {formatCurrency(result.finalAmount)}
                  </div>
                </div>

                <div className="ci-summary-card">
                  <div className="ci-card-header">
                    <h3>Total Interest</h3>
                  </div>
                  <div className="ci-card-value ci-interest">
                    {formatCurrency(result.totalInterest)}
                  </div>
                </div>

                <div className="ci-summary-card">
                  <div className="ci-card-header">
                    <h3>Total Contributions</h3>
                  </div>
                  <div className="ci-card-value">
                    {formatCurrency(result.totalContributions)}
                  </div>
                </div>
              </div>

              <div className="ci-charts-section">
                <div className="ci-chart-container">
                  <h3>Growth Over Time</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="year" 
                        stroke="#b0b0b0"
                        fontSize={12}
                      />
                      <YAxis 
                        tickFormatter={formatCurrency}
                        stroke="#b0b0b0"
                        fontSize={12}
                      />
                      <Tooltip 
                        formatter={(value, name) => [formatCurrency(value), name]}
                        labelFormatter={(label) => `Year ${label}`}
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: '1px solid rgba(0, 191, 255, 0.3)',
                          borderRadius: '8px',
                          color: '#e0e0e0'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        name="Total Balance" 
                        stroke="#00bfff" 
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalContributions" 
                        name="Total Contributions" 
                        stroke="#32cd32" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="ci-pie-container">
                  <h3>Final Balance Breakdown</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: '1px solid rgba(0, 191, 255, 0.3)',
                          borderRadius: '8px',
                          color: '#e0e0e0'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Section - Detailed Table */}
      {result && yearlyData.length > 0 && (
        <div className="ci-table-section">
          <h2>Year-by-Year Breakdown</h2>
          <div className="ci-table-container">
            <table className="ci-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Balance</th>
                  <th>Interest Earned</th>
                  <th>Total Contributions</th>
                  <th>Total Interest</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((data, index) => (
                  <tr key={data.year} className={index === 0 ? 'ci-starting-row' : ''}>
                    <td>{data.year}</td>
                    <td className="ci-balance">{formatCurrency(data.amount)}</td>
                    <td className="ci-interest-earned">
                      {data.year === 0 ? '-' : formatCurrency(data.yearlyInterest)}
                    </td>
                    <td>{formatCurrency(data.totalContributions)}</td>
                    <td className="ci-total-interest">{formatCurrency(data.totalInterest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompoundInterest; 