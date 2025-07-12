import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, 
  YAxis, CartesianGrid, Legend
} from 'recharts';
import './ExpenseAnalyzer.css';
import categorizationRules from '../categorizationRules.json';

const COLORS = [
  '#00bfff', '#32cd32', '#ffdf00', '#ff4d4d', '#7c3aed', '#14b8a6', '#c026d3', '#e11d48',
  '#f97316', '#84cc16', '#22d3ee', '#a855f7', '#f43f5e', '#65a30d', '#6d28d9', '#be185d'
];



const ExpenseAnalyzer = () => {
  const [transactions, setTransactions] = useState(() => {
    try {
      const savedTransactions = localStorage.getItem('bank_transactions');
      return savedTransactions ? JSON.parse(savedTransactions) : [];
    } catch (error) {
      console.error("Failed to parse transactions from localStorage", error);
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState(transactions.length > 0 ? 'overview' : 'upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedYear, setSelectedYear] = useState('all');

  // Get available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set();
    transactions.forEach(t => {
      if (t.date && t.date !== 'Unknown') {
        try {
          let parsedDate = null;
          
          if (typeof t.date === 'string') {
            if (t.date.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
              parsedDate = new Date(t.date);
            } else if (t.date.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
              const parts = t.date.split(/[\/\-]/);
              const month = parseInt(parts[0], 10);
              const day = parseInt(parts[1], 10);
              const year = parseInt(parts[2], 10);
              parsedDate = new Date(year, month - 1, day);
            } else {
              parsedDate = new Date(t.date);
            }
          } else {
            parsedDate = new Date(t.date);
          }
          
          if (!isNaN(parsedDate.getTime())) {
            years.add(parsedDate.getFullYear());
          }
        } catch (e) {
          // Ignore date parsing errors
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Newest first
  }, [transactions]);

  // Set default year to the most recent year when data is loaded
  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === 'all') {
      setSelectedYear(availableYears[0].toString());
    }
  }, [availableYears, selectedYear]);

  const analysis = useMemo(() => {
    let transactionsForAnalysis = transactions.filter(
      t => t.category !== 'Transfers'
    );

    // Filter by selected year if not 'all'
    if (selectedYear !== 'all') {
      transactionsForAnalysis = transactionsForAnalysis.filter(t => {
        if (!t.date || t.date === 'Unknown') return false;
        try {
          let parsedDate = null;
          
          if (typeof t.date === 'string') {
            if (t.date.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
              parsedDate = new Date(t.date);
            } else if (t.date.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
              const parts = t.date.split(/[\/\-]/);
              const month = parseInt(parts[0], 10);
              const day = parseInt(parts[1], 10);
              const year = parseInt(parts[2], 10);
              parsedDate = new Date(year, month - 1, day);
            } else {
              parsedDate = new Date(t.date);
            }
          } else {
            parsedDate = new Date(t.date);
          }
          
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.getFullYear().toString() === selectedYear;
          }
        } catch (e) {
          // Ignore date parsing errors
        }
        return false;
      });
    }

    if (transactionsForAnalysis.length === 0) {
      return {
        expenses: [], income: [], expenseCategories: {}, incomeCategories: {},
        monthlyTrends: [], topExpenses: [], topIncome: [], totalExpenses: 0,
        totalIncome: 0, netCashFlow: 0, avgMonthlyExpenses: 0, avgMonthlyIncome: 0,
      };
    }

    const expenses = transactionsForAnalysis.filter(t => t.type === 'expense' && t.amount > 0);
    const income = transactionsForAnalysis.filter(t => t.type === 'income' && t.amount > 0);

    const expenseCategories = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    const incomeCategories = income.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    const monthlyData = transactionsForAnalysis.reduce((acc, t) => {
      let month = 'Unknown';
      let dateObj = null;
      
      if (t.date && t.date !== 'Unknown') {
        try {
          // Parse the date more robustly
          let parsedDate = null;
          
          if (typeof t.date === 'string') {
            // Handle YYYY-MM-DD format (ISO format)
            if (t.date.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
              parsedDate = new Date(t.date);
            }
                         // Handle MM/DD/YYYY or M/D/YYYY formats
             else if (t.date.match(/^\d{1,2}[/\-]\d{1,2}[/\-]\d{4}$/)) {
               const parts = t.date.split(/[/\-]/);
               const month = parseInt(parts[0], 10);
               const day = parseInt(parts[1], 10);
               const year = parseInt(parts[2], 10);
               parsedDate = new Date(year, month - 1, day);
             }
            // Try direct parsing as fallback
            else {
              parsedDate = new Date(t.date);
            }
          } else {
            parsedDate = new Date(t.date);
          }
          
          if (!isNaN(parsedDate.getTime())) {
            dateObj = parsedDate;
            month = parsedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          } else {
            console.warn('Invalid date found:', t.date);
          }
        } catch (e) {
          console.warn('Date parsing error:', t.date, e);
        }
      }
      
      if (!acc[month]) {
        acc[month] = { expenses: 0, income: 0, net: 0, dateObj: dateObj };
      }
      
      if (t.type === 'expense') {
        acc[month].expenses += t.amount;
      } else {
        acc[month].income += t.amount;
      }
      acc[month].net = acc[month].income - acc[month].expenses;
      
      // Update dateObj if we have a valid one and the existing one is null
      if (dateObj && !acc[month].dateObj) {
        acc[month].dateObj = dateObj;
      }
      
      return acc;
    }, {});

    const monthlyTrends = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        expenses: parseFloat(data.expenses.toFixed(2)),
        income: parseFloat(data.income.toFixed(2)),
        net: parseFloat(data.net.toFixed(2)),
        dateObj: data.dateObj
      }))
      .sort((a, b) => {
        // Sort by date object if available, otherwise by month string
        if (a.dateObj && b.dateObj) {
          return a.dateObj.getTime() - b.dateObj.getTime();
        }
        if (a.dateObj && !b.dateObj) return -1;
        if (!a.dateObj && b.dateObj) return 1;
        return a.month.localeCompare(b.month);
      })
      .map(({ month, expenses, income, net }) => ({ month, expenses, income, net }));

    console.log('Monthly trends data:', monthlyTrends); // Debug log

    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

    return {
      expenses,
      income,
      expenseCategories,
      incomeCategories,
      monthlyTrends,
      topExpenses: [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 10),
      topIncome: [...income].sort((a, b) => b.amount - a.amount).slice(0, 10),
      totalExpenses,
      totalIncome,
      netCashFlow: totalIncome - totalExpenses,
      avgMonthlyExpenses: monthlyTrends.length > 0 ? totalExpenses / monthlyTrends.length : 0,
      avgMonthlyIncome: monthlyTrends.length > 0 ? totalIncome / monthlyTrends.length : 0
    };
  }, [transactions, selectedYear]);

  useEffect(() => {
    try {
      localStorage.setItem('bank_transactions', JSON.stringify(transactions));
    } catch (error) {
      console.error("Failed to save transactions to localStorage", error);
    }
  }, [transactions]);

  const categorizeTransaction = (description) => {
    const desc = description.toLowerCase();

    // High-priority override for transfers
    if (desc.includes('transfer')) {
      return 'Transfers';
    }

    for (const rule of categorizationRules) {
      for (const keyword of rule.keywords) {
        if (desc.includes(keyword.toLowerCase())) {
          return rule.category;
        }
      }
    }
    return "Miscellaneous Expense";
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        parseCsvData(text);
      };
      reader.readAsText(file);
    }
  };

  const parseCsvData = (csvText) => {
    const rows = csvText.split(/\r?\n/).filter(row => row.trim() !== '');
    const headers = rows.shift().split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Create a mapping of original headers to lowercase for lookup
    const headerMap = {};
    headers.forEach((header, index) => {
      headerMap[header.toLowerCase()] = header;
    });
    
    const requiredHeaders = ['description', 'debit', 'credit'];
    const lowercaseHeaders = headers.map(h => h.toLowerCase());
    
    if (!requiredHeaders.every(h => lowercaseHeaders.includes(h))) {
        alert('CSV must contain "description", "debit", and "credit" columns.');
        setIsProcessing(false);
        return;
    }

    const newTransactions = rows.map((row, index) => {
      const values = row.split(',');
      const transactionData = {};
      
      // Build transaction data using original headers
      headers.forEach((header, i) => {
        transactionData[header] = values[i] ? values[i].trim().replace(/"/g, '') : '';
      });

      const debit = parseFloat(transactionData[headerMap['debit']] || transactionData['Debit']) || 0;
      const credit = parseFloat(transactionData[headerMap['credit']] || transactionData['Credit']) || 0;
      const description = transactionData[headerMap['description']] || transactionData['Description'] || 'No Description';
      const category = categorizeTransaction(description);

      let amount = 0;
      let type = '';

      if (debit > 0 && credit === 0) {
        amount = debit;
        type = 'expense';
      } else if (credit > 0 && debit === 0) {
        amount = credit;
        type = 'income';
      } else {
        // Fallback for ambiguous rows, assuming payment keywords imply an expense
        amount = debit || credit;
        type = 'expense';
      }
      
      // Force credit card payments to be expenses
      if (category === 'Credit Card Payments') {
        type = 'expense';
      }

      // Enhanced date parsing - look for various date column names
      let transactionDate = null;
      const dateFields = [
        'date', 'post_date', 'transaction_date', 'posting_date',
        'Date', 'Post Date', 'Transaction Date', 'Posting Date'
      ];
      
      for (const field of dateFields) {
        if (transactionData[field]) {
          const dateValue = transactionData[field];
          try {
            let parsedDate = null;
            
            // Handle MM/DD/YYYY, MM-DD-YYYY, M/D/YYYY formats
            if (dateValue.match(/^\d{1,2}[/\-]\d{1,2}[/\-]\d{4}$/)) {
              const parts = dateValue.split(/[/\-]/);
              const month = parseInt(parts[0], 10);
              const day = parseInt(parts[1], 10);
              const year = parseInt(parts[2], 10);
              parsedDate = new Date(year, month - 1, day);
            }
            // Handle YYYY-MM-DD format
            else if (dateValue.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
              parsedDate = new Date(dateValue);
            }
            // Handle other formats
            else {
              parsedDate = new Date(dateValue);
            }
            
            if (!isNaN(parsedDate.getTime())) {
              transactionDate = parsedDate.toISOString().split('T')[0];
              break;
            }
          } catch (e) {
            console.warn('Failed to parse date:', dateValue);
          }
        }
      }

      return {
        id: `${Date.now()}-${index}`,
        date: transactionDate || new Date().toISOString().split('T')[0],
        description,
        amount,
        type,
        category,
      };
    }).filter(t => t && t.amount > 0);

    console.log('Parsed transactions:', newTransactions.slice(0, 5)); // Debug log
    setTransactions(newTransactions);
    setIsProcessing(false);
    setActiveTab('overview');
  };
  
  const downloadSampleCsv = () => {
    const sample = "date,description,debit,credit\n" +
                   "2023-10-01,Starbucks Coffee,5.45,0\n" +
                   "2023-10-02,Monthly Salary,0,3500\n" +
                   "2023-10-03,Amazon Purchase,45.99,0\n" +
                   "2023-10-04,Uber Ride,15.20,0";
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "sample_transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const expensePieData = Object.entries(analysis.expenseCategories).map(([name, value]) => ({ name, value }));
  const incomePieData = Object.entries(analysis.incomeCategories).map(([name, value]) => ({ name, value }));

  // Calculate dynamic Y-axis max for Monthly Cash Flow chart (3rd highest income/expense ACROSS ALL YEARS)
  const cashFlowYMax = useMemo(() => {
    if (!transactions || transactions.length === 0) return 'dataMax';

    // Aggregate income and expenses by month for ALL years (ignore Transfers)
    const monthlyMap = {};
    transactions.forEach(t => {
      if (!t || t.category === 'Transfers') return;

      // Parse date robustly (reuse simplified parsing)
      let parsedDate = null;
      if (t.date && t.date !== 'Unknown') {
        if (typeof t.date === 'string') {
          if (t.date.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
            parsedDate = new Date(t.date);
          } else if (t.date.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
            const parts = t.date.split(/[\/\-]/);
            const month = parseInt(parts[0], 10);
            const day = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            parsedDate = new Date(year, month - 1, day);
          } else {
            parsedDate = new Date(t.date);
          }
        } else {
          parsedDate = new Date(t.date);
        }
      }

      if (!parsedDate || isNaN(parsedDate.getTime())) return;

      const monthKey = `${parsedDate.getFullYear()}-${parsedDate.getMonth() + 1}`; // e.g., "2024-5"
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { income: 0, expenses: 0 };
      }

      if (t.type === 'income') {
        monthlyMap[monthKey].income += t.amount;
      } else if (t.type === 'expense') {
        monthlyMap[monthKey].expenses += t.amount;
      }
    });

    const values = Object.values(monthlyMap).flatMap(item => [item.income, item.expenses]);
    const sorted = values.sort((a, b) => b - a);
    if (sorted.length === 0) return 'dataMax';
    const index = Math.min(2, sorted.length - 1);
    return sorted[index];
  }, [transactions]);

  return (
    <div className="expense-analyzer">
      <div className="ea-header">
        <h1>Bank Statement Analyzer</h1>
        <p>Analyze your spending patterns and categorize transactions automatically</p>
      </div>
      
      <div className="ea-main-content">
        <div className="ea-tabs">
          <button className={activeTab === 'upload' ? 'active' : ''} onClick={() => setActiveTab('upload')}>Upload</button>
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')} disabled={transactions.length === 0}>Overview</button>
          <button className={activeTab === 'expenses' ? 'active' : ''} onClick={() => setActiveTab('expenses')} disabled={transactions.length === 0}>Expenses</button>
          <button className={activeTab === 'income' ? 'active' : ''} onClick={() => setActiveTab('income')} disabled={transactions.length === 0}>Income</button>
          <button className={activeTab === 'details' ? 'active' : ''} onClick={() => setActiveTab('details')} disabled={transactions.length === 0}>Details</button>
        </div>

        {activeTab === 'upload' && (
          <div className="ea-upload-section">
            <div className="ea-upload-card">
              <h2>Upload Your Statement</h2>
              <p>Upload a CSV file. The system will automatically categorize your transactions.</p>
              
              {isProcessing ? (
                <div className="ea-processing">
                  <div className="ea-processing-spinner"></div>
                  <p>Processing transactions...</p>
                </div>
              ) : (
                <>
                  <div className="ea-file-input">
                    <input type="file" accept=".csv" onChange={handleFileUpload} id="csv-upload" />
                    <label htmlFor="csv-upload">Choose CSV File</label>
                  </div>
                  <button onClick={downloadSampleCsv} className="ea-sample-btn">Download Sample CSV</button>
                </>
              )}
              
              {transactions.length > 0 && !isProcessing && (
                <div className="ea-upload-summary">
                  <h3>Data Loaded Successfully!</h3>
                  <p>{transactions.length} transactions processed.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'overview' && transactions.length > 0 && (
          <div className="ea-overview-section">
            <div className="ea-summary-cards">
              <div className="ea-summary-card"><h3>Total Income</h3><p className="positive">${analysis.totalIncome.toFixed(2)}</p></div>
              <div className="ea-summary-card"><h3>Total Expenses</h3><p className="negative">${analysis.totalExpenses.toFixed(2)}</p></div>
              <div className="ea-summary-card"><h3>Net Cash Flow</h3><p className={analysis.netCashFlow >= 0 ? 'positive' : 'negative'}>${analysis.netCashFlow.toFixed(2)}</p></div>
              <div className="ea-summary-card"><h3>Transactions</h3><p>{transactions.length}</p></div>
            </div>
            <div className="ea-charts-grid">
              <div className="ea-chart-container">
                <h3>Income vs Expenses</h3>
                <ResponsiveContainer width="100%" height={300}><BarChart data={[{ name: 'Income', value: analysis.totalIncome }, { name: 'Expenses', value: analysis.totalExpenses }]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#00bfff" /></BarChart></ResponsiveContainer>
              </div>
              <div className="ea-chart-container">
                <div className="ea-chart-header">
                  <h3>Monthly Cash Flow</h3>
                  {availableYears.length > 1 && (
                    <div className="ea-year-selector">
                      <label htmlFor="year-select">Year: </label>
                      <select 
                        id="year-select"
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="ea-year-select"
                      >
                        <option value="all">All Years</option>
                        {availableYears.map(year => (
                          <option key={year} value={year.toString()}>{year}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analysis.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis 
                      domain={[0, cashFlowYMax]} 
                      allowDataOverflow={true} 
                    />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="income" fill="#32cd32" />
                    <Bar dataKey="expenses" fill="#ff4d4d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && transactions.length > 0 && (
          <div className="ea-expenses-section">
            <div className="ea-charts-grid">
              <div className="ea-chart-container">
                <h3>Expenses by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie 
                      data={expensePieData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={100} 
                      label={({ name }) => name}
                    >
                      {expensePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
               <div className="ea-chart-container">
                <h3>Top 10 Expenses</h3>
                <ul>{analysis.topExpenses.map(t => <li key={t.id}><span>{t.description}</span><span className="negative">{t.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span></li>)}</ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'income' && transactions.length > 0 && (
          <div className="ea-income-section">
            <div className="ea-charts-grid">
              <div className="ea-chart-container">
                <h3>Income by Source</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie 
                      data={incomePieData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={100} 
                      label={({ name }) => name}
                    >
                      {incomePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="ea-chart-container">
                <h3>Top 10 Income Transactions</h3>
                <ul>{analysis.topIncome.map(t => <li key={t.id}><span>{t.description}</span><span className="positive">{t.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span></li>)}</ul>
              </div>
            </div>
          </div>
        )}



        {activeTab === 'details' && transactions.length > 0 && (
          <div className="ea-details-section">
            <div className="ea-table">
              <table>
                <thead>
                  <tr><th>Date</th><th>Description</th><th>Amount</th><th>Type</th><th>Category</th></tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td>{t.description}</td>
                      <td className={t.type === 'income' ? 'positive' : 'negative'}>{t.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                      <td><span className={`ea-type-badge ea-type-${t.type}`}>{t.type}</span></td>
                      <td>{t.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseAnalyzer;
