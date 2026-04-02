import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, HardDrive, Users, FileText, Tag, Flag, Building2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

const StatRow = ({ icon: Icon, label, count, color }) => (
  <div className="flex items-center justify-between py-1.5 px-2.5 rounded hover:bg-slate-50/60 transition-colors">
    <div className="flex items-center gap-2">
      <div className={`w-6 h-6 rounded flex items-center justify-center ${color}`}>
        <Icon className="w-3 h-3" />
      </div>
      <span className="text-[11px] text-slate-600">{label}</span>
    </div>
    <span className="text-[11px] font-bold text-slate-800">{count.toLocaleString()}</span>
  </div>
);

const DBBackup = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/backup/stats`);
      setStats(res.data);
    } catch (error) { toast.error('Failed to fetch database stats'); }
    finally { setLoading(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await axios.get(`${API}/backup/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mhp_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Backup downloaded successfully');
    } catch (error) {
      toast.error('Failed to download backup');
    }
    finally { setDownloading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c587a]"></div>
      </div>
    );
  }

  const collectionIcons = [
    { key: 'users', label: 'Users', icon: Users, color: 'bg-blue-50 text-[#2c587a]' },
    { key: 'loan_applications', label: 'Loan Applications', icon: FileText, color: 'bg-emerald-50 text-emerald-600' },
    { key: 'schemes', label: 'Schemes', icon: Tag, color: 'bg-violet-50 text-violet-600' },
    { key: 'statuses', label: 'Statuses', icon: Flag, color: 'bg-amber-50 text-amber-600' },
    { key: 'master_banks', label: 'Master Banks', icon: Building2, color: 'bg-cyan-50 text-cyan-600' },
    { key: 'master_agents', label: 'Master Agents', icon: UserCheck, color: 'bg-pink-50 text-pink-600' },
  ];

  return (
    <div className="space-y-3 fade-in" data-testid="db-backup-page">
      <div>
        <h1 className="text-sm font-bold text-slate-800" data-testid="db-backup-title">Database Backup</h1>
        <p className="text-[10px] text-slate-400 mt-0.5">Download a complete backup of all your data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Download Card */}
        <Card className="shadow-sm lg:col-span-1" data-testid="backup-download-card">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#2c587a]/10 flex items-center justify-center mx-auto mb-3">
              <HardDrive className="w-6 h-6 text-[#2c587a]" />
            </div>
            <p className="text-xs font-semibold text-slate-700 mb-1">Full Database Backup</p>
            <p className="text-[10px] text-slate-400 mb-3">
              Downloads all collections as a single JSON file. Includes users, loans, schemes, statuses, and master data.
            </p>
            <div className="bg-slate-50 rounded-lg px-3 py-2 mb-3">
              <p className="text-[10px] text-slate-500">Total Records</p>
              <p className="text-lg font-bold text-[#2c587a]" data-testid="total-records">{stats?.total_records?.toLocaleString() || 0}</p>
            </div>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full h-8 text-[11px] bg-[#2c587a] hover:bg-[#234a68]"
              data-testid="download-backup-btn"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {downloading ? 'Preparing...' : 'Download Backup'}
            </Button>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card className="shadow-sm lg:col-span-2" data-testid="backup-stats-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Database className="w-3.5 h-3.5 text-[#2c587a]" />
              <p className="text-xs font-semibold text-slate-700">Collection Overview</p>
            </div>
            <div className="space-y-0.5">
              {collectionIcons.map(({ key, label, icon, color }) => (
                <StatRow key={key} icon={icon} label={label} count={stats?.[key] || 0} color={color} />
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Backup format: JSON</span>
              <Button variant="outline" size="sm" onClick={fetchStats} className="h-6 text-[10px] px-2" data-testid="refresh-stats-btn">
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DBBackup;
