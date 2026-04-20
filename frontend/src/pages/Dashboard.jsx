import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, FileText, 
  ArrowUpRight, ArrowDownRight, Building2, Filter, Activity, Trophy, Medal, Target
} from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [overview, setOverview] = useState(null);
  const [loans, setLoans] = useState([]);
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [targetMonth, setTargetMonth] = useState(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  });
  const [targetInputs, setTargetInputs] = useState({});

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

  const openTargetDialog = () => {
    const inputs = {};
    leaderboard.forEach(a => { inputs[a.agent_name] = a.target_amount || ''; });
    setTargetInputs(inputs);
    setShowTargetDialog(true);
  };

  const saveTargets = async () => {
    try {
      const promises = Object.entries(targetInputs).map(([agent_name, target_amount]) =>
        axios.post(`${API}/targets`, { agent_name, month: targetMonth, target_amount: parseFloat(target_amount) || 0 })
      );
      await Promise.all(promises);
      toast.success('Targets saved!');
      setShowTargetDialog(false);
      fetchLeaderboard();
    } catch { toast.error('Failed to save targets'); }
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
    'bg-violet-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500',
    'bg-teal-500', 'bg-orange-500', 'bg-lime-500', 'bg-fuchsia-500'
  ];

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

  // Ring chart helper
  const RateRing = ({ rate, label, color, size = 56 }) => {
    const r = (size / 2) - 4;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (rate / 100) * circumference;
    return (
      <div className="flex items-center gap-3">
        <div className="relative" style={{ width: size, height: size }}>
          <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" className="transition-all duration-700" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold text-slate-800">{rate}%</span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-700">{label}</p>
          <p className="text-[10px] text-slate-400">{rate >= 50 ? 'Good' : rate >= 25 ? 'Average' : 'Low'}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight" data-testid="dashboard-title">
            {greeting()}, {user?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Loan performance snapshot</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-slate-400 hidden sm:inline">Live</span>
        </div>
      </div>

      {/* === ROW 1: Stat Tiles === */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="top-stats-row">
        {[
          { label: 'Total', value: overview?.total || 0, icon: FileText, accent: 'border-l-[#2c587a]', iconBg: 'text-[#2c587a]' },
          { label: 'Sanctioned', value: fmt(overview?.total_sanction_amount), icon: TrendingUp, accent: 'border-l-violet-500', iconBg: 'text-violet-500' },
          { label: 'Disbursed Amt', value: fmt(overview?.total_disbursed_amount), icon: CheckCircle2, accent: 'border-l-emerald-500', iconBg: 'text-emerald-500' },
          { label: 'Disbursed', value: overview?.disbursed || 0, icon: ArrowUpRight, accent: 'border-l-green-500', iconBg: 'text-green-600' },
          { label: 'Declined', value: overview?.declined || 0, icon: XCircle, accent: 'border-l-red-500', iconBg: 'text-red-500' },
          { label: 'Pending', value: overview?.pending || 0, icon: Clock, accent: 'border-l-amber-500', iconBg: 'text-amber-500' },
        ].map((stat, i) => (
          <div key={stat.label} className={`bg-white rounded-lg border border-slate-200 border-l-[3px] ${stat.accent} px-3 py-2.5 shadow-sm`} data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g,'-')}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{stat.label}</span>
              <stat.icon className={`w-3.5 h-3.5 ${stat.iconBg} opacity-60`} />
            </div>
            <p className="text-lg font-bold text-slate-900 leading-tight tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* === ROW 2: Performance Rates + Leaderboard === */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Performance Rates - Compact vertical */}
        <Card className="lg:col-span-1 shadow-sm border-slate-200" data-testid="performance-rates-chart">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-800 mb-4 uppercase tracking-wide">Performance</p>
            <div className="space-y-4">
              <RateRing rate={conversionRate} label="Conversion" color="#10b981" />
              <RateRing rate={declineRate} label="Decline" color="#ef4444" />
              <RateRing rate={pendingRate} label="Pending" color="#f59e0b" />
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              Based on {overview?.total || 0} applications
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard - Takes 3/4 */}
        {leaderboard.length > 0 && (
          <Card className="lg:col-span-3 shadow-sm border-slate-200" data-testid="team-leaderboard-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Team Leaderboard</p>
                  <span className="text-[10px] text-slate-400 ml-1">{leaderboard.length} agents</span>
                </div>
                {(user?.role === 'admin' || user?.role === 'manager') && (
                  <Button variant="outline" size="sm" onClick={openTargetDialog} className="h-6 text-[10px] gap-1 px-2 border-slate-200" data-testid="set-targets-btn">
                    <Target className="w-3 h-3" /> Set Targets
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                <table className="w-full text-[11px]" data-testid="leaderboard-table">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 font-semibold text-slate-500 w-6">#</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Agent</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-500">Loans</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-500">Disbursed</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500 min-w-[140px]">Target</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-500">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((agent, idx) => {
                      const progress = Math.min(agent.target_progress || 0, 100);
                      return (
                        <tr key={agent.agent_name} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors" data-testid={`leaderboard-row-${idx}`}>
                          <td className="py-2 px-2">
                            {idx === 0 ? <Medal className="w-3.5 h-3.5 text-amber-500" /> :
                             idx === 1 ? <Medal className="w-3.5 h-3.5 text-slate-400" /> :
                             idx === 2 ? <Medal className="w-3.5 h-3.5 text-amber-700" /> :
                             <span className="text-slate-400 text-[10px]">{agent.rank}</span>}
                          </td>
                          <td className="py-2 px-2 font-medium text-slate-700 truncate max-w-[120px]">{agent.agent_name}</td>
                          <td className="py-2 px-2 text-right text-slate-600">{agent.total_loans}</td>
                          <td className="py-2 px-2 text-right font-semibold text-emerald-700">{fmt(agent.disbursed_amount)}</td>
                          <td className="py-2 px-2">
                            {agent.target_amount > 0 ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center justify-between text-[9px]">
                                  <span className="text-slate-500">{fmt(agent.disbursed_amount)}/{fmt(agent.target_amount)}</span>
                                  <span className={`font-bold ${
                                    agent.target_progress >= 100 ? 'text-emerald-600' :
                                    agent.target_progress >= 60 ? 'text-amber-600' : 'text-red-500'
                                  }`}>{agent.target_progress}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden" data-testid={`progress-bar-${idx}`}>
                                  <div className={`h-full rounded-full transition-all duration-500 ${
                                    agent.target_progress >= 100 ? 'bg-emerald-500' :
                                    agent.target_progress >= 60 ? 'bg-amber-400' : 'bg-red-400'
                                  }`} style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-300 italic">No target</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <span className={`inline-block min-w-[36px] text-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              agent.conversion_rate >= 50 ? 'bg-emerald-50 text-emerald-700' :
                              agent.conversion_rate >= 25 ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-600'
                            }`}>
                              {agent.conversion_rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* === ROW 3: Status Breakdown + Bank Analysis side by side === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Breakdown - Scrollable */}
        <Card className="shadow-sm border-slate-200" data-testid="status-breakdown-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Status Breakdown</p>
              <span className="text-[10px] text-slate-400">{overview?.total || 0} total</span>
            </div>
            {overview?.status_breakdown && Object.keys(overview.status_breakdown).length > 0 ? (
              <div className="max-h-[320px] overflow-y-auto pr-1 space-y-1.5" data-testid="status-breakdown-list">
                {Object.entries(overview.status_breakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count], idx) => {
                    const pct = overview?.total > 0 ? (count / overview.total) * 100 : 0;
                    return (
                      <div key={status} className="flex items-center gap-2 py-1 group hover:bg-slate-50 rounded px-1 -mx-1 transition-colors">
                        <div className={`w-2 h-2 rounded-sm flex-shrink-0 ${statusColors[idx % statusColors.length]}`} />
                        <span className="text-[11px] text-slate-600 truncate w-28 flex-shrink-0">{status}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-[5px] overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${statusColors[idx % statusColors.length]}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 w-8 text-right flex-shrink-0">{count}</span>
                        <span className="text-[9px] text-slate-400 w-8 text-right flex-shrink-0">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 py-8 text-center">No status data</p>
            )}
          </CardContent>
        </Card>

        {/* Bank Analysis - Scrollable with sticky header */}
        <Card className="shadow-sm border-slate-200" data-testid="bank-analysis-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#2c587a]" />
                <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Bank Analysis</p>
              </div>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-[#2c587a] bg-white"
                data-testid="bank-filter-select"
              >
                <option value="">All Banks</option>
                {banks.map(bank => <option key={bank} value={bank}>{bank}</option>)}
              </select>
            </div>

            {bankTableData.length > 0 ? (
              <div className="max-h-[320px] overflow-y-auto">
                <table className="w-full text-[11px]" data-testid="bank-analysis-table">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-slate-200" style={{ boxShadow: '0 1px 0 0 #e2e8f0' }}>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Bank</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-500">Apps</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-500">Sanctioned</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-500">Disbursed</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-500">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankTableData.map(([bank, data], idx) => (
                      <tr key={bank} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                        <td className="py-1.5 px-2 font-medium text-slate-700 truncate max-w-[120px]">{bank}</td>
                        <td className="py-1.5 px-2 text-right text-slate-600">{data.total}</td>
                        <td className="py-1.5 px-2 text-right text-slate-600">{fmt(data.sanctioned)}</td>
                        <td className="py-1.5 px-2 text-right text-emerald-700 font-medium">{fmt(data.disbursed)}</td>
                        <td className="py-1.5 px-2 text-right">
                          <span className="text-[10px] text-slate-400">{loans.length > 0 ? ((data.total / loans.length) * 100).toFixed(0) : 0}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 py-8 text-center">No bank data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Set Targets Dialog */}
      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="set-targets-dialog">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-1.5">
              <Target className="w-4 h-4 text-[#2c587a]" /> Set Monthly Disbursement Targets
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[11px]">Target Month</Label>
              <Input value={targetMonth} onChange={e => setTargetMonth(e.target.value)} placeholder="MM-YYYY" className="h-8 text-[11px] mt-0.5 w-40" data-testid="target-month-input" />
              <p className="text-[10px] text-slate-400 mt-0.5">Format: MM-YYYY (e.g., 04-2026)</p>
            </div>
            <div className="space-y-2">
              {leaderboard.map((agent, idx) => (
                <div key={agent.agent_name} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50" data-testid={`target-input-row-${idx}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-slate-700 truncate">{agent.agent_name}</p>
                    <p className="text-[9px] text-slate-400">Current: {fmt(agent.disbursed_amount)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">&#8377;</span>
                    <Input
                      type="number"
                      value={targetInputs[agent.agent_name] || ''}
                      onChange={e => setTargetInputs({ ...targetInputs, [agent.agent_name]: e.target.value })}
                      placeholder="Target"
                      className="h-7 text-[11px] w-28"
                      data-testid={`target-amount-${idx}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setShowTargetDialog(false)} className="flex-1 h-7 text-[11px]">Cancel</Button>
              <Button size="sm" onClick={saveTargets} className="flex-1 h-7 text-[11px] bg-[#2c587a] hover:bg-[#234a68]" data-testid="save-targets-btn">Save Targets</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
