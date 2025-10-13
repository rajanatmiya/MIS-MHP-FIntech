import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building2, Users, TrendingUp, Calendar } from 'lucide-react';

const Analytics = () => {
  const [bankStats, setBankStats] = useState({});
  const [agentStats, setAgentStats] = useState({});
  const [monthStats, setMonthStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [bankRes, agentRes, monthRes] = await Promise.all([
        axios.get(`${API}/analytics/by-bank`),
        axios.get(`${API}/analytics/by-agent`),
        axios.get(`${API}/analytics/by-month`)
      ]);
      setBankStats(bankRes.data);
      setAgentStats(agentRes.data);
      setMonthStats(monthRes.data);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderStatsTable = (stats, title, icon, testId) => {
    const Icon = icon;
    const sortedStats = Object.entries(stats).sort((a, b) => b[1].total - a[1].total);

    return (
      <Card className="card-hover" data-testid={testId}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-600" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase">Disbursed</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase">Declined</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedStats.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">No data available</td>
                  </tr>
                ) : (
                  sortedStats.map(([name, data]) => {
                    const successRate = data.total > 0 ? ((data.disbursed / data.total) * 100).toFixed(1) : 0;
                    return (
                      <tr key={name} className="table-row">
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{name}</td>
                        <td className="px-4 py-3 text-sm text-center text-slate-600">{data.total}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {data.disbursed}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {data.declined}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-semibold text-slate-800">{successRate}%</span>
                            <div className="w-16 bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                                style={{ width: `${successRate}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8 fade-in" data-testid="analytics-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Analytics & Reports
        </h1>
        <p className="text-slate-600">Detailed insights into loan application performance</p>
      </div>

      {/* Bank-wise Analytics */}
      {renderStatsTable(bankStats, 'Bank-wise Performance', Building2, 'bank-analytics')}

      {/* Agent-wise Analytics */}
      {renderStatsTable(agentStats, 'Agent-wise Performance', Users, 'agent-analytics')}

      {/* Month-wise Analytics */}
      {renderStatsTable(monthStats, 'Month-wise Performance', Calendar, 'month-analytics')}
    </div>
  );
};

export default Analytics;