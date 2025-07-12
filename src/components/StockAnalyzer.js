import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './StockAnalyzer.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const StockAnalyzer = () => {
  // API & Ticker
  const apiKey = '45dce6a8aa49cafd332393286f49e99f'; // Hardcoded API Key
  const [ticker, setTicker] = useState('AAPL');

  // Inputs
  const [years, setYears] = useState(5);
  const [initialRevenue, setInitialRevenue] = useState(0);
  const [revenueGrowth, setRevenueGrowth] = useState(10);
  const [initialMargin, setInitialMargin] = useState(0);
  const [marginGrowth, setMarginGrowth] = useState(1);
  const [sharesOutstanding, setSharesOutstanding] = useState(0);
  const [sharesChange, setSharesChange] = useState(-1);
  const [dividendYield, setDividendYield] = useState(0);
  const [peRatio, setPeRatio] = useState(25);
  const [currentStockPrice, setCurrentStockPrice] = useState(0);

  // Data & Results
  const [data, setData] = useState([]);
  const [expectedReturn, setExpectedReturn] = useState({ totalReturn: 0, annualizedReturn: 0 });
  const [error, setError] = useState('');
  const [activeChartTab, setActiveChartTab] = useState('revenue');

  const [revenueCAGR, setRevenueCAGR] = useState({ '1Y': 0, '2Y': 0, '5Y': 0 });
  const [earningsCAGR, setEarningsCAGR] = useState({ '1Y': 0, '2Y': 0, '5Y': 0 });
  const [fairValueCAGR, setFairValueCAGR] = useState({ '1Y': 0, '2Y': 0, '5Y': 0 });

  const calculateCAGR = (values, numYears) => {
    if (values.length < numYears + 1 || values[0] === 0) return 0;
    return (Math.pow(values[numYears] / values[0], 1 / numYears) - 1) * 100;
  };

  const fetchFinancialData = useCallback(async () => {
    if (!ticker || !apiKey) {
      setError('Please enter a stock ticker.');
      return;
    }
    setError('');
    try {
      const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`;
      const incomeUrl = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=1&apikey=${apiKey}`;
      const quoteUrl = `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${apiKey}`;

      const [profileRes, incomeRes, quoteRes] = await Promise.all([
        axios.get(profileUrl),
        axios.get(incomeUrl),
        axios.get(quoteUrl),
      ]);

      const profile = profileRes.data[0];
      const income = incomeRes.data[0];
      const quote = quoteRes.data[0];

      if (profile && income && quote) {
        setInitialRevenue(income.revenue / 1e9);
        setInitialMargin((income.netIncome / income.revenue) * 100);
        setSharesOutstanding(quote.sharesOutstanding / 1e9);
        setCurrentStockPrice(profile.price);
        setDividendYield(profile.lastDiv ? (profile.lastDiv / profile.price) * 100 : 0);
      } else {
        setError('No data found for this ticker. Check the ticker.');
      }
    } catch (err) {
      setError('Failed to fetch financial data. Check the ticker or API key.');
      console.error(err);
    }
  }, [ticker, apiKey]);

  const calculateData = useCallback(() => {
    let currentRevenue = parseFloat(initialRevenue) || 0;
    let currentMargin = parseFloat(initialMargin) || 0;
    let currentShares = parseFloat(sharesOutstanding) || 0;
    let currentStockPriceVal = parseFloat(currentStockPrice) || 0; 

    const newData = [];
    const revenuesForCAGR = [];
    const earningsForCAGR = [];
    const fairValuesForCAGR = [];
    let totalDividends = 0;

    const initialEarnings = currentRevenue * (currentMargin / 100);
    const initialEPS = currentShares > 0 ? initialEarnings / currentShares : 0;
    const initialEstimatedFairValue = initialEPS * (parseFloat(peRatio) || 0);
    const initialDividendPerShare = initialEstimatedFairValue * ((parseFloat(dividendYield) || 0) / 100);

    newData.push({
        year: new Date().getFullYear(),
        revenue: currentRevenue.toFixed(2),
        revenueGrowth: 0, 
        earnings: initialEarnings.toFixed(2),
        earningsGrowth: 0, 
        netMargin: currentMargin.toFixed(2),
        shares: currentShares.toFixed(2),
        eps: initialEPS.toFixed(2),
        dividendPerShare: initialDividendPerShare.toFixed(2),
        estimatedFairValue: initialEstimatedFairValue.toFixed(2),
    });

    revenuesForCAGR.push(currentRevenue);
    earningsForCAGR.push(initialEarnings);
    fairValuesForCAGR.push(initialEstimatedFairValue); 

    let prevRevenue = currentRevenue;
    let prevEarnings = initialEarnings;
    let prevShares = currentShares;
    let prevMargin = currentMargin;

    for (let i = 1; i <= years; i++) { 
        const projectedRevenue = prevRevenue * (1 + (parseFloat(revenueGrowth) || 0) / 100);
        const projectedMargin = prevMargin * (1 + (parseFloat(marginGrowth) || 0) / 100); 
        const projectedEarnings = projectedRevenue * (projectedMargin / 100);
        
        const revenueYoY = ((projectedRevenue / prevRevenue - 1) * 100);
        const earningsYoY = ((projectedEarnings / prevEarnings - 1) * 100);

        const netMargin = projectedRevenue > 0 ? (projectedEarnings / projectedRevenue) * 100 : 0;
        const projectedShares = prevShares * (1 + (parseFloat(sharesChange) || 0) / 100);
        const projectedEPS = projectedShares > 0 ? projectedEarnings / projectedShares : 0;
        const projectedFairValue = projectedEPS * (parseFloat(peRatio) || 0);
        const projectedDividendPerShare = projectedFairValue * ((parseFloat(dividendYield) || 0) / 100);
        totalDividends += projectedDividendPerShare;

        newData.push({
            year: new Date().getFullYear() + i,
            revenue: projectedRevenue.toFixed(2),
            revenueGrowth: revenueYoY.toFixed(2),
            earnings: projectedEarnings.toFixed(2),
            earningsGrowth: earningsYoY.toFixed(2),
            netMargin: netMargin.toFixed(2),
            shares: projectedShares.toFixed(2),
            eps: projectedEPS.toFixed(2),
            dividendPerShare: projectedDividendPerShare.toFixed(2),
            estimatedFairValue: projectedFairValue.toFixed(2),
        });

        prevRevenue = projectedRevenue;
        prevEarnings = projectedEarnings;
        prevShares = projectedShares;
        prevMargin = projectedMargin;

        revenuesForCAGR.push(projectedRevenue);
        earningsForCAGR.push(projectedEarnings);
        fairValuesForCAGR.push(projectedFairValue);
    }
    setData(newData);

    const finalFairValue = parseFloat(newData[newData.length - 1]?.estimatedFairValue) || 0;
    if (currentStockPriceVal > 0) {
        const finalValue = finalFairValue + totalDividends;
        const totalReturn = ((finalValue / currentStockPriceVal) - 1) * 100;
        const annualizedReturn = (Math.pow(finalValue / currentStockPriceVal, 1 / years) - 1) * 100;
        setExpectedReturn({ totalReturn, annualizedReturn });
    } else {
        setExpectedReturn({ totalReturn: 0, annualizedReturn: 0 });
    }

    setRevenueCAGR({
        '1Y': calculateCAGR(revenuesForCAGR, 1),
        '2Y': calculateCAGR(revenuesForCAGR, 2),
        '5Y': calculateCAGR(revenuesForCAGR, 5),
    });
    setEarningsCAGR({ 
        '1Y': calculateCAGR(earningsForCAGR, 1),
        '2Y': calculateCAGR(earningsForCAGR, 2),
        '5Y': calculateCAGR(earningsForCAGR, 5),
    });
    setFairValueCAGR({
        '1Y': calculateCAGR(fairValuesForCAGR, 1),
        '2Y': calculateCAGR(fairValuesForCAGR, 2),
        '5Y': calculateCAGR(fairValuesForCAGR, 5),
    });

  }, [years, initialRevenue, revenueGrowth, initialMargin, marginGrowth, sharesOutstanding, sharesChange, dividendYield, peRatio, currentStockPrice]);

  useEffect(() => {
    calculateData();
  }, [calculateData]);

  const getChartDataAndOptions = () => {
    let chartLabel = '';
    let chartValues = [];
    let chartColor = '';
    let cagrData = {};

    switch (activeChartTab) {
      case 'revenue':
        chartLabel = 'Revenue ($B)';
        chartValues = data.map((d) => parseFloat(d.revenue));
        chartColor = '#00bfff';
        cagrData = revenueCAGR;
        break;
      case 'earnings':
        chartLabel = 'Earnings ($B)';
        chartValues = data.map((d) => parseFloat(d.earnings));
        chartColor = '#32cd32';
        cagrData = earningsCAGR;
        break;
      case 'fairValue':
        chartLabel = 'Fair Value ($)';
        chartValues = data.map((d) => parseFloat(d.estimatedFairValue));
        chartColor = '#ffdf00';
        cagrData = fairValueCAGR;
        break;
      default:
        break;
    }

    const chartData = {
      labels: data.map((d) => d.year),
      datasets: [
        {
          label: chartLabel,
          data: chartValues,
          backgroundColor: chartColor,
          borderColor: chartColor,
          borderWidth: 1,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#ccc' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
        },
        x: {
          ticks: { color: '#ccc' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
        },
      },
      plugins: {
        legend: { labels: { color: '#fff' } },
      },
    };

    return { chartData, chartOptions, cagrData };
  };

  const { chartData, chartOptions, cagrData } = getChartDataAndOptions();

  return (
    <div className="stock-analyzer">
      {/* Header */}
      <div className="sa-header">
        <h1>Stock Analyzer</h1>
        <p>Analyze and project stock performance with advanced financial modeling</p>
      </div>

      {/* Error Message */}
      {error && <div className="sa-error-message">{error}</div>}

      {/* Main Content Grid */}
      <div className="sa-main-content">
        {/* Left Panel - Inputs */}
        <div className="sa-inputs-panel">
          <h2>Investment Parameters</h2>
          
          <div className="sa-inputs-grid">
            <div className="sa-input-group">
              <label>Stock Ticker</label>
              <input 
                type="text" 
                value={ticker} 
                onChange={(e) => setTicker(e.target.value.toUpperCase())} 
                placeholder="Enter ticker (e.g., AAPL)"
              />
            </div>
            
            <div className="sa-input-group">
              <label>Years</label>
              <input 
                type="number" 
                value={years} 
                onChange={(e) => setYears(e.target.value)} 
              />
            </div>
            
            <div className="sa-input-group">
              <label>Revenue ($B)</label>
              <input 
                type="number" 
                value={initialRevenue} 
                onChange={(e) => setInitialRevenue(e.target.value)} 
              />
            </div>
            
            <div className="sa-input-group">
              <label>Revenue Growth (%)</label>
              <input 
                type="number" 
                value={revenueGrowth} 
                onChange={(e) => setRevenueGrowth(e.target.value)} 
              />
            </div>
            
            <div className="sa-input-group">
              <label>Net Margin (%)</label>
              <input 
                type="number" 
                value={initialMargin} 
                onChange={(e) => setInitialMargin(e.target.value)} 
              />
            </div>
            
            <div className="sa-input-group">
              <label>Margin Growth (%)</label>
              <input 
                type="number" 
                value={marginGrowth} 
                onChange={(e) => setMarginGrowth(e.target.value)} 
              />
            </div>
            
            <div className="sa-input-group">
              <label>Shares Out. (B)</label>
              <input 
                type="number" 
                value={sharesOutstanding} 
                onChange={(e) => setSharesOutstanding(e.target.value)} 
              />
            </div>
            
            <div className="sa-input-group">
              <label>Shares Change (%)</label>
              <input 
                type="number" 
                value={sharesChange} 
                onChange={(e) => setSharesChange(e.target.value)} 
              />
            </div>
            
            <div className="sa-input-group">
              <label>Exit P/E Ratio</label>
              <input 
                type="number" 
                value={peRatio} 
                onChange={(e) => setPeRatio(e.target.value)} 
              />
            </div>
            
            <div className="sa-input-group">
              <label>Current Stock Price ($)</label>
              <input 
                type="number" 
                value={currentStockPrice} 
                onChange={(e) => setCurrentStockPrice(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="sa-fetch-button-container">
            <button onClick={fetchFinancialData} className="sa-fetch-button">
              Fetch Data
            </button>
          </div>
        </div>

        {/* Right Panel - Chart */}
        <div className="sa-chart-panel">
          <div className="sa-chart-tabs">
            <button 
              className={activeChartTab === 'revenue' ? 'active' : ''} 
              onClick={() => setActiveChartTab('revenue')}
            >
              Revenue
            </button>
            <button 
              className={activeChartTab === 'earnings' ? 'active' : ''} 
              onClick={() => setActiveChartTab('earnings')}
            >
              Earnings
            </button>
            <button 
              className={activeChartTab === 'fairValue' ? 'active' : ''} 
              onClick={() => setActiveChartTab('fairValue')}
            >
              Fair Value
            </button>
          </div>
          
          <div className="sa-chart-container">
            <Bar data={chartData} options={chartOptions} />
          </div>
          
          <div className="sa-cagr-display">
            <h4>CAGR:</h4>
            <div className="sa-cagr-values">
              <span>1Y: {cagrData['1Y'].toFixed(2)}%</span>
              <span>2Y: {cagrData['2Y'].toFixed(2)}%</span>
              <span>5Y: {cagrData['5Y'].toFixed(2)}%</span>
            </div>
          </div>
          
          <div className="sa-return-display">
            <h4>Expected Return:</h4>
            <div className="sa-return-values">
              <span>Total: {expectedReturn.totalReturn.toFixed(2)}%</span>
              <span>CAGR: {expectedReturn.annualizedReturn.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="sa-table-section">
        <h2>Financial Projections</h2>
        <div className="sa-table-container">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Metric</th>
                {data.map((d) => (
                  <th key={d.year}>{d.year}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Revenue ($B)</td>
                {data.map((d, i) => (
                  <td key={i}>
                    <span>{d.revenue}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td>Revenue Growth (%)</td>
                {data.map((d, i) => (
                  <td key={i}>
                    <span>{d.revenueGrowth}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td>Earnings ($B)</td>
                {data.map((d, i) => (
                  <td key={i}>
                    <span>{d.earnings}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td>Earnings Growth (%)</td>
                {data.map((d, i) => (
                  <td key={i}>
                    <span>{d.earningsGrowth}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td>Net Margin (%)</td>
                {data.map((d, i) => (
                  <td key={i}>
                    <span>{d.netMargin}</span>
                  </td>
                ))}
              </tr>
              <tr className="sa-separator">
                <td colSpan={data.length + 1}></td>
              </tr>
              <tr>
                <td>Shares Outstanding (B)</td>
                {data.map((d, i) => (
                  <td key={i}>
                    <span>{d.shares}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td>Earnings Per Share ($)</td>
                {data.map((d, i) => (
                  <td key={i}>
                    <span>{d.eps}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td>Dividend Per Share ($)</td>
                {data.map((d, i) => (
                  <td key={i}>
                    <span>{d.dividendPerShare}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td>Estimated Fair Value ($)</td>
                {data.map((d, i) => (
                  <td key={i}>
                    <span>{d.estimatedFairValue}</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockAnalyzer;