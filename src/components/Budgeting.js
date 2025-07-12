import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import './Budgeting.css';

const EXPENSE_COLORS = [
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#1d4ed8', // blue-700
  '#c026d3', // fuchsia-600
  '#e11d48', // rose-600
  '#7c3aed', // violet-700
  '#14b8a6', // teal-500
  '#a16207', // yellow-brown
  '#78350f', // dark brown
];

const FilingStatus = {
  Single: 'Single',
  MarriedFilingJointly: 'Married Filing Jointly',
  HeadOfHousehold: 'Head of Household',
};

const STANDARD_DEDUCTIONS = {
  [FilingStatus.Single]: 15000,
  [FilingStatus.MarriedFilingJointly]: 30000,
  [FilingStatus.HeadOfHousehold]: 22500,
};

const Budgeting = () => {
  const [annualIncome, setAnnualIncome] = useState(50000);
  const [filingStatus, setFilingStatus] = useState(FilingStatus.Single);
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ name: '', amount: '' });

  // Tax Calculations
  const calculateFederalTax = (income) => {
    const deduction = STANDARD_DEDUCTIONS[filingStatus] || 0;
    const taxable = Math.max(income - deduction, 0);
    const brackets = [
      { limit: 11925, rate: 0.1 },
      { limit: 48475, rate: 0.12 },
      { limit: 103350, rate: 0.22 },
      { limit: 197300, rate: 0.24 },
      { limit: 250525, rate: 0.32 },
      { limit: 626350, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ];
    let tax = 0, prev = 0;
    for (const { limit, rate } of brackets) {
      if (taxable > limit) {
        tax += (limit - prev) * rate;
        prev = limit;
      } else {
        tax += (taxable - prev) * rate;
        break;
      }
    }
    return tax;
  };

  const calculateFICATax = (income) => {
    const SS_CAP = 176100;
    const ss = Math.min(income, SS_CAP) * 0.062;
    const medicare = income * 0.0145;
    const extra = income > 200000 ? (income - 200000) * 0.009 : 0;
    return ss + medicare + extra;
  };

  const calculateStateTax = (income) => {
    const brackets = [
      { limit: 32570, rate: 0.0535 },
      { limit: 131430, rate: 0.068 },
      { limit: 229360, rate: 0.0785 },
      { limit: Infinity, rate: 0.0985 },
    ];
    let tax = 0, prev = 0;
    for (const { limit, rate } of brackets) {
      if (income > limit) {
        tax += (limit - prev) * rate;
        prev = limit;
      } else {
        tax += (income - prev) * rate;
        break;
      }
    }
    return tax;
  };

  // Monthly Calculations
  const monthlyGross = annualIncome / 12;
  const annualFed = calculateFederalTax(annualIncome);
  const annualFica = calculateFICATax(annualIncome);
  const annualState = calculateStateTax(annualIncome);
  const monthlyFed = annualFed / 12;
  const monthlyFica = annualFica / 12;
  const monthlyState = annualState / 12;
  const totalMonthlyTax = monthlyFed + monthlyFica + monthlyState;
  const monthlyNet = monthlyGross - totalMonthlyTax;
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining = monthlyNet - totalExpenses;

  const handleAddExpense = () => {
    if (newExpense.name && newExpense.amount > 0) {
      setExpenses([...expenses, newExpense]);
      setNewExpense({ name: '', amount: '' });
    }
  };

  const handleRemoveExpense = (index) => {
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  // Chart Data
  const pieChartData = [
    ...expenses.map(e => ({
      name: e.name,
      value: Number(e.amount)
    })),
    {
      name: 'Surplus',
      value: remaining
    }
  ];

  // Investment Projection
  const annualSurplus = remaining * 12;
  const investmentData = [];
  let projValue = 0;
  for (let y = 1; y <= 20; y++) {
    projValue = projValue * 1.09 + annualSurplus;
    investmentData.push({
      year: y,
      NetWorth: projValue,
      isProjection: true
    });
  }

  return (
    <div className="budgeting">
      <div className="budget-header">
        <h1>Budget Planner</h1>
        <p>Track your income, expenses, and savings with comprehensive tax calculations</p>
      </div>

      <div className="budget-container">
        {/* Left Panel: Calculator */}
        <div className="calculator-panel">
          <h2>Financial Calculator</h2>
          
          {/* Income Section */}
          <div className="section">
            <h3>Annual Income</h3>
            <div className="input-group">
              <label>Gross Income ($)</label>
              <input
                type="number"
                value={annualIncome}
                onChange={(e) => setAnnualIncome(Number(e.target.value))}
                min="0"
              />
            </div>
            <div className="input-group">
              <label>Filing Status</label>
              <select
                value={filingStatus}
                onChange={(e) => setFilingStatus(e.target.value)}
              >
                {Object.values(FilingStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Expense Section */}
          <div className="section">
            <h2>Add Monthly Expense</h2>
            <div className="expense-inputs">
              <input
                type="text"
                placeholder="Expense Name"
                value={newExpense.name}
                onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
              />
              <input
                type="number"
                placeholder="Amount"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                min="0"
              />
              <button onClick={handleAddExpense}>Add</button>
            </div>
          </div>

          

          {/* Expense List */}
          <div className="section">
            <h2>Current Expenses</h2>
            <div className="expense-list">
              {expenses.map((expense, index) => (
                <div key={index} className="expense-item">
                  <span>{expense.name}</span>
                  <span>${Number(expense.amount).toFixed(2)}</span>
                  <button onClick={() => handleRemoveExpense(index)}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Charts */}
        <div className="charts-panel">
          <div className="chart-section">
            <h2>Expenses vs. Surplus</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name === 'Surplus' ? '#22c55e' : EXPENSE_COLORS[index % EXPENSE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Summary */}
          <div className="section">
            <h2>Monthly Summary</h2>
            <div className="summary-grid">
              <div className="summary-section">
                <h3>Taxes</h3>
                <div className="summary-item">
                  <span>Federal Tax:</span>
                  <span>${monthlyFed.toFixed(2)}</span>
                </div>
                <div className="summary-item">
                  <span>FICA Tax:</span>
                  <span>${monthlyFica.toFixed(2)}</span>
                </div>
                <div className="summary-item">
                  <span>State Tax:</span>
                  <span>${monthlyState.toFixed(2)}</span>
                </div>
                <div className="summary-item total">
                  <span>Total Tax:</span>
                  <span>${totalMonthlyTax.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="summary-section">
                <h3>Income</h3>
                <div className="summary-item">
                  <span>Gross Income:</span>
                  <span>${monthlyGross.toFixed(2)}</span>
                </div>
                <div className="summary-item">
                  <span>Net Income:</span>
                  <span>${monthlyNet.toFixed(2)}</span>
                </div>
                <div className="summary-item">
                  <span>Total Expenses:</span>
                  <span>${totalExpenses.toFixed(2)}</span>
                </div>
                <div className="summary-item total">
                  <span>Remaining:</span>
                  <span className={remaining >= 0 ? 'positive' : 'negative'}>
                    ${Math.abs(remaining).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Budgeting; 