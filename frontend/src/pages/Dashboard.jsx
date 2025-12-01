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
      const response = await axios.get(`${API}/loans`);
      setLoans(response.data);
      
      // Extract unique banks
      const uniqueBanks = [...new Set(response.data.map(loan => loan.bank).filter(Boolean))];
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
    <div className="space-y-6 lg:space-y-8 fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Dashboard Overview
        </h1>
        <p className="text-sm lg:text-base text-slate-600">Monitor your loan application metrics and performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="stat-card card-hover" data-testid={stat.testId}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                    <p className="text-2xl lg:text-3xl font-bold text-slate-800">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-2 lg:p-3 rounded-xl`}>
                    <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-hover" data-testid="conversion-rate-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-green-600">{conversionRate}%</span>
                <span className="text-sm text-slate-600">of applications disbursed</span>
              </div>
              <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${conversionRate}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="decline-rate-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Decline Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-red-600">{declineRate}%</span>
                <span className="text-sm text-slate-600">of applications declined</span>
              </div>
              <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-red-500 to-rose-500 h-full transition-all duration-500"
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
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(overview.status_breakdown).map(([status, count]) => (
                <div key={status} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm font-medium text-slate-600 mb-1">{status}</p>
                  <p className="text-2xl font-bold text-slate-800">{count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;