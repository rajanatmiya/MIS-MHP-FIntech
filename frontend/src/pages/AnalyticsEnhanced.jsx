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

  useEffect(() => { fetchAnalytics(); }, []);

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
    } catch (error) { toast.error('Failed to fetch analytics'); }
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const params = selectedMonth !== 'all' ? `?month=${selectedMonth}` : '';
      const response = await axios.get(`${API}/export/loans${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `loans_${selectedMonth}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report downloaded!');
    } catch (error) { toast.error('Failed to export'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c587a]"></div>
      </div>
    );
  }

  const COLORS = ['#2c587a', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const bankChartData = Object.entries(bankStats).map(([bank, data]) => ({
    name: bank, Total: data.total, Disbursed: data.disbursed, Declined: data.declined
  }));

  const agentPieData = Object.entries(agentStats).slice(0, 6).map(([agent, data]) => ({
    name: agent, value: data.total
  }));

  return (
    <div className="space-y-3 fade-in" data-testid="analytics-enhanced-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-800" data-testid="analytics-title">Analytics</h1>
          <p className="text-[10px] text-slate-400 mt-0.5">Monthly performance insights & reports</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-28 h-7 text-[11px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[11px]">All Months</SelectItem>
              {uniqueValues.months?.map(m => <SelectItem key={m} value={m} className="text-[11px]">{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleExport} size="sm" className="h-7 text-[11px] px-2.5 bg-[#2c587a] hover:bg-[#234a68]">
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="shadow-sm">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-[#2c587a]" />
              Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="total" stroke="#2c587a" strokeWidth={2} name="Total" dot={{ r: 2 }} />
                <Line type="monotone" dataKey="disbursed" stroke="#10b981" strokeWidth={2} name="Disbursed" dot={{ r: 2 }} />
                <Line type="monotone" dataKey="declined" stroke="#ef4444" strokeWidth={1.5} name="Declined" dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <BarChartIcon className="w-3.5 h-3.5 text-emerald-600" />
              Month-wise Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="disbursed" fill="#10b981" name="Disbursed" radius={[2,2,0,0]} />
                <Bar dataKey="declined" fill="#ef4444" name="Declined" radius={[2,2,0,0]} />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="shadow-sm">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-[#2c587a]" />
              Bank-wise Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bankChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Disbursed" fill="#10b981" radius={[0,2,2,0]} />
                <Bar dataKey="Declined" fill="#ef4444" radius={[0,2,2,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5 text-purple-600" />
              Top Agents by Volume
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 flex justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={agentPieData} cx="50%" cy="50%" labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80} fill="#8884d8" dataKey="value"
                  style={{ fontSize: 10 }}
                >
                  {agentPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Stat Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="shadow-sm">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5" />
              Bank Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase">Bank</th>
                  <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-500 uppercase">Total</th>
                  <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-500 uppercase">Success %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(bankStats).map(([bank, data]) => (
                  <tr key={bank} className="hover:bg-slate-50/50">
                    <td className="px-3 py-1.5 font-medium text-slate-700">{bank}</td>
                    <td className="px-3 py-1.5 text-center text-slate-600">{data.total}</td>
                    <td className="px-3 py-1.5 text-center font-semibold text-emerald-600">
                      {data.total > 0 ? ((data.disbursed / data.total) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5" />
              Agent Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase">Agent</th>
                  <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-500 uppercase">Total</th>
                  <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-500 uppercase">Success %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(agentStats).slice(0, 10).map(([agent, data]) => (
                  <tr key={agent} className="hover:bg-slate-50/50">
                    <td className="px-3 py-1.5 font-medium text-slate-700">{agent}</td>
                    <td className="px-3 py-1.5 text-center text-slate-600">{data.total}</td>
                    <td className="px-3 py-1.5 text-center font-semibold text-emerald-600">
                      {data.total > 0 ? ((data.disbursed / data.total) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsEnhanced;
