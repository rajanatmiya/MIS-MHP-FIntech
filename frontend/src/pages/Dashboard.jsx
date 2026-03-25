import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loans, setLoans] = useState([]);
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
    fetchLoans();
  }, []);

  const fetchOverview = async () => {
    try {
      const response = await axios.get(`${API}/analytics/overview`);
      setOverview(response.data);
    } catch (error) {
      toast.error('Failed to fetch overview data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoans = async () => {
    try {
      const response = await axios.get(`${API}/loans?limit=2000`);
      const data = response.data.loans || response.data;
      setLoans(data);
      
      // Extract unique banks
      const uniqueBanks = [...new Set(data.map(loan => loan.bank).filter(Boolean))];
      setBanks(uniqueBanks.sort());
    } catch (error) {
      console.error('Failed to fetch loans');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const stats = [
    {
      title: 'Total Applications',
      value: overview?.total || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      testId: 'total-applications-card'
    },
    {
      title: 'Total Sanctioned Amount',
      value: formatCurrency(overview?.total_sanction_amount),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      testId: 'sanction-amount-card'
    },
    {
      title: 'Total Disbursed Amount',
      value: formatCurrency(overview?.total_disbursed_amount),
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      testId: 'disbursed-amount-card'
    },
    {
      title: 'Disbursed Cases',
      value: overview?.disbursed || 0,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      testId: 'disbursed-card'
    },
    {
      title: 'Declined',
      value: overview?.declined || 0,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      testId: 'declined-card'
    },
    {
      title: 'Pending',
      value: overview?.pending || 0,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      testId: 'pending-card'
    }
  ];

  const conversionRate = overview?.total > 0 ? ((overview?.disbursed / overview?.total) * 100).toFixed(1) : 0;
  const declineRate = overview?.total > 0 ? ((overview?.declined / overview?.total) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-4 lg:space-y-6 fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-lg lg:text-xl font-bold text-slate-800 mb-1">
          Dashboard Overview
        </h1>
        <p className="text-xs text-slate-500">Monitor your loan application metrics and performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 lg:gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="stat-card card-hover" data-testid={stat.testId}>
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 mb-0.5">{stat.title}</p>
                    <p className="text-lg lg:text-xl font-bold text-slate-800">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-2 rounded-lg`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-hover" data-testid="conversion-rate-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600">{conversionRate}%</span>
                <span className="text-[11px] text-slate-500">of applications disbursed</span>
              </div>
              <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${conversionRate}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="decline-rate-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingDown className="w-4 h-4 text-red-600" />
              Decline Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-red-600">{declineRate}%</span>
                <span className="text-[11px] text-slate-500">of applications declined</span>
              </div>
              <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-red-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${declineRate}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      {overview?.status_breakdown && Object.keys(overview.status_breakdown).length > 0 && (
        <Card className="card-hover" data-testid="status-breakdown-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(overview.status_breakdown).map(([status, count]) => (
                <div key={status} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-[11px] font-medium text-slate-500 mb-0.5">{status}</p>
                  <p className="text-lg font-bold text-slate-800">{count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bank-wise Filter and Breakdown */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Bank-wise Analysis</CardTitle>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Banks</option>
              {banks.map(bank => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const filteredLoans = selectedBank 
              ? loans.filter(loan => loan.bank === selectedBank)
              : loans;
            
            const bankStats = {
              total: filteredLoans.length,
              sanctioned: filteredLoans.reduce((sum, loan) => {
                const amt = parseFloat(String(loan.sanction || '0').replace(/,/g, ''));
                return sum + (isNaN(amt) ? 0 : amt);
              }, 0),
              disbursed: filteredLoans.reduce((sum, loan) => {
                const amt = parseFloat(String(loan.disbursed || '0').replace(/,/g, ''));
                return sum + (isNaN(amt) ? 0 : amt);
              }, 0),
              statusBreakdown: filteredLoans.reduce((acc, loan) => {
                const status = loan.status || 'Unknown';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
              }, {})
            };

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-[11px] font-medium text-blue-800 mb-0.5">Total Applications</p>
                    <p className="text-lg font-bold text-blue-900">{bankStats.total}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <p className="text-[11px] font-medium text-purple-800 mb-0.5">Total Sanctioned</p>
                    <p className="text-lg font-bold text-purple-900">{formatCurrency(bankStats.sanctioned)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <p className="text-[11px] font-medium text-green-800 mb-0.5">Total Disbursed</p>
                    <p className="text-lg font-bold text-green-900">{formatCurrency(bankStats.disbursed)}</p>
                  </div>
                </div>

                {Object.keys(bankStats.statusBreakdown).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-600 mb-2">Status Distribution</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(bankStats.statusBreakdown).map(([status, count]) => (
                        <div key={status} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                          <p className="text-[10px] font-medium text-slate-500 mb-0.5">{status}</p>
                          <p className="text-base font-bold text-slate-800">{count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBank && (
                  <p className="text-[11px] text-slate-500 italic">
                    Showing data for: <span className="font-semibold text-slate-700">{selectedBank}</span>
                  </p>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;