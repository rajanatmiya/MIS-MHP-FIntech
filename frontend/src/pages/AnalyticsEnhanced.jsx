import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Building2, Users, TrendingUp, Download, BarChart as BarChartIcon, PieChart as PieChartIcon, Activity, Layers, Package } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#2c587a', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#a855f7'];
const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtShort = (n) => {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n?.toString() || '0';
};

const AnalyticsEnhanced = () => {
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [bankStats, setBankStats] = useState({});
  const [agentStats, setAgentStats] = useState({});
  const [deepData, setDeepData] = useState(null);
  const [uniqueValues, setUniqueValues] = useState({ months: [] });
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      const [trendsRes, bankRes, agentRes, valuesRes, deepRes] = await Promise.all([
        axios.get(`${API}/analytics/monthly-trends`),
        axios.get(`${API}/analytics/by-bank`),
        axios.get(`${API}/analytics/by-agent`),
        axios.get(`${API}/analytics/unique-values`),
        axios.get(`${API}/analytics/deep`)
      ]);
      setMonthlyTrends(trendsRes.data);
      setBankStats(bankRes.data);
      setAgentStats(agentRes.data);
      setUniqueValues(valuesRes.data);
      setDeepData(deepRes.data);
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

  const bankChartData = Object.entries(bankStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([bank, data]) => ({ name: bank.length > 12 ? bank.slice(0,12) + '..' : bank, Total: data.total, Disbursed: data.disbursed, Declined: data.declined }));

  const statusPieData = deepData?.status_distribution
    ? Object.entries(deepData.status_distribution).sort((a,b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
    : [];

  const categoryChartData = deepData?.category_stats
    ? Object.entries(deepData.category_stats).sort((a,b) => b[1].total - a[1].total).map(([name, d]) => ({ name: name.length > 15 ? name.slice(0,15)+'..' : name, Total: d.total, Disbursed: d.disbursed }))
    : [];

  const productChartData = deepData?.product_stats
    ? Object.entries(deepData.product_stats).sort((a,b) => b[1].total - a[1].total).map(([name, d]) => ({ name: name.length > 15 ? name.slice(0,15)+'..' : name, Total: d.total, Disbursed: d.disbursed }))
    : [];

  const agentAmountData = deepData?.agent_amounts
    ? Object.entries(deepData.agent_amounts).slice(0, 8).map(([name, d]) => ({ name: name.length > 10 ? name.slice(0,10)+'..' : name, Sanctioned: d.sanction_amt, Disbursed: d.disbursed_amt, Loans: d.total }))
    : [];

  const amountTrendData = monthlyTrends.map(m => ({
    month: m.month, Sanctioned: m.sanction_amount, Disbursed: m.disbursed_amount
  }));

  const totals = deepData?.totals || {};

  return (
    <div className="space-y-4 fade-in" data-testid="analytics-enhanced-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight" data-testid="analytics-title">Analytics</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Deep performance insights & reports</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-28 h-7 text-[11px]"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[11px]">All Months</SelectItem>
              {uniqueValues.months?.map(m => <SelectItem key={m} value={m} className="text-[11px]">{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleExport} size="sm" className="h-7 text-[11px] px-2.5 bg-[#2c587a] hover:bg-[#234a68]">
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Loans', value: totals.total_loans || 0, color: 'border-l-[#2c587a]' },
          { label: 'Total Sanctioned', value: fmt(totals.total_sanction), color: 'border-l-violet-500' },
          { label: 'Total Disbursed', value: fmt(totals.total_disbursed), color: 'border-l-emerald-500' },
          { label: 'Conversion', value: `${totals.total_loans > 0 ? ((deepData?.status_distribution?.Disbursed || 0) / totals.total_loans * 100).toFixed(1) : 0}%`, color: 'border-l-amber-500' },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white rounded-lg border border-slate-200 border-l-[3px] ${kpi.color} px-3 py-2.5 shadow-sm`}>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-lg font-bold text-slate-900 leading-tight tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ROW 1: Monthly Trends (line) + Amount Trends (bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-[#2c587a]" />
              <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Monthly Loan Trends</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="total" stroke="#2c587a" strokeWidth={2} name="Total" dot={{ r: 2 }} />
                <Line type="monotone" dataKey="disbursed" stroke="#10b981" strokeWidth={2} name="Disbursed" dot={{ r: 2 }} />
                <Line type="monotone" dataKey="declined" stroke="#ef4444" strokeWidth={1.5} name="Declined" dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <BarChartIcon className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Month-wise Amount</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={amountTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtShort} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Sanctioned" fill="#8b5cf6" name="Sanctioned" radius={[2,2,0,0]} />
                <Bar dataKey="Disbursed" fill="#10b981" name="Disbursed" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: Status Pie + Category Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <PieChartIcon className="w-3.5 h-3.5 text-[#2c587a]" />
              <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Status Distribution</p>
            </div>
            <div className="flex items-center">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={75} innerRadius={40} dataKey="value" paddingAngle={1}>
                    {statusPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-[45%] max-h-[200px] overflow-y-auto space-y-1 pl-2">
                {statusPieData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-600 truncate flex-1">{s.name}</span>
                    <span className="font-semibold text-slate-800">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Layers className="w-3.5 h-3.5 text-violet-600" />
              <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Category-wise</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Total" fill="#2c587a" name="Total" radius={[2,2,0,0]} />
                <Bar dataKey="Disbursed" fill="#10b981" name="Disbursed" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: Product + Agent Amounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Package className="w-3.5 h-3.5 text-orange-500" />
              <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Product-wise</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={productChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Total" fill="#f59e0b" name="Total" radius={[2,2,0,0]} />
                <Bar dataKey="Disbursed" fill="#10b981" name="Disbursed" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Users className="w-3.5 h-3.5 text-[#2c587a]" />
              <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Agent Disbursement</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agentAmountData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={fmtShort} />
                <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Disbursed" fill="#10b981" name="Disbursed" radius={[0,2,2,0]} />
                <Bar dataKey="Sanctioned" fill="#8b5cf6" name="Sanctioned" radius={[0,2,2,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ROW 4: Bank Performance + Top Agents Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Building2 className="w-3.5 h-3.5 text-[#2c587a]" />
              <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Bank Performance</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bankChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Total" fill="#2c587a" name="Total" radius={[2,2,0,0]} />
                <Bar dataKey="Disbursed" fill="#10b981" name="Disbursed" radius={[2,2,0,0]} />
                <Bar dataKey="Declined" fill="#ef4444" name="Declined" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Top Agents</p>
            </div>
            <div className="max-h-[220px] overflow-y-auto">
              <table className="w-full text-[11px]" data-testid="agent-stats-table">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-slate-200" style={{ boxShadow: '0 1px 0 0 #e2e8f0' }}>
                    <th className="text-left py-1.5 px-2 font-semibold text-slate-500">Agent</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-slate-500">Loans</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-slate-500">Disbursed</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-slate-500">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(agentStats).sort((a,b) => b[1].total - a[1].total).map(([agent, data]) => (
                    <tr key={agent} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <td className="py-1.5 px-2 font-medium text-slate-700 truncate max-w-[100px]">{agent}</td>
                      <td className="py-1.5 px-2 text-right text-slate-600">{data.total}</td>
                      <td className="py-1.5 px-2 text-right font-medium text-emerald-700">{data.disbursed}</td>
                      <td className="py-1.5 px-2 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          data.total > 0 && (data.disbursed / data.total * 100) >= 50 ? 'bg-emerald-50 text-emerald-700' :
                          data.total > 0 && (data.disbursed / data.total * 100) >= 25 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {data.total > 0 ? ((data.disbursed / data.total) * 100).toFixed(1) : 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
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
