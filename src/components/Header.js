import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'HOME', icon: '⌂' },
    { path: '/stock-analyzer', label: 'STOCK ANALYZER', icon: '📈' },
    { path: '/budgeting', label: 'BUDGET PLANNER', icon: '📊' },
    { path: '/compound-interest', label: 'COMPOUND INTEREST', icon: '💰' },
    { path: '/mortgage-calculator', label: 'MORTGAGE CALCULATOR', icon: '🏠' },
    { path: '/retirement-planner', label: 'RETIREMENT', icon: '⏳' },
    { path: '/expense-analyzer', label: 'EXPENSES', icon: '💸' },
    { path: '/portfolio-tracker', label: 'PORTFOLIO', icon: '📂' }
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <header className="sci-fi-header">
      <div className="header-background"></div>
      <div className="header-content">
        <div className="header-left">
          <div className="logo-section">
            <div className="logo-icon">⚡</div>
            <div className="logo-text">
              <span className="logo-main">FINANCIAL</span>
              <span className="logo-sub">SUITE</span>
            </div>
          </div>
        </div>
        
        <nav className="nav-tabs">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`nav-tab ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => handleNavigation(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              <div className="nav-glow"></div>
            </button>
          ))}
        </nav>
        
        <div className="header-right">
          <div className="status-indicator">
            <div className="status-dot"></div>
            <span className="status-text">ONLINE</span>
          </div>
        </div>
      </div>
      <div className="header-border"></div>
    </header>
  );
};

export default Header; 