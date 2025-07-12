import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import './PortfolioTracker.css';

const COLORS = ['#00bfff', '#32cd32', '#ffdf00', '#ff4d4d', '#7c3aed', '#14b8a6', '#c026d3', '#e11d48'];

// Current price fetching remains, as it's for live data, not backtesting.
const API_ENDPOINTS = [
  {
    name: 'Yahoo Finance',
    url: (symbol) => `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`,
    extractPrice: (data) => data.quoteResponse?.result?.[0]?.regularMarketPrice || 0
  },
  {
    name: 'Alpha Vantage (Demo)',
    url: (symbol) => `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=demo`,
    extractPrice: (data) => parseFloat(data['Global Quote']?.['05. price']) || 0
  }
];

const fetchPrice = async (symbol) => {
  for (const endpoint of API_ENDPOINTS) {
    try {
      console.log(`Trying ${endpoint.name} for ${symbol}...`);
      const response = await fetch(endpoint.url(symbol));
      if (!response.ok) {
        console.warn(`${endpoint.name} failed for ${symbol}: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const price = endpoint.extractPrice(data);
      
      if (price > 0) {
        console.log(`Successfully fetched price for ${symbol}: $${price} from ${endpoint.name}`);
        return price;
      }
    } catch (error) {
      console.warn(`Error fetching from ${endpoint.name}:`, error);
      continue;
    }
  }
  
  console.error(`Failed to fetch price for ${symbol} from all APIs`);
  return 0;
};

const historicalDataCache = {};

// New function to fetch historical data from local JSON files
const fetchHistoricalData = async (symbol) => {
  if (historicalDataCache[symbol]) {
    return historicalDataCache[symbol];
  }

  try {
    const response = await fetch(`${process.env.PUBLIC_URL}/stock-data/${symbol}.json`);
    if (!response.ok) {
      console.warn(`Could not find local data for ${symbol}. Status: ${response.status}`);
      return null;
    }
    const data = await response.json();
    
    // Transform data to the expected format
    const transformedData = data.map(item => ({
      date: new Date(item.Date).toISOString().split('T')[0], // Standardize date format
      close: item.Close
    })).filter(item => item.close > 0);

    historicalDataCache[symbol] = transformedData;
    return transformedData;

  } catch (error) {
    console.error(`Error loading local historical data for ${symbol}:`, error);
    return null;
  }
};


const PortfolioTracker = () => {
  const [holdings, setHoldings] = useState(() => {
    try {
      const saved = localStorage.getItem('portfolio');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading portfolio from localStorage:', error);
      return [];
    }
  });
  const [newHolding, setNewHolding] = useState({ symbol: '', shares: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backtestData, setBacktestData] = useState([]);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestPeriod, setBacktestPeriod] = useState('1y');
  const [showBacktest, setShowBacktest] = useState(false);
  const [backtestDateRange, setBacktestDateRange] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem('portfolio', JSON.stringify(holdings));
    } catch (error) {
      console.error('Error saving portfolio to localStorage:', error);
    }
  }, [holdings]);

  const addHolding = async () => {
    const symbol = newHolding.symbol.toUpperCase().trim();
    const shares = Number(newHolding.shares);
    
    if (!symbol) {
      setError('Please enter a stock symbol');
      return;
    }
    
    if (shares <= 0 || isNaN(shares)) {
      setError('Please enter a valid number of shares');
      return;
    }

    if (holdings.some(h => h.symbol === symbol)) {
      setError('This stock is already in your portfolio');
      return;
    }

    setError('');
    setLoading(true);
    
    try {
      let price = await fetchPrice(symbol);

      if (price <= 0) {
        console.log(`Live price fetch failed for ${symbol}. Trying local historical data as fallback.`);
        const historicalData = await fetchHistoricalData(symbol);
        if (historicalData && historicalData.length > 0) {
          price = historicalData[historicalData.length - 1].close;
          console.log(`Using latest price from local data for ${symbol}: $${price}`);
        }
      }
      
      if (price > 0) {
        const newHoldingData = { symbol, shares, price };
        setHoldings(prev => [...prev, newHoldingData]);
        setNewHolding({ symbol: '', shares: '' });
        console.log(`Added ${symbol}: ${shares} shares at $${price}`);
      } else {
        setError(`Could not fetch price for ${symbol}. Please check the symbol and the local data file.`);
      }
    } catch (error) {
      console.error('Error adding holding:', error);
      setError('Failed to add stock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteHolding = (idx) => {
    setHoldings(prev => prev.filter((_, i) => i !== idx));
  };

  const updatePrices = async () => {
    setLoading(true);
    setError('');
    
    try {
      const updatedHoldings = await Promise.all(
        holdings.map(async (holding) => {
          const newPrice = await fetchPrice(holding.symbol);
          return { ...holding, price: newPrice > 0 ? newPrice : holding.price };
        })
      );
      
      setHoldings(updatedHoldings);
      console.log('Updated all stock prices');
    } catch (error) {
      console.error('Error updating prices:', error);
      setError('Failed to update prices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const runBacktest = async () => {
    if (holdings.length === 0) {
      setError('Please add some stocks to your portfolio first');
      return;
    }

    setBacktestLoading(true);
    setError('');
    setShowBacktest(false);
    
    try {
      // Fetch historical data from local files
      const historicalDataPromises = holdings.map(async (holding) => {
        const data = await fetchHistoricalData(holding.symbol);
        return { symbol: holding.symbol, data, shares: holding.shares };
      });

      const historicalResults = await Promise.all(historicalDataPromises);
      const validResults = historicalResults.filter(result => result.data && result.data.length > 0);

      if (validResults.length === 0) {
        setError('Could not load local historical data for any of your stocks. Please ensure the JSON files exist in /public/stock-data/.');
        setBacktestLoading(false);
        return;
      }

      if (validResults.length < holdings.length) {
        const failedSymbols = holdings.filter(h => !validResults.find(r => r.symbol === h.symbol)).map(h => h.symbol);
        setError(`Warning: Could not load local data for ${failedSymbols.join(', ')}. Backtest will run with the remaining stocks.`);
      }

      // Determine start date based on selected period
      const getStartDate = (period, results) => {
        const now = new Date();
        
        if (period === 'max') {
          let latestStartDate = null;
          results.forEach(res => {
            if (res.data && res.data.length > 0) {
              // Data is sorted chronologically, so the first entry is the earliest
              const stockStartDate = new Date(res.data[0].date);
              if (!latestStartDate || stockStartDate > latestStartDate) {
                latestStartDate = stockStartDate;
              }
            }
          });
          // Fallback to 1 year if no date could be determined
          return (latestStartDate || new Date(new Date().setFullYear(now.getFullYear() - 1))).toISOString().split('T')[0];
        }
        
        const yearsMap = { '1y': 1, '5y': 5, '10y': 10, '20y': 20 };
        const yearsToSubtract = yearsMap[period] || 1;
        const past = new Date();
        past.setFullYear(now.getFullYear() - yearsToSubtract);
        return past.toISOString().split('T')[0];
      };

      const startDate = getStartDate(backtestPeriod, validResults);

      const filteredResults = validResults.map(result => ({
        ...result,
        data: result.data.filter(item => item.date >= startDate)
      })).filter(result => result.data.length > 0);


      const allDates = new Set();
      filteredResults.forEach(result => {
        result.data.forEach(item => allDates.add(item.date));
      });
      const sortedDates = Array.from(allDates).sort();

      const portfolioHistory = sortedDates.map(date => {
        let totalValue = 0;
        let isMissingDataForDate = false;

        for(const result of filteredResults) {
          const dayData = result.data.find(item => item.date === date);
          if (dayData && dayData.close > 0) {
            totalValue += dayData.close * result.shares;
          } else {
            // Use last known price if a stock has a gap
            const lastKnownData = result.data.slice().reverse().find(item => new Date(item.date) <= new Date(date) && item.close > 0);
            if(lastKnownData) {
              totalValue += lastKnownData.close * result.shares;
            } else {
              isMissingDataForDate = true;
              break; 
            }
          }
        }
        
        if (isMissingDataForDate) return null;

        return {
          date,
          totalValue: totalValue,
          formattedDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
      }).filter(item => item !== null && item.totalValue > 0);

      if (portfolioHistory.length < 2) {
        setError('Not enough historical data in the selected period to create a meaningful backtest. Try a longer period.');
        setBacktestData([]);
        setBacktestDateRange(null);
      } else {
        setBacktestData(portfolioHistory);
        setShowBacktest(true);
        
        // Set the actual date range used in the backtest
        const actualStartDate = portfolioHistory[0].date;
        const actualEndDate = portfolioHistory[portfolioHistory.length - 1].date;
        const requestedStartDate = startDate;
        const isLimited = actualStartDate > requestedStartDate;
        
        setBacktestDateRange({
          startDate: actualStartDate,
          endDate: actualEndDate,
          requestedStartDate: requestedStartDate,
          isLimited: isLimited,
          period: backtestPeriod
        });
        
        console.log(`Backtest completed with ${portfolioHistory.length} data points`);
      }
    } catch (error) {
      console.error('Error running backtest:', error);
      setError('Failed to run backtest. Please try again.');
    } finally {
      setBacktestLoading(false);
    }
  };

  const totalValue = useMemo(() => holdings.reduce((sum, h) => sum + h.price * h.shares, 0), [holdings]);
  
  const pieData = useMemo(() => {
    if (totalValue === 0) return [];
    return holdings.map(h => ({ 
      name: h.symbol, 
      value: h.price * h.shares,
      percentage: ((h.price * h.shares) / totalValue * 100).toFixed(1)
    }));
  }, [holdings, totalValue]);

  const formatCurrency = (value, digits = 2) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  };

  const performance = useMemo(() => {
    if (backtestData.length < 2) return null;
    
    const initialValue = backtestData[0].totalValue;
    const finalValue = backtestData[backtestData.length - 1].totalValue;
    const totalReturn = ((finalValue - initialValue) / initialValue) * 100;
    
    const days = (new Date(backtestData[backtestData.length - 1].date) - new Date(backtestData[0].date)) / (1000 * 60 * 60 * 24);
    if (days === 0) return null;
    
    let annualizedReturn;
    if (backtestPeriod === '1y') {
      annualizedReturn = totalReturn;
    } else {
      annualizedReturn = ((finalValue / initialValue) ** (365 / days) - 1) * 100;
    }
    
    return {
      totalReturn: totalReturn.toFixed(2),
      annualizedReturn: annualizedReturn.toFixed(2),
      initialValue,
      finalValue,
      gain: finalValue - initialValue
    };
  }, [backtestData, backtestPeriod]);

  return (
    <div className="portfolio-tracker">
      <div className="pt-header">
        <h1>Portfolio Tracker</h1>
        <p>Track your investment portfolio performance with historical backtesting</p>
      </div>
      
      <div className="pt-main-content">
        {error && (
          <div className="pt-error">
            {error}
          </div>
        )}

        <div className="pt-inputs">
          <input
            type="text"
            placeholder="Stock Symbol (e.g., AAPL)"
            value={newHolding.symbol}
            onChange={e => setNewHolding({ ...newHolding, symbol: e.target.value })}
            onKeyPress={e => e.key === 'Enter' && addHolding()}
          />
          <input
            type="number"
            placeholder="Number of Shares"
            value={newHolding.shares}
            onChange={e => setNewHolding({ ...newHolding, shares: e.target.value })}
            onKeyPress={e => e.key === 'Enter' && addHolding()}
            min="0"
            step="1"
          />
          <button onClick={addHolding} disabled={loading}>
            {loading ? 'Adding...' : 'Add Stock'}
          </button>
        </div>

        {holdings.length > 0 && (
          <div className="pt-actions">
            <button onClick={updatePrices} disabled={loading || backtestLoading} className="pt-update-btn">
              {loading ? 'Updating...' : 'Update Prices'}
            </button>
            <div className="pt-backtest-controls">
            <label htmlFor="backtest-period">Backtest Period:</label>
              <div className="portfolio-input-group">
                
                <select id="backtest-period" value={backtestPeriod} onChange={e => setBacktestPeriod(e.target.value)}>
                  <option value="1y">1 Year</option>
                  <option value="5y">5 Years</option>
                  <option value="10y">10 Years</option>
                  <option value="20y">20 Years</option>
                  <option value="max">Max</option>
                </select>
              </div>
              <button 
                onClick={runBacktest} 
                disabled={backtestLoading || loading} 
                className="pt-backtest-btn"
              >
                {backtestLoading ? 'Running Backtest...' : 'Run Backtest'}
              </button>
            </div>
          </div>
        )}

        <div className="pt-content-grid">
          <div className="pt-table">
            <h3>Your Holdings</h3>
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Shares</th>
                  <th>Price</th>
                  <th>Value</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h, idx) => (
                  <tr key={idx}>
                    <td className="pt-symbol">{h.symbol}</td>
                    <td>{h.shares.toLocaleString()}</td>
                    <td>{formatCurrency(h.price)}</td>
                    <td>{formatCurrency(h.price * h.shares)}</td>
                    <td>
                      <button 
                        onClick={() => deleteHolding(idx)}
                        className="pt-delete-btn"
                        title="Remove stock"
                        disabled={backtestLoading || loading}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-chart">
            <h3>Portfolio Allocation</h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie 
                      data={pieData} 
                      dataKey="value" 
                      nameKey="name" 
                      outerRadius={100} 
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value, 2)}
                      labelFormatter={(label) => label}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <p className="pt-total">Total Portfolio Value: {formatCurrency(totalValue, 0)}</p>
              </>
            ) : (
              <div className="pt-empty">
                <p>No stocks in your portfolio yet.</p>
                <p>Add some stocks above to get started!</p>
              </div>
            )}
          </div>
        </div>

        {showBacktest && backtestData.length > 0 && (
          <div className="pt-backtest-section">
            <h3>Historical Performance ({backtestPeriod})</h3>
            
            {backtestDateRange && (
              <div className={`pt-date-range-note ${backtestDateRange.isLimited ? 'limited' : ''}`}>
                <span className="pt-date-range-icon">📅</span>
                <span>
                  {backtestDateRange.isLimited ? (
                    <>
                      <strong>Limited by available data:</strong> Backtest runs from{' '}
                      {new Date(backtestDateRange.startDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })} to{' '}
                      {new Date(backtestDateRange.endDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </>
                  ) : (
                    <>
                      Backtest period: {new Date(backtestDateRange.startDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })} to{' '}
                      {new Date(backtestDateRange.endDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </>
                  )}
                </span>
              </div>
            )}

            {performance && (
              <div className="pt-performance-summary">
                <div className="pt-performance-card">
                  <span className="pt-performance-label">Total Return</span>
                  <span className={`pt-performance-value ${performance.totalReturn >= 0 ? 'positive' : 'negative'}`}>
                    {performance.totalReturn >= 0 ? '+' : ''}{performance.totalReturn}%
                  </span>
                </div>
                <div className="pt-performance-card">
                  <span className="pt-performance-label">Annualized Return</span>
                  <span className={`pt-performance-value ${performance.annualizedReturn >= 0 ? 'positive' : 'negative'}`}>
                    {performance.annualizedReturn >= 0 ? '+' : ''}{performance.annualizedReturn}%
                  </span>
                </div>
              </div>
            )}

            <div className="pt-backtest-chart">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={backtestData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fill: '#ccc' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fill: '#ccc' }} 
                    tickFormatter={(value) => formatCurrency(value, 0)}
                    domain={['dataMin', 'dataMax']}
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value, 2)}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="totalValue" 
                    name="Portfolio Value" 
                    stroke="#00bfff" 
                    fill="#00bfff" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioTracker; 