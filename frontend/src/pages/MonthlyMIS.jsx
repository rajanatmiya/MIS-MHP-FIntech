import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, Download, TrendingUp, TrendingDown } from 'lucide-react';

const MonthlyMIS = () => {
  const [monthlyData, setMonthlyData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    fetchMonthlyMIS();
  }, []);

  const fetchMonthlyMIS = async () => {
    try {
      const response = await axios.get(`${API}/analytics/monthly-trends`);
      
      // Group data by month
      const grouped = {};
      response.data.forEach(item => {
        grouped[item.month] = item;
      });
      
      setMonthlyData(grouped);
      
      // Set current month as selected
      const months = Object.keys(grouped).sort();
      if (months.length > 0) {
        setSelectedMonth(months[months.length - 1]);
      }
    } catch (error) {
      toast.error('Failed to fetch monthly MIS');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (month) => {
    try {
      const response = await axios.get(`${API}/export/loans?month=${month}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MIS_${month}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`${month} MIS exported successfully!`);
    } catch (error) {
      toast.error('Failed to export MIS');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const months = Object.keys(monthlyData).sort();

  const getMonthColor = (month) => {
    const colors = [
      'bg-blue-50 border-blue-200',
      'bg-green-50 border-green-200',
      'bg-purple-50 border-purple-200',
      'bg-orange-50 border-orange-200',
      'bg-pink-50 border-pink-200',
      'bg-cyan-50 border-cyan-200'
    ];
    const index = months.indexOf(month);
    return colors[index % colors.length];
  };

  const calculateGrowth = (currentMonth, previousMonth) => {
    if (!previousMonth) return 0;
    const current = monthlyData[currentMonth];
    const previous = monthlyData[previousMonth];
    
    if (previous.total === 0) return 0;
    return (((current.total - previous.total) / previous.total) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6 fade-in" data-testid="monthly-mis-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Month-wise MIS Dashboard
        </h1>
        <p className="text-sm lg:text-base text-slate-600">Manage and track loan performance by month</p>
      </div>

      {/* Monthly Boards - Monday.com Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {months.map((month, index) => {
          const data = monthlyData[month];
          const successRate = data.total > 0 ? ((data.disbursed / data.total) * 100).toFixed(1) : 0;
          const previousMonth = months[index - 1];
          const growth = calculateGrowth(month, previousMonth);
          
          return (
            <Card 
              key={month} 
              className={`card-hover cursor-pointer border-2 transition-all ${getMonthColor(month)} ${
                selectedMonth === month ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedMonth(month)}
              data-testid={`month-card-${month}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="w-5 h-5" />
                      {month}
                    </CardTitle>
                    {index > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {growth >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {growth}%
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(month);
                    }}
                    data-testid={`export-${month}`}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Total Applications */}
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-sm text-slate-600 mb-1">Total Applications</p>
                  <p className="text-3xl font-bold text-slate-800">{data.total}</p>
                </div>

                {/* Status Breakdown */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-green-600 font-medium mb-1">Disbursed</p>
                    <p className="text-xl font-bold text-green-700">{data.disbursed}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-xs text-red-600 font-medium mb-1">Declined</p>
                    <p className="text-xl font-bold text-red-700">{data.declined}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <p className="text-xs text-amber-600 font-medium mb-1">Pending</p>
                    <p className="text-xl font-bold text-amber-700">{data.pending}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-blue-600 font-medium mb-1">Login Done</p>
                    <p className="text-xl font-bold text-blue-700">{data.login_done}</p>
                  </div>
                </div>

                {/* Success Rate */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Success Rate</span>
                    <span className="text-sm font-bold text-green-600">{successRate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${successRate}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No Data State */}
      {months.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Monthly Data</h3>
            <p className="text-slate-600 text-center">
              Start adding loan applications to see month-wise MIS
            </p>
          </CardContent>
        </Card>
      )}

      {/* Selected Month Details */}
      {selectedMonth && monthlyData[selectedMonth] && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              {selectedMonth} - Detailed View
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Total</p>
                <p className="text-2xl font-bold text-slate-800">{monthlyData[selectedMonth].total}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 mb-1">Disbursed</p>
                <p className="text-2xl font-bold text-green-700">{monthlyData[selectedMonth].disbursed}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 mb-1">Declined</p>
                <p className="text-2xl font-bold text-red-700">{monthlyData[selectedMonth].declined}</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-600 mb-1">Pending</p>
                <p className="text-2xl font-bold text-amber-700">{monthlyData[selectedMonth].pending}</p>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => handleExport(selectedMonth)}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Export {selectedMonth} MIS
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MonthlyMIS;
