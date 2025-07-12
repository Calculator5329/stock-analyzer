import React, { useState, useEffect } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import './RetirementPlanner.css';

// Social Security calculation constants
const SOCIAL_SECURITY_BENEFITS = {
  // Full retirement age (FRA) based on birth year
  fullRetirementAge: 67, // For people born 1960 or later
  // Benefit reduction for early claiming (before FRA)
  earlyReduction: 0.0055, // 5.5% reduction per year before FRA
  // Benefit increase for delayed claiming (after FRA)
  delayedIncrease: 0.08, // 8% increase per year after FRA
  // Maximum benefit at FRA (2024)
  maxBenefitAtFRA: 3744, // Monthly maximum
  // Average benefit (2024)
  averageBenefit: 1854, // Monthly average
};

const defaultInputs = {
  currentAge: 30,
  retirementAge: 65,
  currentSavings: 50000,
  monthlyContribution: 1000,
  expectedReturn: 7,
  desiredRetirementIncome: 80000,
  inflationRate: 2.5,
  currentSalary: 75000,
  salaryGrowthRate: 3,
  retirementDuration: 25,
  // Social Security will be auto-calculated
  socialSecurityAge: 67,
  expectedSocialSecurity: 0, // Will be calculated
};

const RetirementPlanner = () => {
  const [inputs, setInputs] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('retirement_inputs') || 'null');
    const initialInputs = saved || defaultInputs;
    
    // Auto-calculate social security if not set
    if (!saved || saved.expectedSocialSecurity === 0) {
      initialInputs.expectedSocialSecurity = calculateSocialSecurity(initialInputs.currentSalary, initialInputs.socialSecurityAge);
    }
    
    return initialInputs;
  });
  const [activeTab, setActiveTab] = useState('inputs');
  const [projections, setProjections] = useState({
    yearlyData: [],
    retirementIncome: [],
    nestEgg: 0,
    withdrawalIncome: 0,
    incomeShortfall: 0,
    totalContributions: 0,
    totalGrowth: 0,
    socialSecurityTotal: 0,
    recommendedSavings: 0,
    socialSecurityDetails: {}
  });

  // Calculate Social Security benefit based on income and claiming age
  function calculateSocialSecurity(annualIncome, claimingAge) {
    const fra = SOCIAL_SECURITY_BENEFITS.fullRetirementAge;
    let monthlyBenefit;
    
    // Calculate base benefit at full retirement age
    if (annualIncome <= 50000) {
      // Lower income: 40% replacement rate
      monthlyBenefit = (annualIncome * 0.40) / 12;
    } else if (annualIncome <= 100000) {
      // Medium income: 30% replacement rate
      monthlyBenefit = (annualIncome * 0.30) / 12;
    } else if (annualIncome <= 150000) {
      // Higher income: 25% replacement rate
      monthlyBenefit = (annualIncome * 0.25) / 12;
    } else {
      // High income: 20% replacement rate (capped by maximum)
      monthlyBenefit = Math.min((annualIncome * 0.20) / 12, SOCIAL_SECURITY_BENEFITS.maxBenefitAtFRA);
    }
    
    // Adjust for claiming age
    if (claimingAge < fra) {
      // Early claiming: reduce benefit
      const yearsEarly = fra - claimingAge;
      const reduction = yearsEarly * SOCIAL_SECURITY_BENEFITS.earlyReduction;
      monthlyBenefit *= (1 - reduction);
    } else if (claimingAge > fra) {
      // Delayed claiming: increase benefit
      const yearsDelayed = claimingAge - fra;
      const increase = yearsDelayed * SOCIAL_SECURITY_BENEFITS.delayedIncrease;
      monthlyBenefit *= (1 + increase);
    }
    
    return Math.round(monthlyBenefit);
  }

  // Find optimal Social Security claiming age
  function findOptimalClaimingAge(annualIncome) {
    let maxBenefit = 0;
    let optimalAge = SOCIAL_SECURITY_BENEFITS.fullRetirementAge;
    
    for (let age = 62; age <= 70; age++) {
      const benefit = calculateSocialSecurity(annualIncome, age);
      if (benefit > maxBenefit) {
        maxBenefit = benefit;
        optimalAge = age;
      }
    }
    
    return optimalAge;
  }

  useEffect(() => {
    localStorage.setItem('retirement_inputs', JSON.stringify(inputs));
    calculateProjections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs]);

  const handleChange = (field, value) => {
    const newInputs = { ...inputs, [field]: value };
    
    // Auto-update social security when salary changes
    if (field === 'currentSalary') {
      const optimalAge = findOptimalClaimingAge(value);
      newInputs.socialSecurityAge = optimalAge;
      newInputs.expectedSocialSecurity = calculateSocialSecurity(value, optimalAge);
    }
    
    // Auto-update social security when claiming age changes
    if (field === 'socialSecurityAge') {
      newInputs.expectedSocialSecurity = calculateSocialSecurity(newInputs.currentSalary, value);
    }
    
    setInputs(newInputs);
  };

  const calculateProjections = () => {
    const {
      currentAge,
      retirementAge,
      currentSavings,
      monthlyContribution,
      expectedReturn,
      desiredRetirementIncome,
      inflationRate,
      expectedSocialSecurity,
      currentSalary,
      salaryGrowthRate,
    } = inputs;

    const yearsToRetirement = Math.max(retirementAge - currentAge, 0);
    const monthsToRetirement = yearsToRetirement * 12;
    const r = (expectedReturn / 100) / 12;

    // Calculate yearly projections
    const yearlyData = [];
    let balance = currentSavings;
    let totalContributions = currentSavings;
    let salary = currentSalary;

    for (let year = 0; year <= yearsToRetirement; year++) {
      const age = currentAge + year;
      const yearlyContribution = monthlyContribution * 12;
      
      if (year > 0) {
        // Add yearly contribution
        balance += yearlyContribution;
        totalContributions += yearlyContribution;
        
        // Apply growth
        balance *= (1 + expectedReturn / 100);
        
        // Update salary
        salary *= (1 + salaryGrowthRate / 100);
      }

      yearlyData.push({
        age,
        year: new Date().getFullYear() + year,
        balance: Math.round(balance),
        contributions: Math.round(totalContributions),
        growth: Math.round(balance - totalContributions),
        salary: Math.round(salary),
        isRetirement: age >= retirementAge
      });
    }

    const nestEgg = balance;
    const totalGrowth = nestEgg - totalContributions;

    // Calculate retirement income sources
    const withdrawalIncome = nestEgg * 0.04; // 4% rule
    const socialSecurityIncome = expectedSocialSecurity * 12;
    const totalRetirementIncome = withdrawalIncome + socialSecurityIncome;

    // Adjust desired income for inflation
    const inflationAdj = Math.pow(1 + inflationRate / 100, yearsToRetirement);
    const desiredIncomeInflated = desiredRetirementIncome * inflationAdj;

    const incomeShortfall = desiredIncomeInflated - totalRetirementIncome;

    // Calculate recommended savings if there's a shortfall
    let recommendedSavings = monthlyContribution;
    if (incomeShortfall > 0) {
      const additionalNeeded = incomeShortfall / 0.04;
      const additionalMonthly = (additionalNeeded / ((Math.pow(1 + r, monthsToRetirement) - 1) / r));
      recommendedSavings = monthlyContribution + additionalMonthly;
    }

    // Create retirement income breakdown
    const retirementIncome = [
      { source: 'Investment Withdrawals', amount: withdrawalIncome, percentage: (withdrawalIncome / totalRetirementIncome) * 100 },
      { source: 'Social Security', amount: socialSecurityIncome, percentage: (socialSecurityIncome / totalRetirementIncome) * 100 }
    ];

    // Social Security details for display
    const socialSecurityDetails = {
      fullRetirementAge: SOCIAL_SECURITY_BENEFITS.fullRetirementAge,
      optimalAge: findOptimalClaimingAge(currentSalary),
      benefitAtFRA: calculateSocialSecurity(currentSalary, SOCIAL_SECURITY_BENEFITS.fullRetirementAge),
      benefitAtOptimal: calculateSocialSecurity(currentSalary, findOptimalClaimingAge(currentSalary)),
      benefitAtCurrent: expectedSocialSecurity
    };

    setProjections({
      yearlyData,
      retirementIncome,
      nestEgg,
      withdrawalIncome,
      incomeShortfall,
      totalContributions,
      totalGrowth,
      socialSecurityTotal: socialSecurityIncome,
      recommendedSavings,
      socialSecurityDetails
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const COLORS = ['#00bfff', '#32cd32', '#ffdf00', '#ff4d4d'];

  return (
    <div className="retirement-planner">
      <div className="rp-header">
        <h1>Retirement Planner</h1>
        <p>Plan your retirement with detailed projections and Social Security optimization</p>
      </div>

      <div className="rp-main-content">
        <div className="rp-tabs">
          <button 
            className={activeTab === 'inputs' ? 'active' : ''} 
            onClick={() => setActiveTab('inputs')}
          >
            Input Parameters
          </button>
          <button 
            className={activeTab === 'projections' ? 'active' : ''} 
            onClick={() => setActiveTab('projections')}
          >
            Growth Projections
          </button>
          <button 
            className={activeTab === 'income' ? 'active' : ''} 
            onClick={() => setActiveTab('income')}
          >
            Retirement Income
          </button>
          <button 
            className={activeTab === 'analysis' ? 'active' : ''} 
            onClick={() => setActiveTab('analysis')}
          >
            Analysis & Recommendations
          </button>
        </div>

        {activeTab === 'inputs' && (
          <div className="rp-inputs-section">
            <div className="rp-input-grid">
              <div className="rp-input-group">
                <h3>Personal Information</h3>
                <div className="rp-input">
                  <label>Current Age</label>
                  <input type="number" value={inputs.currentAge} onChange={e => handleChange('currentAge', Number(e.target.value))} />
                </div>
                <div className="rp-input">
                  <label>Retirement Age</label>
                  <input type="number" value={inputs.retirementAge} onChange={e => handleChange('retirementAge', Number(e.target.value))} />
                </div>
                <div className="rp-input">
                  <label>Current Annual Salary ($)</label>
                  <input type="number" value={inputs.currentSalary} onChange={e => handleChange('currentSalary', Number(e.target.value))} />
                </div>
                <div className="rp-input">
                  <label>Salary Growth Rate (%)</label>
                  <input type="number" step="0.1" value={inputs.salaryGrowthRate} onChange={e => handleChange('salaryGrowthRate', Number(e.target.value))} />
                </div>
              </div>

              <div className="rp-input-group">
                <h3>Savings & Investments</h3>
                <div className="rp-input">
                  <label>Current Savings ($)</label>
                  <input type="number" value={inputs.currentSavings} onChange={e => handleChange('currentSavings', Number(e.target.value))} />
                </div>
                <div className="rp-input">
                  <label>Monthly Contribution ($)</label>
                  <input type="number" value={inputs.monthlyContribution} onChange={e => handleChange('monthlyContribution', Number(e.target.value))} />
                </div>
                <div className="rp-input">
                  <label>Expected Return (%)</label>
                  <input type="number" step="0.1" value={inputs.expectedReturn} onChange={e => handleChange('expectedReturn', Number(e.target.value))} />
                </div>
                <div className="rp-input">
                  <label>Inflation Rate (%)</label>
                  <input type="number" step="0.1" value={inputs.inflationRate} onChange={e => handleChange('inflationRate', Number(e.target.value))} />
                </div>
              </div>

              <div className="rp-input-group">
                <h3>Retirement Planning</h3>
                <div className="rp-input">
                  <label>Desired Annual Income ($)</label>
                  <input type="number" value={inputs.desiredRetirementIncome} onChange={e => handleChange('desiredRetirementIncome', Number(e.target.value))} />
                </div>
                <div className="rp-input">
                  <label>Social Security Claiming Age</label>
                  <input type="number" value={inputs.socialSecurityAge} onChange={e => handleChange('socialSecurityAge', Number(e.target.value))} min="62" max="70" />
                </div>
                <div className="rp-input">
                  <label>Expected Social Security ($/month)</label>
                  <input type="number" value={inputs.expectedSocialSecurity} onChange={e => handleChange('expectedSocialSecurity', Number(e.target.value))} />
                </div>
                <div className="rp-input">
                  <label>Retirement Duration (years)</label>
                  <input type="number" value={inputs.retirementDuration} onChange={e => handleChange('retirementDuration', Number(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="rp-social-security-info">
              <h3>Social Security Information</h3>
              <div className="rp-ss-details">
                <div className="rp-ss-item">
                  <span>Full Retirement Age:</span>
                  <span>{SOCIAL_SECURITY_BENEFITS.fullRetirementAge}</span>
                </div>
                <div className="rp-ss-item">
                  <span>Optimal Claiming Age:</span>
                  <span>{projections.socialSecurityDetails?.optimalAge || 67}</span>
                </div>
                <div className="rp-ss-item">
                  <span>Benefit at Full Retirement Age:</span>
                  <span>{formatCurrency(projections.socialSecurityDetails?.benefitAtFRA || 0)}/month</span>
                </div>
                <div className="rp-ss-item">
                  <span>Benefit at Optimal Age:</span>
                  <span>{formatCurrency(projections.socialSecurityDetails?.benefitAtOptimal || 0)}/month</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projections' && (
          <div className="rp-projections-section">
            <div className="rp-chart-container">
              <h3>Retirement Savings Growth</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={projections.yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="age" tick={{ fill: '#ccc' }} />
                  <YAxis tick={{ fill: '#ccc' }} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="contributions" stackId="1" stroke="#32cd32" fill="#32cd32" fillOpacity={0.6} name="Contributions" />
                  <Area type="monotone" dataKey="growth" stackId="1" stroke="#00bfff" fill="#00bfff" fillOpacity={0.6} name="Growth" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rp-summary-cards">
              <div className="rp-summary-card">
                <h4>Total Nest Egg</h4>
                <p className="rp-amount">{formatCurrency(projections.nestEgg)}</p>
              </div>
              <div className="rp-summary-card">
                <h4>Total Contributions</h4>
                <p className="rp-amount">{formatCurrency(projections.totalContributions)}</p>
              </div>
              <div className="rp-summary-card">
                <h4>Investment Growth</h4>
                <p className="rp-amount">{formatCurrency(projections.totalGrowth)}</p>
              </div>
              <div className="rp-summary-card">
                <h4>Years to Retirement</h4>
                <p className="rp-amount">{inputs.retirementAge - inputs.currentAge}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'income' && (
          <div className="rp-income-section">
            <div className="rp-income-grid">
              <div className="rp-chart-container">
                <h3>Retirement Income Sources</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={projections.retirementIncome}
                      dataKey="amount"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ source, percentage }) => `${source}: ${percentage.toFixed(1)}%`}
                    >
                      {projections.retirementIncome.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="rp-income-breakdown">
                <h3>Monthly Income Breakdown</h3>
                <div className="rp-income-list">
                  {projections.retirementIncome.map((income, index) => (
                    <div key={index} className="rp-income-item">
                      <span className="rp-income-source">{income.source}</span>
                      <span className="rp-income-amount">{formatCurrency(income.amount / 12)}/month</span>
                    </div>
                  ))}
                  <div className="rp-income-item rp-income-total">
                    <span className="rp-income-source">Total Monthly Income</span>
                    <span className="rp-income-amount">
                      {formatCurrency((projections.withdrawalIncome + projections.socialSecurityTotal) / 12)}/month
                    </span>
                  </div>
                  <div className="rp-income-item rp-income-needed">
                    <span className="rp-income-source">Needed Monthly Income</span>
                    <span className="rp-income-amount">
                      {formatCurrency(inputs.desiredRetirementIncome / 12)}/month
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="rp-analysis-section">
            <div className="rp-analysis-grid">
              <div className="rp-analysis-card">
                <h3>Retirement Readiness</h3>
                <div className="rp-readiness-indicator">
                  <div className={`rp-status ${projections.incomeShortfall <= 0 ? 'positive' : 'negative'}`}>
                    {projections.incomeShortfall <= 0 ? '✓ On Track' : '⚠ Needs Improvement'}
                  </div>
                  <p className="rp-gap">
                    Income Shortfall: <span className={projections.incomeShortfall <= 0 ? 'positive' : 'negative'}>
                      {projections.incomeShortfall <= 0 ? 'Surplus: +' : 'Shortfall: '}{formatCurrency(Math.abs(projections.incomeShortfall))}
                    </span>
                  </p>
                  <p className="rp-explanation">
                    {projections.incomeShortfall <= 0 
                      ? 'Your projected retirement income meets or exceeds your desired income.'
                      : 'Your projected retirement income is below your desired income level.'
                    }
                  </p>
                </div>
              </div>

              <div className="rp-analysis-card">
                <h3>Recommendations</h3>
                <div className="rp-recommendations">
                  {projections.incomeShortfall > 0 ? (
                    <>
                      <p>To meet your retirement goals, consider:</p>
                      <ul>
                        <li>Increase monthly savings to {formatCurrency(projections.recommendedSavings)}</li>
                        <li>Work {Math.ceil(projections.incomeShortfall / 20000)} additional years</li>
                        <li>Reduce retirement expenses by {formatCurrency(projections.incomeShortfall)}</li>
                        <li>Delay Social Security to age {projections.socialSecurityDetails?.optimalAge || 67}</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <p>Congratulations! You're on track for retirement.</p>
                      <ul>
                        <li>Continue your current savings plan</li>
                        <li>Consider increasing contributions if income grows</li>
                        <li>Review and rebalance investments annually</li>
                        <li>Consider retiring earlier or increasing lifestyle</li>
                      </ul>
                    </>
                  )}
                </div>
              </div>

              <div className="rp-analysis-card">
                <h3>Key Metrics</h3>
                <div className="rp-metrics">
                  <div className="rp-metric">
                    <span className="rp-metric-label">Income Replacement Ratio</span>
                    <span className="rp-metric-value">
                      {((projections.withdrawalIncome + projections.socialSecurityTotal) / inputs.currentSalary * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="rp-metric">
                    <span className="rp-metric-label">Savings Rate</span>
                    <span className="rp-metric-value">
                      {((inputs.monthlyContribution * 12) / inputs.currentSalary * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="rp-metric">
                    <span className="rp-metric-label">Years to Retirement</span>
                    <span className="rp-metric-value">
                      {inputs.retirementAge - inputs.currentAge} years
                    </span>
                  </div>
                  <div className="rp-metric">
                    <span className="rp-metric-label">Social Security Coverage</span>
                    <span className="rp-metric-value">
                      {((projections.socialSecurityTotal / 12) / ((projections.withdrawalIncome + projections.socialSecurityTotal) / 12) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RetirementPlanner; 