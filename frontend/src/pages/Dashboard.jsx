import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, FileText, 
  ArrowUpRight, ArrowDownRight, Building2, Filter, Activity, Trophy, Medal
} from 'lucide-react';
import { toast } from 'sonner';

const MiniStat = ({ label, value, icon: Icon, color, testId }) => (
  <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-100 px-3 py-2 shadow-sm" data-testid={testId}>
    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${color}`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] text-slate-400 leading-tight truncate">{label}</p>
      <p className="text-sm font-bold text-slate-800 leading-tight">{value}</p>
    </div>
  </div>
);

const RateRing = ({ rate, label, color, bgColor, testId }) => {
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (rate / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1.5" data-testid={testId}>
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="#f1f5f9" strokeWidth="5" />
          <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-slate-800">{rate}%</span>
        </div>
      </div>
      <span className="text-[10px] text-slate-500 font-medium">{label}</span>
    </div>
  );
};

const HBar = ({ label, count, total, color }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-24 text-slate-500 truncate text-right">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-[6px] overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-semibold text-slate-700">{count}</span>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [overview, setOverview] = useState(null);
  const [loans, setLoans] = useState([]);
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => { fetchOverview(); fetchLoans(); fetchLeaderboard(); }, []);

  const fetchOverview = async () => {
    try {
      const response = await axios.get(`${API}/analytics/overview`);
      setOverview(response.data);
    } catch (error) { toast.error('Failed to fetch overview data'); }
    finally { setLoading(false); }
  };

  const fetchLoans = async () => {
    try {
      const response = await axios.get(`${API}/loans?limit=2000`);
      const data = response.data.loans || response.data;
      setLoans(data);
      const uniqueBanks = [...new Set(data.map(loan => loan.bank).filter(Boolean))];
      setBanks(uniqueBanks.sort());
    } catch (error) { console.error('Failed to fetch loans'); }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API}/analytics/team-leaderboard`);
      setLeaderboard(response.data.leaderboard || []);
    } catch (error) { console.error('Failed to fetch leaderboard'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c587a]"></div>
      </div>
    );
  }

  const fmt = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  const conversionRate = overview?.total > 0 ? ((overview?.disbursed / overview?.total) * 100).toFixed(1) : 0;
  const declineRate = overview?.total > 0 ? ((overview?.declined / overview?.total) * 100).toFixed(1) : 0;
  const pendingRate = overview?.total > 0 ? ((overview?.pending / overview?.total) * 100).toFixed(1) : 0;

  const statusColors = [
    'bg-[#2c587a]', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500',
    'bg-violet-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500'
  ];

  // Bank analysis data
  const filteredLoans = selectedBank ? loans.filter(l => l.bank === selectedBank) : loans;
  const bankGroups = {};
  filteredLoans.forEach(loan => {
    const bank = loan.bank || 'Unknown';
    if (!bankGroups[bank]) bankGroups[bank] = { total: 0, sanctioned: 0, disbursed: 0 };
    bankGroups[bank].total++;
    const s = parseFloat(String(loan.sanction || '0').replace(/,/g, ''));
    const d = parseFloat(String(loan.disbursed || '0').replace(/,/g, ''));
    bankGroups[bank].sanctioned += isNaN(s) ? 0 : s;
    bankGroups[bank].disbursed += isNaN(d) ? 0 : d;
  });
  const bankTableData = Object.entries(bankGroups).sort((a, b) => b[1].total - a[1].total);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-3 fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-800" data-testid="dashboard-title">
            {greeting()}, {user?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-[10px] text-slate-400 mt-0.5">Here's your loan performance snapshot</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 hidden sm:inline">Updated just now</span>
          <Activity className="w-3 h-3 text-emerald-500" />
        </div>
      </div>

      {/* Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" data-testid="stats-grid">
        <MiniStat label="Total" value={overview?.total || 0} icon={FileText} color="bg-blue-50 text-[#2c587a]" testId="total-applications-card" />
        <MiniStat label="Sanctioned" value={fmt(overview?.total_sanction_amount)} icon={TrendingUp} color="bg-violet-50 text-violet-600" testId="sanction-amount-card" />
        <MiniStat label="Disbursed Amt" value={fmt(overview?.total_disbursed_amount)} icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" testId="disbursed-amount-card" />
        <MiniStat label="Disbursed" value={overview?.disbursed || 0} icon={ArrowUpRight} color="bg-green-50 text-green-600" testId="disbursed-card" />
        <MiniStat label="Declined" value={overview?.declined || 0} icon={XCircle} color="bg-red-50 text-red-600" testId="declined-card" />
        <MiniStat label="Pending" value={overview?.pending || 0} icon={Clock} color="bg-amber-50 text-amber-600" testId="pending-card" />
      </div>

      {/* Two-column: Rates + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Rate Rings */}
        <Card className="lg:col-span-2 shadow-sm" data-testid="conversion-rate-card">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-700 mb-3">Performance Rates</p>
            <div className="flex items-center justify-around">
              <RateRing rate={conversionRate} label="Conversion" color="#10b981" testId="conversion-ring" />
              <RateRing rate={declineRate} label="Decline" color="#ef4444" testId="decline-ring" />
              <RateRing rate={pendingRate} label="Pending" color="#f59e0b" testId="pending-ring" />
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Based on {overview?.total || 0} total applications</span>
              <span className="flex items-center gap-1">
                {parseFloat(conversionRate) >= 50 ? (
                  <><ArrowUpRight className="w-3 h-3 text-emerald-500" /> Healthy</>
                ) : (
                  <><ArrowDownRight className="w-3 h-3 text-amber-500" /> Needs attention</>
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown Bars */}
        <Card className="lg:col-span-3 shadow-sm" data-testid="status-breakdown-card">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-700 mb-3">Status Breakdown</p>
            {overview?.status_breakdown && Object.keys(overview.status_breakdown).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(overview.status_breakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count], idx) => (
                    <HBar key={status} label={status} count={count} total={overview?.total || 1}
                      color={statusColors[idx % statusColors.length]} />
                  ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 py-4 text-center">No status data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bank Analysis Table */}
      <Card className="shadow-sm" data-testid="bank-analysis-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#2c587a]" />
              <p className="text-xs font-semibold text-slate-700">Bank-wise Analysis</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-md text-[11px] focus:outline-none focus:ring-1 focus:ring-[#2c587a] bg-white"
                data-testid="bank-filter-select"
              >
                <option value="">All Banks</option>
                {banks.map(bank => <option key={bank} value={bank}>{bank}</option>)}
              </select>
            </div>
          </div>

          {bankTableData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]" data-testid="bank-table">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-1.5 px-2 font-semibold text-slate-500">Bank</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-slate-500">Apps</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-slate-500">Sanctioned</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-slate-500">Disbursed</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-slate-500 hidden sm:table-cell">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {bankTableData.map(([bank, data], idx) => (
                    <tr key={bank} className={`border-b border-slate-50 ${idx % 2 === 0 ? 'bg-slate-50/50' : ''} hover:bg-blue-50/40 transition-colors`}>
                      <td className="py-1.5 px-2 font-medium text-slate-700 truncate max-w-[140px]">{bank}</td>
                      <td className="py-1.5 px-2 text-right text-slate-600">{data.total}</td>
                      <td className="py-1.5 px-2 text-right text-slate-600">{fmt(data.sanctioned)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-600">{fmt(data.disbursed)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-400 hidden sm:table-cell">
                        {loans.length > 0 ? ((data.total / loans.length) * 100).toFixed(0) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedBank && (
                <p className="text-[10px] text-slate-400 mt-2 italic">
                  Filtered: <span className="font-medium text-slate-600">{selectedBank}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 py-4 text-center">No bank data available</p>
          )}
        </CardContent>
      </Card>

      {/* Team Performance Leaderboard */}
      {(user?.role === 'admin' || user?.role === 'manager') && leaderboard.length > 0 && (
        <Card className="shadow-sm" data-testid="team-leaderboard-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-xs font-semibold text-slate-700">Team Performance Leaderboard</p>
              </div>
              <span className="text-[10px] text-slate-400">{leaderboard.length} agents</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]" data-testid="leaderboard-table">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-1.5 px-2 font-semibold text-slate-500 w-8">#</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-slate-500">Agent</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-slate-500">Loans</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-slate-500">Sanctioned</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-slate-500">Disbursed</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-slate-500 hidden sm:table-cell">Disbursed #</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-slate-500 hidden sm:table-cell">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((agent, idx) => (
                    <tr key={agent.agent_name} className={`border-b border-slate-50 ${idx % 2 === 0 ? 'bg-slate-50/50' : ''} hover:bg-amber-50/30 transition-colors`} data-testid={`leaderboard-row-${idx}`}>
                      <td className="py-1.5 px-2">
                        {idx === 0 ? <Medal className="w-3.5 h-3.5 text-amber-500" /> :
                         idx === 1 ? <Medal className="w-3.5 h-3.5 text-slate-400" /> :
                         idx === 2 ? <Medal className="w-3.5 h-3.5 text-amber-700" /> :
                         <span className="text-slate-400 text-[10px] pl-0.5">{agent.rank}</span>}
                      </td>
                      <td className="py-1.5 px-2 font-medium text-slate-700 truncate max-w-[140px]">{agent.agent_name}</td>
                      <td className="py-1.5 px-2 text-right text-slate-600">{agent.total_loans}</td>
                      <td className="py-1.5 px-2 text-right text-slate-600">{fmt(agent.sanction_amount)}</td>
                      <td className="py-1.5 px-2 text-right font-medium text-emerald-700">{fmt(agent.disbursed_amount)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-600 hidden sm:table-cell">{agent.disbursed_count}</td>
                      <td className="py-1.5 px-2 text-right hidden sm:table-cell">
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                          agent.conversion_rate >= 50 ? 'bg-emerald-50 text-emerald-700' :
                          agent.conversion_rate >= 25 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {agent.conversion_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
