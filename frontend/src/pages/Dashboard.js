import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { FaLightbulb, FaWallet, FaChartPie, FaChartLine } from 'react-icons/fa';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const currencySymbolMap = {
  'usd': '$',
  'inr': '₹',
  'gbp': '£',
  'euro': '€',
};

const getCurrencySymbol = (currency) => {
  const symbol = currencySymbolMap[currency.toLowerCase()];
  if (!symbol) {
    console.warn(`Currency symbol for '${currency}' not found. Defaulting to empty string.`);
  }
  return symbol || ''; // Return an empty string or any fallback you prefer
};

const Dashboard = () => {
  const location = useLocation();
  const [insight, setInsight] = useState('');
  const [totalExpenses, setTotalExpenses] = useState({ amount: 0, symbol: '' });
  const [topCategory, setTopCategory] = useState('');
  const [topCategoryAmount, setTopCategoryAmount] = useState({ amount: 0, symbol: '' });
  const [avgSpendPerDay, setAvgSpendPerDay] = useState({ amount: 0, symbol: '' });
  const [dailySpends, setDailySpends] = useState([]);
  const [categorySplit, setCategorySplit] = useState({});
  const [currencySymbol, setCurrencySymbol] = useState('');
  
  
  useEffect(() => {
    const fetchData = async () => {
      const whatsappNumber = location.state.whatsappNumber;
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/webhook/ui`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: whatsappNumber, text: 'analytics' }),
      });
      
      if (response.ok) {
        const csvData = await response.text();
        processCsvData(csvData);
      }
    };

    const getInsight = async (expenses) => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/getInsight`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expenses }),
        });
        const result = await response.json();
        setInsight(result.insight);
      } catch (error) {
        console.error('Error getting insight:', error);
        setInsight('Unable to generate insight at this time.');
      }
    };
    
    const processCsvData = async (csvData) => {
      
      // If CSV data is empty, handle this case
      if (!csvData.trim()) {
        console.warn("CSV data is empty");
        // Set default values for all state variables if needed
        setTotalExpenses({ amount: 0, symbol: '' });
        setTopCategory('');
        setTopCategoryAmount({ amount: 0, symbol: '' });
        setAvgSpendPerDay({ amount: 0, symbol: '' });
        setDailySpends([]);
        setCategorySplit({});
        setCurrencySymbol('');
        setInsight('');
        return;
      }
    
      const rows = csvData.split('\n').slice(1);
      const expenses = rows
        .map(row => {
          const [description, amountStr, category, subCategory, dateStr] = row.split(',');
          
          // Extract currency and amount
          const [currencyWithQuotes, ...amountParts] = amountStr.trim().replace(/^"|"$/g, '').split(' ');
          const amountValue = amountParts.join(' ').trim();
          const currency = currencyWithQuotes.replace(/"/g, ''); // Remove any remaining quotes
          const currencySymbol = getCurrencySymbol(currency);
          const amount = parseFloat(amountValue.replace(/[^0-9.-]+/g, ""));
          
          if (!isNaN(amount)) {
            const cleanedCategory = category.replace(/"/g, '').trim();
        const cleanedSubCategory = subCategory.replace(/"/g, '').trim();
        return { date: new Date(dateStr), category: cleanedCategory, subCategory: cleanedSubCategory, amount, currencySymbol };
      }
          return null;
        })
        .filter(expense => expense !== null);
      
      const currentMonth = new Date().getMonth();
      const monthlyExpenses = expenses.filter(expense => new Date(expense.date).getMonth() === currentMonth);
      
      // Handle cases where monthlyExpenses is empty
      const total = monthlyExpenses.reduce((acc, expense) => acc + expense.amount, 0);
      const symbol = monthlyExpenses.length > 0 ? monthlyExpenses[0]?.currencySymbol || '' : '';
      
      setTotalExpenses({ amount: total, symbol });
      setCurrencySymbol(symbol); // Set the currency symbol for charts
      
      const categories = monthlyExpenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {});
      
      const topCategory = Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b, '');
      setTopCategory(topCategory);
      setTopCategoryAmount({ amount: categories[topCategory] || 0, symbol });
      
      const daysInMonth = new Date(new Date().getFullYear(), currentMonth + 1, 0).getDate();
      setAvgSpendPerDay({ amount: total / daysInMonth, symbol });
      
      const dailySpends = monthlyExpenses.reduce((acc, expense) => {
        const day = new Date(expense.date).getDate();
        acc[day - 1] = (acc[day - 1] || 0) + expense.amount;
        return acc;
      }, new Array(daysInMonth).fill(0));
      
      setDailySpends(dailySpends);
      setCategorySplit(categories);
      //const insight = "test"; //await getInsight(csvData);
      //setInsight(insight);
      getInsight(csvData);
    };
    fetchData();
  }, [location.state]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
    <h1 className="text-5xl font-bold mb-8">Dashboard</h1>
    <div className="bg-gray-800 p-4 rounded mb-8">
  <p className="text-2xl">
    To manage your spends on Whatsapp: 
    <a href="https://wa.me/+14157386102" className="text-teal-400 underline ml-2" target="_blank" rel="noopener noreferrer">
      Click Here
    </a>
  </p>
</div>

    {insight && (
      <div className="bg-gray-800 p-2 rounded mb-8">
        <p className="text-2xl mb-6 flex items-center">
          <FaLightbulb className="text-yellow-300 mr-2" /> Insight: {insight}
        </p>
        </div>
      )}
    <div className="flex space-x-4 mb-8">
    <div className="w-1/3 bg-gray-800 p-4 rounded flex items-center">
      <FaWallet size={50} className="text-green-400 text-3xl mr-4" />
        <div>
          <h2 className="text-xl font-bold mb-2">Total Expenses</h2>
          <p className="text-2xl">{totalExpenses.symbol} {totalExpenses.amount.toFixed(2)}</p>
        </div>
    </div>
    <div className="w-1/3 bg-gray-800 p-4 rounded flex items-center">
    <FaChartPie size={60} className="text-blue-400 text-3xl mr-4" />
    <div>
    <h2 className="text-xl font-bold mb-2">Top Category</h2>
    <p className="text-lg">{topCategory}</p>
    <p className="text-2xl">{topCategoryAmount.symbol} {topCategoryAmount.amount.toFixed(2)}</p>
    </div>
    </div>
    <div className="w-1/3 bg-gray-800 p-4 rounded flex items-center">
    <FaChartLine size={60} className="text-yellow-400 text-3xl mr-4" />
    <div>
    <h2 className="text-xl font-bold mb-2">Average Spend per Day</h2>
    <p className="text-2xl">{avgSpendPerDay.symbol} {avgSpendPerDay.amount.toFixed(2)}</p>
    </div>
    </div>
    </div>
    <div className="flex space-x-4 overflow-hidden">
    <div className="flex-1 bg-gray-800 p-4 rounded">
    <h2 className="text-xl font-bold mb-4">Daily Spending Trend</h2>
    <div className="h-96"> {/* Fixed height to avoid overflow */}
    <Bar
    data={{
      labels: Array.from({ length: dailySpends.length }, (_, i) => i + 1),
      datasets: [{
        label: `Daily Spend (${currencySymbol})`, // Use currencySymbol here
        data: dailySpends,
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      }],
    }}
    options={{
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Day of Month', color: '#FFFFFF' },
          ticks: { color: '#FFFFFF' },
        },
        y: {
          title: { display: true, text: `Amount (${currencySymbol})`, color: '#FFFFFF' },
          ticks: { color: '#FFFFFF', callback: value => `${currencySymbol} ${value.toFixed(2)}` }, // Show symbol on Y-axis
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#FFFFFF'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${currencySymbol} ${context.raw.toFixed(2)}`; // Show symbol in tooltip
            }
          }
        }
      }
    }}
    />
    
    
    </div>
    </div>
    <div className="flex-1 bg-gray-800 p-4 rounded">
    <h2 className="text-xl font-bold mb-4">Category Split</h2>
    <div className="flex justify-center items-center h-96"> {/* Fixed height to avoid overflow */}
    <Pie
    data={{
      labels: Object.keys(categorySplit),
      datasets: [{
        data: Object.values(categorySplit),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#B4E82B'],
        borderColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#B4E82B'],
        borderWidth: 1,
      }],
    }}
    options={{
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#FFFFFF'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const category = context.label;
              const value = context.raw;
              return `${category}: ${currencySymbol} ${value.toFixed(2)}`; // Show symbol in tooltip
            }
          }
        }
      }
    }}
    />
    </div>
    </div>
    </div> 
    </div>
  );
};

export default Dashboard;
