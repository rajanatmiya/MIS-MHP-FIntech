import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Building2, Users, TrendingUp, Download, BarChart as BarChartIcon } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AnalyticsEnhanced = () => {
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [bankStats, setBankStats] = useState({});
  const [agentStats, setAgentStats] = useState({});
  const [uniqueValues, setUniqueValues] = useState({ months: [] });
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [trendsRes, bankRes, agentRes, valuesRes] = await Promise.all([
        axios.get(`${API}/analytics/monthly-trends`),
        axios.get(`${API}/analytics/by-bank`),
        axios.get(`${API}/analytics/by-agent`),
        axios.get(`${API}/analytics/unique-values`)
      ]);
      setMonthlyTrends(trendsRes.data);
      setBankStats(bankRes.data);
      setAgentStats(agentRes.data);
      setUniqueValues(valuesRes.data);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = selectedMonth !== 'all' ? `?month=${selectedMonth}` : '';
      const response = await axios.get(`${API}/export/loans${params}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `loans_${selectedMonth}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const bankChartData = Object.entries(bankStats).map(([bank, data]) => ({
    name: bank,
    Total: data.total,
    Disbursed: data.disbursed,
    Declined: data.declined
  }));

  const agentPieData = Object.entries(agentStats).slice(0, 6).map(([agent, data]) => ({
    name: agent,
    value: data.total
  }));

  return (
    <div className="space-y-6 fade-in" data-testid="analytics-enhanced-page">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-sm font-bold text-slate-800 mb-0.5">
            Month-wise MIS Analytics
          </h1>
          <p className="text-[11px] text-slate-500">Comprehensive monthly performance insights</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {uniqueValues.months.map(month => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={handleExport} className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Monthly Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total Applications" />
              <Line type="monotone" dataKey="disbursed" stroke="#10b981" strokeWidth={2} name="Disbursed" />
              <Line type="monotone" dataKey="declined" stroke="#ef4444" strokeWidth={2} name="Declined" />
              <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} name="Pending" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChartIcon className="w-5 h-5 text-green-600" />
            Month-wise Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="disbursed" fill="#10b981" name="Disbursed" />
              <Bar dataKey="declined" fill="#ef4444" name="Declined" />
              <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Bank-wise Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bankChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Disbursed" fill="#10b981" />
                <Bar dataKey="Declined" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Top Agents by Volume
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={agentPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {agentPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Bank Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Bank</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-600 uppercase">Total</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-600 uppercase">Success %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.entries(bankStats).map(([bank, data]) => {
                    const successRate = data.total > 0 ? ((data.disbursed / data.total) * 100).toFixed(1) : 0;
                    return (
                      <tr key={bank} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">{bank}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{data.total}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="font-semibold text-green-600">{successRate}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Agent Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Agent</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-600 uppercase">Total</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-600 uppercase">Success %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.entries(agentStats).slice(0, 10).map(([agent, data]) => {
                    const successRate = data.total > 0 ? ((data.disbursed / data.total) * 100).toFixed(1) : 0;
                    return (
                      <tr key={agent} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">{agent}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{data.total}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="font-semibold text-green-600">{successRate}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsEnhanced;
