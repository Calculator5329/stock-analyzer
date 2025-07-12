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
import './MortgageCalculator.css';

const MortgageCalculator = () => {
  const [loanAmount, setLoanAmount] = useState(400000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [downPayment, setDownPayment] = useState(80000);
  const [propertyTaxRate, setPropertyTaxRate] = useState(1.1);
  const [insuranceRate, setInsuranceRate] = useState(0.5);
  const [pmiRate, setPmiRate] = useState(0.58);
  const [hoaFees, setHoaFees] = useState(0);
  const [result, setResult] = useState(null);
  const [amortizationData, setAmortizationData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);

  const calculateMortgage = useCallback(() => {
    const principal = parseFloat(loanAmount) || 0;
    const monthlyRate = (parseFloat(interestRate) / 100) / 12;
    const totalPayments = (parseFloat(loanTerm) || 0) * 12;
    const downPaymentAmount = parseFloat(downPayment) || 0;
    const homePrice = principal + downPaymentAmount;

    // Calculate additional costs based on rates
    const annualPropertyTax = homePrice * ((parseFloat(propertyTaxRate) || 0) / 100);
    const monthlyPropertyTax = annualPropertyTax / 12;
    
    const annualInsurance = homePrice * ((parseFloat(insuranceRate) || 0) / 100);
    const monthlyInsurance = annualInsurance / 12;

    const loanToValue = homePrice > 0 ? (principal / homePrice) : 0;
    const annualPmi = loanToValue > 0.8 ? principal * ((parseFloat(pmiRate) || 0) / 100) : 0;
    const monthlyPmi = annualPmi / 12;

    const monthlyHoa = parseFloat(hoaFees) || 0;

    if (principal > 0 && monthlyRate > 0 && totalPayments > 0) {
      // Calculate monthly payment (principal + interest)
      const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
                            (Math.pow(1 + monthlyRate, totalPayments) - 1);

      // Total monthly payment including taxes, insurance, etc.
      const totalMonthlyPayment = monthlyPayment + monthlyPropertyTax + monthlyInsurance + monthlyPmi + monthlyHoa;

      // Calculate amortization schedule
      const amortization = [];
      const yearlyBreakdown = [];
      let remainingBalance = principal;
      let totalInterestPaid = 0;
      let totalPrincipalPaid = 0;
      let yearlyInterest = 0;
      let yearlyPrincipal = 0;

      for (let month = 1; month <= totalPayments; month++) {
        const interestPayment = remainingBalance * monthlyRate;
        const principalPayment = monthlyPayment - interestPayment;
        remainingBalance -= principalPayment;
        totalInterestPaid += interestPayment;
        totalPrincipalPaid += principalPayment;
        yearlyInterest += interestPayment;
        yearlyPrincipal += principalPayment;

        if (remainingBalance < 0) remainingBalance = 0;

        amortization.push({
          month,
          year: Math.ceil(month / 12),
          monthlyPayment: monthlyPayment,
          principalPayment: principalPayment,
          interestPayment: interestPayment,
          remainingBalance: remainingBalance,
          totalInterestPaid: totalInterestPaid,
          totalPrincipalPaid: totalPrincipalPaid
        });

        // Add yearly summary
        if (month % 12 === 0 || month === totalPayments) {
          yearlyBreakdown.push({
            year: Math.ceil(month / 12),
            yearlyInterest: yearlyInterest,
            yearlyPrincipal: yearlyPrincipal,
            remainingBalance: remainingBalance,
            totalInterestPaid: totalInterestPaid,
            totalPrincipalPaid: totalPrincipalPaid
          });
          yearlyInterest = 0;
          yearlyPrincipal = 0;
        }
      }

      setAmortizationData(amortization);
      setYearlyData(yearlyBreakdown);

      const totalPaymentAmount = monthlyPayment * totalPayments;
      const totalInterest = totalPaymentAmount - principal;

      setResult({
        homePrice: homePrice,
        loanAmount: principal,
        downPayment: downPaymentAmount,
        monthlyPayment: monthlyPayment,
        totalMonthlyPayment: totalMonthlyPayment,
        monthlyPropertyTax: monthlyPropertyTax,
        monthlyInsurance: monthlyInsurance,
        monthlyPmi: monthlyPmi,
        monthlyHoa: monthlyHoa,
        totalPaymentAmount: totalPaymentAmount,
        totalInterest: totalInterest,
        loanToValue: loanToValue,
        payoffDate: new Date(Date.now() + (totalPayments * 30 * 24 * 60 * 60 * 1000))
      });
    }
  }, [loanAmount, interestRate, loanTerm, downPayment, propertyTaxRate, insuranceRate, pmiRate, hoaFees]);

  useEffect(() => {
    calculateMortgage();
  }, [calculateMortgage]);

  const pieData = result ? [
    { name: 'Principal', value: result.loanAmount, color: '#00bfff' },
    { name: 'Interest', value: result.totalInterest, color: '#ff6b6b' },
    { name: 'Down Payment', value: result.downPayment, color: '#32cd32' }
  ] : [];

  const monthlyPieData = result ? [
    { name: 'Principal & Interest', value: result.monthlyPayment },
    { name: 'Property Tax', value: result.monthlyPropertyTax },
    { name: 'Insurance', value: result.monthlyInsurance },
    { name: 'PMI', value: result.monthlyPmi },
    { name: 'HOA', value: result.monthlyHoa }
  ].filter(item => item.value > 0) : [];

  const MONTHLY_COLORS = ['#00bfff', '#ffdf00', '#32cd32', '#ff6b6b', '#9d4edd'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  return (
    <div className="mortgage-calculator">
      <div className="mc-header">
        <h1>Mortgage Calculator</h1>
        <p>Calculate your monthly payments and see the amortization schedule</p>
      </div>

      <div className="mc-main-content">
        {/* Left Panel - Inputs */}
        <div className="mc-inputs-panel">
          <div className="mc-input-section">
            <h2>Loan Details</h2>
            
            <div className="mc-input-group">
              <label htmlFor="loanAmount">Loan Amount</label>
              <div className="mc-input-wrapper">
                <span className="mc-currency-symbol">$</span>
                <input
                  id="loanAmount"
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            <div className="mc-input-group">
              <label htmlFor="downPayment">Down Payment</label>
              <div className="mc-input-wrapper">
                <span className="mc-currency-symbol">$</span>
                <input
                  id="downPayment"
                  type="number"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            <div className="mc-input-group">
              <label htmlFor="interestRate">Interest Rate</label>
              <div className="mc-input-wrapper">
                <input
                  id="interestRate"
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  min="0"
                  max="20"
                  step="0.01"
                />
                <span className="mc-percent-symbol">%</span>
              </div>
            </div>

            <div className="mc-input-group">
              <label htmlFor="loanTerm">Loan Term</label>
              <div className="mc-input-wrapper">
                <input
                  id="loanTerm"
                  type="number"
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(e.target.value)}
                  min="1"
                  max="50"
                  step="1"
                />
                <span className="mc-unit-symbol">years</span>
              </div>
            </div>

            <h2>Additional Costs</h2>

            <div className="mc-input-group">
              <label htmlFor="propertyTaxRate">Property Tax Rate</label>
              <div className="mc-input-wrapper">
                <input
                  id="propertyTaxRate"
                  type="number"
                  value={propertyTaxRate}
                  onChange={(e) => setPropertyTaxRate(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <span className="mc-percent-symbol">%</span>
              </div>
            </div>

            <div className="mc-input-group">
              <label htmlFor="insuranceRate">Insurance Rate</label>
              <div className="mc-input-wrapper">
                <input
                  id="insuranceRate"
                  type="number"
                  value={insuranceRate}
                  onChange={(e) => setInsuranceRate(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <span className="mc-percent-symbol">%</span>
              </div>
            </div>

            <div className="mc-input-group">
              <label htmlFor="pmiRate">PMI Rate</label>
              <div className="mc-input-wrapper">
                <input
                  id="pmiRate"
                  type="number"
                  value={pmiRate}
                  onChange={(e) => setPmiRate(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <span className="mc-percent-symbol">%</span>
              </div>
            </div>

            <div className="mc-input-group">
              <label htmlFor="hoaFees">Monthly HOA Fees</label>
              <div className="mc-input-wrapper">
                <span className="mc-currency-symbol">$</span>
                <input
                  id="hoaFees"
                  type="number"
                  value={hoaFees}
                  onChange={(e) => setHoaFees(e.target.value)}
                  min="0"
                  step="10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="mc-results-panel">
          {result && (
            <>
              <div className="mc-summary-cards">
                <div className="mc-summary-card mc-primary">
                  <div className="mc-card-header">
                    <h3>Monthly Payment</h3>
                  </div>
                  <div className="mc-card-value">
                    {formatCurrency(result.totalMonthlyPayment)}
                  </div>
                  <div className="mc-card-subtitle">
                    P&I: {formatCurrency(result.monthlyPayment)}
                  </div>
                </div>

                <div className="mc-summary-card">
                  <div className="mc-card-header">
                    <h3>Home Price</h3>
                  </div>
                  <div className="mc-card-value">
                    {formatCurrency(result.homePrice)}
                  </div>
                  <div className="mc-card-subtitle">
                    LTV: {formatPercent(result.loanToValue)}
                  </div>
                </div>

                <div className="mc-summary-card">
                  <div className="mc-card-header">
                    <h3>Total Interest</h3>
                  </div>
                  <div className="mc-card-value mc-interest">
                    {formatCurrency(result.totalInterest)}
                  </div>
                  <div className="mc-card-subtitle">
                    Over {loanTerm} years
                  </div>
                </div>

                <div className="mc-summary-card">
                  <div className="mc-card-header">
                    <h3>Payoff Date</h3>
                  </div>
                  <div className="mc-card-value mc-date">
                    {formatDate(result.payoffDate)}
                  </div>
                  <div className="mc-card-subtitle">
                    {loanTerm * 12} payments
                  </div>
                </div>
              </div>

              <div className="mc-charts-section">
                <div className="mc-chart-container">
                  <h3>Principal vs Interest Over Time</h3>
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
                          backgroundColor: 'rgba(10, 25, 47, 0.95)',
                          border: '1px solid rgba(0, 191, 255, 0.3)',
                          borderRadius: '8px',
                          color: '#e0e0e0'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="totalPrincipalPaid" 
                        stroke="#00bfff" 
                        strokeWidth={2}
                        name="Total Principal Paid"
                        dot={{ fill: '#00bfff', strokeWidth: 2, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalInterestPaid" 
                        stroke="#ff6b6b" 
                        strokeWidth={2}
                        name="Total Interest Paid"
                        dot={{ fill: '#ff6b6b', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mc-pie-container">
                  <h3>Total Cost Breakdown</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
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
                          backgroundColor: 'rgba(10, 25, 47, 0.95)',
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

              <div className="mc-monthly-breakdown">
                <h3>Monthly Payment Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={monthlyPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {monthlyPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={MONTHLY_COLORS[index % MONTHLY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'rgba(10, 25, 47, 0.95)',
                        border: '1px solid rgba(0, 191, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#e0e0e0'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Amortization Table */}
      {result && amortizationData.length > 0 && (
        <div className="mc-table-section">
          <h2>Amortization Schedule</h2>
          <div className="mc-table-container">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Payment #</th>
                  <th>Year</th>
                  <th>Payment</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Balance</th>
                  <th>Total Interest</th>
                </tr>
              </thead>
              <tbody>
                {amortizationData.slice(0, 60).map((payment, index) => (
                  <tr key={payment.month} className={payment.month % 12 === 0 ? 'mc-year-end' : ''}>
                    <td>{payment.month}</td>
                    <td>{payment.year}</td>
                    <td className="mc-payment">{formatCurrency(payment.monthlyPayment)}</td>
                    <td className="mc-principal">{formatCurrency(payment.principalPayment)}</td>
                    <td className="mc-interest">{formatCurrency(payment.interestPayment)}</td>
                    <td className="mc-balance">{formatCurrency(payment.remainingBalance)}</td>
                    <td className="mc-total-interest">{formatCurrency(payment.totalInterestPaid)}</td>
                  </tr>
                ))}
                {amortizationData.length > 60 && (
                  <tr className="mc-more-rows">
                    <td colSpan="7">
                      ... and {amortizationData.length - 60} more payments
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MortgageCalculator; 