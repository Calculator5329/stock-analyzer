import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingSection.css';

const LandingSection = () => {
  const navigate = useNavigate();
  const style = {
    backgroundImage: `url(${process.env.PUBLIC_URL}/landing_section.png)`
  };

  return (
    <div className="landing-section" style={style}>
      <div className="landing-content">
        <h1>Financial Tools Suite</h1>
        <p>Advanced analytics and calculations for informed financial decisions</p>
        <div className="navigation-buttons">
          <button onClick={() => navigate('/stock-analyzer')} className="nav-button">
            <span>Stock Analyzer</span>
            <p>Analyze stocks and predict future values</p>
          </button>
          <button onClick={() => navigate('/budgeting')} className="nav-button">
            <span>Budget Planner</span>
            <p>Track income, expenses, and savings</p>
          </button>
          <button onClick={() => navigate('/compound-interest')} className="nav-button">
            <span>Compound Interest</span>
            <p>Calculate investment growth over time</p>
          </button>
          <button onClick={() => navigate('/mortgage-calculator')} className="nav-button">
            <span>Mortgage Calculator</span>
            <p>Calculate monthly payments and amortization</p>
          </button>
          <button onClick={() => navigate('/retirement-planner')} className="nav-button">
            <span>Retirement Planner</span>
            <p>Plan your retirement with detailed projections</p>
          </button>
          <button onClick={() => navigate('/expense-analyzer')} className="nav-button">
            <span>Expense Analyzer</span>
            <p>Analyze spending patterns and categorize expenses</p>
          </button>
          <button onClick={() => navigate('/portfolio-tracker')} className="nav-button">
            <span>Portfolio Tracker</span>
            <p>Track your investment portfolio performance</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingSection; 